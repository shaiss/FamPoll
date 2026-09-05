"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMembership, seatsForUser } from "../auth";
import { getDb, schema } from "../db";
import { closesAtFrom, isPastDeadline, planRoundCount, resolveFinal, roundSequence, tally } from "../engine/rounds";
import { fail } from "../flash";
import { newId } from "../ids";
import { closeRoundAndAdvance, logActivity, maybeCloseEarly, openRound } from "../lifecycle";

const planSchema = z.enum(["quick", "shortlist_final", "ideas_shortlist_final"]);

async function loadEventForFamily(eventId: string, familyId: string) {
  const event = await getDb().query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event || event.familyId !== familyId) throw new Error("Event not found.");
  return event;
}

async function loadDecisionForFamily(decisionId: string, familyId: string) {
  const decision = await getDb().query.decisions.findFirst({ where: eq(schema.decisions.id, decisionId), with: { event: true } });
  if (!decision || decision.event.familyId !== familyId) throw new Error("Decision not found.");
  return decision;
}

function cleanOptions(raw: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    const t = String(v).trim().slice(0, 80);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function createDecision(formData: FormData) {
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/decisions/new`;
  const event = await loadEventForFamily(eventId, family.id);

  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  if (!title) fail(back, "What are we deciding? Give it a title.");
  const plan = planSchema.catch("quick").parse(formData.get("plan"));
  const roundHours = z.coerce.number().int().min(1).max(24 * 30).catch(72).parse(formData.get("roundHours"));
  const anyoneCanAddOptions = formData.getAll("anyoneCanAddOptions").map(String).includes("on");
  const optionTitles = cleanOptions(formData.getAll("option"));

  if (plan === "quick" && optionTitles.length < 2) fail(back, "A quick vote needs at least 2 options.");
  if (plan === "shortlist_final" && optionTitles.length < 3) fail(back, "A shortlist needs at least 3 options, or use a quick vote.");

  const db = getDb();
  const decisionId = newId();
  await db.transaction(async (tx) => {
    const siblings = await tx.select({ id: schema.decisions.id }).from(schema.decisions).where(eq(schema.decisions.eventId, event.id));
    const [decision] = await tx
      .insert(schema.decisions)
      .values({
        id: decisionId,
        eventId: event.id,
        title,
        position: siblings.length + 1,
        plan,
        roundHours,
        anyoneCanAddOptions,
        createdByMemberId: member.id,
      })
      .returning();
    const firstKind = roundSequence(plan)[0];
    const now = new Date();
    const round = await openRound(tx, decision, firstKind, 1, now);
    if (optionTitles.length) {
      await tx.insert(schema.options).values(
        optionTitles.map((t) => ({ id: newId(), decisionId, title: t, addedByMemberId: member.id, addedInRoundId: round.id })),
      );
    }
    const rounds = planRoundCount(plan);
    await logActivity(tx, {
      eventId: event.id,
      decisionId,
      kind: "decision_created",
      message: `${member.displayName} opened "${title}" (${rounds === 1 ? "quick vote" : `${rounds} rounds`}).`,
      actorMemberId: member.id,
    });
  });
  revalidatePath(`/app/events/${event.id}`);
  redirect(`/app/decisions/${decisionId}`);
}

export async function addOption(formData: FormData) {
  const { family, member } = await requireMembership();
  const decisionId = z.string().parse(formData.get("decisionId"));
  const back = `/app/decisions/${decisionId}`;
  const decision = await loadDecisionForFamily(decisionId, family.id);
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 140) || null;
  if (!title) fail(back, "Type the idea first.");
  if (decision.status !== "open") fail(back, "This decision is closed.");

  const db = getDb();
  const round = await db.query.rounds.findFirst({
    where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")),
    orderBy: [desc(schema.rounds.number)],
  });
  if (!round) fail(back, "No round is open right now.");
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  if (round.kind === "final") fail(back, "Ideas can't be added during the final.");
  if (round.kind === "shortlist" && !organizer) fail(back, "Only the organizer can add ideas once the shortlist has started.");
  if (round.kind === "ideas" && !decision.anyoneCanAddOptions && !organizer) fail(back, "The organizer is collecting ideas for this one.");

  const existing = await db.query.options.findMany({ where: eq(schema.options.decisionId, decision.id) });
  if (existing.some((o) => o.title.toLowerCase() === title.toLowerCase())) fail(back, "That idea is already on the list.");

  await db.transaction(async (tx) => {
    await tx.insert(schema.options).values({ id: newId(), decisionId: decision.id, title, note, addedByMemberId: member.id, addedInRoundId: round.id });
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "option_added", message: `${member.displayName} suggested "${title}".`, actorMemberId: member.id });
  });
  revalidatePath(back);
}

export async function castVote(formData: FormData) {
  const { user, family } = await requireMembership();
  const roundId = z.string().parse(formData.get("roundId"));
  const memberId = z.string().parse(formData.get("memberId"));
  const optionIds = [...new Set(formData.getAll("optionId").map(String))];
  const db = getDb();
  const round = await db.query.rounds.findFirst({ where: eq(schema.rounds.id, roundId) });
  if (!round) throw new Error("Round not found.");
  const decision = await loadDecisionForFamily(round.decisionId, family.id);
  const back = `/app/decisions/${decision.id}`;

  const seats = await seatsForUser(family.id, user.id);
  const seat = seats.find((s) => s.id === memberId);
  if (!seat) fail(back, "You can't vote from that seat.");
  if (round.kind === "ideas") fail(back, "Nobody votes during the ideas round.");
  if (optionIds.length === 0) fail(back, "Pick at least one.");
  if (optionIds.length > round.maxPicks) fail(back, `Pick up to ${round.maxPicks}.`);

  const now = new Date();
  await db.transaction(async (tx) => {
    const fresh = await tx.query.rounds.findFirst({ where: eq(schema.rounds.id, roundId) });
    if (!fresh || fresh.status !== "open") fail(back, "That round just closed.");
    if (isPastDeadline(fresh.closesAt, now)) {
      await closeRoundAndAdvance(tx, fresh, "deadline", now);
      fail(back, "That round just closed.");
    }
    const alive = await tx.query.options.findMany({
      where: and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)),
    });
    const aliveIds = new Set(alive.map((o) => o.id));
    if (!optionIds.every((id) => aliveIds.has(id))) fail(back, "One of those options is no longer in the running.");

    await tx.delete(schema.votes).where(and(eq(schema.votes.roundId, roundId), eq(schema.votes.memberId, memberId)));
    await tx.insert(schema.votes).values(optionIds.map((optionId) => ({ id: newId(), roundId, optionId, memberId, castByUserId: user.id })));
    await maybeCloseEarly(tx, fresh, family.id, now);
  });
  revalidatePath(back);
  revalidatePath(`/app/events/${decision.eventId}`);
  revalidatePath("/app");
  redirect(back);
}

async function requireOrganizer(decisionId: string) {
  const { family, member } = await requireMembership();
  const decision = await loadDecisionForFamily(decisionId, family.id);
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  if (!organizer) fail(`/app/decisions/${decisionId}`, "Only the organizer can do that.");
  return { family, member, decision };
}

export async function closeRoundNow(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const db = getDb();
  await db.transaction(async (tx) => {
    const round = await tx.query.rounds.findFirst({
      where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")),
    });
    if (!round) fail(back, "No round is open.");
    await closeRoundAndAdvance(tx, round, "organizer", new Date());
  });
  revalidatePath(back);
  revalidatePath(`/app/events/${decision.eventId}`);
  redirect(back);
}

/** Reopen the latest round (or extend it if still open). Later rounds and any outcome are undone. */
export async function reopenRound(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const roundsAll = await tx.query.rounds.findMany({ where: eq(schema.rounds.decisionId, decision.id), orderBy: [desc(schema.rounds.number)] });
    const open = roundsAll.find((r) => r.status === "open");
    const target = open ?? roundsAll.find((r) => r.status === "closed");
    if (!target) fail(back, "Nothing to reopen.");

    if (open) {
      await tx.update(schema.rounds).set({ closesAt: closesAtFrom(now, decision.roundHours) }).where(eq(schema.rounds.id, open.id));
      await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "round_extended", message: `${member.displayName} gave round ${open.number} more time.`, actorMemberId: member.id });
      return;
    }
    const laterIds = roundsAll.filter((r) => r.number > target.number).map((r) => r.id);
    const affected = [target.id, ...laterIds];
    await tx.update(schema.options).set({ eliminatedInRoundId: null }).where(inArray(schema.options.eliminatedInRoundId, affected));
    if (laterIds.length) await tx.delete(schema.rounds).where(inArray(schema.rounds.id, laterIds));
    await tx
      .update(schema.rounds)
      .set({ status: "open", closedAt: null, closeReason: null, tied: false, closesAt: closesAtFrom(now, decision.roundHours) })
      .where(eq(schema.rounds.id, target.id));
    await tx.update(schema.decisions).set({ status: "open", outcomeOptionId: null, decidedAt: null }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "round_reopened", message: `${member.displayName} reopened round ${target.number}.`, actorMemberId: member.id });
  });
  revalidatePath(back);
  revalidatePath(`/app/events/${decision.eventId}`);
  revalidatePath("/app");
  redirect(back);
}

/** The organizer settles it by hand: breaks a tie, or just calls it. */
export async function pickWinner(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const optionId = z.string().parse(formData.get("optionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const option = await tx.query.options.findFirst({ where: and(eq(schema.options.id, optionId), eq(schema.options.decisionId, decision.id)) });
    if (!option) fail(back, "That option isn't part of this decision.");
    await tx
      .update(schema.rounds)
      .set({ status: "closed", closedAt: now, closeReason: "organizer" })
      .where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")));
    await tx.update(schema.decisions).set({ status: "decided", outcomeOptionId: optionId, decidedAt: now }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "decided", message: `${decision.title} decided: ${option.title}. ${member.displayName} called it.`, actorMemberId: member.id });
  });
  revalidatePath(back);
  revalidatePath(`/app/events/${decision.eventId}`);
  revalidatePath("/app");
  redirect(back);
}

/** After a tied final: one more final, just between the tied options. */
export async function tiebreak(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    const last = await tx.query.rounds.findFirst({ where: eq(schema.rounds.decisionId, decision.id), orderBy: [desc(schema.rounds.number)] });
    if (!last || last.status !== "closed" || !last.tied) fail(back, "There is no tie to break.");
    const alive = await tx.query.options.findMany({
      where: and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)),
      orderBy: [asc(schema.options.createdAt)],
    });
    const votes = await tx.query.votes.findMany({ where: eq(schema.votes.roundId, last.id) });
    const result = resolveFinal(tally(alive.map((o) => o.id), votes));
    if (result.tiedIds.length < 2) fail(back, "There is no tie to break.");
    await tx.update(schema.rounds).set({ tied: false }).where(eq(schema.rounds.id, last.id));
    await openRound(tx, { ...decision, shortlistPicks: decision.shortlistPicks }, "final", last.number + 1, now, result.tiedIds);
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "tiebreak", message: `${member.displayName} started a tiebreak between ${result.tiedIds.map((id) => alive.find((o) => o.id === id)?.title).join(" and ")}.`, actorMemberId: member.id });
  });
  revalidatePath(back);
  redirect(back);
}

export async function skipDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.rounds)
      .set({ status: "closed", closedAt: now, closeReason: "organizer" })
      .where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")));
    await tx.update(schema.decisions).set({ status: "skipped" }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "skipped", message: `${member.displayName} set "${decision.title}" aside.`, actorMemberId: member.id });
  });
  revalidatePath(`/app/events/${decision.eventId}`);
  redirect(`/app/events/${decision.eventId}`);
}
