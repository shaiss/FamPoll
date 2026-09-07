"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { membershipFor, requireMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { roundSequence } from "../engine/rounds";
import { fail } from "../flash";
import { newCode, newId } from "../ids";
import { logActivity, openRound } from "../lifecycle";
import { getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";

const kinds = ["trip", "outing", "meal", "party", "other"] as const;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Load an event and the acting person's seat in the event's own group. Editing
 * an event resolves membership from the event, not the active group, so an event
 * in any group the person belongs to can be managed whichever group is active.
 */
async function loadEventAndMembership(eventId: string) {
  const user = await requireUser();
  const event = await getDb().query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) return null;
  const membership = await membershipFor(user.id, event.familyId);
  if (!membership) return null;
  return { user, event, member: membership.member, family: membership.family };
}

export async function createEvent(formData: FormData) {
  const { family, member } = await requireMembership();
  const t = await getMessages();
  const back = "/app/events/new";
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) fail(back, t.errDecEventNameRequired);
  const kind = z.enum(kinds).catch("other").parse(formData.get("kind"));
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  if ((startsOn && !dateRe.test(startsOn)) || (endsOn && !dateRe.test(endsOn))) fail(back, t.errDecEventDateInvalid);
  if (startsOn && endsOn && endsOn < startsOn) fail(back, t.errDecEventEndBeforeStart);

  const db = getDb();
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(schema.events).values({ id, familyId: family.id, title, kind, startsOn, endsOn, shareToken: newCode() + newCode(), createdByMemberId: member.id });
    await logActivity(tx, { eventId: id, kind: "event_created", message: interpolate(t.errDecLogEventStarted, { actor: member.displayName, title }), actorMemberId: member.id });
  });
  redirect(`/app/events/${id}`);
}

export async function setEventStatus(formData: FormData) {
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}`;
  const status = z.enum(["planning", "done", "archived"]).catch("planning").parse(formData.get("status"));
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", t.errDecEventGone);
  const { event, member } = loaded;
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(back, t.errDecOnlyOrganizerChange);
  await getDb().update(schema.events).set({ status }).where(eq(schema.events.id, eventId));
  revalidatePath(back);
  revalidatePath("/app");
}

export async function updateEvent(formData: FormData) {
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/edit`;
  const db = getDb();
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", t.errDecEventGone);
  const { event, member } = loaded;
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(`/app/events/${eventId}`, t.errDecOnlyOrganizerEdit);
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) fail(back, t.errDecEventNameRequired);
  const kind = z.enum(kinds).catch(event.kind).parse(formData.get("kind"));
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  if ((startsOn && !dateRe.test(startsOn)) || (endsOn && !dateRe.test(endsOn))) fail(back, t.errDecEventDateInvalid);
  if (startsOn && endsOn && endsOn < startsOn) fail(back, t.errDecEventEndBeforeStart);
  await db.transaction(async (tx) => {
    await tx.update(schema.events).set({ title, kind, startsOn, endsOn }).where(eq(schema.events.id, eventId));
    const changes: string[] = [];
    if (title !== event.title) changes.push(interpolate(t.errDecChangeRenamedTo, { title }));
    if (startsOn !== event.startsOn || endsOn !== event.endsOn) changes.push(startsOn ? interpolate(t.errDecChangeSetDates, { startsOn, endRange: endsOn ? interpolate(t.errDecDateToRange, { endsOn }) : "" }) : t.errDecChangeClearedDates);
    if (changes.length) await logActivity(tx, { eventId, kind: "event_updated", message: interpolate(t.errDecLogEventUpdated, { actor: member.displayName, changes: changes.join(" and ") }), actorMemberId: member.id });
  });
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  redirect(`/app/events/${eventId}`);
}

/** Organizer or creator: mint a fresh public summary token; the old /s/<token> link stops working. */
export async function rotateShareToken(formData: FormData) {
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", t.errDecEventGone);
  const { event, member } = loaded;
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(`/app/events/${eventId}`, t.errDecOnlyOrganizerChange);
  await getDb().update(schema.events).set({ shareToken: newCode() + newCode() }).where(eq(schema.events.id, eventId));
  revalidatePath(`/app/events/${eventId}`);
  redirect(`/app/events/${eventId}/edit`);
}

