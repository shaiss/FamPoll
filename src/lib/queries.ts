import { and, asc, desc, eq, inArray } from "drizzle-orm";
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
  kind: "vote" | "ideas";
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
      if (c.decision.status !== "open" || !r || r.status !== "open") continue;
      if (r.kind === "ideas") openIdeasRounds++;
      else openVotingRounds++;
      if (event.status !== "planning") continue;
      const done = r.kind === "ideas" ? c.contributedMemberIds : c.votedMemberIds;
      const pendingSeats = seats.filter((s) => !done.includes(s.id));
      if (pendingSeats.length > 0) {
        needsVote.push({
          kind: r.kind === "ideas" ? "ideas" : "vote",
          decision: c.decision,
          event,
          round: r,
          rounds: c.rounds,
          pendingSeats,
          votedNames: done.map((id) => memberName.get(id) ?? "?"),
          totalSeats: members.length,
        });
      }
    }
    eventCards.push({ event, decided, open, total: list.length, openVotingRounds, openIdeasRounds });
  }
  needsVote.sort((a, b) => (a.kind === b.kind ? a.round.closesAt.getTime() - b.round.closesAt.getTime() : a.kind === "vote" ? -1 : 1));
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
  return { decision, event: found.event, rounds, currentRound, options, members, seats };
}

/**
 * The only query behind an unauthenticated route. It selects just what the
 * public page shows: titles, outcomes, first names, and the plain-words log.
 */
export async function summaryByToken(token: string) {
  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.shareToken, token), with: { family: { columns: { name: true } } } });
  if (!event) return null;
  await settleDueRounds(event.familyId);
  const [cards, log, members] = await Promise.all([
    decisionCards([event.id]),
    db.query.activity.findMany({ where: eq(schema.activity.eventId, event.id), orderBy: [desc(schema.activity.createdAt)], limit: 20, columns: { id: true, message: true, createdAt: true } }),
    db.query.members.findMany({ where: eq(schema.members.familyId, event.familyId), columns: { id: true, displayName: true } }),
  ]);
  const decisions = (cards.get(event.id) ?? []).map((c) => ({ decision: c.decision, rounds: c.rounds, currentRound: c.currentRound, outcome: c.outcome }));
  return { event, decisions, log, members };
}

export async function familyByCode(code: string) {
  return getDb().query.families.findFirst({
    where: eq(schema.families.inviteCode, code),
    columns: { id: true, name: true, inviteCode: true },
    with: { members: { columns: { id: true, displayName: true, userId: true } } },
  });
}
