import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  closesAtFrom,
  cutAdvancing,
  effectivePicks,
  hasQuorum,
  isPastDeadline,
  isTiebreak,
  nextStep,
  nominalPicks,
  optionCountRule,
  optionTitleLimit,
  plansFor,
  resolveFinal,
  roundInstruction,
  roundLabel,
  roundSequence,
  shouldAutoClose,
  tally,
} from "./rounds";

describe("roundSequence", () => {
  it("maps each plan to its rounds", () => {
    assert.deepEqual(roundSequence("quick"), ["final"]);
    assert.deepEqual(roundSequence("shortlist_final"), ["shortlist", "final"]);
    assert.deepEqual(roundSequence("ideas_shortlist_final"), ["ideas", "shortlist", "final"]);
  });
});

describe("plansFor", () => {
  it("settles A or B in one round and leaves the rest open", () => {
    assert.deepEqual(plansFor("ab"), ["quick"]);
    assert.deepEqual(plansFor("single"), ["quick", "shortlist_final", "ideas_shortlist_final"]);
    assert.deepEqual(plansFor("multi"), ["quick", "shortlist_final", "ideas_shortlist_final"]);
  });
});

describe("nominalPicks", () => {
  it("follows the vote type, not the round kind", () => {
    assert.equal(nominalPicks("ideas", "multi", 3), 0);
    assert.equal(nominalPicks("shortlist", "ab", 3), 1);
    assert.equal(nominalPicks("shortlist", "single", 3), 1);
    assert.equal(nominalPicks("final", "single", 3), 1);
    assert.equal(nominalPicks("shortlist", "multi", 3), 3);
    assert.equal(nominalPicks("final", "multi", 3), 3);
  });
  it("never lets pick several mean pick one", () => {
    assert.equal(nominalPicks("final", "multi", 1), 2);
    assert.equal(nominalPicks("final", "multi", 0), 2);
  });
});

describe("effectivePicks", () => {
  it("caps at one fewer than the options on the ballot", () => {
    assert.equal(effectivePicks(2, 5), 2);
    assert.equal(effectivePicks(3, 3), 2);
    assert.equal(effectivePicks(2, 2), 1);
    assert.equal(effectivePicks(1, 5), 1);
  });
  it("keeps an ideas round at zero and a voting round at least one", () => {
    assert.equal(effectivePicks(0, 5), 0);
    assert.equal(effectivePicks(2, 1), 1);
    assert.equal(effectivePicks(2, 0), 1);
  });
  it("pins the legacy mapping: a migrated pick-several final is pick-one between two, pick-two among three", () => {
    assert.equal(effectivePicks(nominalPicks("final", "multi", 2), 2), 1);
    assert.equal(effectivePicks(nominalPicks("final", "multi", 2), 3), 2);
    assert.equal(effectivePicks(nominalPicks("shortlist", "multi", 2), 5), 2);
  });
});

describe("optionCountRule", () => {
  it("wants exactly two for A or B whatever the plan", () => {
    assert.deepEqual(optionCountRule("ab", "quick"), { min: 2, max: 2 });
    assert.deepEqual(optionCountRule("ab", "ideas_shortlist_final"), { min: 2, max: 2 });
  });
  it("needs two for a quick pick-one, three when people pick several or a shortlist follows", () => {
    assert.deepEqual(optionCountRule("single", "quick"), { min: 2, max: null });
    assert.deepEqual(optionCountRule("multi", "quick"), { min: 3, max: null });
    assert.deepEqual(optionCountRule("single", "shortlist_final"), { min: 3, max: null });
    assert.deepEqual(optionCountRule("multi", "shortlist_final"), { min: 3, max: null });
  });
  it("lets an ideas round start empty", () => {
    assert.deepEqual(optionCountRule("single", "ideas_shortlist_final"), { min: 0, max: null });
  });
});

describe("optionTitleLimit", () => {
  it("gives long text room and keeps the rest short", () => {
    assert.equal(optionTitleLimit("text"), 80);
    assert.equal(optionTitleLimit("date"), 80);
    assert.equal(optionTitleLimit("long_text"), 500);
  });
});

describe("roundInstruction", () => {
  it("says how many to pick in every voting round", () => {
    assert.equal(roundInstruction("ideas", 0, 2), "Add ideas. Nobody votes yet.");
    assert.equal(roundInstruction("shortlist", 2, 2), "Pick up to 2. The top 2 go to the final.");
    assert.equal(roundInstruction("shortlist", 1, 3), "Pick one. The top 3 go to the final.");
    assert.equal(roundInstruction("final", 1, 2), "Pick one. The most votes wins.");
    assert.equal(roundInstruction("final", 3, 2), "Pick up to 3. The most votes wins.");
  });
});

