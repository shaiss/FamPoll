import { Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createEvent } from "@/lib/actions/events";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";

const KINDS = [
  { value: "trip", label: "Trip" },
  { value: "outing", label: "Day out" },
  { value: "meal", label: "Meal" },
  { value: "party", label: "Party" },
  { value: "other", label: "Something else" },
];

export default async function NewEvent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireMembership();
  const error = readError(await searchParams);
  return (
    <Screen>
      <TopBar back="/app" backLabel="Home" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">New event</h1>
        <p className="text-sm text-ink-2">The thing you’re deciding about. Decisions come next.</p>
      </div>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={createEvent} className="flex flex-col gap-5">
          <Field label="What is it?">
            <input name="title" required maxLength={80} placeholder="Summer ’27 Trip" className={inputClass} autoFocus />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Kind</span>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k, i) => (
                <label key={k.value} className="cursor-pointer">
                  <input type="radio" name="kind" value={k.value} defaultChecked={i === 0} className="peer sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold peer-checked:border-accent peer-checked:bg-accent-tint peer-checked:text-accent-deep">
                    {k.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" hint="Optional. Leave blank if the dates are still up in the air.">
              <input type="date" name="startsOn" className={inputClass} />
            </Field>
            <Field label="Ends">
              <input type="date" name="endsOn" className={inputClass} />
            </Field>
          </div>
          <SubmitButton pendingLabel="Creating…">Create event</SubmitButton>
        </form>
      </Card>
    </Screen>
  );
}
