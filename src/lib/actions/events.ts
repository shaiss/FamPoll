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

const kinds = ["trip", "outing", "meal", "party", "other"] as const;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

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
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}`;
  const status = z.enum(["planning", "done", "archived"]).catch("planning").parse(formData.get("status"));
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", "That event is gone.");
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) fail(back, "Only the organizer can change this.");
  await db.update(schema.events).set({ status }).where(eq(schema.events.id, eventId));
  revalidatePath(back);
  revalidatePath("/app");
}

export async function updateEvent(formData: FormData) {
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  const back = `/app/events/${eventId}/edit`;
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", "That event is gone.");
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
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  if (member.role !== "organizer") fail(`/app/events/${eventId}`, "Only an organizer can delete an event.");
  if (formData.get("confirm") !== "on") fail(`/app/events/${eventId}/edit`, "Tick the box to confirm you want to delete it.");
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, family.id)) });
  if (!event) fail("/app", "That event is gone.");
  await db.delete(schema.events).where(eq(schema.events.id, eventId));
  revalidatePath("/app");
  redirect("/app");
}
