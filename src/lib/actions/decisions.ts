"use server";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMembership, seatsForUser } from "../auth";
import { getDb, schema } from "../db";
import { closesAtFrom, effectivePicks, isPastDeadline, optionCountRule, optionTitleLimit, planRoundCount, plansFor, resolveFinal, roundSequence, tally, type Format, type Plan, type VoteType } from "../engine/rounds";
import { fail } from "../flash";
import { newId } from "../ids";
import { applyOutcome, closeRoundAndAdvance, lockOpenRound, logActivity, maybeCloseEarly, openRound, settleDueRounds } from "../lifecycle";
import { clipTitle, dateRangeTitle } from "../format";

const planSchema = z.enum(["quick", "shortlist_final", "ideas_shortlist_final"]);
const formatSchema = z.enum(["text", "long_text", "date"]);
const voteTypeSchema = z.enum(["ab", "single", "multi"]);

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

/**
 * Clean, de-duplicated option titles. Short text splits each field into lines;
 * long text keeps every field whole (a paragraph is one option).
 */
function cleanOptions(raw: FormDataEntryValue[], format: Format): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const limit = optionTitleLimit(format);
  for (const v of raw) {
    const pieces = format === "long_text" ? [String(v)] : String(v).split(/\r?\n/);
    for (const piece of pieces) {
      const t = piece.trim().slice(0, limit).trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  }
  return out;
}

/** The option title from an add/edit form, sized for the decision's format. */
function optionTitleFrom(formData: FormData, format: Format): string {
  return String(formData.get("title") ?? "").trim().slice(0, optionTitleLimit(format)).trim();
}

