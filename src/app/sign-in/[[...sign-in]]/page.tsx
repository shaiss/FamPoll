import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { hasClerk } from "@/lib/env";
import { Wordmark } from "@/components/wordmark";
import { isInAppBrowser } from "@/lib/ua";

export default async function SignInPage() {
  if (!hasClerk) redirect("/setup");
  const inApp = await isInAppBrowser();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-8 px-5 pb-16 pt-16">
      <Wordmark />
      {inApp ? (
        <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">Sign-in works best in your browser. Tap the menu and choose “Open in browser”, then come back to this link.</p>
      ) : null}
      <SignIn />
    </main>
  );
}
