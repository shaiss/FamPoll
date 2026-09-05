"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembership, requireMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import type { Tx } from "../lifecycle";
import { fail } from "../flash";
import { newCode, newId } from "../ids";

const MAX_PROXIES_PER_PERSON = 4;

function cleanName(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim().slice(0, 60);
  return t.length ? t : null;
}

/**
 * Point every history row owned by `memberIds` at `heirMemberId` so those members
 * can be deleted without tripping the not-null / no-action foreign keys on events,
 * decisions, options and the activity log (their votes cascade away on delete).
 * `heirMemberId` must be a seat that survives — an organizer of the same family.
 */
async function reassignHistory(tx: Tx, memberIds: string[], heirMemberId: string) {
  if (memberIds.length === 0) return;
  await tx.update(schema.events).set({ createdByMemberId: heirMemberId }).where(inArray(schema.events.createdByMemberId, memberIds));
  await tx.update(schema.decisions).set({ createdByMemberId: heirMemberId }).where(inArray(schema.decisions.createdByMemberId, memberIds));
  await tx.update(schema.options).set({ addedByMemberId: heirMemberId }).where(inArray(schema.options.addedByMemberId, memberIds));
  await tx.update(schema.activity).set({ actorMemberId: heirMemberId }).where(inArray(schema.activity.actorMemberId, memberIds));
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

/**
 * Add a seat for someone without an account (a kid, a grandparent). The adult
 * who adds them votes for them. Organizers only: a signed-in kid must not be
 * able to mint extra votes, and organizer is the app's "adult" role.
 */
export async function addProxyMember(formData: FormData) {
  const { user, family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can add a seat for someone. Ask them to make you an organizer.");
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
    const managed = target.userId
      ? await tx.query.members.findMany({ where: and(eq(schema.members.familyId, family.id), eq(schema.members.managedByUserId, target.userId)) })
      : [];
    const goneIds = [target.id, ...managed.map((m) => m.id)];
    // Keep the record: their events, decisions, options and log lines move to the acting organizer.
    await reassignHistory(tx, goneIds, member.id);
    await tx.delete(schema.members).where(inArray(schema.members.id, goneIds));
  });
  revalidatePath("/app/family");
}

/** Organizer only: make another signed-in adult an organizer too (the co-parent case). */
export async function makeOrganizer(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can do that.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target || !target.userId) fail("/app/family", "Only someone with an account can be an organizer.");
  await db.update(schema.members).set({ role: "organizer" }).where(eq(schema.members.id, target.id));
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

/**
 * Leave the family. If you are the only signed-in member, the family is deleted
 * outright (nobody is left to run it) — the cascade takes events, decisions and
 * the log with it. Otherwise your history moves to another organizer, and an
 * organizer can only leave once another organizer remains.
 */
export async function leaveFamily() {
  const { user, family, member } = await requireMembership();
  const db = getDb();
  const all = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id) });
  const signedIn = all.filter((m) => m.userId !== null);
  if (signedIn.length <= 1) {
    // A lone member (typically a test family). Deleting the family cascades cleanly:
    // the no-action foreign keys are checked at statement end, by which point every
    // referencing row has gone too.
    await db.delete(schema.families).where(eq(schema.families.id, family.id));
    redirect("/app/family/new");
  }
  const otherOrganizers = signedIn.filter((m) => m.id !== member.id && m.role === "organizer");
  if (member.role === "organizer" && otherOrganizers.length === 0) fail("/app/family", "Make someone else an organizer before you leave.");
  const heir = otherOrganizers[0] ?? signedIn.find((m) => m.id !== member.id)!;
  await db.transaction(async (tx) => {
    const managed = await tx.query.members.findMany({ where: and(eq(schema.members.familyId, family.id), eq(schema.members.managedByUserId, user.id)) });
    const goneIds = [member.id, ...managed.map((m) => m.id)];
    await reassignHistory(tx, goneIds, heir.id);
    await tx.delete(schema.members).where(inArray(schema.members.id, goneIds));
  });
  redirect("/app/family/new");
}

/** Organizer only: step someone (or yourself) down to a plain member. The last organizer can't. */
export async function demoteOrganizer(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can do that.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  await db.transaction(async (tx) => {
    // Lock this family's organizer rows so two concurrent demotions can't both
    // pass the count check and leave the family with nobody in charge.
    const organizers = await tx
      .select()
      .from(schema.members)
      .where(and(eq(schema.members.familyId, family.id), eq(schema.members.role, "organizer")))
      .for("update");
    const target = organizers.find((m) => m.id === memberId);
    if (!target) fail("/app/family", "They aren't an organizer.");
    if (organizers.length <= 1) fail("/app/family", "Make someone else an organizer first — a family needs one.");
    await tx.update(schema.members).set({ role: "member" }).where(eq(schema.members.id, target.id));
  });
  revalidatePath("/app/family");
}

/** Organizer only: hand a proxy seat (a kid, a grandparent) to another organizer to manage. */
export async function reassignProxy(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can move a seat.");
  const memberId = z.string().parse(formData.get("memberId"));
  const toMemberId = z.string().parse(formData.get("toMemberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id), isNull(schema.members.userId)) });
  if (!target) fail("/app/family", "That seat is not a proxy seat.");
  const to = await db.query.members.findFirst({ where: and(eq(schema.members.id, toMemberId), eq(schema.members.familyId, family.id)) });
  if (!to || !to.userId || to.role !== "organizer") fail("/app/family", "Hand it to another organizer.");
  await db.update(schema.members).set({ managedByUserId: to.userId }).where(eq(schema.members.id, target.id));
  revalidatePath("/app/family");
}

/** Organizer only: delete the whole family, and everything in it, behind a confirm. */
export async function deleteFamily(formData: FormData) {
  const { family, member } = await requireMembership();
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can delete the family.");
  if (formData.get("confirm") !== "on") fail("/app/family", "Tick the box to confirm you want to delete everything.");
  await getDb().delete(schema.families).where(eq(schema.families.id, family.id));
  redirect("/app/family/new");
}

/** Your own display name, or (organizer) anyone's, proxies included. */
export async function renameMember(formData: FormData) {
  const { user, family, member } = await requireMembership();
  const memberId = z.string().parse(formData.get("memberId"));
  const displayName = cleanName(formData.get("displayName"));
  if (!displayName) fail("/app/family", "Give them a name.");
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target) fail("/app/family", "That person is not in this family.");
  if (target.userId !== user.id && member.role !== "organizer") fail("/app/family", "You can rename yourself; an organizer can rename anyone.");
  const members = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id) });
  if (members.some((m) => m.id !== target.id && m.displayName.toLowerCase() === displayName.toLowerCase())) fail("/app/family", `There is already a ${displayName} here.`);
  await db.update(schema.members).set({ displayName }).where(eq(schema.members.id, target.id));
  revalidatePath("/app/family");
  revalidatePath("/app");
}

