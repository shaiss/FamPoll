import Link from "next/link";
import { Card, Icon, Screen, Wordmark } from "@/components/ui";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isConfigured, setupStatus } from "@/lib/env";

export const dynamic = "force-dynamic";

const STEPS: { key: keyof ReturnType<typeof setupStatus>; label: string; how: string }[] = [
  {
    key: "clerkPublishableKey",
    label: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    how: "Create an application at dashboard.clerk.com, enable Google, Apple and Facebook under SSO connections, then copy the publishable key from API keys.",
  },
  {
    key: "clerkSecretKey",
    label: "CLERK_SECRET_KEY",
    how: "Same Clerk API keys page. Keep this one server-side only.",
  },
  {
    key: "databaseUrl",
    label: "DATABASE_URL",
    how: "Any Postgres. On Vercel: Storage tab, create a Neon database, and the variable is added for you. Then run `npm run db:push` once against it.",
  },
  {
    key: "appUrl",
    label: "NEXT_PUBLIC_APP_URL",
    how: "The public address of this deployment, used in share links. Optional: falls back to the request URL.",
  },
];

export default async function SetupPage() {
  if (isConfigured) {
    // Once everything is connected this page is for the owner only.
    const { userId } = await auth();
    if (!userId) redirect("/sign-in?redirect_url=/setup");
  }
  const status = setupStatus();
  const ready = status.clerkPublishableKey && status.clerkSecretKey && status.databaseUrl;
  return (
    <Screen className="pt-14">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{ready ? "Ready to go." : "Almost there."}</h1>
        <p className="text-ink-2">
          {ready
            ? "Every integration is connected."
            : "This deployment is live but needs its integrations connected. Add these environment variables in Vercel, then redeploy."}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {STEPS.map((s) => {
          const ok = status[s.key];
          return (
            <Card key={s.key} className="flex gap-3 p-4">
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-teal text-white" : "border-2 border-dashed border-line-2 text-ink-3"}`}
              >
                {ok ? <Icon name="check" size={14} stroke={3} /> : null}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <code className="break-all text-sm font-bold">{s.label}</code>
                <p className="text-[13px] leading-snug text-ink-2">{ok ? "Set." : s.how}</p>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-ink-3">This page shows only whether each variable is present, never its value.</p>
      {ready ? (
        <Link href="/app" className="font-semibold text-accent">
          Open the app
        </Link>
      ) : null}
    </Screen>
  );
}
