"use client";

import { useSyncExternalStore } from "react";
import { closesLabel, formatDate } from "@/lib/format";

type Mode = "closes" | "date" | "weekday";

const noop = () => () => {};
/** false during server render and hydration, true once the browser owns the page. */
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

/**
 * Renders a time in the viewer's own time zone. The server sends a
 * zone-free fallback ("closes in 3h"); the browser swaps in the local
 * absolute form ("closes Sun 8pm") once hydrated.
 */
export function LocalTime({ iso, mode, fallback }: { iso: string; mode: Mode; fallback: string }) {
  const isClient = useIsClient();
  if (!isClient) return <>{fallback}</>;
  const d = new Date(iso);
  if (mode === "closes") return <>{closesLabel(d)}</>;
  if (mode === "weekday") return <>{formatDate(d, { weekday: "long", month: "short", day: "numeric" })}</>;
  return <>{formatDate(d)}</>;
}
