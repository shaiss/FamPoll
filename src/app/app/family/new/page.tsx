import { redirect } from "next/navigation";
import { Button, Card, Field, inputClass, Screen, Wordmark } from "@/components/ui";
import { createFamily, joinFamily } from "@/lib/actions/family";
import { getMembership, requireUser } from "@/lib/auth";
import { readError } from "@/lib/flash";

export default async function NewFamily({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/app");
  const error = readError(await searchParams);
  return (
    <Screen className="pt-14">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">Who’s deciding together?</h1>
        <p className="text-ink-2">Start your family, then send everyone one invite link.</p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createFamily} className="flex flex-col gap-4">
          <Field label="Family name">
            <input name="name" required maxLength={60} placeholder="The Kalmans" className={inputClass} autoFocus />
          </Field>
          <Button type="submit">Start the family</Button>
        </form>
      </Card>
      <Card className="p-5">
        <form action={joinFamily} className="flex flex-col gap-4">
          <Field label="Have an invite code?" hint="It’s the last part of the invite link someone sent you.">
            <input name="code" maxLength={20} placeholder="abcd2345" className={inputClass} autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Button type="submit" variant="secondary">
            Join a family
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
