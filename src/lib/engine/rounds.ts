/**
 * The rounds engine. Pure functions only: no database, no dates from the clock.
 * Everything about how a decision moves from ideas to an outcome lives here so
 * it can be unit-tested and explained in one place.
 *
 * Plans
 *   quick                  final
 *   shortlist_final        shortlist -> final
 *   ideas_shortlist_final  ideas -> shortlist -> final
 *
 * Round kinds
 *   ideas      people add options; nobody votes
 *   shortlist  approval vote: each person picks up to N; the top K advance
 *   final      each person picks one; the top option wins
 */

export type Plan = "quick" | "shortlist_final" | "ideas_shortlist_final";
export type RoundKind = "ideas" | "shortlist" | "final";

export type TallyRow = { optionId: string; count: number };

export const PLAN_LABEL: Record<Plan, string> = {
  quick: "Quick vote",
  shortlist_final: "Shortlist, then final",
  ideas_shortlist_final: "Ideas, shortlist, final",
};

export const ROUND_LABEL: Record<RoundKind, string> = {
  ideas: "Ideas",
  shortlist: "Shortlist",
  final: "Final",
};

export function roundSequence(plan: Plan): RoundKind[] {
  switch (plan) {
    case "quick":
      return ["final"];
    case "shortlist_final":
      return ["shortlist", "final"];
    case "ideas_shortlist_final":
      return ["ideas", "shortlist", "final"];
  }
}

export function planRoundCount(plan: Plan): number {
  return roundSequence(plan).length;
}

/** Picks a person gets in a round of this kind. */
export function maxPicksFor(kind: RoundKind, shortlistPicks: number): number {
  if (kind === "ideas") return 0;
  if (kind === "shortlist") return Math.max(1, shortlistPicks);
  return 1;
}

export function closesAtFrom(openedAt: Date, roundHours: number): Date {
  return new Date(openedAt.getTime() + Math.max(1, roundHours) * 60 * 60 * 1000);
}

export function isPastDeadline(closesAt: Date, now: Date): boolean {
  return closesAt.getTime() <= now.getTime();
}

/**
 * A voting round closes early once every eligible seat has voted.
 * Ideas rounds never close early: there is no "everyone is done" signal.
 */
export function shouldAutoClose(kind: RoundKind, distinctVoters: number, eligibleSeats: number): boolean {
  if (kind === "ideas") return false;
  return eligibleSeats > 0 && distinctVoters >= eligibleSeats;
}

/**
 * Count votes per alive option. Rows come back sorted by count (desc), then by
 * the order the options were given in (so earlier ideas win stable ordering).
 */
export function tally(aliveOptionIds: string[], votes: { optionId: string }[]): TallyRow[] {
  const counts = new Map<string, number>();
  for (const id of aliveOptionIds) counts.set(id, 0);
  for (const v of votes) {
    if (counts.has(v.optionId)) counts.set(v.optionId, (counts.get(v.optionId) ?? 0) + 1);
  }
  const order = new Map(aliveOptionIds.map((id, i) => [id, i]));
  return [...counts.entries()]
    .map(([optionId, count]) => ({ optionId, count }))
    .sort((a, b) => b.count - a.count || (order.get(a.optionId) ?? 0) - (order.get(b.optionId) ?? 0));
}

export type Cut = { advancing: string[]; eliminated: string[]; tieAtCut: boolean };

/**
 * Decide who advances from a shortlist round.
 *  - Everyone tied at the cut line advances (a tie never silently drops someone).
 *  - Options with zero votes are dropped whenever at least one option got a vote.
 *  - If nobody voted at all, everything advances and the final sorts it out.
 */
export function cutAdvancing(rows: TallyRow[], advanceCount: number): Cut {
  const k = Math.max(1, advanceCount);
  if (rows.length <= k) {
    return { advancing: rows.map((r) => r.optionId), eliminated: [], tieAtCut: false };
  }
  const anyVotes = rows.some((r) => r.count > 0);
  if (!anyVotes) {
    return { advancing: rows.map((r) => r.optionId), eliminated: [], tieAtCut: false };
  }
  const threshold = Math.max(1, rows[k - 1].count);
  const advancing = rows.filter((r) => r.count >= threshold).map((r) => r.optionId);
  const eliminated = rows.filter((r) => r.count < threshold).map((r) => r.optionId);
  return { advancing, eliminated, tieAtCut: advancing.length > k };
}

