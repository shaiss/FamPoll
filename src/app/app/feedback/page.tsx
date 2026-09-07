import Link from "next/link";
import { Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { submitFeedback } from "@/lib/actions/feedback";
import { requireUser } from "@/lib/auth";
import { isFeedbackAdminEmail } from "@/lib/env";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";

const textareaClass =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[17px] font-medium text-ink outline-none placeholder:font-medium placeholder:text-ink-3 focus:border-accent";

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const error = readError(sp);
  const sent = sp.sent === "1";
  const t = await getMessages();
  const isAdmin = isFeedbackAdminEmail(user.email);

  return (
    <Screen>
      <TopBar back="/app" backLabel={t.feedbackBackHome} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{t.feedbackTitle}</h1>
        <p className="text-sm text-ink-2">{t.feedbackSubtitle}</p>
      </div>

      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}

      {sent ? (
        <Card className="flex flex-col gap-2 p-4">
          <div className="font-display text-lg font-bold text-teal-deep">{t.feedbackSentTitle}</div>
          <p className="text-sm text-ink-2">{t.feedbackSentBody}</p>
          <Link href="/app/feedback" className="text-sm font-semibold text-accent">
            {t.feedbackSendAnother}
          </Link>
        </Card>
      ) : (
        <Card className="p-4">
          <form action={submitFeedback} className="flex flex-col gap-3">
            <Field label={t.feedbackKindLabel}>
              <select name="kind" defaultValue="idea" className={inputClass}>
                <option value="bug">{t.feedbackKindBug}</option>
                <option value="idea">{t.feedbackKindIdea}</option>
                <option value="other">{t.feedbackKindOther}</option>
              </select>
            </Field>
            <Field label={t.feedbackMessageLabel} hint={t.feedbackPrivacyNote}>
              <textarea name="message" required minLength={5} maxLength={2000} rows={5} placeholder={t.feedbackMessagePlaceholder} className={textareaClass} />
            </Field>
            <SubmitButton pendingLabel={t.feedbackSubmitPending}>{t.feedbackSubmit}</SubmitButton>
          </form>
        </Card>
      )}

      {isAdmin ? (
        <Link href="/app/feedback/review" className="text-center text-xs font-semibold text-ink-3 hover:text-ink">
          {t.feedbackReviewLinkOwner}
        </Link>
      ) : null}
    </Screen>
  );
}
