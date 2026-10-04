import { interpolate, type Messages } from "./messages";

/** Where a ballot action sends the viewer after it finishes. */
export function decisionPagePath(mode: "user" | "seat", decisionId: string): string {
  return mode === "seat" ? `/seat/decisions/${decisionId}` : `/app/decisions/${decisionId}`;
}

/**
 * Who may act as `memberId` on a ballot action (vote, add an idea, show a hand).
 * A signed-in family member only wins when `memberId` is one of their seats;
 * otherwise the `fp_seat` cookie seat wins. A co-present Clerk member who is
 * not that seat must not steal attribution or block the cookie.
 */
export function ballotActorKind(input: {
  memberId: string;
  clerkSeatIds: readonly string[] | null;
  cookieSeatId: string | null;
}): "user" | "seat" | null {
  if (input.clerkSeatIds?.includes(input.memberId)) return "user";
  if (input.cookieSeatId === input.memberId) return "seat";
  return null;
}

/** "Eli (via Shai)" when someone else cast the vote; a departed seat keeps its ballot, not its name. */
export function voterDisplayName(
  v: { memberId: string | null; castByUserId: string | null },
  memberById: Map<string, { displayName: string; userId: string | null }>,
  casterName: Map<string, string>,
  t: Pick<Messages, "decisionvoterLeft" | "decisionviaCaster" | "decisioncasterFallback">,
): string {
  if (v.memberId === null) return t.decisionvoterLeft;
  const m = memberById.get(v.memberId);
  const name = m?.displayName ?? "?";
  if (!m || !v.castByUserId || m.userId === v.castByUserId) return name;
  return interpolate(t.decisionviaCaster, { name, caster: casterName.get(v.castByUserId) ?? t.decisioncasterFallback });
}

/** Options that advanced out of each closed shortlist, for the history view. */
export function advancedFromShortlists<
  O extends { id: string; eliminatedInRoundId: string | null },
  R extends { id: string; number: number; kind: string; status: string },
>(rounds: R[], options: O[]): Map<string, Set<string>> {
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const numberOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.number ?? Infinity;
  const out = new Map<string, Set<string>>();
  for (const r of closedRounds) {
    if (r.kind !== "shortlist") continue;
    out.set(r.id, new Set(options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) > r.number).map((o) => o.id)));
  }
  return out;
}
