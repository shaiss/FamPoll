import { redirect } from "next/navigation";

/**
 * Production Next.js hides the text of errors thrown inside server actions, so
 * user-facing validation problems travel back as a query parameter instead.
 */
export function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

export function readError(searchParams: { error?: string | string[] } | undefined): string | null {
  const e = searchParams?.error;
  if (!e) return null;
  return Array.isArray(e) ? e[0] : e;
}
