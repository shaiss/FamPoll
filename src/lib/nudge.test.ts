import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { messages } from "./messages";
import { nudgePeople, pasteNudgeLines, personalVoteUrl, reminderNudgeBody, storedPersonalLinkToken, visibleRosterMember } from "./nudge";

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

  it("never invents tokens and only returns stored ones for live named link seats", () => {
    const live = { includePersonalLinks: true, namedSeatsEnabled: true, isLiveLinkSeat: true };
    assert.equal(storedPersonalLinkToken("tok-1", live), "tok-1");
    assert.equal(storedPersonalLinkToken("  tok-1  ", live), "tok-1");
    assert.equal(storedPersonalLinkToken("   ", live), null);
    assert.equal(storedPersonalLinkToken(undefined, live), null);
    assert.equal(storedPersonalLinkToken("tok-1", { ...live, namedSeatsEnabled: false }), null);
    assert.equal(storedPersonalLinkToken("tok-1", { ...live, isLiveLinkSeat: false }), null);
  });

  it("omits /p/ lines from member-facing copy even when stored tokens exist", () => {
    const t = messages("en");
    const waiters = [
      {
        displayName: "Nana",
        personalLinkToken: storedPersonalLinkToken("nana-token", {
          includePersonalLinks: false,
          namedSeatsEnabled: true,
          isLiveLinkSeat: true,
        }),
      },
      {
        displayName: "Eli",
        personalLinkToken: storedPersonalLinkToken(null, {
          includePersonalLinks: false,
          namedSeatsEnabled: true,
          isLiveLinkSeat: false,
        }),
      },
    ];
    const lines = pasteNudgeLines(t, { pending: nudgePeople(waiters, "https://quorum.family"), link, closesAt });
    assert.equal(lines.length, 2);
    assert.match(lines[0].text, /Still waiting on Nana, Eli/);
    assert.match(lines[0].text, /\/app\/decisions\/abc/);
    assert.equal(lines.some((l) => l.text.includes("/p/")), false);
    assert.equal(lines.some((l) => l.text.includes("nana-token")), false);
    assert.match(lines[1].text, /Safari\/Chrome/);
  });

  it("includes /p/ lines in organizer copy for live link seats", () => {
    const t = messages("en");
    const waiters = [
      {
        displayName: "Nana",
        personalLinkToken: storedPersonalLinkToken("nana-token", {
          includePersonalLinks: true,
          namedSeatsEnabled: true,
          isLiveLinkSeat: true,
        }),
      },
      {
        displayName: "Eli",
        personalLinkToken: storedPersonalLinkToken("should-not-appear", {
          includePersonalLinks: true,
          namedSeatsEnabled: true,
          isLiveLinkSeat: false,
        }),
      },
    ];
    const lines = pasteNudgeLines(t, { pending: nudgePeople(waiters, "https://quorum.family"), link, closesAt });
    assert.equal(lines[1].text, "Nana: https://quorum.family/p/nana-token");
    assert.ok(!lines.some((l) => l.text.includes("Eli:")));
    assert.ok(!lines.some((l) => l.text.includes("should-not-appear")));
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
          {
            displayName: "Nana",
            personalLinkToken: storedPersonalLinkToken("nana-token", {
              includePersonalLinks: true,
              namedSeatsEnabled: true,
              isLiveLinkSeat: true,
            }),
          },
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

  it("localizes member-facing Spanish and Portuguese copy without /p/ lines", () => {
    const memberOpts = { includePersonalLinks: false, namedSeatsEnabled: true, isLiveLinkSeat: true } as const;
    const es = pasteNudgeLines(messages("es"), {
      pending: nudgePeople(
        [{ displayName: "Abuela", personalLinkToken: storedPersonalLinkToken("abuela", memberOpts) }],
        "https://quorum.family",
      ),
      link,
      closesAt,
    });
    const pt = pasteNudgeLines(messages("pt-BR"), {
      pending: nudgePeople(
        [{ displayName: "Vovó", personalLinkToken: storedPersonalLinkToken("vovo", memberOpts) }],
        "https://quorum.family",
      ),
      link,
      closesAt,
    });
    assert.match(es[0].text, /Aún esperando a Abuela/);
    assert.match(es[0].text, /\/app\/decisions\/abc/);
    assert.equal(es.length, 2);
    assert.equal(es.some((l) => l.text.includes("/p/")), false);
    assert.match(pt[0].text, /Ainda esperando por Vovó/);
    assert.equal(pt.length, 2);
    assert.equal(pt.some((l) => l.text.includes("/p/")), false);
  });
});

describe("visibleRosterMember", () => {
  const linkSeat = {
    displayName: "Nana",
    linkSeat: true,
    userId: null,
    managedByUserId: null,
    personalLinkToken: "nana-token",
    seatSessionToken: "seat-cookie",
  };
  const signedIn = {
    displayName: "Eli",
    linkSeat: false,
    userId: "user_eli",
    managedByUserId: null,
    personalLinkToken: "should-not-appear",
    seatSessionToken: "eli-cookie",
  };
  const live = { includePersonalLinks: true, namedSeatsEnabled: true };

  it("keeps a live /p/ token for organizers and always drops seat cookies", () => {
    const row = visibleRosterMember(linkSeat, live);
    assert.equal(row.personalLinkToken, "nana-token");
    assert.equal(row.seatSessionToken, null);
  });

  it("strips another seat's token for non-organizers", () => {
    const row = visibleRosterMember(linkSeat, { includePersonalLinks: false, namedSeatsEnabled: true });
    assert.equal(row.personalLinkToken, null);
    assert.equal(row.seatSessionToken, null);
    assert.equal(row.displayName, "Nana");
  });

  it("omits /p/ tokens when named seats are off, even for organizers", () => {
    const row = visibleRosterMember(linkSeat, { includePersonalLinks: true, namedSeatsEnabled: false });
    assert.equal(row.personalLinkToken, null);
  });

  it("never keeps a token on a signed-in seat", () => {
    const row = visibleRosterMember(signedIn, live);
    assert.equal(row.personalLinkToken, null);
    assert.equal(row.seatSessionToken, null);
  });
});

describe("family roster personal-link controls", () => {
  const src = readFileSync("src/app/app/family/page.tsx", "utf8");

  it("projects members through visibleRosterMember before render", () => {
    assert.match(src, /visibleRosterMember/);
    assert.match(src, /includePersonalLinks:\s*organizer/);
    assert.match(src, /rotatePersonalLink/);
    assert.match(src, /familyPersonalLinkLabel/);
  });
});
