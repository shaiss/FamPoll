/**
 * Environment helpers. The app is designed to deploy green with no secrets set:
 * every integration is optional at build time and lights up when its variables exist.
 */
export const env = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  // Optional organizer-reminder email. Absent by default; the whole path is a no-op without these.
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
  // Shared secret an external pinger passes to /api/tick to run the reminder sweep.
  cronSecret: process.env.CRON_SECRET ?? "",
  // Feedback → GitHub issues. Server-only: a fine-grained PAT (Issues:write on the
  // one repo, under a dedicated machine account) and the target "owner/repo".
  // Never NEXT_PUBLIC_ — that would inline the token into the client bundle.
  githubFeedbackToken: process.env.GITHUB_FEEDBACK_TOKEN ?? "",
  githubFeedbackRepo: process.env.GITHUB_FEEDBACK_REPO ?? "",
  githubFeedbackLabels: process.env.GITHUB_FEEDBACK_LABELS ?? "",
  // Who may open the feedback review queue: a comma-separated allowlist of emails.
  // Empty means no one — the review page stays closed until an owner is named.
  feedbackAdminEmails: process.env.FEEDBACK_ADMIN_EMAILS ?? "",
};

export const hasClerk = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasClerkPublishable = Boolean(env.clerkPublishableKey);
export const hasDatabase = Boolean(env.databaseUrl);
export const isConfigured = hasClerk && hasDatabase;
/** Organizer reminders can send only when a mail provider and sender are set. */
export const hasMailer = Boolean(env.resendApiKey && env.resendFromEmail);
/** The reminder sweep endpoint accepts a ping only when a secret is set to guard it. */
export const hasReminderCron = Boolean(env.cronSecret);

/** The feedback bridge is live only when both the token and the target repo are set. */
export const hasGithubFeedback = Boolean(env.githubFeedbackToken && env.githubFeedbackRepo);

/** The owner allowlist, normalized. Never returns the raw string. */
export function feedbackAdminEmails(): string[] {
  return env.feedbackAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** True when `email` is on the review-queue allowlist (case-insensitive). */
export function isFeedbackAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return feedbackAdminEmails().includes(email.trim().toLowerCase());
}

export type SetupStatus = {
  clerkPublishableKey: boolean;
  clerkSecretKey: boolean;
  databaseUrl: boolean;
  appUrl: boolean;
  mailer: boolean;
  reminderCron: boolean;
  githubFeedbackToken: boolean;
  githubFeedbackRepo: boolean;
  feedbackAdminEmails: boolean;
};

/** Presence only. Never returns the values themselves. */
export function setupStatus(): SetupStatus {
  return {
    clerkPublishableKey: Boolean(env.clerkPublishableKey),
    clerkSecretKey: Boolean(env.clerkSecretKey),
    databaseUrl: Boolean(env.databaseUrl),
    appUrl: Boolean(env.appUrl),
    mailer: hasMailer,
    reminderCron: hasReminderCron,
    githubFeedbackToken: Boolean(env.githubFeedbackToken),
    githubFeedbackRepo: Boolean(env.githubFeedbackRepo),
    feedbackAdminEmails: Boolean(env.feedbackAdminEmails),
  };
}
