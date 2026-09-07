import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_FEEDBACK_LENGTH, sanitizeFeedback } from "./github";

const ZW = "​";

describe("sanitizeFeedback", () => {
  it("keeps ordinary feedback intact", () => {
    assert.equal(sanitizeFeedback("The vote button is hard to find on the decision page."), "The vote button is hard to find on the decision page.");
  });

  it("removes links, where pasted share tokens and invite codes leak", () => {
    assert.equal(sanitizeFeedback("Broken here: https://fampoll.app/s/ab3cd4ef5gh6jk please fix"), "Broken here: [link removed] please fix");
    assert.equal(sanitizeFeedback("see www.example.com/x"), "see [link removed]");
  });

  it("removes bare capability paths even without a full URL", () => {
    assert.equal(sanitizeFeedback("the /join/ab3cd4ef5gh6jk link failed"), "the [link removed] link failed");
    assert.equal(sanitizeFeedback("opening /s/xyz789abc broke it"), "opening [link removed] broke it");
  });

  it("removes email addresses", () => {
    assert.equal(sanitizeFeedback("reach me at jo.doe@example.com ok"), "reach me at [email removed] ok");
  });

  it("redacts standalone capability secrets but spares ordinary words", () => {
    // 14-char id / 16-char code shapes that carry a digit look like real tokens.
    assert.equal(sanitizeFeedback("code ab3cd4ef5gh6jk here"), "code [code removed] here");
    // A long all-letter word has no digit, so it survives.
    assert.equal(sanitizeFeedback("understandings matter"), "understandings matter");
  });

  it("neutralizes GitHub @mentions and #issue references", () => {
    const out = sanitizeFeedback("ping @maintainer about fixes #42");
    assert.ok(out.includes(`@${ZW}maintainer`), "mention should be defused");
    assert.ok(out.includes(`#${ZW}42`), "issue reference should be defused");
    assert.ok(!/@maintainer/.test(out), "no raw @mention survives");
  });

  it("strips HTML tags", () => {
    assert.equal(sanitizeFeedback("hi <b>there</b> friend"), "hi there friend");
  });

  it("trims and caps length", () => {
    assert.equal(sanitizeFeedback("   spaced   "), "spaced");
    assert.equal(sanitizeFeedback("x".repeat(5000)).length, MAX_FEEDBACK_LENGTH);
  });
});
