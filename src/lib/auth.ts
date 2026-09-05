import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "./db";
import { hasClerk, hasDatabase } from "./env";
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

/** The family this person belongs to. One family per person for now. */
export async function getMembership(userId: string): Promise<Membership | null> {
  const db = getDb();
  const member = await db.query.members.findFirst({
    where: eq(schema.members.userId, userId),
    with: { family: true },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
  if (!member) return null;
  const { family, ...rest } = member;
  return { member: rest as Member, family };
}

export async function requireMembership(): Promise<{ user: User } & Membership> {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/app/family/new");
  return { user, ...membership };
}

/**
 * Every seat this person can vote from in a family: their own, plus any
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
