import Link from "next/link";
import { LocalTime } from "@/components/time";
import { AvatarStack, Card, Icon, LinkButton, Pill, Progress, SectionLabel, Screen } from "@/components/ui";
import { GroupSwitcher } from "@/components/group-switcher";
import { ShareButton } from "@/components/share-button";
import { CopyButton } from "@/components/copy-button";
import { brand } from "@/lib/brand";
import { baseUrl } from "@/lib/url";
import { requireMembership } from "@/lib/auth";
import { roundLabel } from "@/lib/engine/rounds";
import { closesRelative, formatDate, formatDateRange } from "@/lib/format";
import { homeData } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate, type Messages } from "@/lib/messages";

function openLabel(c: { openVotingRounds: number; openIdeasRounds: number; open: number }, t: Messages): string {
  const parts: string[] = [];
  if (c.openVotingRounds) parts.push(interpolate(t.homeRoundsOpen, { count: c.openVotingRounds }));
  if (c.openIdeasRounds) parts.push(t.homeGatheringIdeas);
  if (parts.length) return parts.join(" · ");
  return c.open ? interpolate(t.homeDecisionsWaiting, { count: c.open }) : t.homeAllSettled;
}

export default async function Home() {
  const { user, family, memberships } = await requireMembership();
  const { needsVote, events, members, seats } = await homeData(family.id, user.id);
  const base = await baseUrl();
  const t = await getMessages();
  const locale = await getLocale();
  const KIND_LABEL: Record<string, string> = { trip: t.homeKindTrip, outing: t.homeKindOuting, meal: t.homeKindMeal, party: t.homeKindParty, other: t.homeKindEvent };
  const inviteUrl = `${base}/join/${family.inviteCode}`;
  const soloOrganizer = members.filter((m) => m.userId !== null).length === 1;
  const live = events.filter((e) => e.event.status === "planning");
  const past = events.filter((e) => e.event.status !== "planning");
  const firstName = user.name.split(" ")[0];
  const now = new Date();

  return (
    <Screen className="relative pt-8">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium text-ink-2">
            <LocalTime iso={now.toISOString()} mode="weekday" fallback={formatDate(now, { month: "short", day: "numeric" }, locale)} />
          </div>
          <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">{interpolate(t.homeGreeting, { name: firstName })}</h1>
        </div>
        <GroupSwitcher memberships={memberships} activeId={family.id} memberNames={members.map((m) => m.displayName)} />
      </div>

      <section className="flex flex-col gap-2.5">
        <SectionLabel tone="accent" right={needsVote.length ? interpolate(t.homeOpenCount, { count: needsVote.length }) : undefined}>
          {t.homeNeedsYouLabel}
        </SectionLabel>
        {needsVote.length === 0 ? (
          <Card className="p-4 text-sm text-ink-2">{t.homeNothingWaiting}</Card>
        ) : (
          needsVote.map((n) => {
            const proxies = n.pendingSeats.filter((s) => s.userId !== user.id);
            const ideas = n.kind === "ideas";
            if (n.kind === "organizer") {
              const why = n.reason === "tie" ? t.homeReasonTie : n.reason === "no_quorum" ? t.homeReasonNoQuorum : t.homeReasonNothing;
              return (
                <Card key={n.decision.id + n.round.id} className="flex flex-col gap-3 border-ink bg-ink p-4 text-white">
                  <Pill tone="accent">{t.homeOnYouPill}</Pill>
                  <div className="flex flex-col gap-0.5">
                    <div className="font-display text-xl font-bold tracking-[-0.01em]">{n.decision.title}</div>
                    <div className="text-[13px] text-line">
                      {n.event.title} · {why}
                    </div>
                  </div>
                  <LinkButton href={`/app/decisions/${n.decision.id}`} size="sm">
                    {t.homeSortItOut}
                  </LinkButton>
                </Card>
              );
            }
            return (
              <Card key={n.decision.id + n.round.id} accent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Pill tone="accent">
                    <Icon name="clock" size={12} stroke={2.5} />
                    {ideas ? t.homeIdeasWanted : roundLabel(t, n.round, n.rounds, n.decision.plan)} · <LocalTime iso={n.round.closesAt.toISOString()} mode="closes" fallback={closesRelative(n.round.closesAt, now, locale)} />
                  </Pill>
                  <Icon name="chevron-right" size={18} stroke={2.25} className="text-ink-3" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-display text-xl font-bold tracking-[-0.01em]">{n.decision.title}</div>
                  <div className="text-[13px] text-ink-2">
                    {n.event.title}
                    {!ideas && n.picks > 1 ? ` · ${interpolate(t.homePickUpTo, { count: n.picks })}` : ""}
                    {proxies.length ? ` · ${interpolate(t.homeAlsoFor, { names: proxies.map((p) => p.displayName).join(", ") })}` : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarStack names={n.votedNames} size={24} max={4} ring="#ffffff" />
                    <span className="text-xs text-ink-2">
                      {ideas ? interpolate(t.homeAddedIdeasCount, { count: n.votedNames.length, total: n.totalSeats }) : interpolate(t.homeVotedCount, { count: n.votedNames.length, total: n.totalSeats })}
                    </span>
                  </div>
                  <LinkButton href={`/app/decisions/${n.decision.id}`} size="sm">
                    {ideas ? t.homeAddIdea : t.homeVote}
                  </LinkButton>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {soloOrganizer ? (
        <Card accent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-0.5">
            <div className="font-display text-lg font-bold">{t.homeSoloTitle}</div>
            <p className="text-sm text-ink-2">{t.homeSoloBody}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton url={inviteUrl} title={interpolate(t.homeShareTitle, { family: family.name, brand: brand.name })} text={interpolate(t.homeShareText, { brand: brand.name })} />
            <CopyButton text={inviteUrl} />
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={past.length ? <Link href="#past">{t.homeSeePast}</Link> : undefined}>{t.homeEventsLabel}</SectionLabel>
        {live.length === 0 ? (
          <Card className="flex flex-col gap-2 p-4">
            <div className="font-display text-lg font-bold">{t.homeNoEventsTitle}</div>
            <p className="text-sm text-ink-2">{t.homeNoEventsBody}</p>
          </Card>
        ) : null}
        {live.map((c) => (
          <Link key={c.event.id} href={`/app/events/${c.event.id}`} className="block">
            <Card className="flex flex-col gap-3 p-4 transition hover:border-line-2">
              <div className="flex flex-col gap-0.5">
                <div className="font-display text-[19px] font-bold tracking-[-0.01em]">{c.event.title}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
                  <Icon name={c.event.kind === "trip" ? "pin" : "calendar"} size={14} />
                  <span>
                    {KIND_LABEL[c.event.kind]}
                    {c.event.startsOn ? ` · ${formatDateRange(c.event.startsOn, c.event.endsOn, locale)}` : ""}
                  </span>
                </div>
              </div>
              {c.total > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-teal-deep">
                      {interpolate(t.homeDecidedCount, { decided: c.decided, total: c.total })}
                    </span>
                    <span className={c.openVotingRounds || c.openIdeasRounds ? "text-accent-deep" : "text-ink-2"}>{openLabel(c, t)}</span>
                  </div>
                  <Progress decided={c.decided} open={c.open} total={c.total} />
                </div>
              ) : (
                <div className="text-xs font-semibold text-ink-2">{t.homeNoDecisions}</div>
              )}
            </Card>
          </Link>
        ))}
        {past.length ? (
          <div id="past" className="flex flex-col gap-2 pt-2">
            <SectionLabel>{t.homePastLabel}</SectionLabel>
            {past.map((c) => (
              <Link key={c.event.id} href={`/app/events/${c.event.id}`} className="block">
                <Card className="flex items-center justify-between p-4 opacity-80">
                  <div className="font-display text-[17px] font-bold">{c.event.title}</div>
                  <div className="text-xs text-ink-2">
                    {interpolate(t.homeDecidedCount, { decided: c.decided, total: c.total })}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <Link
        href="/app/events/new"
        aria-label={t.homeNewEventAria}
        className="fixed bottom-8 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-button hover:bg-accent-deep md:right-[calc(50%-13rem)]"
      >
        <Icon name="plus" size={24} stroke={2.5} />
      </Link>
      {seats.length > 1 ? <span className="sr-only">{interpolate(t.homeAlsoVoteFor, { names: seats.filter((s) => s.userId !== user.id).map((s) => s.displayName).join(", ") })}</span> : null}
    </Screen>
  );
}
