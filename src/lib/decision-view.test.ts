import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { advancedFromShortlists, decisionPagePath, voterDisplayName } from "./decision-view";
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
});
