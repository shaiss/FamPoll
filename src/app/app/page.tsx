import Link from "next/link";
import { LocalTime } from "@/components/time";
import { AvatarStack, Card, Icon, LinkButton, Pill, Progress, SectionLabel, Screen } from "@/components/ui";
import { ShareButton } from "@/components/share-button";
import { CopyButton } from "@/components/copy-button";
import { brand } from "@/lib/brand";
import { baseUrl } from "@/lib/url";
import { requireMembership } from "@/lib/auth";
import { roundLabel } from "@/lib/engine/rounds";
import { closesRelative, formatDate, formatDateRange, plural } from "@/lib/format";
import { homeData } from "@/lib/queries";

const KIND_LABEL: Record<string, string> = { trip: "Trip", outing: "Outing", meal: "Meal", party: "Party", other: "Event" };

function openLabel(c: { openVotingRounds: number; openIdeasRounds: number; open: number }): string {
  const parts: string[] = [];
  if (c.openVotingRounds) parts.push(plural(c.openVotingRounds, "round") + " open");
  if (c.openIdeasRounds) parts.push("gathering ideas");
  if (parts.length) return parts.join(" · ");
  return c.open ? plural(c.open, "decision") + " waiting" : "all settled";
}

export default async function Home() {
  const { user, family } = await requireMembership();
  const { needsVote, events, members, seats } = await homeData(family.id, user.id);
  const base = await baseUrl();
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
            <LocalTime iso={now.toISOString()} mode="weekday" fallback={formatDate(now, { month: "short", day: "numeric" })} />
          </div>
          <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">Hi, {firstName}</h1>
        </div>
        <Link href="/app/family" aria-label={family.name} className="flex items-center gap-2">
          <AvatarStack names={members.map((m) => m.displayName)} size={30} max={4} />
          <span className="text-[13px] font-semibold text-ink-2">People</span>
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <SectionLabel tone="accent" right={needsVote.length ? `${needsVote.length} open` : undefined}>
          Needs you
        </SectionLabel>
        {needsVote.length === 0 ? (
          <Card className="p-4 text-sm text-ink-2">Nothing waiting on you right now.</Card>
        ) : (
          needsVote.map((n) => {
            const proxies = n.pendingSeats.filter((s) => s.userId !== user.id);
            const ideas = n.kind === "ideas";
            if (n.kind === "organizer") {
              const why = n.reason === "tie" ? "ended in a tie" : n.reason === "no_quorum" ? "closed with too few votes" : "closed with nothing to decide";
              return (
                <Card key={n.decision.id + n.round.id} className="flex flex-col gap-3 border-ink bg-ink p-4 text-white">
                  <Pill tone="accent">On you</Pill>
                  <div className="flex flex-col gap-0.5">
                    <div className="font-display text-xl font-bold tracking-[-0.01em]">{n.decision.title}</div>
                    <div className="text-[13px] text-line">
                      {n.event.title} · {why}
                    </div>
                  </div>
                  <LinkButton href={`/app/decisions/${n.decision.id}`} size="sm">
                    Sort it out
                  </LinkButton>
                </Card>
              );
            }
            return (
              <Card key={n.decision.id + n.round.id} accent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Pill tone="accent">
                    <Icon name="clock" size={12} stroke={2.5} />
                    {ideas ? "Ideas wanted" : roundLabel(n.round, n.rounds, n.decision.plan)} · <LocalTime iso={n.round.closesAt.toISOString()} mode="closes" fallback={closesRelative(n.round.closesAt, now)} />
                  </Pill>
                  <Icon name="chevron-right" size={18} stroke={2.25} className="text-ink-3" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-display text-xl font-bold tracking-[-0.01em]">{n.decision.title}</div>
                  <div className="text-[13px] text-ink-2">
                    {n.event.title}
                    {!ideas && n.picks > 1 ? ` · pick up to ${n.picks}` : ""}
                    {proxies.length ? ` · also for ${proxies.map((p) => p.displayName).join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarStack names={n.votedNames} size={24} max={4} ring="#ffffff" />
                    <span className="text-xs text-ink-2">
                      {n.votedNames.length} of {n.totalSeats} {ideas ? "added ideas" : "voted"}
                    </span>
                  </div>
                  <LinkButton href={`/app/decisions/${n.decision.id}`} size="sm">
                    {ideas ? "Add idea" : "Vote"}
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
            <div className="font-display text-lg font-bold">It’s just you so far</div>
            <p className="text-sm text-ink-2">Send the invite link so the family can vote too. You can also add a seat for a kid or grandparent on the People page.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ShareButton url={inviteUrl} title={`Join ${family.name} on ${brand.name}`} text={`Vote with us on ${brand.name}`} />
            <CopyButton text={inviteUrl} />
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={past.length ? <Link href="#past">See past</Link> : undefined}>Events</SectionLabel>
        {live.length === 0 ? (
          <Card className="flex flex-col gap-2 p-4">
            <div className="font-display text-lg font-bold">No events yet</div>
            <p className="text-sm text-ink-2">Start with the next thing you need to decide together: a trip, a birthday, Friday dinner.</p>
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
                    {c.event.startsOn ? ` · ${formatDateRange(c.event.startsOn, c.event.endsOn)}` : ""}
                  </span>
                </div>
              </div>
              {c.total > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-teal-deep">
                      {c.decided} of {c.total} decided
                    </span>
                    <span className={c.openVotingRounds || c.openIdeasRounds ? "text-accent-deep" : "text-ink-2"}>{openLabel(c)}</span>
                  </div>
                  <Progress decided={c.decided} open={c.open} total={c.total} />
                </div>
              ) : (
                <div className="text-xs font-semibold text-ink-2">No decisions yet · add the first one</div>
              )}
            </Card>
          </Link>
        ))}
        {past.length ? (
          <div id="past" className="flex flex-col gap-2 pt-2">
            <SectionLabel>Past</SectionLabel>
            {past.map((c) => (
              <Link key={c.event.id} href={`/app/events/${c.event.id}`} className="block">
                <Card className="flex items-center justify-between p-4 opacity-80">
                  <div className="font-display text-[17px] font-bold">{c.event.title}</div>
                  <div className="text-xs text-ink-2">
                    {c.decided} of {c.total} decided
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <Link
        href="/app/events/new"
        aria-label="New event"
        className="fixed bottom-8 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-button hover:bg-accent-deep md:right-[calc(50%-13rem)]"
      >
        <Icon name="plus" size={24} stroke={2.5} />
      </Link>
      {seats.length > 1 ? <span className="sr-only">You also vote for {seats.filter((s) => s.userId !== user.id).map((s) => s.displayName).join(", ")}</span> : null}
    </Screen>
  );
}
