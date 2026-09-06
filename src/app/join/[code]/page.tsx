import type { Metadata } from "next";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AvatarStack, Button, Card, LinkButton, Screen } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { SubmitButton } from "@/components/submit-button";
import { joinFamily } from "@/lib/actions/family";
import { membershipFor, requireUser } from "@/lib/auth";
import { brandFor } from "@/lib/brand";
import { getLocale, getMessages } from "@/lib/locale-server";
import { hasClerk, hasDatabase } from "@/lib/env";
import { readError } from "@/lib/flash";
import { interpolate } from "@/lib/messages";
import { familyByCode } from "@/lib/queries";
import { isInAppBrowser } from "@/lib/ua";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const b = brandFor(await getLocale());
  const t = await getMessages();
  if (!hasDatabase) return { title: t.pubMetaInviteTitle };
  const { code } = await params;
  const family = await familyByCode(code.toLowerCase());
  const title = family ? interpolate(t.pubMetaJoinFamilyTitle, { family: family.name, brand: b.name }) : interpolate(t.pubMetaInviteBrandTitle, { brand: b.name });
  const description = family ? interpolate(t.pubMetaJoinDescription, { count: family.members.length }) : t.pubMetaInviteInvalidDescription;
  return { title, description, robots: { index: false }, openGraph: { title, description, siteName: b.name, type: "website" } };
}

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const error = readError(await searchParams);
  const family = await familyByCode(code.toLowerCase());
  const { userId } = await auth();
  const t = await getMessages();

  if (!family) {
    return (
      <Screen className="pt-14">
        <Wordmark href="/" />
        <Card className="flex flex-col gap-3 p-5">
          <h1 className="font-display text-2xl font-bold">{t.pubInvalidTitle}</h1>
          <p className="text-ink-2">{t.pubInvalidBody}</p>
          <LinkButton href={userId ? "/app" : "/"} variant="secondary">
            {userId ? t.pubGoToYourFamily : t.pubHome}
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
        <div className="text-[13px] text-ink-2">{t.pubInvitedToJoin}</div>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.01em]">{family.name}</h1>
        <div className="text-[13px] text-ink-2">{interpolate(t.pubPeopleIn, { count: family.members.length })}</div>
      </div>
    </>
  );

  if (!userId) {
    const here = `/join/${encodeURIComponent(code)}`;
    const inApp = await isInAppBrowser();
    return (
      <Screen className="pt-14">
        <Wordmark href="/" />
        <Card className="flex flex-col gap-4 p-5 shadow-card">
          {invite}
          {inApp ? (
            <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{t.pubInAppBrowserHint}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            <SignInButton mode="modal" forceRedirectUrl={here} signUpForceRedirectUrl={here}>
              <Button>{t.pubContinueSocial}</Button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl={here} signInForceRedirectUrl={here}>
              <Button variant="secondary">{t.pubImNewHere}</Button>
            </SignUpButton>
          </div>
          <p className="text-xs text-ink-3">{t.pubNoPasswords}</p>
        </Card>
      </Screen>
    );
  }

  const user = await requireUser();
  // Already a seat in this group? Straight to the app. You can still belong to
  // other groups — joining one never blocks joining another.
  const existing = await membershipFor(user.id, family.id);
  if (existing) redirect("/app");

  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <Card className="flex flex-col gap-4 p-5 shadow-card">
        {invite}
        <form action={joinFamily} className="flex flex-col gap-3">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="fromLink" value="1" />
          <SubmitButton pendingLabel={t.pubJoiningPending}>{interpolate(t.pubJoinAsName, { name: user.name })}</SubmitButton>
        </form>
        {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      </Card>
    </Screen>
  );
}
