import { ImageResponse } from "next/og";
import { brandFor } from "@/lib/brand";
import { hasDatabase } from "@/lib/env";
import { getLocale, getMessages } from "@/lib/locale-server";
import { summaryOgCard } from "@/lib/og/summary-share";
import { SUMMARY_OG_SIZE, SummaryOgImage } from "@/lib/og/summary-og-image";
import { summaryByToken } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Event summary";
export const size = SUMMARY_OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const locale = await getLocale();
  const brand = brandFor(locale);
  const t = await getMessages();
  const { token } = await params;
  const data = hasDatabase ? await summaryByToken(token) : null;
  const card = summaryOgCard(data, brand, t, locale);

  return new ImageResponse(<SummaryOgImage card={card} />, SUMMARY_OG_SIZE);
}
