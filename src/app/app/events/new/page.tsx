import { Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createEvent } from "@/lib/actions/events";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";

const KINDS = [
  { value: "trip", label: "eventsKindTrip" },
  { value: "outing", label: "eventsKindOuting" },
  { value: "meal", label: "eventsKindMeal" },
  { value: "party", label: "eventsKindParty" },
  { value: "other", label: "eventsKindOther" },
];

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireMembership();
  const error = readError(await searchParams);
  const t = await getMessages();
  return (
    <Screen>
      <TopBar back="/app" backLabel={t.eventsBackHome} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{t.eventsNewTitle}</h1>
        <p className="text-sm text-ink-2">{t.eventsNewSubtitle}</p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createEvent} className="flex flex-col gap-5">
          <Field label={t.eventsFieldWhatIsIt}>
            <input name="title" required maxLength={80} placeholder={t.eventsTitlePlaceholder} className={inputClass} autoFocus />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">{t.eventsFieldKind}</span>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k, i) => (
                <label key={k.value} className="cursor-pointer">
                  <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold peer-checked:border-accent peer-checked:bg-accent-tint peer-checked:text-accent-deep">
                    {t[k.label as keyof typeof t]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.eventsFieldStarts} hint={t.eventsStartsHintNew}>
              <input type="date" name="startsOn" className={inputClass} />
            </Field>
            <Field label={t.eventsFieldEnds}>
              <input type="date" name="endsOn" className={inputClass} />
            </Field>
          </div>
          <SubmitButton pendingLabel={t.eventsCreatePending}>{t.eventsCreateSubmit}</SubmitButton>
        </form>
      </Card>
    </Screen>
  );
}
