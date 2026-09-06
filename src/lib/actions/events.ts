"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMembership } from "../auth";
import { getDb, schema } from "../db";
import { fail } from "../flash";
import { newCode, newId } from "../ids";
import { logActivity } from "../lifecycle";
import { getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";

const kinds = ["trip", "outing", "meal", "party", "other"] as const;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

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
  const { family, member } = await requireMembership();
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}`;
  const status = z.enum(["planning", "done", "archived"]).catch("planning").parse(formData.get("status"));
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", t.errDecEventGone);
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(back, t.errDecOnlyOrganizerChange);
  await db.update(schema.events).set({ status }).where(eq(schema.events.id, eventId));
  revalidatePath(back);
  revalidatePath("/app");
}

export async function updateEvent(formData: FormData) {
  const { family, member } = await requireMembership();
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/edit`;
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", t.errDecEventGone);
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

/** Organizer only. Removes the event and everything under it. */
export async function deleteEvent(formData: FormData) {
  const { family, member } = await requireMembership();
  const t = await getMessages();
  const eventId = z.string().parse(formData.get("eventId"));
  if (member.role !== "organizer") fail(`/app/events/${eventId}`, t.errDecOnlyOrganizerDeleteEvent);
  if (formData.get("confirm") !== "on") fail(`/app/events/${eventId}/edit`, t.errDecTickToDeleteEvent);
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", t.errDecEventGone);
  await db.delete(schema.events).where(eq(schema.events.id, eventId));
  revalidatePath("/app");
  redirect("/app");
}
