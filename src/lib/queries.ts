import { and, asc, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { cache } from "react";
import { membershipFor, seatsForUser } from "./auth";
import { getDb, schema } from "./db";
import type { Decision, Event, Member, Option, Round, Vote } from "./db/schema";
import { effectivePicks, hiddenDefaultFor, seatsVoted } from "./engine/rounds";
import { settleDueRounds } from "./lifecycle";

export type DecisionCard = {
  decision: Decision;
  /** Every round so far, oldest first. */
  rounds: Round[];
  currentRound: Round | null;
  aliveCount: number;
  /** Seats that voted in the current round. Participation is public; picks are not. */
  votedMemberIds: string[];
  /** Seats that added an idea in the current round (ideas rounds). For the viewer's own "done" checks only; never rendered. */
  contributedMemberIds: string[];
  /** The contributors who can be named: anonymous ideas keep their author out of every avatar stack. */
  publicContributorIds: string[];
  outcome: Option | null;
};

export type EventCard = { event: Event; decided: number; open: number; total: number; openVotingRounds: number; openIdeasRounds: number };

export type NeedsVote = {
  kind: "vote" | "ideas" | "organizer";
  /** For organizer items: why it needs them. */
  reason?: "tie" | "no_quorum" | "stalled";
  decision: Decision;
  event: Event;
  round: Round;
  rounds: Round[];
  pendingSeats: Member[];
  votedNames: string[];
  totalSeats: number;
  /** The live pick cap for a voting round (0 for ideas). */
  picks: number;
};

async function decisionCards(eventIds: string[]): Promise<Map<string, DecisionCard[]>> {
  const db = getDb();
  const out = new Map<string, DecisionCard[]>();
  if (eventIds.length === 0) return out;
  const decisions = await db.query.decisions.findMany({
    where: inArray(schema.decisions.eventId, eventIds),
    orderBy: [asc(schema.decisions.position), asc(schema.decisions.createdAt)],
    with: { rounds: { orderBy: [asc(schema.rounds.number)], with: { votes: { columns: { memberId: true } } } }, options: true },
  });
  for (const d of decisions) {
    const rounds: Round[] = d.rounds.map((r) => {
      const { votes, ...rest } = r;
      void votes;
      return rest;
    });
    const last = d.rounds[d.rounds.length - 1] ?? null;
    const currentRound = rounds[rounds.length - 1] ?? null;
    const votedMemberIds = last ? [...seatsVoted(last.votes)] : [];
    const added = last ? d.options.filter((o) => o.addedInRoundId === last.id && o.addedByMemberId) : [];
    const contributedMemberIds = [...new Set(added.map((o) => o.addedByMemberId as string))];
    const publicContributorIds = [...new Set(added.filter((o) => !o.anonymous).map((o) => o.addedByMemberId as string))];
    const list = out.get(d.eventId) ?? [];
    list.push({
      decision: d,
      rounds,
      currentRound,
      aliveCount: d.options.filter((o) => !o.eliminatedInRoundId).length,
      votedMemberIds,
      contributedMemberIds,
      publicContributorIds,
      outcome: d.outcomeOptionId ? (d.options.find((o) => o.id === d.outcomeOptionId) ?? null) : null,
    });
    out.set(d.eventId, list);
  }
  return out;
}

export async function familyMembers(familyId: string): Promise<Member[]> {
  return getDb().query.members.findMany({ where: eq(schema.members.familyId, familyId), orderBy: [asc(schema.members.createdAt)] });
}

/**
 * People you could add straight into a group: everyone who holds a seat in one
 * of your other groups and is not already here. The trust is "you share a group
 * already", which mirrors how proxy seats work — an organizer adds someone the
 * family already knows.
 */
export async function invitableUsers(currentFamilyId: string, userId: string): Promise<{ userId: string; name: string; groups: string[] }[]> {
  const db = getDb();
  const mine = await db.query.members.findMany({ where: eq(schema.members.userId, userId), columns: { familyId: true } });
  const otherFamilyIds = [...new Set(mine.map((m) => m.familyId))].filter((id) => id !== currentFamilyId);
  if (otherFamilyIds.length === 0) return [];
  const here = await db.query.members.findMany({ where: eq(schema.members.familyId, currentFamilyId), columns: { userId: true } });
  const excluded = new Set<string>(here.map((m) => m.userId).filter((id): id is string => id !== null));
  excluded.add(userId);
  const others = await db.query.members.findMany({
    where: and(inArray(schema.members.familyId, otherFamilyIds), isNotNull(schema.members.userId)),
    with: { user: { columns: { id: true, name: true } }, family: { columns: { name: true } } },
  });
  const byUser = new Map<string, { userId: string; name: string; groups: string[] }>();
  for (const m of others) {
    if (!m.userId || excluded.has(m.userId)) continue;
    const entry = byUser.get(m.userId) ?? { userId: m.userId, name: m.user?.name ?? m.displayName, groups: [] };
    if (m.family?.name && !entry.groups.includes(m.family.name)) entry.groups.push(m.family.name);
    byUser.set(m.userId, entry);
  }
  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function homeData(familyId: string, userId: string) {
  await settleDueRounds(familyId);
  const db = getDb();
  const [events, members, seats] = await Promise.all([
    db.query.events.findMany({ where: eq(schema.events.familyId, familyId), orderBy: [desc(schema.events.createdAt)] }),
    familyMembers(familyId),
    seatsForUser(familyId, userId),
  ]);
  const cards = await decisionCards(events.map((e) => e.id));
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));

  const needsVote: NeedsVote[] = [];
  const eventCards: EventCard[] = [];
  for (const event of events) {
    const list = cards.get(event.id) ?? [];
    const decided = list.filter((c) => c.decision.status === "decided").length;
    const open = list.filter((c) => c.decision.status === "open").length;
    let openVotingRounds = 0;
    let openIdeasRounds = 0;
    for (const c of list) {
      const r = c.currentRound;
      if (c.decision.status === "open" && r && r.status === "closed" && event.status === "planning") {
        // Nothing is open: a tie, a low-turnout deadline, or an empty ideas round waits on the organizer.
        const mine = seats.find((s) => s.userId === userId);
        const canAct = mine && (mine.role === "organizer" || c.decision.createdByMemberId === mine.id);
        if (canAct) {
          needsVote.push({
            kind: "organizer",
            reason: r.tied ? "tie" : r.closeReason === "no_quorum" ? "no_quorum" : "stalled",
            decision: c.decision,
            event,
            round: r,
            rounds: c.rounds,
            pendingSeats: [],
            votedNames: c.votedMemberIds.map((id) => memberName.get(id) ?? "?"),
            totalSeats: members.length,
            picks: effectivePicks(r.maxPicks, c.aliveCount),
          });
        }
        continue;
      }
      if (c.decision.status !== "open" || !r || r.status !== "open") continue;
      if (r.kind === "ideas") openIdeasRounds++;
      else openVotingRounds++;
      if (event.status !== "planning") continue;
      const done = r.kind === "ideas" ? c.contributedMemberIds : c.votedMemberIds;
      // Proxy seats can't add ideas, so they never "owe" one — don't nag their manager for them.
      const eligibleSeats = r.kind === "ideas" ? seats.filter((s) => s.userId !== null) : seats;
      const pendingSeats = eligibleSeats.filter((s) => !done.includes(s.id));
      if (pendingSeats.length > 0) {
        needsVote.push({
          kind: r.kind === "ideas" ? "ideas" : "vote",
          decision: c.decision,
          event,
          round: r,
          rounds: c.rounds,
          pendingSeats,
          // Ideas: only name contributors who signed their idea.
          votedNames: (r.kind === "ideas" ? c.publicContributorIds : c.votedMemberIds).map((id) => memberName.get(id) ?? "?"),
          totalSeats: r.kind === "ideas" ? members.filter((m) => m.userId !== null).length : members.length,
          picks: effectivePicks(r.maxPicks, c.aliveCount),
        });
      }
    }
    eventCards.push({ event, decided, open, total: list.length, openVotingRounds, openIdeasRounds });
  }
  const order = { organizer: 0, vote: 1, ideas: 2 };
  needsVote.sort((a, b) => (a.kind === b.kind ? a.round.closesAt.getTime() - b.round.closesAt.getTime() : order[a.kind] - order[b.kind]));
  return { needsVote, events: eventCards, members, seats };
}

