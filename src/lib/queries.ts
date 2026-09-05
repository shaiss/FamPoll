import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { seatsForUser } from "./auth";
import { getDb, schema } from "./db";
import type { Decision, Event, Member, Option, Round } from "./db/schema";
import { settleDueRounds } from "./lifecycle";

export type DecisionCard = {
  decision: Decision;
  /** Every round so far, oldest first. */
  rounds: Round[];
  currentRound: Round | null;
  aliveCount: number;
  /** Seats that voted in the current round. */
  votedMemberIds: string[];
  /** Seats that added an idea in the current round (ideas rounds). */
  contributedMemberIds: string[];
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
    const votedMemberIds = last ? [...new Set(last.votes.map((v) => v.memberId))] : [];
    const contributedMemberIds = last ? [...new Set(d.options.filter((o) => o.addedInRoundId === last.id && o.addedByMemberId).map((o) => o.addedByMemberId as string))] : [];
    const list = out.get(d.eventId) ?? [];
    list.push({
      decision: d,
      rounds,
      currentRound,
      aliveCount: d.options.filter((o) => !o.eliminatedInRoundId).length,
      votedMemberIds,
      contributedMemberIds,
      outcome: d.outcomeOptionId ? (d.options.find((o) => o.id === d.outcomeOptionId) ?? null) : null,
    });
    out.set(d.eventId, list);
  }
  return out;
}

export async function familyMembers(familyId: string): Promise<Member[]> {
  return getDb().query.members.findMany({ where: eq(schema.members.familyId, familyId), orderBy: [asc(schema.members.createdAt)] });
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
          votedNames: done.map((id) => memberName.get(id) ?? "?"),
          totalSeats: r.kind === "ideas" ? members.filter((m) => m.userId !== null).length : members.length,
        });
      }
    }
    eventCards.push({ event, decided, open, total: list.length, openVotingRounds, openIdeasRounds });
  }
  const order = { organizer: 0, vote: 1, ideas: 2 };
  needsVote.sort((a, b) => (a.kind === b.kind ? a.round.closesAt.getTime() - b.round.closesAt.getTime() : order[a.kind] - order[b.kind]));
  return { needsVote, events: eventCards, members, seats };
}

export async function eventData(eventId: string, familyId: string) {
  await settleDueRounds(familyId);
  const db = getDb();
  const event = await db.query.events.findFirst({ where: and(eq(schema.events.id, eventId), eq(schema.events.familyId, familyId)) });
  if (!event) return null;
  const [cards, members, log] = await Promise.all([
    decisionCards([event.id]),
    familyMembers(familyId),
    db.query.activity.findMany({ where: eq(schema.activity.eventId, event.id), orderBy: [desc(schema.activity.createdAt)], limit: 30 }),
  ]);
  return { event, decisions: cards.get(event.id) ?? [], members, log };
}

export async function decisionData(decisionId: string, familyId: string, userId: string) {
  const db = getDb();
  const found = await db.query.decisions.findFirst({ where: eq(schema.decisions.id, decisionId), with: { event: true } });
  if (!found || found.event.familyId !== familyId) return null;
  await settleDueRounds(familyId);
  const [decision, rounds, options, members, seats] = await Promise.all([
    db.query.decisions.findFirst({ where: eq(schema.decisions.id, decisionId) }),
    db.query.rounds.findMany({ where: eq(schema.rounds.decisionId, decisionId), orderBy: [asc(schema.rounds.number)], with: { votes: true } }),
    db.query.options.findMany({ where: eq(schema.options.decisionId, decisionId), orderBy: [asc(schema.options.createdAt)], with: { addedBy: true } }),
    familyMembers(familyId),
    seatsForUser(familyId, userId),
  ]);
  if (!decision) return null;
  const currentRound = rounds[rounds.length - 1] ?? null;
  // Who physically cast each proxy vote, for "Eli (via Shai)".
  const casterIds = [...new Set(rounds.flatMap((r) => r.votes.map((v) => v.castByUserId)))];
  const casters = casterIds.length ? await db.query.users.findMany({ where: inArray(schema.users.id, casterIds), columns: { id: true, name: true } }) : [];
  const casterName = new Map(casters.map((u) => [u.id, u.name.split(" ")[0]]));
  return { decision, event: found.event, rounds, currentRound, options, members, seats, casterName };
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
