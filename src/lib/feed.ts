/**
 * FamPoll → famdash feed: pure mappers and selection for GET /api/feed/recent.
 * The route owns auth and the database; this file stays free of I/O.
 */

export const FEED_SOURCE = "fampoll" as const;
export const FEED_DEFAULT_LIMIT = 10;
export const FEED_MIN_LIMIT = 1;
export const FEED_MAX_LIMIT = 50;
/** How far back decided items may appear in the recent feed. */
export const FEED_DECIDED_WINDOW_DAYS = 14;

export type FeedItemStatus = "ok" | "stub" | "error";

export type FeedItem = {
  id: string;
  source: typeof FEED_SOURCE;
  title: string;
  summary?: string;
  occurredAt: string;
  href?: string;
  status?: FeedItemStatus;
  meta?: Record<string, string>;
};

/** Row shape the route loads from decisions + events (+ optional open round). */
export type FeedDecisionInput = {
  decisionId: string;
  title: string;
  plan: string;
  voteType: string;
  decisionStatus: "open" | "decided";
  /** When the item became relevant: open round openedAt, or decidedAt. */
  occurredAt: Date;
  eventId: string;
  eventTitle: string;
  /** Event share token; never minted here. Empty/null → no href. */
  shareToken: string | null;
  /** Current open round kind when status is open. */
  roundKind?: string | null;
};

/** Clamp `limit` query to 1–50; default 10. Non-numeric → default. */
export function clampFeedLimit(raw: string | null | undefined): number {
  if (raw == null || raw === "") return FEED_DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return FEED_DEFAULT_LIMIT;
  return Math.min(FEED_MAX_LIMIT, Math.max(FEED_MIN_LIMIT, n));
}

/** Absolute `/s/…` link when a share token already exists. Never invents one. */
export function feedShareHref(baseUrl: string, shareToken: string | null | undefined): string | undefined {
  if (!shareToken) return undefined;
  const base = baseUrl.replace(/\/$/, "");
  if (!base) return undefined;
  return `${base}/s/${shareToken}`;
}

/**
 * Open (needs-vote) first, then fill with recently decided, each bucket already
 * newest-first. Truncates to `limit`.
 */
export function selectRecentFeedInputs(
  open: FeedDecisionInput[],
  decided: FeedDecisionInput[],
  limit: number,
): FeedDecisionInput[] {
  const cap = Math.max(0, limit);
  if (cap === 0) return [];
  const opens = open.slice(0, cap);
  if (opens.length >= cap) return opens;
  return opens.concat(decided.slice(0, cap - opens.length));
}

function openSummary(input: FeedDecisionInput): string {
  const verb = input.roundKind === "ideas" ? "Needs ideas" : "Needs vote";
  return `${verb} — open ${input.eventTitle}`.trim();
}

function decidedSummary(input: FeedDecisionInput): string {
  return `Decided — ${input.eventTitle}`.trim();
}

/** Map a loaded decision row to a FeedItem. No PII: titles and schema enums only. */
export function toFeedItem(input: FeedDecisionInput, baseUrl: string): FeedItem {
  const meta: Record<string, string> = {
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    decisionStatus: input.decisionStatus,
    plan: input.plan,
    voteType: input.voteType,
  };
  if (input.roundKind) meta.round = input.roundKind;

  const item: FeedItem = {
    id: `${FEED_SOURCE}:${input.decisionId}`,
    source: FEED_SOURCE,
    title: input.title,
    occurredAt: input.occurredAt.toISOString(),
    status: "ok",
    meta,
  };

  if (input.decisionStatus === "open") {
    item.summary = openSummary(input);
    // Open / needs-vote: omit href (open Quorum in the family app, not the public summary).
  } else {
    item.summary = decidedSummary(input);
    const href = feedShareHref(baseUrl, input.shareToken);
    if (href) item.href = href;
  }

  return item;
}

export function toFeedItems(inputs: FeedDecisionInput[], baseUrl: string): FeedItem[] {
  return inputs.map((row) => toFeedItem(row, baseUrl));
}

/** Cutoff for "recently decided" (≤ N days). */
export function decidedSince(now = new Date(), days = FEED_DECIDED_WINDOW_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Prefer NEXT_PUBLIC_APP_URL (env.appUrl); else the incoming request host.
 * Sync so the feed route can build absolute `/s` links without next/headers.
 */
export function feedBaseUrl(req: Request, appUrl: string): string {
  if (appUrl) return appUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  const forwarded = req.headers.get("x-forwarded-proto");
  const proto = forwarded || url.protocol.replace(":", "") || "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}
