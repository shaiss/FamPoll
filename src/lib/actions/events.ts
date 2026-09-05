"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMembership } from "../auth";
import { getDb, schema } from "../db";
import { newCode, newId } from "../ids";
import { logActivity } from "../lifecycle";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Give the event a name").max(80),
  kind: z.enum(["trip", "outing", "meal", "party", "other"]).default("other"),
  startsOn: z.string().trim().optional().transform((v) => (v ? v : null)),
  endsOn: z.string().trim().optional().transform((v) => (v ? v : null)),
});

export async function createEvent(formData: FormData) {
  const { family, member } = await requireMembership();
  const input = eventSchema.parse({
    title: formData.get("title"),
    kind: formData.get("kind") ?? "other",
    startsOn: formData.get("startsOn") ?? "",
    endsOn: formData.get("endsOn") ?? "",
  });
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
    throw new Error("The end date is before the start date.");
  }
  const db = getDb();
  const id = newId();
  await db.transaction(async (tx) => {
    await tx.insert(schema.events).values({
      id,
      familyId: family.id,
      title: input.title,
      kind: input.kind,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      shareToken: newCode() + newCode(),
      createdByMemberId: member.id,
    });
    await logActivity(tx, { eventId: id, kind: "event_created", message: `${member.displayName} started ${input.title}.`, actorMemberId: member.id });
  });
  redirect(`/app/events/${id}`);
}

export async function setEventStatus(formData: FormData) {
  const { family, member } = await requireMembership();
  const eventId = z.string().parse(formData.get("eventId"));
  const status = z.enum(["planning", "done", "archived"]).parse(formData.get("status"));
  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event || event.familyId !== family.id) throw new Error("Event not found.");
  if (member.role !== "organizer" && event.createdByMemberId !== member.id) throw new Error("Only the organizer can change this.");
  await db.update(schema.events).set({ status }).where(eq(schema.events.id, eventId));
  revalidatePath(`/app/events/${eventId}`);
  revalidatePath("/app");
}
