import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { hasClerk } from "@/lib/env";
import { Wordmark } from "@/components/wordmark";
import { isInAppBrowser } from "@/lib/ua";
import { getMessages } from "@/lib/locale-server";

export default async function SignInPage() {
  if (!hasClerk) redirect("/setup");
  const inApp = await isInAppBrowser();
  const t = await getMessages();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-8 px-5 pb-16 pt-16">
      <Wordmark />
      {inApp ? (
        <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{t.authinAppBrowserNotice}</p>
      ) : null}
      <SignIn />
    </main>
  );
}