/** "needs at least 3 options" in the family's words, per format. */
function tooFewOptionsMessage(min: number, format: Format, voteType: VoteType, plan: Plan): string {
  const noun = format === "date" ? "date ranges" : "options";
  if (voteType === "ab") return `A or B needs exactly two different ${noun}.`;
  if (plan === "shortlist_final") return `A shortlist needs at least ${min} ${noun}, or use a quick vote.`;
  if (voteType === "multi") return `Pick several needs at least ${min} ${noun}, or switch to multiple choice.`;
  return `A quick vote needs at least ${min} ${noun}${format === "text" ? ", one per line" : ""}.`;
}

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Pairs of start/end inputs from a dates form, validated and titled. */
function cleanDateOptions(starts: FormDataEntryValue[], ends: FormDataEntryValue[]): { title: string; startsOn: string; endsOn: string }[] | string {
  const out: { title: string; startsOn: string; endsOn: string }[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < starts.length; i++) {
    const a = String(starts[i] ?? "").trim();
    const rawEnd = String(ends[i] ?? "").trim();
    const b = rawEnd || a;
    if (!a && !rawEnd) continue;
    if (!dateRe.test(a) || !dateRe.test(b)) return "One of the dates doesn't look right.";
    if (b < a) return "An end date is before its start date.";
    const key = a + "|" + b;
    if (seen.has(key)) continue;
    seen.add(key);
    // Pass null (not the start date) for a blank end so a single day titles as "Jul 11", not "Jul 11–11".
    out.push({ title: dateRangeTitle(a, rawEnd || null), startsOn: a, endsOn: b });
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
  const format = formatSchema.catch("text").parse(formData.get("format"));
  const voteType = voteTypeSchema.catch("single").parse(formData.get("voteType"));
  const picks = z.coerce.number().int().min(2).max(4).catch(2).parse(formData.get("picks"));
  const anonymous = formData.get("anonymous") === "on";
  const requestedPlan = planSchema.catch("quick").parse(formData.get("plan"));
  // A or B is settled in one round, whatever the form sent.
  const plan: Plan = plansFor(voteType).includes(requestedPlan) ? requestedPlan : "quick";
  const roundHours = z.coerce.number().int().min(1).max(24 * 30).catch(72).parse(formData.get("roundHours"));
  // "Tonight": the browser sends an absolute time for round 1; later rounds use roundHours.
  const closesAtRaw = String(formData.get("closesAtIso") ?? "").trim();
  let firstClosesAt: Date | undefined;
  if (closesAtRaw) {
    const d = new Date(closesAtRaw);
    const nowMs = Date.now();
    if (Number.isNaN(d.getTime()) || d.getTime() < nowMs + 10 * 60 * 1000 || d.getTime() > nowMs + 31 * 24 * 60 * 60 * 1000) fail(back, "That deadline doesn't look right.");
    firstClosesAt = d;
  }
  // A or B keeps its two options: nobody adds a third.
  const anyoneCanAddOptions = voteType !== "ab" && formData.getAll("anyoneCanAddOptions").map(String).includes("on");
  const setsEventDates = format === "date" && formData.get("setsEventDates") === "on";
  let optionRows: { title: string; startsOn: string | null; endsOn: string | null }[];
  if (format === "date") {
    const parsed = cleanDateOptions(formData.getAll("dateStart"), formData.getAll("dateEnd"));
    if (typeof parsed === "string") fail(back, parsed);
    optionRows = parsed;
  } else {
    optionRows = cleanOptions(formData.getAll("options"), format).map((t) => ({ title: t, startsOn: null, endsOn: null }));
  }

  const rule = optionCountRule(voteType, plan);
  if (optionRows.length < rule.min) fail(back, tooFewOptionsMessage(rule.min, format, voteType, plan));
  if (rule.max !== null && optionRows.length > rule.max) fail(back, voteType === "ab" ? "A or B is just two options. Use multiple choice for more." : "Too many options.");

  const db = getDb();
  const decisionId = newId();
  await db.transaction(async (tx) => {
    const siblings = await tx.select({ id: schema.decisions.id }).from(schema.decisions).where(eq(schema.decisions.eventId, event.id));
    const [decision] = await tx
      .insert(schema.decisions)
      .values({ id: decisionId, eventId: event.id, title, position: siblings.length + 1, plan, format, voteType, picks, anonymous, roundHours, anyoneCanAddOptions, setsEventDates, createdByMemberId: member.id })
      .returning();
    const round = await openRound(tx, decision, roundSequence(plan)[0], 1, new Date(), undefined, firstClosesAt);
    if (optionRows.length) {
      // An anonymous question's own options are anonymous too, or the bylines would name the asker.
      await tx.insert(schema.options).values(optionRows.map((o) => ({ id: newId(), decisionId, title: o.title, startsOn: o.startsOn, endsOn: o.endsOn, addedByMemberId: member.id, anonymous, addedInRoundId: round.id })));
    }
    const rounds = planRoundCount(plan);
    await logActivity(tx, {
      eventId: event.id,
      decisionId,
      kind: "decision_created",
      message: `${anonymous ? "Someone" : member.displayName} opened "${title}" (${rounds === 1 ? "quick vote" : `${rounds} rounds`}).`,
      // The asker is still recorded on the decision; the log row stays unattributable.
      actorMemberId: anonymous ? null : member.id,
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
  let title = optionTitleFrom(formData, decision.format);
  let startsOn: string | null = null;
  let endsOn: string | null = null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 140) || null;
  if (decision.format === "date") {
    const parsed = cleanDateOptions([formData.get("dateStart") ?? ""], [formData.get("dateEnd") ?? ""]);
    if (typeof parsed === "string") fail(back, parsed);
    if (parsed.length === 0) fail(back, "Pick the dates first.");
    ({ title, startsOn, endsOn } = parsed[0]);
  }
  if (!title) fail(back, "Type the idea first.");
  if (decision.status !== "open") fail(back, "This decision is closed.");
  if (decision.event.status !== "planning") fail(back, "This event is closed.");
  if (decision.voteType === "ab") fail(back, "This is an A or B question, so it keeps its two options.");
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;

  const db = getDb();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    const round = open ? await lockOpenRound(tx, open.id) : null;
    if (!round) return void (problem = "No round is open right now.");
    // Anyone may add while the first round is open (a quick vote's only round, or an
    // opening ideas/shortlist round). Later shortlist and final rounds are curated.
    const firstRound = round.number === 1;
    if (!firstRound && round.kind === "final") return void (problem = "Options can't be added during the final. Reopen the previous round instead.");
    if (!firstRound && round.kind === "shortlist" && !organizer) return void (problem = "Only the organizer can add options once the shortlist has started.");
    if (!decision.anyoneCanAddOptions && !organizer) return void (problem = "The organizer is collecting ideas for this one.");
    const existing = await tx.query.options.findMany({ where: eq(schema.options.decisionId, decision.id) });
    if (existing.some((o) => o.title.toLowerCase() === title.toLowerCase())) return void (problem = "That idea is already on the list.");
    // A non-organizer who gets through a curated gate is the anonymous asker; naming them here would unmask them.
    const gated = (!firstRound && round.kind === "shortlist") || !decision.anyoneCanAddOptions;
    const anonymous = formData.get("anonymous") === "on" || (decision.anonymous && gated && member.role !== "organizer");
    await tx.insert(schema.options).values({ id: newId(), decisionId: decision.id, title, note, startsOn, endsOn, addedByMemberId: member.id, anonymous, addedInRoundId: round.id });
    await logActivity(tx, {
      eventId: decision.eventId,
      decisionId: decision.id,
      kind: "option_added",
      message: `${anonymous ? "Someone" : member.displayName} suggested "${clipTitle(title, decision.format)}".`,
      actorMemberId: anonymous ? null : member.id,
    });
  });
  if (problem) fail(back, problem);
  revalidatePath(back);
}

export async function castVote(formData: FormData) {
  const { user, family } = await requireMembership();
  const roundId = z.string().parse(formData.get("roundId"));
  const memberId = z.string().parse(formData.get("memberId"));
  const skip = formData.get("skip") === "1";
  // A hidden ballot: counted like any other, never shown by name.
  const hidden = formData.get("hidden") === "1";
  const optionIds = skip ? [] : [...new Set(formData.getAll("optionId").map(String))];
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
  if (!skip && optionIds.length === 0) fail(back, "Pick at least one, or skip.");

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
    // The cap depends on how many options are alive, so it is checked under the same
    // lock that addOption and removeOption take.
    const cap = effectivePicks(fresh.maxPicks, alive.length);
    if (optionIds.length > cap) return void (problem = cap === 1 ? "Pick one." : `Pick up to ${cap}.`);
    const before = await tx.select({ id: schema.votes.id }).from(schema.votes).where(and(eq(schema.votes.roundId, roundId), eq(schema.votes.memberId, memberId)));
    await tx.delete(schema.votes).where(and(eq(schema.votes.roundId, roundId), eq(schema.votes.memberId, memberId)));
    if (skip) {
      await tx.insert(schema.votes).values({ id: newId(), roundId, optionId: null, memberId, castByUserId: user.id, anonymous: hidden });
    } else {
      await tx.insert(schema.votes).values(optionIds.map((optionId) => ({ id: newId(), roundId, optionId, memberId, castByUserId: user.id, anonymous: hidden })));
    }
    if (seat.userId === null && before.length === 0) {
      const me = seats.find((s) => s.userId === user.id);
      await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "proxy_vote", message: `${me?.displayName ?? user.name} voted for ${seat.displayName}.`, actorMemberId: me?.id ?? null });
    }
    await maybeCloseEarly(tx, fresh, family.id, now);
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/**
 * Organizer powers belong to organizers and to whoever asked the question. A
 * non-organizer who gets through is therefore the asker, so on an anonymous
 * decision the log calls them "Whoever asked this" instead of naming them.
 */
async function requireOrganizer(decisionId: string) {
  const { family, member } = await requireMembership();
  const decision = await loadDecisionForFamily(decisionId, family.id);
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  if (!organizer) fail(`/app/decisions/${decisionId}`, "Only the organizer, or whoever asked this, can do that.");
  const veiled = decision.anonymous && member.role !== "organizer";
  const actorName = veiled ? "Whoever asked this" : member.displayName;
  // A veiled actor's log rows carry no member id either, so no later join can name them.
  const actorMemberId = veiled ? null : member.id;
  return { family, member, decision, actorName, actorMemberId };
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
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
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
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "round_extended", message: `${actorName} gave round ${round.number} more time.`, actorMemberId });
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
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
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
    // A round that closed because everyone voted would close again on the next page
    // load, so its ballots are cleared and everyone votes afresh. Other closes keep them.
    const clearVotes = target.closeReason === "everyone_voted";
    if (clearVotes) await tx.delete(schema.votes).where(eq(schema.votes.roundId, target.id));
    await tx
      .update(schema.rounds)
      .set({ status: "open", closedAt: null, closeReason: null, tied: false, closesAt: closesAtFrom(now, decision.roundHours) })
      .where(eq(schema.rounds.id, target.id));
    await tx.update(schema.decisions).set({ status: "open", outcomeOptionId: null, decidedAt: null }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, {
      eventId: decision.eventId,
      decisionId: decision.id,
      kind: "round_reopened",
      message: `${actorName} reopened round ${target.number}${decision.outcomeOptionId ? " and cleared the outcome" : ""}${clearVotes ? "; everyone votes again" : ""}.`,
      actorMemberId,
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
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
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
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "decided", message: `${decision.title} decided: ${clipTitle(option.title, decision.format)}. ${actorName} called it.`, actorMemberId });
    await applyOutcome(tx, decision, optionId);
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** After a tied final: one more final, just between the tied options. */
export async function tiebreak(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
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
    const result = resolveFinal(tally(alive.map((o) => o.id), votes.filter((v): v is typeof v & { optionId: string } => v.optionId !== null)));
    if (result.tiedIds.length < 2) return void (problem = "There is no tie to break.");
    await tx.update(schema.rounds).set({ tied: false }).where(eq(schema.rounds.id, last.id));
    await openRound(tx, decision, "final", last.number + 1, now, { optionIds: result.tiedIds, stampRoundId: last.id });
    await logActivity(tx, {
      eventId: decision.eventId,
      decisionId: decision.id,
      kind: "tiebreak",
      message: `${actorName} started a tiebreak between ${result.tiedIds.map((id) => clipTitle(alive.find((o) => o.id === id)?.title ?? "an option", decision.format)).join(" and ")}.`,
      actorMemberId,
    });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

export async function skipDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
  if (decision.status !== "open") fail(`/app/decisions/${decisionId}`, "This decision is already settled.");
  const db = getDb();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.rounds)
      .set({ status: "closed", closedAt: now, closeReason: "organizer", tied: false })
      .where(and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")));
    await tx.update(schema.decisions).set({ status: "skipped" }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "skipped", message: `${actorName} set "${decision.title}" aside.`, actorMemberId });
  });
  revalidateDecision(decision.id, decision.eventId);
  redirect(`/app/events/${decision.eventId}`);
}

