import type { Locale } from "@/lib/locale";
import type { Messages } from "@/lib/messages";
import { closesRelative, formatDateRange } from "@/lib/format";
import { interpolate } from "@/lib/messages";
import type { summaryByToken } from "@/lib/queries";

export type SummaryShareData = NonNullable<Awaited<ReturnType<typeof summaryByToken>>>;

export type SummaryShareMeta = {
  title: string;
  description: string;
};

/** Title + description for link previews. Matches the public summary page; no voter names. */
export function summaryShareMeta(data: SummaryShareData, t: Messages, locale: Locale): SummaryShareMeta {
  const decided = data.decisions.filter((d) => d.decision.status === "decided");
  const open = data.decisions.filter((d) => d.decision.status === "open" && d.currentRound?.status === "open");
  const parts = [interpolate(t.pubMetaDecidedCount, { decided: decided.length, total: data.decisions.length })];
  if (open.length) {
    parts.push(
      `${open.length === 1 ? open[0].decision.title : interpolate(t.pubMetaOpenCount, { count: open.length })}${
        open.length === 1 && open[0].currentRound ? " · " + closesRelative(open[0].currentRound.closesAt, undefined, locale) : ""
      }`,
    );
  }
  const title = interpolate(t.pubMetaDecidedTitle, { event: data.event.title });
  const description = parts.join(" · ");
  return { title, description };
}

export type SummaryOgCard = {
  brandName: string;
  brandTagline: string;
  heading: string;
  eventTitle: string | null;
  dateLine: string;
  statusLine: string;
};

/** Visual copy for the OG image only — counts and dates, never names or vote results. */
export function summaryOgCard(data: SummaryShareData | null, brand: { name: string; tagline: string }, t: Messages, locale: Locale): SummaryOgCard {
  if (!data) {
    return {
      brandName: brand.name,
      brandTagline: brand.tagline,
      heading: t.pubDecidedHeading,
      eventTitle: null,
      dateLine: "",
      statusLine: "",
    };
  }
  const decided = data.decisions.filter((d) => d.decision.status === "decided").length;
  const open = data.decisions.filter((d) => d.decision.status === "open" && d.currentRound?.status === "open").length;
  const total = data.decisions.length;
  const statusParts = [interpolate(t.pubMetaDecidedCount, { decided, total })];
  if (open) statusParts.push(interpolate(t.pubMetaOpenCount, { count: open }));
  const dateLine = data.event.startsOn ? formatDateRange(data.event.startsOn, data.event.endsOn, locale) : t.pubDatesTBD;
  return {
    brandName: brand.name,
    brandTagline: brand.tagline,
    heading: t.pubDecidedHeading,
    eventTitle: data.event.title,
    dateLine,
    statusLine: statusParts.join(" · "),
  };
}

export function summaryOgImagePath(token: string): string {
  return `/s/${encodeURIComponent(token)}/opengraph-image`;
}
