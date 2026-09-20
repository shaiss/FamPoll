import Link from "next/link";
import { Card, Screen, SectionLabel, TopBar } from "@/components/ui";
import { SeatIdentityBar } from "@/components/seat-identity-bar";
import { Wordmark } from "@/components/wordmark";
import { requireLinkSeat } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";
import { seatOpenBallots } from "@/lib/queries";
import { hasClerk, hasDatabase } from "@/lib/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SeatHomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const error = readError(await searchParams);
  const seat = await requireLinkSeat();
  const t = await getMessages();
  const ballots = await seatOpenBallots(seat.familyId, seat.id);

  return (
    <Screen>
      <TopBar back="/" backLabel={t.pubHome} right={<Wordmark href="/" size={18} />} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[28px] font-bold leading-tight">{t.seatHomeTitle}</h1>
        <p className="text-sm text-ink-2">{seat.family.name}</p>
      </div>
      <SeatIdentityBar name={seat.displayName} />
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      {ballots.length === 0 ? (
        <Card className="p-4 text-sm text-ink-2">{t.seatHomeEmpty}</Card>
      ) : (
        <section className="flex flex-col gap-2">
          <SectionLabel>{t.homeNeedsYouLabel}</SectionLabel>
          {ballots.map(({ decision, event }) => (
            <Link key={decision.id} href={`/seat/decisions/${decision.id}`}>
              <Card className="flex flex-col gap-1 p-4 transition hover:border-accent">
                <div className="font-bold">{decision.title}</div>
                <div className="text-xs text-ink-2">{event.title}</div>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </Screen>
  );
}
