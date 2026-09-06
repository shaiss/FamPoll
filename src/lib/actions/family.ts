"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { membershipFor, requireUser } from "../auth";
import { getDb, schema } from "../db";
import type { Tx } from "../lifecycle";
import { fail } from "../flash";
import { clearActiveGroupId, setActiveGroupId } from "../group";
import { newCode, newId } from "../ids";

const MAX_PROXIES_PER_PERSON = 4;

function cleanName(v: FormDataEntryValue | null): string | null {
  const t = String(v ?? "").trim().slice(0, 60);
  return t.length ? t : null;
}

/**
 * Resolve the acting person's seat in the group a People-page form names. Every
 * management action carries a hidden `familyId`, so it acts on that exact group
 * regardless of which group is currently active. Fails when they aren't in it.
 */
async function requireGroupMembership(formData: FormData) {
  const user = await requireUser();
  const familyId = z.string().parse(formData.get("familyId"));
  const membership = await membershipFor(user.id, familyId);
  if (!membership) fail("/app", "That group is gone.");
  return { user, member: membership.member, family: membership.family };
}

/**
 * Point every history row owned by `memberIds` at `heirMemberId` so those members
 * can be deleted without tripping the not-null / no-action foreign keys on events,
 * decisions, options and the activity log (retireSeats handles their ballots).
 * `heirMemberId` must be a seat that survives — an organizer of the same family.
 */
async function reassignHistory(tx: Tx, memberIds: string[], heirMemberId: string) {
  if (memberIds.length === 0) return;
  await tx.update(schema.events).set({ createdByMemberId: heirMemberId }).where(inArray(schema.events.createdByMemberId, memberIds));
  await tx.update(schema.decisions).set({ createdByMemberId: heirMemberId }).where(inArray(schema.decisions.createdByMemberId, memberIds));
  await tx.update(schema.options).set({ addedByMemberId: heirMemberId }).where(inArray(schema.options.addedByMemberId, memberIds));
  await tx.update(schema.activity).set({ actorMemberId: heirMemberId }).where(inArray(schema.activity.actorMemberId, memberIds));
}

/**
 * Remove seats from the group. Their ballots in rounds still open go with them
 * (they are no longer eligible, and "everyone voted" must not wait on them);
 * ballots in closed rounds stay, with member_id set null by the foreign key,
 * so a settled round's counts never shift and a hidden vote in it is never
 * given away by subtraction.
 */
async function retireSeats(tx: Tx, memberIds: string[]) {
  if (memberIds.length === 0) return;
  const open = await tx.select({ id: schema.rounds.id }).from(schema.rounds).where(eq(schema.rounds.status, "open"));
  if (open.length) {
    await tx.delete(schema.votes).where(and(inArray(schema.votes.memberId, memberIds), inArray(schema.votes.roundId, open.map((r) => r.id))));
  }
  await tx.delete(schema.members).where(inArray(schema.members.id, memberIds));
}

export async function createFamily(formData: FormData) {
  const user = await requireUser();
  const name = cleanName(formData.get("name"));
  if (!name) fail("/app/family/new", "Give the group a name.");
  const db = getDb();
  const familyId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(schema.families).values({ id: familyId, name, inviteCode: newCode() + newCode(), createdByUserId: user.id });
    await tx.insert(schema.members).values({ id: newId(), familyId, userId: user.id, displayName: user.name, role: "organizer" });
  });
  await setActiveGroupId(familyId);
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
  const existing = await membershipFor(user.id, family.id);
  if (!existing) {
    try {
      await db.insert(schema.members).values({ id: newId(), familyId: family.id, userId: user.id, displayName: user.name, role: "member" });
    } catch {
      // The unique index on (family_id, user_id) caught a concurrent join; whichever won is fine.
    }
  }
  await setActiveGroupId(family.id);
  redirect("/app");
}

/** Set which group is active (the switcher). */
export async function switchGroup(formData: FormData) {
  const user = await requireUser();
  const familyId = z.string().parse(formData.get("familyId"));
  const membership = await membershipFor(user.id, familyId);
  if (!membership) fail("/app", "You're not in that group.");
  await setActiveGroupId(familyId);
  revalidatePath("/app");
  redirect("/app");
}

/**
 * Add someone you already share a group with straight into this group. Organizer
 * only, and only for a person who holds a seat in one of your other groups — the
 * same "the family already knows them" trust that lets an organizer mint a proxy
 * seat. No invite link needed.
 */
