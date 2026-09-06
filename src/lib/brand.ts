import { DEFAULT_LOCALE, type Locale } from "./locale";
import { messages } from "./messages";

/**
 * The product name and tagline. The name is spelled in the visitor's own
 * language — Quorum (English), Cuórum (Spanish), Quórum (Portuguese) — chosen by
 * the domain they arrived on (see src/lib/locale.ts). NEXT_PUBLIC_BRAND_NAME and
 * NEXT_PUBLIC_BRAND_TAGLINE still override everything for a one-off deployment
 * (inlined at build time, so a change needs a redeploy); leave them unset for
 * the per-language names.
 */
export function brandFor(locale: Locale): { name: string; tagline: string } {
  const m = messages(locale);
  return {
    name: process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || m.brandName,
    tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE?.trim() || m.tagline,
  };
}

/** Default (English) brand, for build-time spots with no request host (e.g. the web manifest). */
export const brand = brandFor(DEFAULT_LOCALE);
