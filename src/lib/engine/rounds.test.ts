import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  closesAtFrom,
  cutAdvancing,
  isPastDeadline,
  isTiebreak,
  maxPicksFor,
  nextStep,
  resolveFinal,
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

describe("maxPicksFor", () => {
  it("gives no picks in ideas, N in shortlist, one in final", () => {
    assert.equal(maxPicksFor("ideas", 2), 0);
    assert.equal(maxPicksFor("shortlist", 2), 2);
    assert.equal(maxPicksFor("shortlist", 0), 1);
    assert.equal(maxPicksFor("final", 2), 1);
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