export async function addExistingUserToGroup(formData: FormData) {
  const { user, family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can add people.");
  const targetUserId = z.string().parse(formData.get("userId"));
  if (targetUserId === user.id) fail("/app/family", "You're already here.");
  const db = getDb();
  const targetSeats = await db.query.members.findMany({ where: eq(schema.members.userId, targetUserId), columns: { familyId: true } });
  const targetFamilyIds = new Set(targetSeats.map((m) => m.familyId));
  if (targetFamilyIds.has(family.id)) {
    // Already a member here (perhaps added a moment ago).
    revalidatePath("/app/family");
    return;
  }
  const mySeats = await db.query.members.findMany({ where: eq(schema.members.userId, user.id), columns: { familyId: true } });
  const shareAGroup = mySeats.some((m) => m.familyId !== family.id && targetFamilyIds.has(m.familyId));
  if (!shareAGroup) fail("/app/family", "You can only add someone you already share a group with.");
  const targetUser = await db.query.users.findFirst({ where: eq(schema.users.id, targetUserId) });
  if (!targetUser) fail("/app/family", "That person isn't reachable any more.");
  const here = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id), columns: { displayName: true } });
  const taken = new Set(here.map((m) => m.displayName.toLowerCase()));
  let displayName = targetUser.name.slice(0, 60);
  if (taken.has(displayName.toLowerCase())) {
    let n = 2;
    while (taken.has(`${targetUser.name} ${n}`.toLowerCase())) n++;
    displayName = `${targetUser.name} ${n}`.slice(0, 60);
  }
  try {
    await db.insert(schema.members).values({ id: newId(), familyId: family.id, userId: targetUserId, displayName, role: "member" });
  } catch {
    // The unique index on (family_id, user_id) caught a concurrent add; that's fine.
  }
  revalidatePath("/app/family");
}

/**
 * Add a seat for someone without an account (a kid, a grandparent). The adult
 * who adds them votes for them. Organizers only: a signed-in kid must not be
 * able to mint extra votes, and organizer is the app's "adult" role.
 */
export async function addProxyMember(formData: FormData) {
  const { user, family, member } = await requireGroupMembership(formData);
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
  const { user, family, member } = await requireGroupMembership(formData);
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id), isNull(schema.members.userId)) });
  if (!target) fail("/app/family", "That seat is not a proxy seat.");
  if (target.managedByUserId !== user.id && member.role !== "organizer") fail("/app/family", "Only the person who added them, or an organizer, can remove a seat.");
  await db.transaction(async (tx) => retireSeats(tx, [target.id]));
  revalidatePath("/app/family");
}

/** Organizer only: remove a signed-in member and the proxy seats they manage. */
export async function removeMember(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can remove people.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target) fail("/app/family", "That person is not in this group.");
  if (target.id === member.id) fail("/app/family", "You can't remove yourself.");
  if (target.role === "organizer") fail("/app/family", "Organizers can't be removed here.");
  await db.transaction(async (tx) => {
    const managed = target.userId
      ? await tx.query.members.findMany({ where: and(eq(schema.members.familyId, family.id), eq(schema.members.managedByUserId, target.userId)) })
      : [];
    const goneIds = [target.id, ...managed.map((m) => m.id)];
    // Keep the record: their events, decisions, options and log lines move to the acting organizer.
    await reassignHistory(tx, goneIds, member.id);
    await retireSeats(tx, goneIds);
  });
  revalidatePath("/app/family");
}

/** Organizer only: make another signed-in adult an organizer too (the co-parent case). */
export async function makeOrganizer(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can do that.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target || !target.userId) fail("/app/family", "Only someone with an account can be an organizer.");
  await db.update(schema.members).set({ role: "organizer" }).where(eq(schema.members.id, target.id));
  revalidatePath("/app/family");
}

/** Organizer only: a new invite link; the old one stops working immediately. */
export async function rotateInviteCode(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can change the invite link.");
  await getDb().update(schema.families).set({ inviteCode: newCode() + newCode() }).where(eq(schema.families.id, family.id));
  revalidatePath("/app/family");
}

export async function renameFamily(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can rename the group.");
  const name = cleanName(formData.get("name"));
  if (!name) fail("/app/family", "Give the group a name.");
  await getDb().update(schema.families).set({ name }).where(eq(schema.families.id, family.id));
  revalidatePath("/app");
  revalidatePath("/app/family");
}

/**
 * Leave the group. If you are the only signed-in member, the group is deleted
 * outright (nobody is left to run it) — the cascade takes events, decisions and
 * the log with it. Otherwise your history moves to another organizer, and an
 * organizer can only leave once another organizer remains. Afterwards the active
 * group is forgotten, so home falls back to another group you belong to (or
 * onboarding when you have none left).
 */
