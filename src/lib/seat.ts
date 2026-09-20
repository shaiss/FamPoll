import { cookies } from "next/headers";

/** HttpOnly cookie holding `members.seat_session_token` after a personal-link claim. */
export const SEAT_COOKIE = "fp_seat";

export async function getSeatSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SEAT_COOKIE)?.value ?? null;
}

export async function setSeatSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SEAT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
}

export async function clearSeatSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SEAT_COOKIE);
}