/** Organizer only: drop an option (and its votes) while ideas or a shortlist are open. */
export async function removeOption(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const optionId = z.string().parse(formData.get("optionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "open") fail(back, "This decision is already settled.");
  if (decision.voteType === "ab") fail(back, "An A or B question keeps its two options. Fix one instead.");
  const db = getDb();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const open = await tx.query.rounds.findFirst({ where: and(eq(schema.rounds.decisionId, decision.id), eq(schema.rounds.status, "open")) });
    const round = open ? await lockOpenRound(tx, open.id) : null;
    if (!round) return void (problem = "Options can only be removed while a round is open.");
    if (round.number !== 1 && round.kind === "final") return void (problem = "Options can't be removed during the final. Reopen the previous round instead.");
    const option = await tx.query.options.findFirst({ where: and(eq(schema.options.id, optionId), eq(schema.options.decisionId, decision.id), isNull(schema.options.eliminatedInRoundId)) });
    if (!option) return void (problem = "That option isn't in the running.");
    // Ballots are sealed while the round is open but participation is public. Letting
    // the votes cascade would move whoever picked only this option from "voted" to
    // "waiting on", which names them. Their emptied ballot becomes a skip instead
    // (same caster, same hidden flag), so nothing visible moves.
    const roundVotes = await tx.select().from(schema.votes).where(eq(schema.votes.roundId, round.id));
    const emptied = roundVotes.filter((v) => v.optionId === option.id && !roundVotes.some((w) => w.memberId === v.memberId && w.optionId !== option.id));
    if (emptied.length) {
      await tx.insert(schema.votes).values(emptied.map((v) => ({ id: newId(), roundId: round.id, optionId: null, memberId: v.memberId, castByUserId: v.castByUserId, anonymous: v.anonymous })));
    }
    await tx.delete(schema.options).where(eq(schema.options.id, option.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "option_removed", message: `${actorName} removed "${clipTitle(option.title, decision.format)}".`, actorMemberId });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

export async function renameDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  if (!title) fail(back, "Give it a title.");
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(schema.decisions).set({ title }).where(eq(schema.decisions.id, decision.id));
    if (title !== decision.title) await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "decision_renamed", message: `${actorName} renamed "${decision.title}" to "${title}".`, actorMemberId });
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

/** Organizer only: delete a decision for good, behind a confirm. Its rounds, options, votes and log lines cascade away. */
export async function deleteDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (formData.get("confirm") !== "on") fail(back, "Tick the box to delete this decision for good.");
  const db = getDb();
  const eventId = decision.eventId;
  await db.transaction(async (tx) => {
    await tx.delete(schema.decisions).where(eq(schema.decisions.id, decision.id));
    // Keep positions gapless after the gap the delete leaves.
    const rest = await tx.select().from(schema.decisions).where(eq(schema.decisions.eventId, eventId)).orderBy(asc(schema.decisions.position), asc(schema.decisions.createdAt));
    for (let k = 0; k < rest.length; k++) await tx.update(schema.decisions).set({ position: k + 1 }).where(eq(schema.decisions.id, rest[k].id));
  });
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  redirect(`/app/events/${eventId}`);
}

