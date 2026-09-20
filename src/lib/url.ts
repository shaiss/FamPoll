import { headers } from "next/headers";
import { env } from "./env";

/** Absolute base URL for links that leave the app (share links, invites). */
export async function baseUrl(): Promise<string> {
  if (env.appUrl) return env.appUrl.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/** Absolute URL for a path on this deployment (OG images, share links). */
export async function absoluteUrl(path: string): Promise<string> {
  const base = await baseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
