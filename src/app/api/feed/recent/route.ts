import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { env, hasDatabase } from "@/lib/env";
import {
  clampFeedLimit,
  decidedSince,
  feedBaseUrl,
  selectRecentFeedInputs,
  toFeedItems,
  type FeedDecisionInput,
} from "@/lib/feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Famdash FeedClient: recent open (needs-vote) decisions, then recently decided
 * (≤14 days). Auth is `Authorization: Bearer <FAMPOLL_API_KEY>` — never put the
 * key in the query string (it would leak into logs).
 */
export async function GET(req: Request) {
  const expected = env.fampollApiKey;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasDatabase) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const limit = clampFeedLimit(url.searchParams.get("limit"));
  const base = feedBaseUrl(req, env.appUrl);
  const since = decidedSince();
  const db = getDb();

  const openRows = await db
    .select({
      decisionId: schema.decisions.id,
      title: schema.decisions.title,
      plan: schema.decisions.plan,
      voteType: schema.decisions.voteType,
      openedAt: schema.rounds.openedAt,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
      shareToken: schema.events.shareToken,
      roundKind: schema.rounds.kind,
    })
    .from(schema.decisions)
    .innerJoin(schema.events, eq(schema.events.id, schema.decisions.eventId))
    .innerJoin(
      schema.rounds,
      and(eq(schema.rounds.decisionId, schema.decisions.id), eq(schema.rounds.status, "open")),
    )
    .where(eq(schema.decisions.status, "open"))
    .orderBy(desc(schema.rounds.openedAt))
    .limit(limit);

  const decidedRows = await db
    .select({
      decisionId: schema.decisions.id,
      title: schema.decisions.title,
      plan: schema.decisions.plan,
      voteType: schema.decisions.voteType,
      decidedAt: schema.decisions.decidedAt,
      eventId: schema.events.id,
      eventTitle: schema.events.title,
      shareToken: schema.events.shareToken,
    })
    .from(schema.decisions)
    .innerJoin(schema.events, eq(schema.events.id, schema.decisions.eventId))
    .where(and(eq(schema.decisions.status, "decided"), gte(schema.decisions.decidedAt, since)))
    .orderBy(desc(schema.decisions.decidedAt))
    .limit(limit);

  const open: FeedDecisionInput[] = openRows.map((r) => ({
    decisionId: r.decisionId,
    title: r.title,
    plan: r.plan,
    voteType: r.voteType,
    decisionStatus: "open",
    occurredAt: r.openedAt,
    eventId: r.eventId,
    eventTitle: r.eventTitle,
    shareToken: r.shareToken,
    roundKind: r.roundKind,
  }));

  const decided: FeedDecisionInput[] = decidedRows
    .filter((r): r is typeof r & { decidedAt: Date } => r.decidedAt != null)
    .map((r) => ({
      decisionId: r.decisionId,
      title: r.title,
      plan: r.plan,
      voteType: r.voteType,
      decisionStatus: "decided" as const,
      occurredAt: r.decidedAt,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      shareToken: r.shareToken,
      roundKind: null,
    }));

  const items = toFeedItems(selectRecentFeedInputs(open, decided, limit), base);
  return NextResponse.json(items);
}
