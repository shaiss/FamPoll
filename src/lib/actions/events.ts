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
