import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { Card, Screen } from "@/components/ui";
import { InAppBrowserNotice } from "@/components/in-app-browser-notice";
import { SubmitButton } from "@/components/submit-button";
import { Wordmark } from "@/components/wordmark";
import { claimPersonalLink } from "@/lib/actions/seats";
import { isLinkSeat, memberBySeatSession } from "@/lib/auth";
import { brandFor } from "@/lib/brand";
import { getDb, schema } from "@/lib/db";
import { hasClerk, hasDatabase } from "@/lib/env";
import { readError } from "@/lib/flash";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages();
  const b = brandFor(await getLocale());
  return { title: `${t.pubMetaPersonalLinkTitle} · ${b.name}`, robots: { index: false } };
}

export default async function PersonalLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token: raw } = await params;
  const token = raw.trim().toLowerCase();
  const error = readError(await searchParams);
  const t = await getMessages();

  if (!hasClerk || !hasDatabase) redirect("/setup");

  const existing = await memberBySeatSession();
  if (existing) redirect("/seat");

  const seat = await getDb().query.members.findFirst({
    where: and(eq(schema.members.personalLinkToken, token), eq(schema.members.linkSeat, true)),
    with: { family: true },
  });

  if (!seat || !isLinkSeat(seat) || !seat.family.namedSeatsEnabled) {
    return (
      <Screen className="pt-14">
        <Wordmark href="/" />
        <Card className="flex flex-col gap-3 p-5">
          <h1 className="font-display text-2xl font-bold">{t.pubInvalidTitle}</h1>
          <p className="text-ink-2">{t.errSeatLinkInvalid}</p>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <Card className="flex flex-col gap-4 p-5 shadow-card">
        <div>
          <div className="text-[13px] text-ink-2">{seat.family.name}</div>
          <h1 className="font-display text-[26px] font-bold tracking-[-0.01em]">{interpolate(t.seatClaimTitle, { name: seat.displayName })}</h1>
          <p className="mt-2 text-sm text-ink-2">{t.seatClaimBody}</p>
        </div>
        <InAppBrowserNotice />
        <form action={claimPersonalLink} className="flex flex-col gap-2">
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel={t.seatClaimPending}>{interpolate(t.seatClaimButton, { name: seat.displayName })}</SubmitButton>
        </form>
        {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      </Card>
    </Screen>
  );
}