/** Organizer only: bring a set-aside decision back by reopening its last round. */
export async function unskipDecision(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  if (decision.status !== "skipped") fail(back, "This decision isn't set aside.");
  if (decision.event.status !== "planning") fail(back, "This event is closed.");
  const db = getDb();
  const now = new Date();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const [last] = await tx.select().from(schema.rounds).where(eq(schema.rounds.decisionId, decision.id)).orderBy(desc(schema.rounds.number)).limit(1).for("update");
    if (!last) return void (problem = "There is no round to bring back.");
    await tx.update(schema.rounds).set({ status: "open", closedAt: null, closeReason: null, tied: false, closesAt: closesAtFrom(now, decision.roundHours) }).where(eq(schema.rounds.id, last.id));
    await tx.update(schema.decisions).set({ status: "open" }).where(eq(schema.decisions.id, decision.id));
    await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "unskipped", message: `${actorName} brought "${decision.title}" back.`, actorMemberId });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/** Organizer only: fix an option's title, note or dates in place (its id stays, so votes on it survive). */
export async function editOption(formData: FormData) {
  const decisionId = z.string().parse(formData.get("decisionId"));
  const optionId = z.string().parse(formData.get("optionId"));
  const { decision, actorName, actorMemberId } = await requireOrganizer(decisionId);
  const back = `/app/decisions/${decisionId}`;
  let title = optionTitleFrom(formData, decision.format);
  const note = String(formData.get("note") ?? "").trim().slice(0, 140) || null;
  let startsOn: string | null = null;
  let endsOn: string | null = null;
  if (decision.format === "date") {
    const parsed = cleanDateOptions([formData.get("dateStart") ?? ""], [formData.get("dateEnd") ?? ""]);
    if (typeof parsed === "string") fail(back, parsed);
    if (parsed.length === 0) fail(back, "Pick the dates first.");
    ({ title, startsOn, endsOn } = parsed[0]);
  }
  if (!title) fail(back, "Give the option a title.");
  const db = getDb();
  let problem: string | null = null;
  await db.transaction(async (tx) => {
    const option = await tx.query.options.findFirst({ where: and(eq(schema.options.id, optionId), eq(schema.options.decisionId, decision.id)) });
    if (!option) return void (problem = "That option isn't here.");
    const others = await tx.query.options.findMany({ where: eq(schema.options.decisionId, decision.id) });
    if (others.some((o) => o.id !== option.id && o.title.toLowerCase() === title.toLowerCase())) return void (problem = "Another option already has that name.");
    await tx.update(schema.options).set({ title, note, startsOn, endsOn }).where(eq(schema.options.id, option.id));
    // If the fixed option is the one that set the event's dates, keep those in step.
    if (decision.setsEventDates && decision.outcomeOptionId === option.id) await applyOutcome(tx, decision, option.id);
    if (title !== option.title) await logActivity(tx, { eventId: decision.eventId, decisionId: decision.id, kind: "option_edited", message: `${actorName} changed "${clipTitle(option.title, decision.format)}" to "${clipTitle(title, decision.format)}".`, actorMemberId });
  });
  if (problem) fail(back, problem);
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}

/**
 * Poker's "show your hand": after a round has closed, a seat that voted hidden
 * can put its name back on its ballot. One way only; there is no re-hiding once
 * the round is over, because the reveal has already been seen.
 */
export async function revealVotes(formData: FormData) {
  const { user, family } = await requireMembership();
  const roundId = z.string().parse(formData.get("roundId"));
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const round = await db.query.rounds.findFirst({ where: eq(schema.rounds.id, roundId) });
  if (!round) throw new Error("Round not found.");
  const decision = await loadDecisionForFamily(round.decisionId, family.id);
  const back = `/app/decisions/${decision.id}`;
  if (round.status !== "closed") fail(back, "You can show your hand once the round has closed.");
  const seats = await seatsForUser(family.id, user.id);
  if (!seats.some((s) => s.id === memberId)) fail(back, "That isn't your seat.");
  await db.update(schema.votes).set({ anonymous: false }).where(and(eq(schema.votes.roundId, roundId), eq(schema.votes.memberId, memberId)));
  revalidateDecision(decision.id, decision.eventId);
  redirect(back);
}
