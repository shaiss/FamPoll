export const LOCALES = ["en", "es", "pt-BR"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/**
 * One deployment, three doors: the domain a visitor arrives on picks the
 * language. Accented domains reach the server as Punycode (xn--…), so both the
 * ASCII and the pretty form are mapped.
 *   quorum.family                              → English
 *   cuórum.family / cuórum.com (xn--curum-1ta) → Spanish
 *   quórum.family (xn--qurum-1ta)              → Portuguese (Brazil)
 */
const HOST_LOCALE: Record<string, Locale> = {
  "quorum.family": "en",
  "xn--curum-1ta.family": "es",
  "cuórum.family": "es",
  "xn--curum-1ta.com": "es",
  "cuórum.com": "es",
  "xn--qurum-1ta.family": "pt-BR",
  "quórum.family": "pt-BR",
};

/** Pure host → locale. Strips a port and a leading "www."; unknown hosts (localhost, the vercel.app preview) fall back to English. This module stays client-safe — the request-bound getLocale() lives in locale-server.ts. */
export function localeFromHost(host: string | null | undefined): Locale {
  if (!host) return DEFAULT_LOCALE;
  const h = host.split(":")[0].trim().toLowerCase().replace(/^www\./, "");
  return HOST_LOCALE[h] ?? DEFAULT_LOCALE;
}