describe("closesAtFrom", () => {
  it("adds hours and never allows a zero-length round", () => {
    const t = new Date("2026-09-05T10:00:00Z");
    assert.equal(closesAtFrom(t, 72).toISOString(), "2026-09-08T10:00:00.000Z");
    assert.equal(closesAtFrom(t, 0).toISOString(), "2026-09-05T11:00:00.000Z");
  });
});

describe("shouldAutoClose", () => {
  it("closes a voting round once every seat has voted", () => {
    assert.equal(shouldAutoClose("final", 6, 6), true);
    assert.equal(shouldAutoClose("shortlist", 5, 6), false);
    assert.equal(shouldAutoClose("ideas", 6, 6), false);
    assert.equal(shouldAutoClose("final", 0, 0), false);
  });
});

describe("tally", () => {
  it("counts alive options only and keeps a stable order on ties", () => {
    const rows = tally(["a", "b", "c"], [{ optionId: "b" }, { optionId: "b" }, { optionId: "c" }, { optionId: "zombie" }]);
    assert.deepEqual(rows, [
      { optionId: "b", count: 2 },
      { optionId: "c", count: 1 },
      { optionId: "a", count: 0 },
    ]);
    const tied = tally(["x", "y"], [{ optionId: "y" }, { optionId: "x" }]);
    assert.deepEqual(tied.map((r) => r.optionId), ["x", "y"]);
  });
});

describe("cutAdvancing", () => {
  it("advances the top K", () => {
    const cut = cutAdvancing(
      [
        { optionId: "a", count: 5 },
        { optionId: "b", count: 4 },
        { optionId: "c", count: 2 },
        { optionId: "d", count: 1 },
      ],
      2,
    );
    assert.deepEqual(cut, { advancing: ["a", "b"], eliminated: ["c", "d"], tieAtCut: false });
  });
  it("carries everyone tied at the cut line", () => {
    const cut = cutAdvancing(
      [
        { optionId: "a", count: 5 },
        { optionId: "b", count: 3 },
        { optionId: "c", count: 3 },
        { optionId: "d", count: 0 },
      ],
      2,
    );
    assert.deepEqual(cut, { advancing: ["a", "b", "c"], eliminated: ["d"], tieAtCut: true });
  });
  it("drops zero-vote options when anyone voted, even if that leaves fewer than K", () => {
    const cut = cutAdvancing(
      [
        { optionId: "a", count: 3 },
        { optionId: "b", count: 0 },
        { optionId: "c", count: 0 },
      ],
      2,
    );
    assert.deepEqual(cut, { advancing: ["a"], eliminated: ["b", "c"], tieAtCut: false });
  });
  it("advances everything when nobody voted", () => {
    const cut = cutAdvancing(
      [
        { optionId: "a", count: 0 },
        { optionId: "b", count: 0 },
        { optionId: "c", count: 0 },
      ],
      2,
    );
    assert.deepEqual(cut, { advancing: ["a", "b", "c"], eliminated: [], tieAtCut: false });
  });
  it("advances everything when the field is already small", () => {
    const cut = cutAdvancing([{ optionId: "a", count: 0 }, { optionId: "b", count: 1 }], 2);
    assert.deepEqual(cut, { advancing: ["a", "b"], eliminated: [], tieAtCut: false });
  });
});

describe("resolveFinal", () => {
  it("names a single leader", () => {
    assert.deepEqual(resolveFinal([{ optionId: "a", count: 4 }, { optionId: "b", count: 2 }]), { winnerId: "a", tiedIds: [] });
  });
  it("reports a tie among the leaders", () => {
    assert.deepEqual(
      resolveFinal([
        { optionId: "a", count: 3 },
        { optionId: "b", count: 3 },
        { optionId: "c", count: 1 },
      ]),
      { winnerId: null, tiedIds: ["a", "b"] },
    );
  });
  it("treats zero votes as a tie among everyone", () => {
    assert.deepEqual(resolveFinal([{ optionId: "a", count: 0 }, { optionId: "b", count: 0 }]), { winnerId: null, tiedIds: ["a", "b"] });
  });
  it("handles an empty field", () => {
    assert.deepEqual(resolveFinal([]), { winnerId: null, tiedIds: [] });
  });
});

