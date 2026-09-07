/**
 * Environment helpers. The app is designed to deploy green with no secrets set:
 * every integration is optional at build time and lights up when its variables exist.
 */
export const env = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
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
    githubFeedbackToken: Boolean(env.githubFeedbackToken),
    githubFeedbackRepo: Boolean(env.githubFeedbackRepo),
    feedbackAdminEmails: Boolean(env.feedbackAdminEmails),
  };
}
