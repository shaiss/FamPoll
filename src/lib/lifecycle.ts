import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb, schema, type Db } from "./db";
import {
  closesAtFrom,
  cutAdvancing,
  isPastDeadline,
  maxPicksFor,
  nextStep,
  resolveFinal,
  roundSequence,
  shouldAutoClose,
  tally,
  type NextStep,
  type RoundKind,
} from "./engine/rounds";
import { newId } from "./ids";
import type { Decision, Round } from "./db/schema";

export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type CloseReason = "deadline" | "everyone_voted" | "organizer";

export async function logActivity(
  tx: Tx | Db,
  input: { eventId: string; decisionId?: string | null; kind: string; message: string; actorMemberId?: string | null },
) {
  await tx.insert(schema.activity).values({
    id: newId(),
    eventId: input.eventId,
    decisionId: input.decisionId ?? null,
    kind: input.kind,
    message: input.message,
    actorMemberId: input.actorMemberId ?? null,
  });
}

/**
 * Lock a round row for the rest of the transaction and return it only if it is
 * still open. Every path that closes a round, counts votes to close it early,
 * or writes votes into it goes through this lock, so two requests can never
 * settle the same round twice or miss an "everyone voted" close.
 */
export async function lockOpenRound(tx: Tx, roundId: string): Promise<Round | null> {
  const [round] = await tx.select().from(schema.rounds).where(eq(schema.rounds.id, roundId)).for("update");
  if (!round || round.status !== "open") return null;
  return round;
}

/**
 * Opens the next round. For a tiebreak, `only` restricts the ballot to the tied
 * options; the others are stamped as eliminated in `stampRoundId` (the round
 * that tied), so a later reopen of that round brings them back correctly.
 */
export async function openRound(
  tx: Tx | Db,
  decision: Decision,
  kind: RoundKind,
  number: number,
  now: Date,
  only?: { optionIds: string[]; stampRoundId: string },
) {
  const [round] = await tx
    .insert(schema.rounds)
    .values({
      id: newId(),
      decisionId: decision.id,
      number,
      kind,
      status: "open",
      maxPicks: maxPicksFor(kind, decision.shortlistPicks),
      openedAt: now,
      closesAt: closesAtFrom(now, decision.roundHours),
    })
    .returning();
  if (only) {
    await tx
      .update(schema.options)
      .set({ eliminatedInRoundId: only.stampRoundId })
      .where(and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)));
    await tx.update(schema.options).set({ eliminatedInRoundId: null }).where(inArray(schema.options.id, only.optionIds));
  }
  return round;
}

/**
 * Closes a round and applies what follows: eliminate, advance, decide, or tie.
 * Takes the round id and locks it itself, so it is safe from any caller.
 * Returns null when the round was already closed by someone else.
 */
