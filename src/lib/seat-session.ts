import { and, eq, exists, isNull } from "drizzle-orm";
import { schema, type Db } from "./db";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Fields the claim write and rotation touch on a named link seat. */
export type LinkSeatClaimRow = {
  id: string;
  personalLinkToken: string | null;
  seatSessionToken: string | null;
  linkSeat: boolean;
  userId: string | null;
  managedByUserId: string | null;
  namedSeatsEnabled: boolean;
};

/**
 * Same seat-eligibility the `/p/` claim already checks, plus the presented
 * token still sitting on the row (so a concurrent rotate cannot win the race).
 */
export function linkSeatClaimWriteMatches(row: LinkSeatClaimRow, presentedToken: string): boolean {
  return (
    presentedToken.length > 0 &&
    row.personalLinkToken === presentedToken &&
    row.linkSeat &&
    row.userId === null &&
    row.managedByUserId === null &&
    row.namedSeatsEnabled
  );
}

/** Organizer rotate: new `/p/` token, drop any claimed seat cookie server-side. */
export function rotatePersonalLinkTokens<T extends { personalLinkToken: string | null; seatSessionToken: string | null }>(
  row: T,
  nextPersonalLinkToken: string,
): T {
  return { ...row, personalLinkToken: nextPersonalLinkToken, seatSessionToken: null };
}

/** Stamp a session only when `linkSeatClaimWriteMatches` still holds. */
export function stampSeatSessionIfCurrent(
  row: LinkSeatClaimRow,
  presentedToken: string,
  nextSeatSessionToken: string,
): LinkSeatClaimRow | null {
  if (!linkSeatClaimWriteMatches(row, presentedToken)) return null;
  return { ...row, seatSessionToken: nextSeatSessionToken };
}

/**
 * Lookup-then-write claim: the cookie is issued only when the stamp matched
 * the current token. A rotate between those steps leaves `cookie` null.
 */
export function attemptLinkSeatClaim(
  row: LinkSeatClaimRow,
  presentedToken: string,
  nextSeatSessionToken: string,
): { cookie: string | null; seat: LinkSeatClaimRow } {
  const next = stampSeatSessionIfCurrent(row, presentedToken, nextSeatSessionToken);
  if (!next) return { cookie: null, seat: row };
  return { cookie: nextSeatSessionToken, seat: next };
}

export function claimSeatSessionWhere(memberId: string, presentedToken: string) {
  return and(
    eq(schema.members.id, memberId),
    eq(schema.members.personalLinkToken, presentedToken),
    eq(schema.members.linkSeat, true),
    isNull(schema.members.userId),
    isNull(schema.members.managedByUserId),
  );
}

/**
 * One UPDATE: session token is written only if this member still holds the
 * presented personal-link token and is still a live named link seat.
 */
export async function stampSeatSessionIfLinkCurrent(
  db: Db | Tx,
  args: { memberId: string; presentedToken: string; seatSessionToken: string },
): Promise<boolean> {
  const rows = await db
    .update(schema.members)
    .set({ seatSessionToken: args.seatSessionToken })
    .where(
      and(
        claimSeatSessionWhere(args.memberId, args.presentedToken),
        exists(
          db
            .select({ id: schema.families.id })
            .from(schema.families)
            .where(and(eq(schema.families.id, schema.members.familyId), eq(schema.families.namedSeatsEnabled, true))),
        ),
      ),
    )
    .returning({ id: schema.members.id });
  return rows.length > 0;
}
