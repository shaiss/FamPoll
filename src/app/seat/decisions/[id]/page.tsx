import Link from "next/link";
import { notFound } from "next/navigation";
import { VoteForm } from "@/components/vote-form";
import { SeatIdentityBar } from "@/components/seat-identity-bar";
import { Card, Screen, SectionLabel, TopBar } from "@/components/ui";
import { LocalTime } from "@/components/time";
import { requireLinkSeat } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { closesRelative } from "@/lib/format";
import { effectivePicks, roundLabel } from "@/lib/engine/rounds";
import { decisionDataForLinkSeat } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { hasClerk, hasDatabase } from "@/lib/env";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SeatDecisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const { id } = await params;
  const error = readError(await searchParams);
  const seat = await requireLinkSeat();
  const data = await decisionDataForLinkSeat(id, seat);
  if (!data) notFound();
  const { decision, event, rounds, currentRound, options, hiddenDefault } = data;
  const t = await getMessages();
  const locale = await getLocale();
  const planning = event.status === "planning";
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const open = planning && currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  const pickCap = open ? effectivePicks(open.maxPicks, alive.length) : 0;
  const rankedFinalOpen = !!open && open.kind === "final" && decision.rankedFinal;
  const decided = decision.status === "decided";

  const myVotes = open ? open.votes.filter((v) => v.memberId === seat.id) : [];
  const mine = rankedFinalOpen
    ? [...myVotes].filter((v) => v.optionId !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((v) => v.optionId as string)
    : myVotes.map((v) => v.optionId).filter((id): id is string => id !== null);
  const skipped = myVotes.some((v) => v.optionId === null);

  return (
    <Screen>
      <TopBar back="/seat" backLabel={t.seatHomeTitle} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] font-bold leading-tight">{decision.title}</h1>
        <p className="text-sm text-ink-2">{event.title}</p>
      </div>
      <SeatIdentityBar name={seat.displayName} />
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}

      {decided ? (
        <Card className="p-4 text-sm text-ink-2">
          {t.errDecAlreadySettled}
          <Link href="/seat" className="mt-2 block font-semibold text-accent-deep">{t.seatHomeTitle}</Link>
        </Card>
      ) : null}

      {open && open.kind !== "ideas" ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>{roundLabel(t, open, rounds, decision.plan)}</SectionLabel>
          <VoteForm
            key={`${open.id}:${seat.id}`}
            roundId={open.id}
            memberId={seat.id}
            maxPicks={pickCap}
            ranked={rankedFinalOpen}
            initial={mine}
            changed={mine.length > 0}
            skipped={skipped}
            hiddenDefault={hiddenDefault.get(seat.id) ?? false}
            options={alive.map((o) => ({
              id: o.id,
              title: o.title,
              byline: [o.addedBy ? interpolate(t.decisionpersonsIdea, { name: o.addedBy.displayName }) : null, o.note].filter(Boolean).join(" · "),
              longText: decision.format === "long_text",
            }))}
          />
          <p className="text-center text-xs text-ink-3">
            {t.decisionchangeMindNote.split("{closes}")[0]}
            <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt, undefined, locale)} />
            {t.decisionchangeMindNote.split("{closes}")[1]}
          </p>
        </section>
      ) : !decided ? (
        <Card className="p-4 text-sm text-ink-2">{open?.kind === "ideas" ? t.decisionorganizerCollectingIdeas : t.seatHomeEmpty}</Card>
      ) : null}
    </Screen>
  );
}
