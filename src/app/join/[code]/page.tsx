import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AvatarStack, Button, Card, LinkButton, Screen, Wordmark } from "@/components/ui";
import { joinFamily } from "@/lib/actions/family";
import { getMembership, requireUser } from "@/lib/auth";
import { hasClerk, hasDatabase } from "@/lib/env";
import { readError } from "@/lib/flash";
import { plural } from "@/lib/format";
import { familyByCode } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const error = readError(await searchParams);
  const family = await familyByCode(code.toLowerCase());
  const { userId } = await auth();

  if (!family) {
    return (
      <Screen className="pt-14">
        <Wordmark href="/" />
        <Card className="flex flex-col gap-3 p-5">
          <h1 className="font-display text-2xl font-bold">That invite link isn’t valid.</h1>
          <p className="text-ink-2">It may have been replaced. Ask whoever sent it for a fresh one.</p>
          <LinkButton href={userId ? "/app" : "/"} variant="secondary">
            {userId ? "Go to your family" : "Home"}
          </LinkButton>
        </Card>
      </Screen>
    );
  }

  const names = family.members.map((m) => m.displayName);
  const invite = (
    <>
      <AvatarStack names={names} size={32} ring="#ffffff" />
      <div>
        <div className="text-[13px] text-ink-2">You’re invited to join</div>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em]">{family.name}</h1>
        <div className="text-[13px] text-ink-2">{plural(family.members.length, "person", "people")} in</div>
      </div>
    </>
  );

  if (!userId) {
    const here = `/join/${encodeURIComponent(code)}`;
    return (
      <Screen className="pt-14">
        <Wordmark href="/" />
        <Card className="flex flex-col gap-4 p-5 shadow-card">
          {invite}
          <div className="flex flex-col gap-2">
            <SignInButton mode="modal" forceRedirectUrl={here} signUpForceRedirectUrl={here}>
              <Button>Continue with Google, Apple or Facebook</Button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl={here} signInForceRedirectUrl={here}>
              <Button variant="secondary">I’m new here</Button>
            </SignUpButton>
          </div>
          <p className="text-xs text-ink-3">No passwords. We only keep your name and photo so the family knows who voted.</p>
        </Card>
      </Screen>
    );
  }

  const user = await requireUser();
  const existing = await getMembership(user.id);
  if (existing && existing.family.id === family.id) redirect("/app");

  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <Card className="flex flex-col gap-4 p-5 shadow-card">
        {invite}
        {existing ? (
          <>
            <p className="text-sm text-accent-deep">You’re already in {existing.family.name}. One family per person for now.</p>
            <LinkButton href="/app" variant="secondary">
              Go to {existing.family.name}
            </LinkButton>
          </>
        ) : (
          <form action={joinFamily} className="flex flex-col gap-3">
            <input type="hidden" name="code" value={code} />
            <input type="hidden" name="fromLink" value="1" />
            <Button type="submit">Join as {user.name}</Button>
          </form>
        )}
        {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      </Card>
    </Screen>
  );
}