export type FinalResult = { winnerId: string | null; tiedIds: string[] };

/** Decide the winner of a final (or quick) round. A tie returns every tied option. */
export function resolveFinal(rows: TallyRow[]): FinalResult {
  if (rows.length === 0) return { winnerId: null, tiedIds: [] };
  const top = rows[0].count;
  const leaders = rows.filter((r) => r.count === top).map((r) => r.optionId);
  if (leaders.length === 1 && top > 0) return { winnerId: leaders[0], tiedIds: [] };
  return { winnerId: null, tiedIds: leaders };
}

export type NextStep =
  | { kind: "round"; round: RoundKind }
  | { kind: "decided"; optionId: string }
  | { kind: "tie"; tiedIds: string[] }
  | { kind: "stalled"; reason: string };

/**
 * What happens after a round closes.
 * `alive` is the list of option ids still in play after any elimination.
 */
export function nextStep(plan: Plan, closed: RoundKind, alive: string[], advanceCount: number, finalResult?: FinalResult): NextStep {
  if (closed === "final") {
    if (!finalResult) return { kind: "stalled", reason: "A final round closed without a result." };
    if (finalResult.winnerId) return { kind: "decided", optionId: finalResult.winnerId };
    if (finalResult.tiedIds.length === 0) return { kind: "stalled", reason: "There were no options to choose from." };
    return { kind: "tie", tiedIds: finalResult.tiedIds };
  }
  if (alive.length === 0) return { kind: "stalled", reason: "No ideas were added." };
  if (alive.length === 1) return { kind: "decided", optionId: alive[0] };
  const seq = roundSequence(plan);
  const idx = seq.indexOf(closed);
  const remaining = seq.slice(idx + 1);
  if (closed === "ideas") {
    // A shortlist is pointless when the field is already small enough for a final.
    if (alive.length <= Math.max(1, advanceCount) && remaining.includes("final")) {
      return { kind: "round", round: "final" };
    }
  }
  const next = remaining[0];
  if (!next) return { kind: "stalled", reason: "The plan has no further rounds." };
  return { kind: "round", round: next };
}

/** The instruction line under a round title. */
export function roundInstruction(kind: RoundKind, maxPicks: number, advanceCount: number): string {
  if (kind === "ideas") return "Add ideas. Nobody votes yet.";
  if (kind === "shortlist") {
    const picks = maxPicks === 1 ? "Pick one." : `Pick up to ${maxPicks}.`;
    return `${picks} The top ${advanceCount} go to the final.`;
  }
  return "Pick one. The most votes wins.";
}

export type RoundRef = { kind: RoundKind; number: number };

/** A tiebreak is a final that follows another final of the same decision. */
export function isTiebreak(round: RoundRef, all: RoundRef[]): boolean {
  if (round.kind !== "final") return false;
  return all.some((r) => r.number < round.number && r.kind === "final");
}

/**
 * "Round 2 of 3 · Shortlist", "Quick vote", "Tiebreak". The denominator is the
 * rounds actually played so far plus what the plan still has left, so a skipped
 * shortlist or a tiebreak never reads "Round 2 of 3" or "Round 4 of 3".
 */
export function roundLabel(round: RoundRef, all: RoundRef[], plan: Plan): string {
  if (isTiebreak(round, all)) return "Tiebreak";
  const seq = roundSequence(plan);
  if (seq.length === 1 && round.number === 1) return "Quick vote";
  const remaining = round.kind === "final" ? 0 : seq.slice(seq.indexOf(round.kind) + 1).length;
  return `Round ${round.number} of ${round.number + remaining} · ${ROUND_LABEL[round.kind]}`;
}

/**
 * Quorum for an automatic outcome at a deadline: at least half the seats
 * took part (a Skip counts as taking part). Below it the round closes and
 * waits for the organizer instead of deciding on a handful of votes.
 */
export function hasQuorum(distinctVoters: number, eligibleSeats: number): boolean {
  if (eligibleSeats <= 0) return false;
  return distinctVoters * 2 >= eligibleSeats;
}
