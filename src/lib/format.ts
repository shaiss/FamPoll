import { DEFAULT_LOCALE, type Locale } from "./locale";
import { interpolate, messages } from "./messages";

const day = 24 * 60 * 60 * 1000;

/** Locale tag Intl understands, per app locale. */
const BCP47: Record<Locale, string> = { en: "en-US", es: "es", "pt-BR": "pt-BR" };

export function formatDate(
  d: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  return new Intl.DateTimeFormat(BCP47[locale], opts).format(date);
}

export function formatDateRange(start: string | null, end: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!start && !end) return "";
  if (start && !end) return formatDate(start, undefined, locale);
  if (!start && end) return formatDate(end, undefined, locale);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${formatDate(s, { month: "short" }, locale)} ${s.getDate()}–${e.getDate()}`;
  }
  return `${formatDate(s, undefined, locale)} – ${formatDate(e, undefined, locale)}`;
}

export function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end + "T00:00:00").getTime();
  const n = Math.round((e - s) / day);
  return n > 0 ? n : null;
}

/** "closes Sun 8pm", "closes in 2h", "closing now" — in the viewer's time zone. */
export function closesLabel(closesAt: Date, now = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const t = messages(locale);
  const diff = closesAt.getTime() - now.getTime();
  if (diff <= 0) return t.fmtClosingNow;
  if (diff < 60 * 60 * 1000) return interpolate(t.fmtClosesInMin, { n: Math.max(1, Math.round(diff / 60000)) });
  if (diff < 12 * 60 * 60 * 1000) return interpolate(t.fmtClosesInHours, { n: Math.round(diff / 3600000) });
  if (diff < 6 * day) {
    const when = new Intl.DateTimeFormat(BCP47[locale], { weekday: "short", hour: "numeric" }).format(closesAt).replace(" AM", "am").replace(" PM", "pm");
    return interpolate(t.fmtClosesWhen, { when });
  }
  return interpolate(t.fmtClosesWhen, { when: formatDate(closesAt, undefined, locale) });
}

export function relativeTime(d: Date, now = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const t = messages(locale);
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return t.fmtJustNow;
  if (diff < 3600000) return interpolate(t.fmtMinAgo, { n: Math.round(diff / 60000) });
  if (diff < day) return interpolate(t.fmtHoursAgo, { n: Math.round(diff / 3600000) });
  if (diff < 7 * day) return interpolate(t.fmtDaysAgo, { n: Math.round(diff / day) });
  return formatDate(d, undefined, locale);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ["#F1C27D", "#E8A598", "#B8B5D6", "#9FC5E8", "#A7C4BC", "#F5D06F", "#F3B6A0", "#C9D8A3"];

export function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Time-zone-free version for server rendering: "closes in 3h", "closes in 2 days". */
export function closesRelative(closesAt: Date, now = new Date(), locale: Locale = DEFAULT_LOCALE): string {
  const t = messages(locale);
  const diff = closesAt.getTime() - now.getTime();
  if (diff <= 0) return t.fmtClosingNow;
  if (diff < 60 * 60 * 1000) return interpolate(t.fmtClosesInMin, { n: Math.max(1, Math.round(diff / 60000)) });
  if (diff < 36 * 60 * 60 * 1000) return interpolate(t.fmtClosesInHours, { n: Math.round(diff / 3600000) });
  return interpolate(t.fmtClosesInDays, { n: Math.round(diff / day) });
}

/** "Jul 11–18 · 7 nights" for a date-range option. */
export function dateRangeTitle(start: string, end: string | null, locale: Locale = DEFAULT_LOCALE): string {
  const range = formatDateRange(start, end, locale);
  const n = nightsBetween(start, end ?? start);
  if (!n) return range;
  const t = messages(locale);
  const nights = interpolate(n === 1 ? t.fmtNightSingular : t.fmtNightPlural, { count: n });
  return `${range} · ${nights}`;
}

/**
 * A long-text option is a paragraph; lists, log lines and copy text want one
 * short line of it. Other formats pass through untouched.
 */
export function clipTitle(title: string, format: "text" | "long_text" | "date", max = 70): string {
  if (format !== "long_text") return title;
  const line = title.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";
  const clipped = line.length < title.trim().length;
  if (line.length <= max && !clipped) return line;
  return line.slice(0, Math.max(1, max - 1)).trimEnd() + "…";
}
