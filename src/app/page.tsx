import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Icon, LinkButton } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { getLocale } from "@/lib/locale-server";
import { messages } from "@/lib/messages";
import { hasClerk, hasDatabase } from "@/lib/env";
import { isInAppBrowser } from "@/lib/ua";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (hasClerk) {
    const { userId } = await auth();
    if (userId && hasDatabase) redirect("/app");
  }
  const inApp = await isInAppBrowser();
  const locale = await getLocale();
  const t = messages(locale);
  return (
    <main lang={locale} className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between overflow-hidden px-6 pb-10 pt-20">
      <div className="pointer-events-none absolute -right-36 -top-32 h-80 w-80 rounded-full bg-accent-tint" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-tint" />
      <div className="relative flex flex-col gap-7">
        <Wordmark />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-pretty">{t.tagline}</h1>
          <p className="text-[16px] leading-relaxed text-ink-2 text-pretty">
            {t.landingLede}
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-[15px] text-ink-2">
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> {t.feature1}</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> {t.feature2}</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> {t.feature3}</li>
        </ul>
      </div>
      <div className="relative flex flex-col gap-3">
        {inApp ? (
          <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{t.inAppHint}</p>
        ) : null}
        {hasClerk ? (
          <>
            <SignInButton mode="modal">
              <Button>{t.continueCta}</Button>
            </SignInButton>
            <p className="text-center text-xs text-ink-3">{t.noPasswords}</p>
          </>
        ) : (
          <>
            <LinkButton href="/setup" variant="secondary">
              {t.finishSetup}
            </LinkButton>
            <p className="text-center text-xs text-ink-3">{t.setupHint}</p>
          </>
        )}
        <Link href="/setup" className="sr-only">
          {t.finishSetup}
        </Link>
      </div>
    </main>
  );
}
