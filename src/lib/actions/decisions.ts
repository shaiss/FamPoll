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
import { applyOutcome, closeRoundAndAdvance, lockOpenRound, logActivity, maybeCloseEarly, openRound, settleDueRounds } from "../lifecycle";
import { dateRangeTitle } from "../format";

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

/** Split a textarea into clean, de-duplicated option titles. */
function cleanOptions(raw: FormDataEntryValue[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    for (const line of String(v).split(/\r?\n/)) {
      const t = line.trim().slice(0, 80);
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Pairs of start/end inputs from a dates form, validated and titled. */
function cleanDateOptions(starts: FormDataEntryValue[], ends: FormDataEntryValue[]): { title: string; startsOn: string; endsOn: string }[] | string {
  const out: { title: string; startsOn: string; endsOn: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < starts.length; i++) {
    const a = String(starts[i] ?? "").trim();
    const b = String(ends[i] ?? "").trim() || a;
    if (!a && !String(ends[i] ?? "").trim()) continue;
    if (!dateRe.test(a) || !dateRe.test(b)) return "One of the dates doesn't look right.";
    if (b < a) return "An end date is before its start date.";
    const key = a + "|" + b;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: dateRangeTitle(a, b), startsOn: a, endsOn: b });
  }
  return out;
}

function revalidateDecision(decisionId: string, eventId: string) {
  revalidatePath(`/app/decisions/${decisionId}`);
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
}

export async function createDecision(formData: FormData) {
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/decisions/new`;
  const event = await loadEventForFamily(eventId, family.id);
  if (event.status !== "planning") fail(`/app/events/${eventId}`, "This event is closed. Reopen it to add decisions.");

  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  if (!title) fail(back, "What are we deciding? Give it a title.");
  const plan = planSchema.catch("quick").parse(formData.get("plan"));
  const roundHours = z.coerce.number().int().min(1).max(24 * 30).catch(72).parse(formData.get("roundHours"));
  const anyoneCanAddOptions = formData.getAll("anyoneCanAddOptions").map(String).includes("on");
  const setsEventDates = formData.get("setsEventDates") === "on";
  let optionRows: { title: string; startsOn: string | null; endsOn: string | null }[];
  if (setsEventDates) {
    const parsed = cleanDateOptions(formData.getAll("dateStart"), formData.getAll("dateEnd"));
    if (typeof parsed === "string") fail(back, parsed);
    optionRows = parsed;
  } else {
    optionRows = cleanOptions(formData.getAll("options")).map((t) => ({ title: t, startsOn: null, endsOn: null }));
  }

  if (plan === "quick" && optionRows.length < 2) fail(back, setsEventDates ? "A quick vote needs at least 2 date ranges." : "A quick vote needs at least 2 options, one per line.");
  if (plan === "shortlist_final" && optionRows.length < 3) fail(back, setsEventDates ? "A shortlist needs at least 3 date ranges, or use a quick vote." : "A shortlist needs at least 3 options, or use a quick vote.");

  const db = getDb();
  const decisionId = newId();
  await db.transaction(async (tx) => {
    const siblings = await tx.select({ id: schema.decisions.id }).from(schema.decisions).where(eq(schema.decisions.eventId, event.id));
    const [decision] = await tx
      .insert(schema.decisions)
      .values({ id: decisionId, eventId: event.id, title, position: siblings.length + 1, plan, roundHours, anyoneCanAddOptions, setsEventDates, createdByMemberId: member.id })
      .returning();
    const round = await openRound(tx, decision, roundSequence(plan)[0], 1, new Date());
    if (optionRows.length) {
      await tx.insert(schema.options).values(optionRows.map((o) => ({ id: newId(), decisionId, title: o.title, startsOn: o.startsOn, endsOn: o.endsOn, addedByMemberId: member.id, addedInRoundId: round.id })));
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
  let title = String(formData.get("title") ?? "").trim().slice(0, 80);
  let startsOn: string | null = null;
  let endsOn: string | null = null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 140) || null;
  if (decision.setsEventDates) {
    const parsed = cleanDateOptions([formData.get("dateStart") ?? ""], [formData.get("dateEnd") ?? ""]);
    if (typeof parsed === "string") fail(back, parsed);
    if (parsed.length === 0) fail(back, "Pick the dates first.");
    ({ title, startsOn, endsOn } = parsed[0]);
  }
  if (!title) fail(back, "Type the idea first.");
  if (decision.status !== "open") fail(back, "This decision is closed.");
  if (decision.event.status !== "planning") fail(back, "This event is closed.");
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;

  const db = getDb();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    const round = open ? await lockOpenRound(tx, open.id) : null;
    if (!round) return void (problem = "No round is open right now.");
    if (round.kind === "final") return void (problem = "Ideas can't be added during the final.");
    if (round.kind === "shortlist" && !organizer) return void (problem = "Only the organizer can add ideas once the shortlist has started.");
    if (round.kind === "ideas" && !decision.anyoneCanAddOptions && !organizer) return void (problem = "The organizer is collecting ideas for this one.");
    const existing = await tx.query.options.findMany({ where: eq(schema.options.decisionId, decision.id) });
    if (existing.some((o) => o.title.toLowerCase() === title.toLowerCase())) return void (problem = "That idea is already on the list.");
    await tx.insert(schema.options).values({ id: newId(), decisionId: decision.id, title, note, startsOn, endsOn, addedByMemberId: member.id, addedInRoundId: round.id });
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "option_added", message: `${member.displayName} suggested "${title}".`, actorMemberId: member.id });
  });
  if (problem) fail(back, problem);
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

  if (decision.status !== "open") fail(back, "This decision is already settled.");
  if (decision.event.status !== "planning") fail(back, "This event is closed.");
  const seats = await seatsForUser(family.id, user.id);
  const seat = seats.find((s) => s.id === memberId);
  if (!seat) fail(back, "You can't vote from that seat.");
  if (round.kind === "ideas") fail(back, "Nobody votes during the ideas round.");
  if (optionIds.length === 0) fail(back, "Pick at least one.");
  if (optionIds.length > round.maxPicks) fail(back, `Pick up to ${round.maxPicks}.`);

  // Deadlines are settled in their own committed transaction first, so a
  // redirect below can never roll a close back.
  await settleDueRounds(family.id);

  const now = new Date();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const fresh = await lockOpenRound(tx, roundId);
    if (!fresh || isPastDeadline(fresh.closesAt, now)) return void (problem = "That round just closed.");
    const alive = await tx.query.options.findMany({ where: and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)) });
    const aliveIds = new Set(alive.map((o) => o.id));
    if (!optionIds.every((id) => aliveIds.has(id))) return void (problem = "One of those options is no longer in the running.");
    await tx.delete(schema.votes).where(and(eq(schema.votes.roundId, roundId), eq(schema.votes.memberId, memberId)));
    await tx.insert(schema.votes).values(optionIds.map((optionId) => ({ id: newId(), roundId, optionId, memberId, castByUserId: user.id })));
    await maybeCloseEarly(tx, fresh, family.id, now);
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

async function requireOrganizer(decisionId: string) {
  const { family, member } = await requireMembership();
  const decision = await loadDecisionForFamily(decisionId, family.id);
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  if (!organizer) fail(`/app/decisions/${decisionId}`, "Only the organizer, or whoever asked this, can do that.");
  return { family, member, decision };
}

export async function closeRoundNow(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled.");
  const db = getDb();
  let closed = false;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    if (!open) return;
    closed = (await closeRoundAndAdvance(tx, open.id, "organizer", new Date())) !== null;
  });
  if (!closed) fail(back, "No round is open.");
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** Give the open round a fresh deadline. */
export async function extendRound(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled.");
  const db = getDb();
  const now = new Date();
  let extended = false;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    const round = open ? await lockOpenRound(tx, open.id) : null;
    if (!round) return;
    await tx.update(schema.rounds).set({ closesAt: closesAtFrom(now, decision.roundHours) }).where(eq(schema.rounds.id, round.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "round_extended", message: `${member.displayName} gave round ${round.number} more time.`, actorMemberId: member.id });
    extended = true;
  });
  if (!extended) fail(back, "No round is open to extend.");
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/**
 * Reopen the most recently closed round. A round that opened after it (the
 * auto-started next round) is discarded along with its votes, eliminations made
 * by the reopened round are undone, and any outcome is cleared.
 */
export async function reopenRound(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.event.status !== "planning") fail(back, "This event is closed.");
  const db = getDb();
  const now = new Date();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const all = await tx.select().from(schema.rounds).where(eq(schema.rounds.decisionId, decision.id)).orderBy(desc(schema.rounds.number)).for("update");
    const target = all.find((r) => r.status === "closed");
    if (!target) return void (problem = "Nothing to reopen yet.");
    const later = all.filter((r) => r.number > target.number);
    if (later.some((r) => r.status === "closed")) return void (problem = "Only the last closed round can be reopened.");
    const laterIds = later.map((r) => r.id);
    if (laterIds.length) {
      await tx.update(schema.options).set({ addedInRoundId: target.id }).where(inArray(schema.options.addedInRoundId, laterIds));
      await tx.delete(schema.rounds).where(inArray(schema.rounds.id, laterIds));
    }
    await tx.update(schema.options).set({ eliminatedInRoundId: null }).where(eq(schema.options.eliminatedInRoundId, target.id));
    await tx
      .update(schema.rounds)
      .set({ status: "open", closedAt: null, closeReason: null, tied: false, closesAt: closesAtFrom(now, decision.roundHours) })
      .where(eq(schema.rounds.id, target.id));
    await tx.update(schema.decisions).set({ status: "open", outcomeOptionId: null, decidedAt: null }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, {
      eventId: decision.eventId,
      decisionId: decision.id,
      kind: "round_reopened",
      message: `${member.displayName} reopened round ${target.number}${decision.outcomeOptionId ? " and cleared the outcome" : ""}.`,
      actorMemberId: member.id,
    });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** The organizer settles it by hand: breaks a tie, or just calls it. */
export async function pickWinner(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const optionId = z.string().parse(formData.get("optionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled. Reopen it first.");
  const db = getDb();
  const now = new Date();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const option = await tx.query.options.findFirst({
      where: and(eq(schema.options.id, optionId), eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)),
    });
    if (!option) return void (problem = "That option isn't in the running.");
    await tx
      .update(schema.rounds)
      .set({ status: "closed", closedAt: now, closeReason: "organizer", tied: false })
      .where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")));
    await tx.update(schema.rounds).set({ tied: false }).where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.tied, true)));
    await tx.update(schema.decisions).set({ status: "decided", outcomeOptionId: optionId, decidedAt: now }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "decided", message: `${decision.title} decided: ${option.title}. ${member.displayName} called it.`, actorMemberId: member.id });
    await applyOutcome(tx, decision, optionId);
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** After a tied final: one more final, just between the tied options. */
export async function tiebreak(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled.");
  const db = getDb();
  const now = new Date();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const [last] = await tx.select().from(schema.rounds).where(eq(schema.rounds.decisionId, decision.id)).orderBy(desc(schema.rounds.number)).limit(1).for("update");
    if (!last || last.status !== "closed" || !last.tied) return void (problem = "There is no tie to break.");
    const alive = await tx.query.options.findMany({
      where: and(eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)),
      orderBy: [asc(schema.options.createdAt)],
    });
    const votes = await tx.query.votes.findMany({ where: eq(schema.votes.roundId, last.id) });
    const result = resolveFinal(tally(alive.map((o) => o.id), votes));
    if (result.tiedIds.length < 2) return void (problem = "There is no tie to break.");
    await tx.update(schema.rounds).set({ tied: false }).where(eq(schema.rounds.id, last.id));
    await openRound(tx, decision, "final", last.number + 1, now, { optionIds: result.tiedIds, stampRoundId: last.id });
    await logActivity(tx, {
      eventId: decision.eventId,
      decisionId: decision.id,
      kind: "tiebreak",
      message: `${member.displayName} started a tiebreak between ${result.tiedIds.map((id) => alive.find((o) => o.id === id)?.title).join(" and ")}.`,
      actorMemberId: member.id,
    });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

export async function skipDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  if (decision.status !== "open") fail(`/app/decisions/${decisionId}`, "This decision is already settled.");
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.rounds)
      .set({ status: "closed", closedAt: now, closeReason: "organizer", tied: false })
      .where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")));
    await tx.update(schema.decisions).set({ status: "skipped" }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "skipped", message: `${member.displayName} set "${decision.title}" aside.`, actorMemberId: member.id });
  });
  revalidateDecision(decision.id, decision.eventId);
  redirect(`/app/events/${decision.eventId}`);
}

/** Organizer only: drop an option (and its votes) while ideas or a shortlist are open. */
export async function removeOption(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const optionId = z.string().parse(formData.get("optionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled.");
  const db = getDb();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    const round = open ? await lockOpenRound(tx, open.id) : null;
    if (!round) return void (problem = "Options can only be removed while a round is open.");
    if (round.kind === "final") return void (problem = "Options can't be removed during the final. Reopen the previous round instead.");
    const option = await tx.query.options.findFirst({ where: and(eq(schema.options.id, optionId), eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)) });
    if (!option) return void (problem = "That option isn't in the running.");
    await tx.delete(schema.options).where(eq(schema.options.id, option.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "option_removed", message: `${member.displayName} removed "${option.title}".`, actorMemberId: member.id });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

export async function renameDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, member } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  if (!title) fail(back, "Give it a title.");
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(schema.decisions).set({ title }).where(eq(schema.decisions.id, decision.id));
    if (title !== decision.title) await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "decision_renamed", message: `${member.displayName} renamed "${decision.title}" to "${title}".`, actorMemberId: member.id });
  });
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** Move a decision one step up or down in its event's order. */
export async function moveDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const direction = formData.get("direction") === "up" ? -1 : 1;
  const { decision } = await requireOrganizer(decisionId);
  const db = getDb();
  await db.transaction(async (tx) => {
    const siblings = await tx.select().from(schema.decisions).where(eq(schema.decisions.eventId, decision.eventId)).orderBy(asc(schema.decisions.position), asc(schema.decisions.createdAt)).for("update");
    const i = siblings.findIndex((d) => d.id === decision.id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= siblings.length) return;
    // Renumber the whole list so positions are always distinct and gapless.
    const order = siblings.map((d) => d.id);
    [order[i], order[j]] = [order[j], order[i]];
    for (let k = 0; k < order.length; k++) {
      await tx.update(schema.decisions).set({ position: k + 1 }).where(eq(schema.decisions.id, order[k]));
    }
  });
  revalidatePath(`/app/events/${decision.eventId}`);
  redirect(`/app/events/${decision.eventId}`);
}

