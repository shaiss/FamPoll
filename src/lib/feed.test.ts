import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampFeedLimit,
  decidedSince,
  feedBaseUrl,
  feedShareHref,
  selectRecentFeedInputs,
  toFeedItem,
  type FeedDecisionInput,
} from "./feed";

const baseOpen = (over: Partial<FeedDecisionInput> = {}): FeedDecisionInput => ({
  decisionId: "d1",
  title: "Where to stay",
  plan: "quick",
  voteType: "single",
  decisionStatus: "open",
  occurredAt: new Date("2026-09-10T12:00:00.000Z"),
  eventId: "e1",
  eventTitle: "Quorum",
  shareToken: "sharetok12345678",
  roundKind: "final",
  ...over,
});

const baseDecided = (over: Partial<FeedDecisionInput> = {}): FeedDecisionInput => ({
  ...baseOpen({
    decisionId: "d2",
    title: "Dinner spot",
    decisionStatus: "decided",
    occurredAt: new Date("2026-09-12T18:00:00.000Z"),
    roundKind: null,
  }),
  ...over,
});

describe("clampFeedLimit", () => {
  it("defaults to 10", () => {
    assert.equal(clampFeedLimit(null), 10);
    assert.equal(clampFeedLimit(undefined), 10);
    assert.equal(clampFeedLimit(""), 10);
    assert.equal(clampFeedLimit("nope"), 10);
  });
  it("clamps to 1–50", () => {
    assert.equal(clampFeedLimit("0"), 1);
    assert.equal(clampFeedLimit("-3"), 1);
    assert.equal(clampFeedLimit("1"), 1);
    assert.equal(clampFeedLimit("25"), 25);
    assert.equal(clampFeedLimit("50"), 50);
    assert.equal(clampFeedLimit("999"), 50);
  });
});

describe("feedShareHref", () => {
  it("builds /s links and omits when token or base is missing", () => {
    assert.equal(feedShareHref("https://app.example", "abc"), "https://app.example/s/abc");
    assert.equal(feedShareHref("https://app.example/", "abc"), "https://app.example/s/abc");
    assert.equal(feedShareHref("https://app.example", null), undefined);
    assert.equal(feedShareHref("https://app.example", ""), undefined);
    assert.equal(feedShareHref("", "abc"), undefined);
  });
});

describe("selectRecentFeedInputs", () => {
  it("takes open first, then fills with decided up to limit", () => {
    const open = [
      baseOpen({ decisionId: "o1", occurredAt: new Date("2026-09-11T00:00:00.000Z") }),
      baseOpen({ decisionId: "o2", occurredAt: new Date("2026-09-10T00:00:00.000Z") }),
    ];
    const decided = [
      baseDecided({ decisionId: "c1", occurredAt: new Date("2026-09-12T00:00:00.000Z") }),
      baseDecided({ decisionId: "c2", occurredAt: new Date("2026-09-09T00:00:00.000Z") }),
    ];
    assert.deepEqual(
      selectRecentFeedInputs(open, decided, 3).map((r) => r.decisionId),
      ["o1", "o2", "c1"],
    );
    assert.deepEqual(
      selectRecentFeedInputs(open, decided, 1).map((r) => r.decisionId),
      ["o1"],
    );
    assert.deepEqual(
      selectRecentFeedInputs([], decided, 2).map((r) => r.decisionId),
      ["c1", "c2"],
    );
  });
});

describe("toFeedItem", () => {
  it("maps open needs-vote without href and with open meta", () => {
    const item = toFeedItem(baseOpen(), "https://poll.example");
    assert.equal(item.id, "fampoll:d1");
    assert.equal(item.source, "fampoll");
    assert.equal(item.title, "Where to stay");
    assert.equal(item.summary, "Needs vote — open Quorum");
    assert.equal(item.occurredAt, "2026-09-10T12:00:00.000Z");
    assert.equal(item.href, undefined);
    assert.equal(item.status, "ok");
    assert.deepEqual(item.meta, {
      eventId: "e1",
      eventTitle: "Quorum",
      decisionStatus: "open",
      plan: "quick",
      voteType: "single",
      round: "final",
    });
  });

  it("uses Needs ideas when the open round is ideas", () => {
    const item = toFeedItem(baseOpen({ roundKind: "ideas" }), "https://poll.example");
    assert.equal(item.summary, "Needs ideas — open Quorum");
  });

  it("maps decided with share href and decided meta", () => {
    const item = toFeedItem(baseDecided(), "https://poll.example");
    assert.equal(item.summary, "Decided — Quorum");
    assert.equal(item.href, "https://poll.example/s/sharetok12345678");
    assert.equal(item.meta?.decisionStatus, "decided");
    assert.equal(item.meta?.round, undefined);
  });

  it("omits href for decided when share token is missing", () => {
    const item = toFeedItem(baseDecided({ shareToken: null }), "https://poll.example");
    assert.equal(item.href, undefined);
  });
});

describe("feedBaseUrl", () => {
  it("prefers env appUrl over the request host", () => {
    const req = new Request("https://preview.example/api/feed/recent");
    assert.equal(feedBaseUrl(req, "https://canonical.example/"), "https://canonical.example");
  });
  it("falls back to forwarded host", () => {
    const req = new Request("http://localhost:3000/api/feed/recent", {
      headers: { "x-forwarded-proto": "https", "x-forwarded-host": "poll.example" },
    });
    assert.equal(feedBaseUrl(req, ""), "https://poll.example");
  });
});

describe("decidedSince", () => {
  it("subtracts 14 days", () => {
    const now = new Date("2026-09-13T00:00:00.000Z");
    assert.equal(decidedSince(now).toISOString(), "2026-08-30T00:00:00.000Z");
  });
});