/**
 * Everything the event screen needs, scoped by the viewer's seat in the event's
 * own group rather than their active group — so an event in any group they
 * belong to opens correctly, whichever group is currently active. Null when the
 * event is gone or they aren't a member of its group.
 */
export async function eventData(eventId: string, userId: string) {
  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.id, eventId) });
  if (!event) return null;
  const membership = await membershipFor(userId, event.familyId);
  if (!membership) return null;
  await settleDueRounds(event.familyId);
  const [cards, members, log] = await Promise.all([
    decisionCards([event.id]),
    familyMembers(event.familyId),
    db.query.activity.findMany({ where: eq(schema.activity.eventId, event.id), orderBy: [desc(schema.activity.createdAt)], limit: 30 }),
  ]);
  return { event, decisions: cards.get(event.id) ?? [], members, log, family: membership.family, member: membership.member };
}

/** A round as the decision page sees it. While open, `votes` holds only the viewer's own seats' ballots. */
export type RoundView = Round & { votes: Vote[]; voterMemberIds: string[] };
export type OptionView = Option & { addedBy: Member | null };

export async function decisionData(decisionId: string, userId: string) {
  const db = getDb();
  const found = await db.query.decisions.findFirst({ where: eq(schema.decisions.id, decisionId), with: { event: true } });
  if (!found) return null;
  const membership = await membershipFor(userId, found.event.familyId);
  if (!membership) return null;
  const familyId = found.event.familyId;
  await settleDueRounds(familyId);
  const [decision, allRounds, rawOptions, members, seats] = await Promise.all([
    db.query.decisions.findFirst({ where: eq(schema.decisions.id, decisionId) }),
    db.query.rounds.findMany({ where: eq(schema.rounds.decisionId, decisionId), orderBy: [asc(schema.rounds.number)], with: { votes: true } }),
    db.query.options.findMany({ where: eq(schema.options.decisionId, decisionId), orderBy: [asc(schema.options.createdAt)], with: { addedBy: true } }),
    familyMembers(familyId),
    seatsForUser(familyId, userId),
  ]);
  if (!decision) return null;
  const mySeatIds = new Set(seats.map((s) => s.id));
  // Ballots are sealed while a round is open: the page gets everyone's participation
  // but only the viewer's own picks, so nobody is swayed by (or can peek at) the rest.
  const rounds: RoundView[] = allRounds.map((r) => ({
    ...r,
    votes: r.status === "open" ? r.votes.filter((v) => v.memberId !== null && mySeatIds.has(v.memberId)) : r.votes,
    voterMemberIds: [...seatsVoted(r.votes)],
  }));
  // An anonymous idea never carries its author to the page.
  const options: OptionView[] = rawOptions.map((o) => (o.anonymous ? { ...o, addedBy: null, addedByMemberId: null } : o));
  const currentRound = rounds[rounds.length - 1] ?? null;
  // "Hide my vote" starts from the seat's most recent ballot in this decision, else its standing preference.
  const hiddenDefault = new Map<string, boolean>();
  for (const seat of seats) {
    const mine = allRounds.flatMap((r) => r.votes.filter((v) => v.memberId === seat.id).map((v) => ({ roundNumber: r.number, createdAt: v.createdAt, anonymous: v.anonymous })));
    hiddenDefault.set(seat.id, hiddenDefaultFor(mine, seat.votesHidden));
  }
  // Who physically cast each proxy vote, for "Eli (via Shai)".
  const casterIds = [...new Set(rounds.flatMap((r) => r.votes.map((v) => v.castByUserId)))];
  const casters = casterIds.length ? await db.query.users.findMany({ where: inArray(schema.users.id, casterIds), columns: { id: true, name: true } }) : [];
  const casterName = new Map(casters.map((u) => [u.id, u.name.split(" ")[0]]));
  return { decision, event: found.event, rounds, currentRound, options, members, seats, casterName, hiddenDefault, family: membership.family, member: membership.member };
}

