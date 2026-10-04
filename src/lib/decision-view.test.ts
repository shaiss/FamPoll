import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { advancedFromShortlists, ballotActorKind, decisionPagePath, voterDisplayName } from "./decision-view";
import { interpolate, messages } from "./messages";

const en = messages("en");

describe("decisionPagePath", () => {
  it("sends a link seat to /seat and a signed-in voter to /app", () => {
    assert.equal(decisionPagePath("seat", "dec_1"), "/seat/decisions/dec_1");
    assert.equal(decisionPagePath("user", "dec_1"), "/app/decisions/dec_1");
  });
  it("never mints a personal /p/ bearer URL", () => {
    assert.equal(decisionPagePath("seat", "dec_1").includes("/p/"), false);
  });
});

describe("voterDisplayName", () => {
  const members = new Map([
    ["m1", { displayName: "Eli", userId: "u1" }],
    ["m2", { displayName: "Nana", userId: null }],
  ]);
  const casters = new Map([["u9", "Shai"]]);

  it("names the seat, and a proxy caster, and a departed seat without a name", () => {
    assert.equal(voterDisplayName({ memberId: "m1", castByUserId: "u1" }, members, casters, en), "Eli");
    assert.equal(voterDisplayName({ memberId: "m2", castByUserId: "u9" }, members, casters, en), interpolate(en.decisionviaCaster, { name: "Nana", caster: "Shai" }));
    assert.equal(voterDisplayName({ memberId: null, castByUserId: "u9" }, members, casters, en), en.decisionvoterLeft);
  });
});

describe("advancedFromShortlists", () => {
  it("marks options still alive after a closed shortlist as advancing", () => {
    const rounds = [
      { id: "r1", number: 1, kind: "shortlist", status: "closed" },
      { id: "r2", number: 2, kind: "final", status: "open" },
    ];
    const options = [
      { id: "a", eliminatedInRoundId: null },
      { id: "b", eliminatedInRoundId: "r1" },
    ];
    const map = advancedFromShortlists(rounds, options);
    assert.deepEqual([...(map.get("r1") ?? [])], ["a"]);
  });
});

describe("ballotActorKind", () => {
  it("lets the fp_seat cookie win when a co-present Clerk family member is not that seat", () => {
    assert.equal(
      ballotActorKind({
        memberId: "cookie-seat",
        clerkSeatIds: ["clerk-member", "clerk-proxy"],
        cookieSeatId: "cookie-seat",
      }),
      "seat",
    );
  });

  it("lets a signed-in family member act as their own seat even if a cookie is present", () => {
    assert.equal(
      ballotActorKind({
        memberId: "clerk-member",
        clerkSeatIds: ["clerk-member"],
        cookieSeatId: "cookie-seat",
      }),
      "user",
    );
  });

  it("rejects a Clerk member claiming a seat that is neither theirs nor the cookie", () => {
    assert.equal(
      ballotActorKind({
        memberId: "other-seat",
        clerkSeatIds: ["clerk-member"],
        cookieSeatId: "cookie-seat",
      }),
      null,
    );
  });
});

describe("seat surface source", () => {
  const files = [
    "src/app/seat/page.tsx",
    "src/app/seat/decisions/[id]/page.tsx",
    "src/components/seat-identity-bar.tsx",
    "src/components/decision-results.tsx",
  ];
  it("does not embed personal-link tokens or other seats' /p/ URLs", () => {
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      assert.equal(src.includes("personalLinkToken"), false, file);
      assert.equal(src.includes("/p/"), false, file);
    }
  });
  it("keeps organizer controls off the seat decision page", () => {
    const src = readFileSync("src/app/seat/decisions/[id]/page.tsx", "utf8");
    for (const action of ["closeRoundNow", "deleteDecision", "extendRound", "pickWinner", "reopenRound", "tiebreak"]) {
      assert.equal(src.includes(action), false, action);
    }
    assert.match(src, /organizer:\s*false/);
  });
});

function actionBody(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, name);
  const next = src.indexOf("\nexport async function ", start + 1);
  return next === -1 ? src.slice(start) : src.slice(start, next);
}

describe("addOption and revealVotes seat cookie", () => {
  const src = readFileSync("src/lib/actions/decisions.ts", "utf8");
  it("resolve through resolveBallotSeat, not a Clerk-first actor", () => {
    for (const name of ["addOption", "revealVotes", "castVote"]) {
      const body = actionBody(src, name);
      assert.match(body, /resolveBallotSeat\(/, name);
      assert.equal(body.includes("resolveDecisionActor"), false, name);
    }
    assert.match(src, /ballotActorKind\(/);
    assert.equal(src.includes("function resolveDecisionActor"), false);
  });
  it("addOption posts a seat id so a co-present Clerk member cannot steal the cookie seat", () => {
    const add = actionBody(src, "addOption");
    assert.match(add, /formData\.get\("memberId"\)/);
    const form = readFileSync("src/components/decision-results.tsx", "utf8");
    assert.match(form, /name="memberId"/);
    const seatPage = readFileSync("src/app/seat/decisions/[id]/page.tsx", "utf8");
    assert.match(seatPage, /memberId=\{seat\.id\}/);
  });
  it("addOption rejects advisory seats on adults-only decisions like castVote", () => {
    const add = actionBody(src, "addOption");
    const cast = actionBody(src, "castVote");
    assert.match(add, /seatInScope\(member, decision\.eligibilityScope\)/);
    assert.match(cast, /seatInScope\(seat, decision\.eligibilityScope\)/);
    const seatPage = readFileSync("src/app/seat/decisions/[id]/page.tsx", "utf8");
    assert.match(seatPage, /allowAddIdeas && !advisory/);
  });
});
