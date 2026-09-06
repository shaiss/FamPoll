"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import { messages, type Messages } from "@/lib/messages";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Carries the request's locale to client components; set once in the root layout. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Localized UI strings for client components. Server components use getMessages(). */
export function useMessages(): Messages {
  return messages(useContext(LocaleContext));
}
