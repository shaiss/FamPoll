/**
 * The rounds engine. Pure functions only: no database, no dates from the clock.
 * Everything about how a decision moves from ideas to an outcome lives here so
 * it can be unit-tested and explained in one place.
 *
 * Three independent choices describe a decision:
 *
 * Format: what an option is. Exactly one per decision.
 *   text       a short line
 *   long_text  a paragraph
 *   date       a date range
 *
 * Vote type: how each voting round is voted.
 *   ab       exactly two options, pick one; one round only, nobody adds options
 *   single   multiple choice: pick one of several
 *   multi    pick several: each person picks up to N (never all of them)
 *
 * Plan: the round structure.
 *   quick                  final
 *   shortlist_final        shortlist -> final
 *   ideas_shortlist_final  ideas -> shortlist -> final
 *
 * Round kinds are stages, and no longer imply how you vote:
 *   ideas      people add options; nobody votes
 *   shortlist  everyone votes; the top K advance
 *   final      everyone votes; the top option wins
 */

export type Plan = "quick" | "shortlist_final" | "ideas_shortlist_final";
export type RoundKind = "ideas" | "shortlist" | "final";
export type Format = "text" | "long_text" | "date";
export type VoteType = "ab" | "single" | "multi";

export type TallyRow = { optionId: string; count: number };

export const PLAN_LABEL: Record<Plan, string> = {
  quick: "Quick vote",
  shortlist_final: "Shortlist, then final",
  ideas_shortlist_final: "Ideas, shortlist, final",
};

export const FORMAT_LABEL: Record<Format, string> = {
  text: "Text",
  long_text: "Long text",
  date: "Dates",
};

export const VOTE_TYPE_LABEL: Record<VoteType, string> = {
  ab: "A or B",
  single: "Multiple choice",
  multi: "Pick several",
};

export const FORMATS: Format[] = ["text", "long_text", "date"];
export const VOTE_TYPES: VoteType[] = ["ab", "single", "multi"];
export const PLANS: Plan[] = ["quick", "shortlist_final", "ideas_shortlist_final"];

/** The plans a vote type allows. A or B is settled in one round: two options never need narrowing. */
export function plansFor(voteType: VoteType): Plan[] {
  if (voteType === "ab") return ["quick"];
  return PLANS;
}

/** Longest option title per format. Dates derive their title, so they get the short limit. */
export function optionTitleLimit(format: Format): number {
  return format === "long_text" ? 500 : 80;
}

export type OptionCountRule = { min: number; max: number | null };

/**
 * How many options a decision needs at creation. A or B is exactly two. A quick
 * vote needs two, or three when people pick several (otherwise the cap makes it
 * pick-one). A shortlist needs three. An ideas round can start empty.
 */
export function optionCountRule(voteType: VoteType, plan: Plan): OptionCountRule {
  if (voteType === "ab") return { min: 2, max: 2 };
  if (plan === "ideas_shortlist_final") return { min: 0, max: null };
  if (plan === "shortlist_final") return { min: 3, max: null };
  return { min: voteType === "multi" ? 3 : 2, max: null };
}

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

/**
 * Picks a person gets in a round, before the live cap: none in an ideas round,
 * one for A or B and multiple choice, N for pick several. Stored on the round.
 */
export function nominalPicks(kind: RoundKind, voteType: VoteType, picks: number): number {
  if (kind === "ideas") return 0;
  if (voteType === "multi") return Math.max(2, picks);
  return 1;
}

/**
 * The cap that actually applies, given how many options are on the ballot: you
 * can never approve everything (that is what Skip is for), so a pick-several
 * final between two options is pick-one, and an option added mid-round raises
 * the cap again. Always at least one for a voting round.
 */
export function effectivePicks(nominal: number, optionCount: number): number {
  if (nominal <= 0) return 0;
  return Math.max(1, Math.min(nominal, optionCount - 1));
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

/** The instruction line under a round title. `maxPicks` is the effective cap. */
export function roundInstruction(kind: RoundKind, maxPicks: number, advanceCount: number): string {
  if (kind === "ideas") return "Add ideas. Nobody votes yet.";
  const picks = maxPicks === 1 ? "Pick one." : `Pick up to ${maxPicks}.`;
  if (kind === "shortlist") return `${picks} The top ${advanceCount} go to the final.`;
  return `${picks} The most votes wins.`;
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

export type BallotRef = { memberId: string | null; optionId: string | null; castByUserId: string };

/** The seats that took part in a round. A seat that has since left the family (memberId null) is not one. */
export function seatsVoted(votes: { memberId: string | null }[]): Set<string> {
  const out = new Set<string>();
  for (const v of votes) if (v.memberId !== null) out.add(v.memberId);
  return out;
}

/**
 * How many people are behind a round's ballots, for the results footer. Seats
 * still in the family count once each; ballots left behind by seats that have
 * gone are grouped by whoever cast them, the closest thing to a person we keep.
 */
export function peopleVoted(votes: { memberId: string | null; castByUserId: string }[]): number {
  const departed = new Set<string>();
  for (const v of votes) if (v.memberId === null) departed.add(v.castByUserId);
  return seatsVoted(votes).size + departed.size;
}

/**
 * When an option is removed mid-round, the ballots whose only pick was that
 * option. Each becomes a skip so participation never moves (which would name
 * the pickers). A ballot that would approve every remaining option is a skip
 * too: that is what approving everything means.
 */
export function ballotsToSkip<T extends { memberId: string | null; optionId: string | null }>(votes: T[], removedOptionId: string, aliveAfter: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const v of votes) {
    if (v.memberId === null || v.optionId === null || seen.has(v.memberId)) continue;
    const mine = votes.filter((w) => w.memberId === v.memberId && w.optionId !== null);
    const remaining = mine.filter((w) => w.optionId !== removedOptionId);
    if (remaining.length === 0 || (aliveAfter > 0 && remaining.length >= aliveAfter)) {
      seen.add(v.memberId);
      out.push(v);
    }
  }
  return out;
}

/**
 * The starting state of "hide my vote" for a seat in a decision: what its most
 * recent ballot in this decision did, else the seat's standing preference.
 */
export function hiddenDefaultFor(ballots: { roundNumber: number; createdAt: Date; anonymous: boolean }[], seatPreference: boolean): boolean {
  let latest: (typeof ballots)[number] | null = null;
  for (const b of ballots) {
    if (!latest || b.roundNumber > latest.roundNumber || (b.roundNumber === latest.roundNumber && b.createdAt.getTime() > latest.createdAt.getTime())) latest = b;
  }
  return latest ? latest.anonymous : seatPreference;
}
