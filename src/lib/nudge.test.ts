import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messages } from "./messages";
import { nudgePeople, pasteNudgeLines, personalVoteUrl, reminderNudgeBody } from "./nudge";

describe("nudge Path A template", () => {
  const closesAt = new Date("2026-09-15T18:00:00Z");
  const link = "https://quorum.family/app/decisions/abc";
  const nanaLink = "https://quorum.family/p/nana-token";

  it("builds paste lines with deadline placeholder and Safari/Chrome line", () => {
    const t = messages("en");
    const lines = pasteNudgeLines(t, {
      pending: [{ displayName: "Nana" }, { displayName: "Eli" }],
      link,
      closesAt,
    });
    assert.equal(lines.length, 2);
    assert.equal(lines[0].text, "Still waiting on Nana, Eli — vote by {deadline}: https://quorum.family/app/decisions/abc");
    assert.equal(lines[0].closesAtIso, closesAt.toISOString());
    assert.match(lines[1].text, /Safari\/Chrome/);
  });

  it("lists personal /p/ URLs for pending link seats and keeps the shared decision link", () => {
    const t = messages("en");
    const lines = pasteNudgeLines(t, {
      pending: [
        { displayName: "Nana", personalLink: nanaLink },
        { displayName: "Eli" },
      ],
      link,
      closesAt,
    });
    assert.equal(lines.length, 3);
    assert.match(lines[0].text, /Still waiting on Nana, Eli/);
    assert.match(lines[0].text, /\/app\/decisions\/abc/);
    assert.equal(lines[1].text, "Nana: https://quorum.family/p/nana-token");
    assert.ok(!lines.some((l) => l.text.includes("Eli:")));
    assert.match(lines[2].text, /Safari\/Chrome/);
  });

  it("does not invent tokens when mapping seats", () => {
    const people = nudgePeople(
      [
        { displayName: "Nana", personalLinkToken: "tok-1" },
        { displayName: "Eli", personalLinkToken: null },
        { displayName: "Sam" },
      ],
      "https://quorum.family/",
    );
    assert.deepEqual(people, [
      { displayName: "Nana", personalLink: "https://quorum.family/p/tok-1" },
      { displayName: "Eli" },
      { displayName: "Sam" },
    ]);
    assert.equal(personalVoteUrl("https://quorum.family", "a/b"), "https://quorum.family/p/a%2Fb");
  });

  it("builds organizer email body with resolved deadline", () => {
    const t = messages("en");
    const now = new Date("2026-09-15T12:00:00Z");
    const body = reminderNudgeBody(t, {
      pending: [{ displayName: "Nana" }, { displayName: "Eli" }],
      link,
      closesAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      locale: "en",
      now,
    });
    assert.match(body, /Still waiting on Nana, Eli — vote by 2h:/);
    assert.match(body, /https:\/\/quorum\.family\/app\/decisions\/abc/);
    assert.match(body, /Safari\/Chrome/);
    assert.equal(body.includes("/p/"), false);
  });

  it("includes /p/ URLs in organizer email for pending link seats", () => {
    const t = messages("en");
    const now = new Date("2026-09-15T12:00:00Z");
    const body = reminderNudgeBody(t, {
      pending: nudgePeople(
        [
          { displayName: "Nana", personalLinkToken: "nana-token" },
          { displayName: "Eli" },
        ],
        "https://quorum.family",
      ),
      link,
      closesAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      locale: "en",
      now,
    });
    assert.match(body, /Nana: https:\/\/quorum\.family\/p\/nana-token/);
    assert.match(body, /\/app\/decisions\/abc/);
  });

  it("localizes Spanish and Portuguese paste templates", () => {
    const pending = [{ displayName: "Abuela", personalLink: "https://quorum.family/p/abuela" }];
    const es = pasteNudgeLines(messages("es"), { pending, link, closesAt });
    const pt = pasteNudgeLines(messages("pt-BR"), { pending: [{ displayName: "Vovó", personalLink: "https://quorum.family/p/vovo" }], link, closesAt });
    assert.match(es[0].text, /Aún esperando a Abuela/);
    assert.equal(es[1].text, "Abuela: https://quorum.family/p/abuela");
    assert.match(pt[0].text, /Ainda esperando por Vovó/);
    assert.equal(pt[1].text, "Vovó: https://quorum.family/p/vovo");
    assert.match(es[2].text, /Safari\/Chrome/);
    assert.match(pt[2].text, /Safari\/Chrome/);
  });
});