export async function leaveFamily(formData: FormData) {
  const { user, family, member } = await requireGroupMembership(formData);
  const db = getDb();
  const all = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id) });
  const signedIn = all.filter((m) => m.userId !== null);
  if (signedIn.length <= 1) {
    // A lone member (typically a test group). Deleting the group cascades cleanly:
    // the no-action foreign keys are checked at statement end, by which point every
    // referencing row has gone too.
    await db.delete(schema.families).where(eq(schema.families.id, family.id));
    await clearActiveGroupId();
    redirect("/app");
  }
  const otherOrganizers = signedIn.filter((m) => m.id !== member.id && m.role === "organizer");
  if (member.role === "organizer" && otherOrganizers.length === 0) fail("/app/family", "Make someone else an organizer before you leave.");
  const heir = otherOrganizers[0] ?? signedIn.find((m) => m.id !== member.id)!;
  await db.transaction(async (tx) => {
    const managed = await tx.query.members.findMany({ where: and(eq(schema.members.familyId, family.id), eq(schema.members.managedByUserId, user.id)) });
    const goneIds = [member.id, ...managed.map((m) => m.id)];
    await reassignHistory(tx, goneIds, heir.id);
    await retireSeats(tx, goneIds);
  });
  await clearActiveGroupId();
  redirect("/app");
}

/** Organizer only: step someone (or yourself) down to a plain member. The last organizer can't. */
export async function demoteOrganizer(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can do that.");
  const memberId = z.string().parse(formData.get("memberId"));
  const db = getDb();
  await db.transaction(async (tx) => {
    // Lock this group's organizer rows so two concurrent demotions can't both
    // pass the count check and leave the group with nobody in charge.
    const organizers = await tx
      .select()
      .from(schema.members)
      .where(and(eq(schema.members.familyId, family.id), eq(schema.members.role, "organizer")))
      .for("update");
    const target = organizers.find((m) => m.id === memberId);
    if (!target) fail("/app/family", "They aren't an organizer.");
    if (organizers.length <= 1) fail("/app/family", "Make someone else an organizer first — a group needs one.");
    await tx.update(schema.members).set({ role: "member" }).where(eq(schema.members.id, target.id));
  });
  revalidatePath("/app/family");
}

/** Organizer only: hand a proxy seat (a kid, a grandparent) to another organizer to manage. */
export async function reassignProxy(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
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

/** Organizer only: delete the whole group, and everything in it, behind a confirm. */
export async function deleteFamily(formData: FormData) {
  const { family, member } = await requireGroupMembership(formData);
  if (member.role !== "organizer") fail("/app/family", "Only an organizer can delete the group.");
  if (formData.get("confirm") !== "on") fail("/app/family", "Tick the box to confirm you want to delete everything.");
  await getDb().delete(schema.families).where(eq(schema.families.id, family.id));
  await clearActiveGroupId();
  redirect("/app");
}

/** Your own display name, or (organizer) anyone's, proxies included. */
export async function renameMember(formData: FormData) {
  const { user, family, member } = await requireGroupMembership(formData);
  const memberId = z.string().parse(formData.get("memberId"));
  const displayName = cleanName(formData.get("displayName"));
  if (!displayName) fail("/app/family", "Give them a name.");
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target) fail("/app/family", "That person is not in this group.");
  if (target.userId !== user.id && member.role !== "organizer") fail("/app/family", "You can rename yourself; an organizer can rename anyone.");
  const members = await db.query.members.findMany({ where: eq(schema.members.familyId, family.id) });
  if (members.some((m) => m.id !== target.id && m.displayName.toLowerCase() === displayName.toLowerCase())) fail("/app/family", `There is already a ${displayName} here.`);
  await db.update(schema.members).set({ displayName }).where(eq(schema.members.id, target.id));
  revalidatePath("/app/family");
  revalidatePath("/app");
}

/**
 * "Hide my votes by default": every ballot this seat casts starts hidden. Your
 * own seat, or a proxy seat you vote for. Privacy is personal, so an organizer
 * cannot flip it for anyone else.
 */
export async function setVotePrivacy(formData: FormData) {
  const { user, family } = await requireGroupMembership(formData);
  const memberId = z.string().parse(formData.get("memberId"));
  const votesHidden = formData.get("votesHidden") === "1";
  const db = getDb();
  const target = await db.query.members.findFirst({ where: and(eq(schema.members.id, memberId), eq(schema.members.familyId, family.id)) });
  if (!target) fail("/app/family", "That person is not in this group.");
  if (target.userId !== user.id && target.managedByUserId !== user.id) fail("/app/family", "Only that person, or whoever votes for them, can change this.");
  await db.update(schema.members).set({ votesHidden }).where(eq(schema.members.id, target.id));
  revalidatePath("/app/family");
}
