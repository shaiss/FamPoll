/**
 * The product's name and tagline, in one place. Override per deployment with
 * NEXT_PUBLIC_BRAND_NAME and NEXT_PUBLIC_BRAND_TAGLINE (inlined at build time,
 * so a change needs a redeploy). Nothing else in the app should hard-code the name.
 */
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "FamPoll",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE?.trim() || "Family decisions, one round at a time.",
} as const;
