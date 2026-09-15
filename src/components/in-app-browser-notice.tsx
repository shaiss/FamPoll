import { getMessages } from "@/lib/locale-server";
import { inAppBrowserInfo } from "@/lib/ua";

/**
 * Strong “Open in Safari/Chrome” banner for Messenger/FB/IG webviews.
 * Clear step copy beats Android intent:// (no existing pattern; ToS/fragility risk).
 */
export async function InAppBrowserNotice({ className = "" }: { className?: string } = {}) {
  const info = await inAppBrowserInfo();
  if (!info.inApp) return null;
  const t = await getMessages();
  const steps =
    info.platform === "ios" ? t.inAppHintIos : info.platform === "android" ? t.inAppHintAndroid : t.inAppHint;
  return (
    <aside
      role="status"
      className={`flex flex-col gap-1.5 rounded-[12px] border border-accent-line bg-accent-tint px-3 py-3 text-accent-deep ${className}`}
    >
      <p className="text-sm font-extrabold tracking-[-0.01em]">{t.inAppOpenTitle}</p>
      <p className="text-sm font-semibold leading-snug whitespace-pre-line">{steps}</p>
    </aside>
  );
}