/**
 * "Start from a past event": clone the event and its decisions' definitions and
 * options into a fresh event in the same group, each decision set aside so the
 * organizer opens them when ready. Dates are cleared and no rounds or votes copy.
 */
export async function duplicateEvent(formData: FormData) {
  const t = await getMessages();
  const sourceId = z.string().parse(formData.get("eventId"));
  const loaded = await loadEventAndMembership(sourceId);
  if (!loaded) fail("/app", t.errDecEventGone);
  const { event: source, member } = loaded;
  if (member.role !== "organizer" && source.createdByMemberId !== member.id) fail(`/app/events/${sourceId}`, t.errDecOnlyOrganizerEdit);
  const db = getDb();
  const id = newId();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(schema.events).values({
      id,
      familyId: source.familyId,
      title: interpolate(t.eventsCopyTitle, { title: source.title }).slice(0, 80),
      kind: source.kind,
      startsOn: null,
      endsOn: null,
      shareToken: newCode() + newCode(),
      createdByMemberId: member.id,
    });
    await logActivity(tx, { eventId: id, kind: "event_created", message: interpolate(t.errDecLogEventStartedFrom, { actor: member.displayName, title: source.title }), actorMemberId: member.id });
    const decisions = await tx.query.decisions.findMany({ where: eq(schema.decisions.eventId, source.id), orderBy: [asc(schema.decisions.position), asc(schema.decisions.createdAt)] });
    let position = 0;
    for (const d of decisions) {
      position++;
      const decisionId = newId();
      const [copy] = await tx
        .insert(schema.decisions)
        .values({
          id: decisionId,
          eventId: id,
          title: d.title,
          position,
          plan: d.plan,
          format: d.format,
          voteType: d.voteType,
          picks: d.picks,
          advanceCount: d.advanceCount,
          roundHours: d.roundHours,
          anyoneCanAddOptions: d.anyoneCanAddOptions,
          setsEventDates: d.setsEventDates,
          anonymous: d.anonymous,
          eligibilityScope: d.eligibilityScope,
          rankedFinal: d.rankedFinal,
          remindOrganizer: d.remindOrganizer,
          // Set aside so a duplicated event doesn't open every vote at once; the organizer brings each back.
          status: "skipped",
          createdByMemberId: member.id,
        })
        .returning();
      // A set-aside decision still needs a round to reopen from (unskip reopens the last round).
      const round = await openRound(tx, copy, roundSequence(d.plan)[0], 1, now);
      await tx.update(schema.rounds).set({ status: "closed", closedAt: now, closeReason: "organizer" }).where(eq(schema.rounds.id, round.id));
      const options = await tx.query.options.findMany({ where: eq(schema.options.decisionId, d.id), orderBy: [asc(schema.options.createdAt)] });
      if (options.length) {
        await tx.insert(schema.options).values(
          options.map((o) => ({ id: newId(), decisionId, title: o.title, note: o.note, startsOn: o.startsOn, endsOn: o.endsOn, addedByMemberId: member.id, anonymous: o.anonymous, addedInRoundId: round.id })),
        );
      }
    }
  });
  revalidatePath("/app");
  redirect(`/app/events/${id}`);
}

/** Organizer only. Removes the event and everything under it. */
export async function deleteEvent(formData: FormData) {
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", t.errDecEventGone);
  const { member } = loaded;
  if (member.role !== "organizer") fail(`/app/events/${eventId}`, t.errDecOnlyOrganizerDeleteEvent);
  if (formData.get("confirm") !== "on") fail(`/app/events/${eventId}/edit`, t.errDecTickToDeleteEvent);
  await getDb().delete(schema.events).where(eq(schema.events.id, eventId));
  revalidatePath("/app");
  redirect("/app");
}
