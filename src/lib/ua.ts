import { headers } from "next/headers";

/** True inside Facebook, Messenger or Instagram's in-app browsers, where Google's OAuth is blocked. */
export async function isInAppBrowser(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return /FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(ua);
}