/**
 * The only query behind an unauthenticated route. It selects just what the
 * public page shows: titles, outcomes, first names, and the plain-words log.
 */
export const summaryByToken = cache(async function summaryByToken(token: string) {
  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.shareToken, token), with: { family: { columns: { name: true, inviteCode: true } } } });
  if (!event) return null;
  await settleDueRounds(event.familyId);
  const [cards, log, members] = await Promise.all([
    decisionCards([event.id]),
    db.query.activity.findMany({ where: eq(schema.activity.eventId, event.id), orderBy: [desc(schema.activity.createdAt)], limit: 20, columns: { id: true, message: true, createdAt: true } }),
    db.query.members.findMany({ where: eq(schema.members.familyId, event.familyId), columns: { id: true, displayName: true } }),
  ]);
  const decisions = (cards.get(event.id) ?? []).map((c) => ({ decision: c.decision, rounds: c.rounds, currentRound: c.currentRound, outcome: c.outcome }));
  return { event, decisions, log, members };
});

export const familyByCode = cache(async function familyByCode(code: string) {
  return getDb().query.families.findFirst({
    where: eq(schema.families.inviteCode, code),
    columns: { id: true, name: true, inviteCode: true },
    with: { members: { columns: { id: true, displayName: true, userId: true } } },
  });
});
