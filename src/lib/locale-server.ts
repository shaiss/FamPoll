import { headers } from "next/headers";
import { localeFromHost, type Locale } from "./locale";
import { messages, type Messages } from "./messages";

/** Server-only: the active locale for this request, from its Host header. */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  return localeFromHost(h.get("x-forwarded-host") ?? h.get("host"));
}

/** Server-only: localized UI strings for this request. Client components use useMessages(). */
export async function getMessages(): Promise<Messages> {
  return messages(await getLocale());
}
