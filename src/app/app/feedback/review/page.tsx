import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { approveFeedback, rejectFeedback } from "@/lib/actions/feedback";
import { requireUser } from "@/lib/auth";
import { hasGithubFeedback, isFeedbackAdminEmail } from "@/lib/env";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { feedbackQueue, feedbackRecent } from "@/lib/queries";

const textareaClass =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[15px] font-medium text-ink outline-none placeholder:font-medium placeholder:text-ink-3 focus:border-accent";

export default async function FeedbackReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; posted?: string; rejected?: string }>;
}) {
  const user = await requireUser();
  // Owner-only surface. A family organizer must NOT land here — reviewing a
  // relative's feedback would de-anonymize it.
  if (!isFeedbackAdminEmail(user.email)) redirect("/app");

  const sp = await searchParams;
  const error = readError(sp);
  const t = await getMessages();
  const [queue, recent] = await Promise.all([feedbackQueue(), feedbackRecent()]);

  const kindLabel = (k: string) => (k === "bug" ? t.feedbackKindBug : k === "idea" ? t.feedbackKindIdea : t.feedbackKindOther);

  return (
    <Screen>
      <TopBar back="/app/feedback" backLabel={t.feedbackTitle} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{t.feedbackReviewTitle}</h1>
        <p className="text-sm text-ink-2">{t.feedbackReviewSubtitle}</p>
      </div>

      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      {sp.posted === "1" ? <p className="rounded-[12px] bg-teal-tint px-3 py-2 text-sm font-semibold text-teal-deep">{t.feedbackReviewPostedBanner}</p> : null}
      {sp.rejected === "1" ? <p className="rounded-[12px] bg-sand px-3 py-2 text-sm font-semibold text-ink-2">{t.feedbackReviewRejectedBanner}</p> : null}
      {!hasGithubFeedback ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{t.feedbackReviewNotConnected}</p> : null}

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={String(queue.length)}>{t.feedbackReviewTitle}</SectionLabel>
        {queue.length === 0 ? (
          <Card className="p-4 text-sm text-ink-2">{t.feedbackReviewEmpty}</Card>
        ) : (
          queue.map((f) => {
            const who = f.family?.name ? `${f.createdBy?.name ?? "—"} · ${f.family.name}` : f.createdBy?.name ?? "—";
            return (
              <Card key={f.id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Pill tone={f.kind === "idea" ? "teal" : "accent"}>{kindLabel(f.kind)}</Pill>
                  {f.status === "failed" ? <span className="text-xs font-semibold text-accent-deep">{t.feedbackReviewFailedNote}</span> : null}
                </div>
                <p className="text-xs text-ink-3">
                  {interpolate(t.feedbackReviewFrom, { who })} · {t.feedbackReviewInternal}
                </p>
                <form action={approveFeedback} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <textarea name="message" defaultValue={f.message} rows={5} maxLength={2000} className={textareaClass} />
                  <p className="text-xs text-ink-3">{t.feedbackReviewEditHint}</p>
                  {hasGithubFeedback ? (
                    <SubmitButton size="sm" pendingLabel={t.feedbackReviewApprovePending}>
                      {t.feedbackReviewApprove}
                    </SubmitButton>
                  ) : null}
                </form>
                <form action={rejectFeedback}>
                  <input type="hidden" name="id" value={f.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t.feedbackReviewReject}
                  </Button>
                </form>
              </Card>
            );
          })
        )}
      </section>

      {recent.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionLabel>{t.feedbackReviewRecentLabel}</SectionLabel>
          {recent.map((f) => (
            <Card key={f.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-2">
                <Pill tone={f.status === "posted" ? "teal" : "muted"}>
                  {f.status === "posted" ? t.feedbackReviewPostedPill : t.feedbackReviewRejectedPill}
                </Pill>
                <span className="truncate text-sm text-ink-2">{f.message}</span>
              </div>
              {f.githubIssueUrl && f.githubIssueNumber ? (
                <Link href={f.githubIssueUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-accent">
                  {interpolate(t.feedbackReviewViewIssue, { number: f.githubIssueNumber })}
                </Link>
              ) : null}
            </Card>
          ))}
        </section>
      ) : null}
    </Screen>
  );
}
