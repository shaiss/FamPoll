import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { seatsForUser } from "./auth";
import { getDb, schema } from "./db";
import type { Decision, Event, Member, Option, Round, Vote } from "./db/schema";
import { settleDueRounds } from "./lifecycle";

export type DecisionCard = {
  decision: Decision;
  currentRound: Round | null;
  aliveCount: number;
  votedMemberIds: string[];
  outcome: Option | null;
};

export type EventCard = {
  event: Event;
  decided: number;
  open: number;
  total: number;
  openRoundLabel: string | null;
};

export type NeedsVote = {
  decision: Decision;
  event: Event;
  round: Round;
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
    with: {
      rounds: { orderBy: [desc(schema.rounds.number)], limit: 1, with: { votes: true } },
      options: true,
    },
  });
  for (const d of decisions) {
    const currentRound = d.rounds[0] ?? null;
    const votedMemberIds = currentRound ? [...new Set(currentRound.votes.map((v: Vote) => v.memberId))] : [];
    const outcome = d.outcomeOptionId ? (d.options.find((o) => o.id === d.outcomeOptionId) ?? null) : null;
    const { votes: _votes, ...roundOnly } = currentRound ?? { votes: [] as Vote[] };
    void _votes;
    const card: DecisionCard = {
      decision: d,
      currentRound: currentRound ? (roundOnly as Round) : null,
      aliveCount: d.options.filter((o) => !o.eliminatedInRoundId).length,
      votedMemberIds,
      outcome,
    };
    const list = out.get(d.eventId) ?? [];
    list.push(card);
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
    let openRoundLabel: string | null = null;
    for (const c of list) {
      const r = c.currentRound;
      if (c.decision.status !== "open" || !r || r.status !== "open") continue;
      if (!openRoundLabel) openRoundLabel = r.kind === "ideas" ? "gathering ideas" : "1 round open";
      if (r.kind === "ideas") continue;
      const pendingSeats = seats.filter((s) => !c.votedMemberIds.includes(s.id));
      if (pendingSeats.length > 0 && event.status === "planning") {
        needsVote.push({
          decision: c.decision,
          event,
          round: r,
          pendingSeats,
          votedNames: c.votedMemberIds.map((id) => memberName.get(id) ?? "?"),
          totalSeats: members.length,
        });
      }
    }
    eventCards.push({ event, decided, open, total: list.length, openRoundLabel });
  }
  needsVote.sort((a, b) => a.round.closesAt.getTime() - b.round.closesAt.getTime());
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
  const decision = await db.query.decisions.findFirst({
    where: eq(schema.decisions.id, decisionId),
    with: { event: true },
  });
  if (!decision || decision.event.familyId !== familyId) return null;
  await settleDueRounds(familyId);
  const [rounds, options, members, seats] = await Promise.all([
    db.query.rounds.findMany({ where: eq(schema.rounds.decisionId, decision.id), orderBy: [asc(schema.rounds.number)], with: { votes: true } }),
    db.query.options.findMany({ where: eq(schema.options.decisionId, decision.id), orderBy: [asc(schema.options.createdAt)], with: { addedBy: true } }),
    familyMembers(familyId),
    seatsForUser(familyId, userId),
  ]);
  const currentRound = rounds[rounds.length - 1] ?? null;
  return { decision, event: decision.event, rounds, currentRound, options, members, seats };
}

export async function summaryByToken(token: string) {
  const db = getDb();
  const event = await db.query.events.findFirst({ where: eq(schema.events.shareToken, token), with: { family: true } });
  if (!event) return null;
  const [cards, log, members] = await Promise.all([
    decisionCards([event.id]),
    db.query.activity.findMany({ where: eq(schema.activity.eventId, event.id), orderBy: [desc(schema.activity.createdAt)], limit: 20 }),
    familyMembers(event.familyId),
  ]);
  return { event, decisions: cards.get(event.id) ?? [], log, members };
}

export async function familyByCode(code: string) {
  return getDb().query.families.findFirst({ where: eq(schema.families.inviteCode, code), with: { members: true } });
}

