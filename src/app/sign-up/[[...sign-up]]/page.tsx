import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { hasClerk } from "@/lib/env";
import { InAppBrowserNotice } from "@/components/in-app-browser-notice";
import { Wordmark } from "@/components/wordmark";

export default async function SignUpPage() {
  if (!hasClerk) redirect("/setup");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-8 px-5 pb-16 pt-16">
      <Wordmark />
      <InAppBrowserNotice className="w-full" />
      <SignUp />
    </main>
  );
}
