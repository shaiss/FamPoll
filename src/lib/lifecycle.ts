import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { getDb, schema, type Db } from "./db";
import {
  closesAtFrom,
  cutAdvancing,
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

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

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

/** Opens the next round for a decision. */
export async function openRound(tx: Tx | Db, decision: Decision, kind: RoundKind, number: number, now: Date, onlyOptionIds?: string[]) {
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
  if (onlyOptionIds) {
    // A tiebreak final: everything outside the tie is out.
    await tx
      .update(schema.options)
      .set({ eliminatedInRoundId: round.id })
      .where(and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)))
      .then(async () => {
        await tx.update(schema.options).set({ eliminatedInRoundId: null }).where(inArray(schema.options.id, onlyOptionIds));
      });
  }
  return round;
}

/**
 * Closes a round and applies what follows: eliminate, advance, decide, or tie.
 * Safe to call from a deadline check, an "everyone voted" check, or the organizer.
 * Returns the resulting step so callers can phrase a message.
 */
export async function closeRoundAndAdvance(tx: Tx, round: Round, reason: CloseReason, now: Date): Promise<NextStep> {
  if (round.status !== "open") return { kind: "stalled", reason: "Round already closed." };
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

  switch (step.kind) {
    case "round": {
      await openRound(tx, decision, step.round, round.number + 1, now);
      const seq = roundSequence(decision.plan);
      const label = step.round === "final" ? "the final" : step.round === "shortlist" ? "the shortlist" : "ideas";
      const skipped = round.kind === "ideas" && step.round === "final" && seq.includes("shortlist") ? " Few enough ideas, so the shortlist was skipped." : "";
      await tx.insert(schema.activity).values({
        id: newId(),
        eventId: decision.eventId,
        decisionId: decision.id,
        kind: "round_advanced",
        message: `Round ${round.number} closed because ${why}. On to ${label}.${skipped}`,
      });
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
      await tx.insert(schema.activity).values({
        id: newId(),
        eventId: decision.eventId,
        decisionId: decision.id,
        kind: "decided",
        message: `${decision.title} decided: ${titleOf(step.optionId)}.${detail}`,
      });
      break;
    }
    case "tie": {
      await tx.insert(schema.activity).values({
        id: newId(),
        eventId: decision.eventId,
        decisionId: decision.id,
        kind: "tie",
        message: `${decision.title}: the final tied between ${step.tiedIds.map(titleOf).join(" and ")}. The organizer breaks the tie.`,
      });
      break;
    }
    case "stalled": {
      await tx.insert(schema.activity).values({
        id: newId(),
        eventId: decision.eventId,
        decisionId: decision.id,
        kind: "stalled",
        message: `${decision.title}: round ${round.number} closed but nothing could advance. ${step.reason}`,
      });
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
 * Closes any open round whose deadline passed. Runs lazily on page loads, so the
 * app needs no scheduler. Idempotent: a round can only close once.
 */
export async function settleDueRounds(familyId: string, now = new Date()): Promise<number> {
  const db = getDb();
  const due = await db
    .select({ round: schema.rounds })
    .from(schema.rounds)
    .innerJoin(schema.decisions, eq(schema.decisions.id, schema.rounds.decisionId))
    .innerJoin(schema.events, eq(schema.events.id, schema.decisions.eventId))
    .where(and(eq(schema.events.familyId, familyId), eq(schema.rounds.status, "open"), lte(schema.rounds.closesAt, now)));
  let closed = 0;
  for (const { round } of due) {
    await db.transaction(async (tx) => {
      const fresh = await tx.query.rounds.findFirst({ where: eq(schema.rounds.id, round.id) });
      if (fresh && fresh.status === "open") {
        await closeRoundAndAdvance(tx, fresh, "deadline", now);
        closed++;
      }
    });
  }
  return closed;
}

/** After a vote lands: close the round early when every seat has voted. */
export async function maybeCloseEarly(tx: Tx, round: Round, familyId: string, now: Date): Promise<boolean> {
  const votes = await tx.select({ memberId: schema.votes.memberId }).from(schema.votes).where(eq(schema.votes.roundId, round.id));
  const distinct = new Set(votes.map((v) => v.memberId)).size;
  const eligible = await eligibleSeatCount(tx, familyId);
  if (shouldAutoClose(round.kind, distinct, eligible)) {
    await closeRoundAndAdvance(tx, round, "everyone_voted", now);
    return true;
  }
  return false;
}
