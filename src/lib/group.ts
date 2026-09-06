import { cookies } from "next/headers";

/**
 * A person can belong to several groups (families). One is "active": it decides
 * which group's home, events and People page they see. The choice lives in a
 * cookie so it survives navigation without a schema column; it is only ever a
 * group id the person is a member of (resolution falls back to their first
 * group when the cookie is missing or stale), so nothing sensitive travels in
 * it. Only server actions and route handlers may write cookies, so pages read
 * it (and fall back) while switch/create/join/leave write it.
 */
export const ACTIVE_GROUP_COOKIE = "fp_group";

/** The active group id from the request cookie, or null when none is set. */
export async function getActiveGroupId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_GROUP_COOKIE)?.value ?? null;
}

/** Point the active group at `familyId`. Server actions / route handlers only. */
export async function setActiveGroupId(familyId: string): Promise<void> {
  const store = await cookies();
  store.set(ACTIVE_GROUP_COOKIE, familyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Forget the active group (e.g. after leaving it); resolution then falls back to the first group. */
export async function clearActiveGroupId(): Promise<void> {
  const store = await cookies();
  store.delete(ACTIVE_GROUP_COOKIE);
}
