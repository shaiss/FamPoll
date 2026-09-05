import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Icon, LinkButton, Wordmark } from "@/components/ui";
import { hasClerk, hasDatabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Landing() {
  if (hasClerk) {
    const { userId } = await auth();
    if (userId && hasDatabase) redirect("/app");
  }
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col justify-between overflow-hidden px-6 pb-10 pt-20">
      <div className="pointer-events-none absolute -right-36 -top-32 h-80 w-80 rounded-full bg-accent-tint" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-teal-tint" />
      <div className="relative flex flex-col gap-7">
        <Wordmark />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-[-0.025em] text-pretty">Family decisions, one round at a time.</h1>
          <p className="text-[16px] leading-relaxed text-ink-2 text-pretty">
            Group the votes around the trip, the dinner, the party. Narrow it down in rounds. Keep track of what you decided.
          </p>
        </div>
        <ul className="flex flex-col gap-2 text-[15px] text-ink-2">
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> Every decision lives inside its event</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> Ideas, shortlist, final: rounds that close themselves</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-teal" stroke={3} /> One link back to Messenger with what you decided</li>
        </ul>
      </div>
      <div className="relative flex flex-col gap-3">
        {hasClerk ? (
          <>
            <SignInButton mode="modal">
              <Button>Continue with Google, Apple or Facebook</Button>
            </SignInButton>
            <p className="text-center text-xs text-ink-3">No passwords. We only keep your name and photo so the family knows who voted.</p>
          </>
        ) : (
          <>
            <LinkButton href="/setup" variant="secondary">
              Finish setup
            </LinkButton>
            <p className="text-center text-xs text-ink-3">Sign-in turns on once Clerk is connected.</p>
          </>
        )}
        <Link href="/setup" className="sr-only">
          Setup
        </Link>
      </div>
    </main>
  );
}
