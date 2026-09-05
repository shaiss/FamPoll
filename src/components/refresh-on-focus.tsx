"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Re-fetches the page when the tab comes back into view, so counts don't go stale on a phone left open. */
export function RefreshOnFocus() {
  const router = useRouter();
  const last = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < 10_000) return;
      last.current = now;
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);
  return null;
}
