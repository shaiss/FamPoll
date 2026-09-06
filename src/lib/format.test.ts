import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clipTitle } from "./format";

describe("clipTitle", () => {
  it("passes short-text and date titles through untouched", () => {
    assert.equal(clipTitle("Beach house in Cascais", "text"), "Beach house in Cascais");
    assert.equal(clipTitle("Jul 11–18 · 7 nights", "date"), "Jul 11–18 · 7 nights");
  });
  it("keeps a short single-line paragraph whole", () => {
    assert.equal(clipTitle("Fly Friday, stay in Alfama.", "long_text"), "Fly Friday, stay in Alfama.");
  });
  it("takes the first line of a paragraph and marks the cut", () => {
    assert.equal(clipTitle("Plan A: fly Friday.\nStay in Alfama, walk everywhere.", "long_text"), "Plan A: fly Friday.…");
  });
  it("clips a long first line to the limit", () => {
    const long = "A".repeat(100);
    const out = clipTitle(long, "long_text");
    assert.equal(out.length, 70);
    assert.ok(out.endsWith("…"));
    assert.equal(clipTitle(long, "long_text", 10), "AAAAAAAAA…");
  });
  it("skips leading blank lines", () => {
    assert.equal(clipTitle("\n\n  Second line is first  \nmore", "long_text"), "Second line is first…");
  });
});
