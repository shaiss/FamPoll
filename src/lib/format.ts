const day = 24 * 60 * 60 * 1000;

export function formatDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  return new Intl.DateTimeFormat("en-US", opts).format(date);
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${formatDate(s, { month: "short" })} ${s.getDate()}–${e.getDate()}`;
  }
  return `${formatDate(s)} – ${formatDate(e)}`;
}

export function nightsBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const s = new Date(start + "T00:00:00").getTime();
  const e = new Date(end + "T00:00:00").getTime();
  const n = Math.round((e - s) / day);
  return n > 0 ? n : null;
}

/** "closes Sun 8pm", "closes in 2h", "closed" */
export function closesLabel(closesAt: Date, now = new Date()): string {
  const diff = closesAt.getTime() - now.getTime();
  if (diff <= 0) return "closing now";
  if (diff < 60 * 60 * 1000) return `closes in ${Math.max(1, Math.round(diff / 60000))} min`;
  if (diff < 12 * 60 * 60 * 1000) return `closes in ${Math.round(diff / 3600000)}h`;
  if (diff < 6 * day) {
    return "closes " + new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric" }).format(closesAt).replace(" AM", "am").replace(" PM", "pm");
  }
  return "closes " + formatDate(closesAt);
}

export function relativeTime(d: Date, now = new Date()): string {
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.round(diff / 60000)} min ago`;
  if (diff < day) return `${Math.round(diff / 3600000)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return formatDate(d);
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

export function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}
