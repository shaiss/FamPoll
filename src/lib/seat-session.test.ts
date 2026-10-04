import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  attemptLinkSeatClaim,
  rotatePersonalLinkTokens,
  stampSeatSessionIfCurrent,
  type LinkSeatClaimRow,
} from "./seat-session";

function liveSeat(over: Partial<LinkSeatClaimRow> = {}): LinkSeatClaimRow {
  return {
    id: "mem_nana",
    personalLinkToken: "old-link",
    seatSessionToken: "old-cookie",
    linkSeat: true,
    userId: null,
    managedByUserId: null,
    namedSeatsEnabled: true,
    ...over,
  };
}

describe("attemptLinkSeatClaim", () => {
  it("claims with the current token and sets the seat-session cookie", () => {
    const seat = liveSeat({ seatSessionToken: null });
    const result = attemptLinkSeatClaim(seat, "old-link", "new-cookie");
    assert.equal(result.cookie, "new-cookie");
    assert.equal(result.seat.seatSessionToken, "new-cookie");
    assert.equal(result.seat.personalLinkToken, "old-link");
  });

  it("rejects a claim whose token was rotated before the write and sets no cookie", () => {
    const before = liveSeat({ seatSessionToken: "old-cookie" });
    const rotated = rotatePersonalLinkTokens(before, "new-link");
    const result = attemptLinkSeatClaim(rotated, "old-link", "raced-cookie");
    assert.equal(result.cookie, null);
    assert.equal(result.seat.seatSessionToken, null);
    assert.equal(result.seat.personalLinkToken, "new-link");
    assert.equal(stampSeatSessionIfCurrent(rotated, "old-link", "raced-cookie"), null);
  });
});

describe("rotatePersonalLinkTokens", () => {
  it("clears the seat session when minting a replacement /p/ token", () => {
    const rotated = rotatePersonalLinkTokens(liveSeat(), "new-link");
    assert.equal(rotated.personalLinkToken, "new-link");
    assert.equal(rotated.seatSessionToken, null);
  });
});

describe("claimPersonalLink write fence", () => {
  const src = readFileSync("src/lib/actions/seats.ts", "utf8");

  it("stamps the session only while the presented token still matches, then sets the cookie", () => {
    assert.match(src, /stampSeatSessionIfLinkCurrent/);
    const stampAt = src.indexOf("stampSeatSessionIfLinkCurrent");
    const rejectAt = src.indexOf("if (!stamped)");
    const cookieAt = src.indexOf("setSeatSessionToken(seatSessionToken)");
    const logAt = src.indexOf("kind: \"seat_claimed\"");
    assert.equal(stampAt > 0 && rejectAt > stampAt && cookieAt > rejectAt && logAt > rejectAt, true);
    assert.match(src, /if \(!stamped\) fail\(back, t\.errSeatLinkInvalid\)/);
  });

  it("rotation still writes a null seat session in the same update as the new token", () => {
    assert.match(src, /set\(\{ personalLinkToken, seatSessionToken: null \}\)/);
  });
});
