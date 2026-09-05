import { redirect } from "next/navigation";
import { AvatarStack, Button, Card, Screen, Wordmark } from "@/components/ui";
import { joinFamily } from "@/lib/actions/family";
import { getMembership, requireUser } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { familyByCode } from "@/lib/queries";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string }> }) {
  const { code } = await params;
  const error = readError(await searchParams);
  const user = await requireUser();
  const family = await familyByCode(code);
  const existing = await getMembership(user.id);
  if (existing && family && existing.family.id === family.id) redirect("/app");

  return (
    <Screen className="pt-14">
      <Wordmark />
      {!family ? (
        <Card className="p-5">
          <h1 className="font-display text-2xl font-bold">That invite link isn’t valid.</h1>
          <p className="mt-2 text-ink-2">Ask whoever sent it for a fresh one.</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-4 p-5 shadow-card">
          <AvatarStack names={family.members.map((m) => m.displayName)} size={32} ring="#ffffff" />
          <div>
            <div className="text-[13px] text-ink-2">You’re invited to join</div>
            <h1 className="font-display text-[26px] font-bold tracking-[-0.01em]">{family.name}</h1>
            <div className="text-[13px] text-ink-2">{plural(family.members.length, "person", "people")} in</div>
          </div>
          {existing ? (
            <p className="text-sm text-accent-deep">You’re already in {existing.family.name}. One family per person for now.</p>
          ) : (
            <form action={joinFamily} className="flex flex-col gap-3">
              <input type="hidden" name="code" value={code} />
              <Button type="submit">Join as {user.name}</Button>
            </form>
          )}
          {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
        </Card>
      )}
    </Screen>
  );
}
