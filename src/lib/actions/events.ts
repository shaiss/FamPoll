"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { membershipFor, requireMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { fail } from "../flash";
import { newCode, newId } from "../ids";
import { logActivity } from "../lifecycle";

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
  const back = "/app/events/new";
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) fail(back, "Give the event a name.");
  const kind = z.enum(kinds).catch("other").parse(formData.get("kind"));
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  if ((startsOn && !dateRe.test(startsOn)) || (endsOn && !dateRe.test(endsOn))) fail(back, "That date doesn't look right.");
  if (startsOn && endsOn && endsOn < startsOn) fail(back, "The end date is before the start date.");

  const db = getDb();
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(schema.events).values({ id, familyId: family.id, title, kind, startsOn, endsOn, shareToken: newCode() + newCode(), createdByMemberId: member.id });
    await logActivity(tx, { eventId: id, kind: "event_created", message: `${member.displayName} started ${title}.`, actorMemberId: member.id });
  });
  redirect(`/app/events/${id}`);
}

export async function setEventStatus(formData: FormData) {
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}`;
  const status = z.enum(["planning", "done", "archived"]).catch("planning").parse(formData.get("status"));
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", "That event is gone.");
  const { event, member } = loaded;
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(back, "Only the organizer can change this.");
  await getDb().update(schema.events).set({ status }).where(eq(schema.events.id, eventId));
  revalidatePath(back);
  revalidatePath("/app");
}

export async function updateEvent(formData: FormData) {
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/edit`;
  const db = getDb();
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", "That event is gone.");
  const { event, member } = loaded;
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(`/app/events/${eventId}`, "Only the organizer can edit this.");
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  if (!title) fail(back, "Give the event a name.");
  const kind = z.enum(kinds).catch(event.kind).parse(formData.get("kind"));
  const startsOn = String(formData.get("startsOn") ?? "").trim() || null;
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  if ((startsOn && !dateRe.test(startsOn)) || (endsOn && !dateRe.test(endsOn))) fail(back, "That date doesn't look right.");
  if (startsOn && endsOn && endsOn < startsOn) fail(back, "The end date is before the start date.");
  await db.transaction(async (tx) => {
    await tx.update(schema.events).set({ title, kind, startsOn, endsOn }).where(eq(schema.events.id, eventId));
    const changes: string[] = [];
    if (title !== event.title) changes.push(`renamed it to "${title}"`);
    if (startsOn !== event.startsOn || endsOn !== event.endsOn) changes.push(startsOn ? `set the dates to ${startsOn}${endsOn ? ` to ${endsOn}` : ""}` : "cleared the dates");
    if (changes.length) await logActivity(tx, { eventId, kind: "event_updated", message: `${member.displayName} ${changes.join(" and ")}.`, actorMemberId: member.id });
  });
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
  redirect(`/app/events/${eventId}`);
}

/** Organizer only. Removes the event and everything under it. */
export async function deleteEvent(formData: FormData) {
  const eventId = z.string().parse(formData.get("eventId"));
  const loaded = await loadEventAndMembership(eventId);
  if (!loaded) fail("/app", "That event is gone.");
  const { member } = loaded;
  if (member.role !== "organizer") fail(`/app/events/${eventId}`, "Only an organizer can delete an event.");
  if (formData.get("confirm") !== "on") fail(`/app/events/${eventId}/edit`, "Tick the box to confirm you want to delete it.");
  await getDb().delete(schema.events).where(eq(schema.events.id, eventId));
  revalidatePath("/app");
  redirect("/app");
}
