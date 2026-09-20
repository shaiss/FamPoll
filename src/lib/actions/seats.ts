"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isLinkSeat, isOrganizer, membershipFor, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { fail } from "../flash";
import { newId } from "../ids";
import { logActivity } from "../lifecycle";
import { clearSeatSessionCookie, setSeatSessionToken } from "../seat";
import { getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { retireSeats } from "./family";

async function requireOrganizerInGroup(formData: FormData) {
  const user = await requireUser();
  const familyId = z.string().parse(formData.get("familyId"));
  const membership = await membershipFor(user.id, familyId);
  const t = await getMessages();
  if (!membership) fail("/app", t.errFamGroupGone);
  if (!isOrganizer(membership.member)) fail("/app/family", t.errFamOrganizerOnlyLinkSeats);
  return { user, ...membership };
}

function cleanName(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim().slice(0, 60);
  return t.length ? t : null;
}

export async function setNamedSeatsEnabled(formData: FormData) {
  const { family } = await requireOrganizerInGroup(formData);
  const enabled = formData.get("enabled") === "1";
  await getDb().update(schema.families).set({ namedSeatsEnabled: enabled }).where(eq(schema.families.id, family.id));
  revalidatePath("/app/family");
}

export async function addLinkSeat(formData: FormData) {
  const { family, member: actor } = await requireOrganizerInGroup(formData);
  const t = await getMessages();
  if (!family.namedSeatsEnabled) fail("/app/family", t.errFamLinkSeatsOff);
  const displayName = cleanName(formData.get("displayName"));
  if (!displayName) fail("/app/family", t.errFamLinkSeatNameRequired);
  const personalLinkToken = newId();
  const memberId = newId();
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.insert(schema.members).values({
      id: memberId,
      familyId: family.id,
      userId: null,
      managedByUserId: null,
      displayName,
      role: "member",
      linkSeat: true,
      personalLinkToken,
    });
    const event = await tx.query.events.findFirst({
      where: eq(schema.events.familyId, family.id),
      orderBy: (e, { desc }) => [desc(e.createdAt)],
      columns: { id: true },
    });
    if (event) {
      await logActivity(tx, {
        eventId: event.id,
        kind: "link_seat_added",
        message: interpolate(t.logLinkSeatAdded, { organizer: actor.displayName, name: displayName }),
        actorMemberId: actor.id,
      });
    }
  });
  revalidatePath("/app/family");
}

export async function rotatePersonalLink(formData: FormData) {
  const { family } = await requireOrganizerInGroup(formData);
  const memberId = z.string().parse(formData.get("memberId"));
  const t = await getMessages();
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target || !isLinkSeat(target)) fail("/app/family", t.errFamNotLinkSeat);
  const personalLinkToken = newId();
  await db
    .update(schema.members)
    .set({ personalLinkToken, seatSessionToken: null })
    .where(eq(schema.members.id, memberId));
  revalidatePath("/app/family");
}

export async function revokePersonalLink(formData: FormData) {
  const { family } = await requireOrganizerInGroup(formData);
  const memberId = z.string().parse(formData.get("memberId"));
  const t = await getMessages();
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target || !isLinkSeat(target)) fail("/app/family", t.errFamNotLinkSeat);
  await db.transaction(async (tx) => {
    await retireSeats(tx, [memberId]);
  });
  revalidatePath("/app/family");
}

/** POST from `/p/<token>`: stamp the seat cookie and open the ballot home. */
export async function claimPersonalLink(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim().toLowerCase();
  const t = await getMessages();
  const back = token ? `/p/${encodeURIComponent(token)}` : "/p";
  if (!token) fail(back, t.errSeatLinkInvalid);
  const db = getDb();
  const seat = await db.query.members.findFirst({
    where: eq(schema.members.personalLinkToken, token),
    with: { family: true },
  });
  if (!seat || !isLinkSeat(seat) || !seat.family.namedSeatsEnabled) fail(back, t.errSeatLinkInvalid);
  const seatSessionToken = newId();
  await db.update(schema.members).set({ seatSessionToken }).where(eq(schema.members.id, seat.id));
  const event = await db.query.events.findFirst({
    where: eq(schema.events.familyId, seat.familyId),
    orderBy: (e, { desc }) => [desc(e.createdAt)],
    columns: { id: true },
  });
  if (event) {
    await logActivity(getDb(), {
      eventId: event.id,
      kind: "seat_claimed",
      message: interpolate(t.logSeatClaimed, { name: seat.displayName }),
      actorMemberId: seat.id,
    });
  }
  await setSeatSessionToken(seatSessionToken);
  redirect("/seat");
}

export async function clearSeatSession() {
  await clearSeatSessionCookie();
  redirect("/p");
}
