import { Button, Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { createFamily, joinFamily } from "@/lib/actions/family";
import { getMemberships, requireUser } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";

export default async function NewFamily({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);
  const hasGroups = memberships.length > 0;
  const error = readError(await searchParams);
  const t = await getMessages();
  return (
    <Screen className={hasGroups ? "" : "pt-14"}>
      {hasGroups ? <TopBar back="/app" backLabel={t.familybackHome} /> : <Wordmark />}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{hasGroups ? t.familyAddGroupTitle : t.familynewTitle}</h1>
        <p className="text-ink-2">{hasGroups ? t.familyAddGroupSubtitle : t.familynewSubtitle}</p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createFamily} className="flex flex-col gap-4">
          <Field label={t.familynameFieldLabel}>
            <input name="name" required maxLength={60} placeholder={t.familynamePlaceholder} className={inputClass} autoFocus />
          </Field>
          <Button type="submit">{hasGroups ? t.familyCreateGroupButton : t.familystartButton}</Button>
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
