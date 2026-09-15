import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { messages } from "./messages";
import { pasteNudgeLines, reminderNudgeBody } from "./nudge";

describe("nudge Path A template", () => {
  const closesAt = new Date("2026-09-15T18:00:00Z");
  const link = "https://quorum.family/app/decisions/abc";

  it("builds paste lines with deadline placeholder and Safari/Chrome line", () => {
    const t = messages("en");
    const lines = pasteNudgeLines(t, { names: ["Nana", "Eli"], link, closesAt });
    assert.equal(lines.length, 2);
    assert.equal(lines[0].text, "Still waiting on Nana, Eli — vote by {deadline}: https://quorum.family/app/decisions/abc");
    assert.equal(lines[0].closesAtIso, closesAt.toISOString());
    assert.match(lines[1].text, /Safari\/Chrome/);
  });

  it("builds organizer email body with resolved deadline", () => {
    const t = messages("en");
    const now = new Date("2026-09-15T12:00:00Z");
    const body = reminderNudgeBody(t, {
      names: ["Nana", "Eli"],
      link,
      closesAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      locale: "en",
      now,
    });
    assert.match(body, /Still waiting on Nana, Eli — vote by 2h:/);
    assert.match(body, /https:\/\/quorum\.family\/app\/decisions\/abc/);
    assert.match(body, /Safari\/Chrome/);
  });

  it("localizes Spanish and Portuguese paste templates", () => {
    const es = pasteNudgeLines(messages("es"), { names: ["Abuela"], link, closesAt });
    const pt = pasteNudgeLines(messages("pt-BR"), { names: ["Vovó"], link, closesAt });
    assert.match(es[0].text, /Aún esperando a Abuela/);
    assert.match(pt[0].text, /Ainda esperando por Vovó/);
    assert.match(es[1].text, /Safari\/Chrome/);
    assert.match(pt[1].text, /Safari\/Chrome/);
  });
});
