import { headers } from "next/headers";

export type InAppPlatform = "ios" | "android" | "other";

export type InAppBrowserInfo = {
  inApp: boolean;
  platform: InAppPlatform;
  userAgent: string;
};

function platformFromUa(ua: string): InAppPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

/** True inside Facebook, Messenger or Instagram's in-app browsers, where Google's OAuth is blocked. */
export async function isInAppBrowser(): Promise<boolean> {
  return (await inAppBrowserInfo()).inApp;
}

/** Detect Messenger/FB/IG webviews and rough OS so UI can show Safari vs Chrome steps. */
export async function inAppBrowserInfo(): Promise<InAppBrowserInfo> {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const inApp = /FBAN|FBAV|FB_IAB|Messenger|Instagram/i.test(userAgent);
  return { inApp, platform: platformFromUa(userAgent), userAgent };
}
