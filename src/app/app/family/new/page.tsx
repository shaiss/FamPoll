import { redirect } from "next/navigation";
import { Button, Card, Field, inputClass, Screen } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { createFamily, joinFamily } from "@/lib/actions/family";
import { getMembership, requireUser } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";

export default async function NewFamily({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/app");
  const error = readError(await searchParams);
  const t = await getMessages();
  return (
    <Screen className="pt-14">
      <Wordmark />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{t.familynewTitle}</h1>
        <p className="text-ink-2">{t.familynewSubtitle}</p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createFamily} className="flex flex-col gap-4">
          <Field label={t.familynameFieldLabel}>
            <input name="name" required maxLength={60} placeholder={t.familynamePlaceholder} className={inputClass} autoFocus />
          </Field>
          <Button type="submit">{t.familystartButton}</Button>
        </form>
      </Card>
      <Card className="p-5">
        <form action={joinFamily} className="flex flex-col gap-4">
          <Field label={t.familyjoinCodeLabel} hint={t.familyjoinCodeHint}>
            <input name="code" maxLength={20} placeholder={t.familyjoinCodePlaceholder} className={inputClass} autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Button type="submit" variant="secondary">
            {t.familyjoinButton}
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
