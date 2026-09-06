import { Button, Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { createFamily, joinFamily } from "@/lib/actions/family";
import { getMemberships, requireUser } from "@/lib/auth";
import { readError } from "@/lib/flash";

export default async function NewFamily({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  const hasGroups = memberships.length > 0;
  const error = readError(await searchParams);
  return (
    <Screen className={hasGroups ? "" : "pt-14"}>
      {hasGroups ? <TopBar back="/app" backLabel="Home" /> : <Wordmark />}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{hasGroups ? "Add a group" : "Who’s deciding together?"}</h1>
        <p className="text-ink-2">
          {hasGroups
            ? "Start a new group, or join one with an invite code. You can switch between your groups any time."
            : "Start your first group, then send everyone one invite link."}
        </p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createFamily} className="flex flex-col gap-4">
          <Field label="Group name">
            <input name="name" required maxLength={60} placeholder="The Kalmans" className={inputClass} autoFocus />
          </Field>
          <Button type="submit">{hasGroups ? "Create group" : "Start the group"}</Button>
        </form>
      </Card>
      <Card className="p-5">
        <form action={joinFamily} className="flex flex-col gap-4">
          <Field label="Have an invite code?" hint="It’s the last part of the invite link someone sent you.">
            <input name="code" maxLength={20} placeholder="abcd2345" className={inputClass} autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Button type="submit" variant="secondary">
            Join a group
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
