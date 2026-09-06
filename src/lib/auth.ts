import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "./db";
import { hasClerk, hasDatabase } from "./env";
import { getActiveGroupId } from "./group";
import type { Family, Member, User } from "./db/schema";

/**
 * Resolves the signed-in person and makes sure a matching `users` row exists.
 * Redirects to sign-in when signed out, and to /setup when the app is not
 * configured yet, so pages never have to handle either case themselves.
 */
export async function requireUser(): Promise<User> {
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (existing) return existing;

  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? cu?.emailAddresses?.[0]?.emailAddress ?? null;
  const name = cu?.fullName || cu?.firstName || cu?.username || (email ? email.split("@")[0] : "Someone");
  const [row] = await db
    .insert(schema.users)
    .values({ id: userId, name, imageUrl: cu?.imageUrl ?? null, email })
    .onConflictDoUpdate({ target: schema.users.id, set: { name, imageUrl: cu?.imageUrl ?? null, email } })
    .returning();
  return row;
}

export type Membership = { member: Member; family: Family };

/** Every group this person holds a signed-in seat in, oldest first (the switcher's order). */
export async function getMemberships(userId: string): Promise<Membership[]> {
  const db = getDb();
  const rows = await db.query.members.findMany({
    where: eq(schema.members.userId, userId),
    with: { family: true },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  return rows.map(({ family, ...member }) => ({ member: member as Member, family }));
}

/** This person's seat in one specific group, or null if they aren't in it. */
export async function membershipFor(userId: string, familyId: string): Promise<Membership | null> {
  const db = getDb();
  const member = await db.query.members.findFirst({
    where: and(eq(schema.members.userId, userId), eq(schema.members.familyId, familyId)),
    with: { family: true },
  });
  if (!member) return null;
  const { family, ...rest } = member;
  return { member: rest as Member, family };
}

/** Pick the active group from a set of memberships: the cookie's group, else the first. */
export function pickActive(memberships: Membership[], activeId: string | null): Membership | null {
  if (memberships.length === 0) return null;
  return memberships.find((m) => m.family.id === activeId) ?? memberships[0];
}

/**
 * The person's active group (the one the switcher last selected), else their
 * first. Null when they belong to no group. Used by the front door and invite
 * flows that only need "are they in a group, and which".
 */
export async function getMembership(userId: string): Promise<Membership | null> {
  const [memberships, activeId] = await Promise.all([getMemberships(userId), getActiveGroupId()]);
  return pickActive(memberships, activeId);
}

export type ActiveMembership = { user: User; member: Member; family: Family; memberships: Membership[] };

/**
 * The signed-in person plus their active group. `memberships` carries every
 * group they are in, so a page can render the group switcher. Redirects to
 * onboarding when they belong to no group yet.
 */
export async function requireMembership(): Promise<ActiveMembership> {
  const user = await requireUser();
  const [memberships, activeId] = await Promise.all([getMemberships(user.id), getActiveGroupId()]);
  if (memberships.length === 0) redirect("/app/family/new");
  const active = pickActive(memberships, activeId)!;
  return { user, member: active.member, family: active.family, memberships };
}

/**
 * Every seat this person can vote from in a group: their own, plus any
 * proxy members (kids, a grandparent without a phone) they manage.
 */
export async function seatsForUser(familyId: string, userId: string): Promise<Member[]> {
  const db = getDb();
  return db.query.members.findMany({
    where: and(
      eq(schema.members.familyId, familyId),
      or(eq(schema.members.userId, userId), eq(schema.members.managedByUserId, userId)),
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

export function isOrganizer(member: Member): boolean {
  return member.role === "organizer";
}
