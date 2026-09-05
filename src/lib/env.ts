/**
 * Environment helpers. The app is designed to deploy green with no secrets set:
 * every integration is optional at build time and lights up when its variables exist.
 */
export const env = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
};

export const hasClerk = Boolean(env.clerkPublishableKey && env.clerkSecretKey);
export const hasClerkPublishable = Boolean(env.clerkPublishableKey);
export const hasDatabase = Boolean(env.databaseUrl);
export const isConfigured = hasClerk && hasDatabase;

export type SetupStatus = {
  clerkPublishableKey: boolean;
  clerkSecretKey: boolean;
  databaseUrl: boolean;
  appUrl: boolean;
};

/** Presence only. Never returns the values themselves. */
export function setupStatus(): SetupStatus {
  return {
    clerkPublishableKey: Boolean(env.clerkPublishableKey),
    clerkSecretKey: Boolean(env.clerkSecretKey),
    databaseUrl: Boolean(env.databaseUrl),
    appUrl: Boolean(env.appUrl),
  };
}
