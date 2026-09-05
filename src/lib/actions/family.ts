"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembership, requireMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { fail } from "../flash";
import { newCode, newId } from "../ids";

const MAX_PROXIES_PER_PERSON = 4;

function cleanName(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim().slice(0, 60);
  return t.length ? t : null;
}

export async function createFamily(formData: FormData) {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/app");
  const name = cleanName(formData.get("name"));
  if (!name) fail("/app/family/new", "Give the family a name.");
  const db = getDb();
  await db.transaction(async (tx) => {
    const familyId = newId();
    await tx.insert(schema.families).values({ id: familyId, name, inviteCode: newCode() + newCode(), createdByUserId: user.id });
    await tx.insert(schema.members).values({ id: newId(), familyId, userId: user.id, displayName: user.name, role: "organizer" });
  });
  redirect("/app");
}

export async function joinFamily(formData: FormData) {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const fromLink = formData.get("fromLink") === "1";
  const back = fromLink ? `/join/${encodeURIComponent(code)}` : "/app/family/new";
  if (code.length < 4 || code.length > 40) fail(back, "That invite code doesn't look right.");
  const db = getDb();
  const family = await db.query.families.findFirst({ where: eq(schema.families.inviteCode, code) });
  if (!family) fail(back, "That invite link is not valid any more. Ask for a fresh one.");
  const existing = await getMembership(user.id);
  if (existing && existing.family.id === family.id) redirect("/app");
  if (existing) fail(back, `You're already in ${existing.family.name}. One family per person for now.`);
  try {
    await db.insert(schema.members).values({ id: newId(), familyId: family.id, userId: user.id, displayName: user.name, role: "member" });
  } catch {
    // The unique index on user_id caught a concurrent join; whichever won is fine.
  }
  redirect("/app");
}

/** Add a seat for someone without an account (a kid, a grandparent). The adult who adds them votes for them. */
export async function addProxyMember(formData: FormData) {
  const { user, family } = await requireMembership();
  const displayName = cleanName(formData.get("displayName"));
  if (!displayName) fail("/app/family", "Give them a name.");
  const db = getDb();
  const members = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id) });
  if (members.some((m) => m.displayName.toLowerCase() === displayName.toLowerCase())) fail("/app/family", `There is already a ${displayName} here. Add a last initial.`);
  const mine = members.filter((m) => m.userId === null && m.managedByUserId === user.id).length;
  if (mine >= MAX_PROXIES_PER_PERSON) fail("/app/family", `You can vote for up to ${MAX_PROXIES_PER_PERSON} people. Ask another adult to add the rest.`);
  await db.insert(schema.members).values({ id: newId(), familyId: family.id, userId: null, managedByUserId: user.id, displayName, role: "member" });
  revalidatePath("/app/family");
}

export async function removeProxyMember(formData: FormData) {
  const { user, family, member } = await requireMembership();
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id), isNull(schema.members.userId)) });
  if (!target) fail("/app/family", "That seat is not a proxy seat.");
  if (target.managedByUserId !== user.id && member.role !== "organizer") fail("/app/family", "Only the person who added them, or an organizer, can remove a seat.");
  await db.delete(schema.members).where(eq(schema.members.id, memberId));
  revalidatePath("/app/family");
}

/** Organizer only: remove a signed-in member and the proxy seats they manage. */
export async function removeMember(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can remove people.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target) fail("/app/family", "That person is not in this family.");
  if (target.id === member.id) fail("/app/family", "You can't remove yourself.");
  if (target.role === "organizer") fail("/app/family", "Organizers can't be removed here.");
  await db.transaction(async (tx) => {
    if (target.userId) await tx.delete(schema.members).where(and(eq(schema.members.familyId, family.id), eq(schema.members.managedByUserId, target.userId)));
    await tx.delete(schema.members).where(eq(schema.members.id, target.id));
  });
  revalidatePath("/app/family");
}

/** Organizer only: a new invite link; the old one stops working immediately. */
export async function rotateInviteCode() {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can change the invite link.");
  await getDb().update(schema.families).set({ inviteCode: newCode() + newCode() }).where(eq(schema.families.id, family.id));
  revalidatePath("/app/family");
}

export async function renameFamily(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can rename the family.");
  const name = cleanName(formData.get("name"));
  if (!name) fail("/app/family", "Give the family a name.");
  await getDb().update(schema.families).set({ name }).where(eq(schema.families.id, family.id));
  revalidatePath("/app");
  revalidatePath("/app/family");
}