describe("nextStep", () => {
  it("goes ideas -> shortlist when there are many ideas", () => {
    assert.deepEqual(nextStep("ideas_shortlist_final", "ideas", ["a", "b", "c", "d"], 2), { kind: "round", round: "shortlist" });
  });
  it("skips the shortlist when ideas already fit the final", () => {
    assert.deepEqual(nextStep("ideas_shortlist_final", "ideas", ["a", "b"], 2), { kind: "round", round: "final" });
  });
  it("decides immediately when only one idea is alive", () => {
    assert.deepEqual(nextStep("ideas_shortlist_final", "ideas", ["a"], 2), { kind: "decided", optionId: "a" });
    assert.deepEqual(nextStep("shortlist_final", "shortlist", ["a"], 2), { kind: "decided", optionId: "a" });
  });
  it("stalls when an ideas round produced nothing", () => {
    assert.equal(nextStep("ideas_shortlist_final", "ideas", [], 2).kind, "stalled");
  });
  it("goes shortlist -> final", () => {
    assert.deepEqual(nextStep("shortlist_final", "shortlist", ["a", "b"], 2), { kind: "round", round: "final" });
  });
  it("decides or ties after a final", () => {
    assert.deepEqual(nextStep("quick", "final", ["a", "b"], 2, { winnerId: "a", tiedIds: [] }), { kind: "decided", optionId: "a" });
    assert.deepEqual(nextStep("quick", "final", ["a", "b"], 2, { winnerId: null, tiedIds: ["a", "b"] }), { kind: "tie", tiedIds: ["a", "b"] });
  });
});

describe("roundLabel", () => {
  it("labels a quick vote", () => {
    assert.equal(roundLabel({ kind: "final", number: 1 }, [{ kind: "final", number: 1 }], "quick"), "Quick vote");
  });
  it("counts remaining rounds from the plan", () => {
    const all = [{ kind: "ideas" as const, number: 1 }];
    assert.equal(roundLabel(all[0], all, "ideas_shortlist_final"), "Round 1 of 3 · Ideas");
    const two = [...all, { kind: "shortlist" as const, number: 2 }];
    assert.equal(roundLabel(two[1], two, "ideas_shortlist_final"), "Round 2 of 3 · Shortlist");
  });
  it("shrinks the denominator when the shortlist was skipped", () => {
    const all = [{ kind: "ideas" as const, number: 1 }, { kind: "final" as const, number: 2 }];
    assert.equal(roundLabel(all[1], all, "ideas_shortlist_final"), "Round 2 of 2 · Final");
  });
  it("names a tiebreak", () => {
    const all = [{ kind: "final" as const, number: 1 }, { kind: "final" as const, number: 2 }];
    assert.equal(isTiebreak(all[1], all), true);
    assert.equal(isTiebreak(all[0], all), false);
    assert.equal(roundLabel(all[1], all, "quick"), "Tiebreak");
  });
});

describe("boundaries", () => {
  it("treats the exact deadline as past", () => {
    const t = new Date("2026-09-05T10:00:00Z");
    assert.equal(isPastDeadline(t, t), true);
    assert.equal(isPastDeadline(t, new Date(t.getTime() - 1)), false);
  });
  it("stalls a final that closed with no result", () => {
    assert.equal(nextStep("quick", "final", ["a"], 2).kind, "stalled");
  });
  it("keeps tieAtCut false when the tie sits below the cut", () => {
    const cut = cutAdvancing(
      [
        { optionId: "a", count: 5 },
        { optionId: "b", count: 4 },
        { optionId: "c", count: 2 },
        { optionId: "d", count: 2 },
      ],
      2,
    );
    assert.deepEqual(cut, { advancing: ["a", "b"], eliminated: ["c", "d"], tieAtCut: false });
  });
  it("goes to a shortlist with exactly one more idea than advance", () => {
    assert.deepEqual(nextStep("ideas_shortlist_final", "ideas", ["a", "b", "c"], 2), { kind: "round", round: "shortlist" });
  });
  it("does not call a lone zero-vote option a tie worth breaking", () => {
    assert.deepEqual(resolveFinal([{ optionId: "a", count: 0 }]), { winnerId: null, tiedIds: ["a"] });
  });
});

describe("hasQuorum", () => {
  it("needs half the seats, skips included", () => {
    assert.equal(hasQuorum(1, 6), false);
    assert.equal(hasQuorum(3, 6), true);
    assert.equal(hasQuorum(2, 3), true);
    assert.equal(hasQuorum(1, 3), false);
    assert.equal(hasQuorum(0, 0), false);
  });
});
