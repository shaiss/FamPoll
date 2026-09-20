import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messages } from "@/lib/messages";
import { summaryOgCard, summaryShareMeta, type SummaryShareData } from "./summary-share";

const t = messages("en");
const brand = { name: "Quorum", tagline: "Decide together" };

const sampleData = {
  event: {
    id: "e1",
    title: "Beach week",
    startsOn: "2026-07-01",
    endsOn: "2026-07-05",
    familyId: "f1",
    kind: "trip",
    createdAt: new Date(),
    shareToken: "tok",
    status: "planning",
    createdByMemberId: "m0",
    family: { name: "Nguyen", inviteCode: "abc" },
  },
  decisions: [
    { decision: { status: "decided", title: "Where to stay" }, currentRound: null, rounds: [], outcome: null },
    {
      decision: { status: "open", title: "Dinner night" },
      currentRound: { status: "open", closesAt: new Date("2026-06-01T20:00:00Z") },
      rounds: [],
      outcome: null,
    },
  ],
  log: [],
  members: [{ id: "m1", displayName: "Alex" }],
} as unknown as SummaryShareData;

describe("summaryShareMeta", () => {
  it("builds title and count description without member names", () => {
    const { title, description } = summaryShareMeta(sampleData, t, "en");
    assert.match(title, /Beach week/);
    assert.match(description, /1 of 2 decided/);
    assert.doesNotMatch(description, /Alex/);
    assert.doesNotMatch(description, /Nguyen/);
  });
});

describe("summaryOgCard", () => {
  it("uses counts only on the image card", () => {
    const card = summaryOgCard(sampleData, brand, t, "en");
    assert.equal(card.eventTitle, "Beach week");
    assert.match(card.statusLine, /1 of 2 decided/);
    assert.match(card.statusLine, /1 open/);
    assert.doesNotMatch(card.statusLine, /Dinner night/);
    assert.doesNotMatch(card.statusLine, /Alex/);
  });

  it("falls back to brand when data is missing", () => {
    const card = summaryOgCard(null, brand, t, "en");
    assert.equal(card.eventTitle, null);
    assert.equal(card.brandName, "Quorum");
  });
});