export async function closeRoundAndAdvance(tx: Tx, roundId: string, reason: CloseReason, now: Date): Promise<NextStep | null> {
  const round = await lockOpenRound(tx, roundId);
  if (!round) return null;
  const decision = await tx.query.decisions.findFirst({ where: eq(schema.decisions.id, round.decisionId) });
  if (!decision) throw new Error("Decision not found");

  const alive = await tx.query.options.findMany({
    where: and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)),
    orderBy: [asc(schema.options.createdAt)],
  });
  const votes = await tx.query.votes.findMany({ where: eq(schema.votes.roundId, round.id) });
  const rows = tally(
    alive.map((o) => o.id),
    votes.map((v) => ({ optionId: v.optionId })),
  );

  let aliveIds = alive.map((o) => o.id);
  let finalResult: ReturnType<typeof resolveFinal> | undefined;

  if (round.kind === "shortlist") {
    const cut = cutAdvancing(rows, decision.advanceCount);
    if (cut.eliminated.length > 0) {
      await tx.update(schema.options).set({ eliminatedInRoundId: round.id }).where(inArray(schema.options.id, cut.eliminated));
    }
    aliveIds = cut.advancing;
  } else if (round.kind === "final") {
    finalResult = resolveFinal(rows);
  }

  const step = nextStep(decision.plan, round.kind, aliveIds, decision.advanceCount, finalResult);

  await tx
    .update(schema.rounds)
    .set({ status: "closed", closedAt: now, closeReason: reason, tied: step.kind === "tie" })
    .where(eq(schema.rounds.id, round.id));

  const titleOf = (id: string) => alive.find((o) => o.id === id)?.title ?? "an option";
  const why = reason === "everyone_voted" ? "everyone voted" : reason === "deadline" ? "time was up" : "the organizer closed it";
  const log = (kind: string, message: string) =>
    tx.insert(schema.activity).values({ id: newId(), eventId: decision.eventId, decisionId: decision.id, kind, message });

  switch (step.kind) {
    case "round": {
      await openRound(tx, decision, step.round, round.number + 1, now);
      const seq = roundSequence(decision.plan);
      const label = step.round === "final" ? "the final" : step.round === "shortlist" ? "the shortlist" : "ideas";
      const skipped = round.kind === "ideas" && step.round === "final" && seq.includes("shortlist") ? " Few enough ideas, so the shortlist was skipped." : "";
      await log("round_advanced", `Round ${round.number} closed because ${why}. On to ${label}.${skipped}`);
      break;
    }
    case "decided": {
      await tx
        .update(schema.decisions)
        .set({ status: "decided", outcomeOptionId: step.optionId, decidedAt: now })
        .where(eq(schema.decisions.id, decision.id));
      const detail =
        round.kind === "final" && rows.length > 1
          ? ` ${titleOf(step.optionId)} won ${rows[0].count}–${rows[1].count}.`
          : ` ${titleOf(step.optionId)} was the only idea left.`;
      await log("decided", `${decision.title} decided: ${titleOf(step.optionId)}.${detail}`);
      break;
    }
    case "tie": {
      await log("tie", `${decision.title}: the final tied between ${step.tiedIds.map(titleOf).join(" and ")}. The organizer breaks the tie.`);
      break;
    }
    case "stalled": {
      await log("stalled", `${decision.title}: round ${round.number} closed but nothing could advance. ${step.reason}`);
      break;
    }
  }
  return step;
}

/** Number of seats that may vote in this family: every member, proxies included. */
export async function eligibleSeatCount(tx: Tx | Db, familyId: string): Promise<number> {
  const rows = await tx.select({ id: schema.members.id }).from(schema.members).where(eq(schema.members.familyId, familyId));
  return rows.length;
}

/**
 * Closes any open round whose deadline passed, and repairs a missed
 * "everyone voted" close. Runs lazily on page loads, so the app needs no
 * scheduler. Idempotent: the row lock means a round closes exactly once.
 */
export async function settleDueRounds(familyId: string, now = new Date()): Promise<number> {
  const db = getDb();
  const open = await db
    .select({ round: schema.rounds })
    .from(schema.rounds)
    .innerJoin(schema.decisions, eq(schema.decisions.id, schema.rounds.decisionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.decisions.eventId))
    .where(and(eq(schema.events.familyId, familyId), eq(schema.rounds.status, "open"), eq(schema.decisions.status, "open")));
  let closed = 0;
  for (const { round } of open) {
    const due = isPastDeadline(round.closesAt, now);
    await db.transaction(async (tx) => {
      const fresh = await lockOpenRound(tx, round.id);
      if (!fresh) return;
      if (due) {
        if (await closeRoundAndAdvance(tx, fresh.id, "deadline", now)) closed++;
        return;
      }
      if (await maybeCloseEarly(tx, fresh, familyId, now)) closed++;
    });
  }
  return closed;
}

/** With the round locked: close it early when every seat has voted. */
export async function maybeCloseEarly(tx: Tx, round: Round, familyId: string, now: Date): Promise<boolean> {
  const votes = await tx.select({ memberId: schema.votes.memberId }).from(schema.votes).where(eq(schema.votes.roundId, round.id));
  const distinct = new Set(votes.map((v) => v.memberId)).size;
  const eligible = await eligibleSeatCount(tx, familyId);
  if (shouldAutoClose(round.kind, distinct, eligible)) {
    return (await closeRoundAndAdvance(tx, round.id, "everyone_voted", now)) !== null;
  }
  return false;
}

