"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembership, requireMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { newCode, newId } from "../ids";

const nameSchema = z.string().trim().min(1, "Give it a name").max(60, "Keep it under 60 characters");

export async function createFamily(formData: FormData) {
  const user = await requireUser();
  const existing = await getMembership(user.id);
  if (existing) redirect("/app");
  const name = nameSchema.parse(formData.get("name"));
  const db = getDb();
  await db.transaction(async (tx) => {
    const familyId = newId();
    await tx.insert(schema.families).values({ id: familyId, name, inviteCode: newCode(), createdByUserId: user.id });
    await tx.insert(schema.members).values({
      id: newId(),
      familyId,
      userId: user.id,
      displayName: user.name,
      role: "organizer",
    });
  });
  redirect("/app");
}

export async function joinFamily(formData: FormData) {
  const user = await requireUser();
  const code = z.string().trim().min(4).max(20).parse(formData.get("code"));
  const db = getDb();
  const family = await db.query.families.findFirst({ where: eq(schema.families.inviteCode, code) });
  if (!family) throw new Error("That invite link is not valid any more.");
  const existing = await getMembership(user.id);
  if (existing && existing.family.id === family.id) redirect("/app");
  if (existing) throw new Error("You are already in a family. One family per person for now.");
  await db.insert(schema.members).values({
    id: newId(),
    familyId: family.id,
    userId: user.id,
    displayName: user.name,
    role: "member",
  });
  redirect("/app");
}

/** Add a seat for someone without an account (a kid, a grandparent). The adult who adds them votes for them. */
export async function addProxyMember(formData: FormData) {
  const { user, family } = await requireMembership();
  const displayName = nameSchema.parse(formData.get("displayName"));
  const db = getDb();
  await db.insert(schema.members).values({
    id: newId(),
    familyId: family.id,
    userId: null,
    managedByUserId: user.id,
    displayName,
    role: "member",
  });
  revalidatePath("/app/family");
}

export async function removeProxyMember(formData: FormData) {
  const { user, family, member } = await requireMembership();
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!target || target.familyId !== family.id || target.userId !== null) throw new Error("Not a proxy seat.");
  if (target.managedByUserId !== user.id && member.role !== "organizer") throw new Error("Only the person who added them, or an organizer, can remove a seat.");
  await db.delete(schema.members).where(eq(schema.members.id, memberId));
  revalidatePath("/app/family");
}

export async function renameFamily(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") throw new Error("Only an organizer can rename the family.");
  const name = nameSchema.parse(formData.get("name"));
  await getDb().update(schema.families).set({ name }).where(eq(schema.families.id, family.id));
  revalidatePath("/app");
}
