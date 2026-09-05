import { notFound } from "next/navigation";
import { Button, Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { createDecision } from "@/lib/actions/decisions";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { eventData } from "@/lib/queries";

const PLANS = [
  { value: "quick", title: "Quick vote", body: "One round, pick one. Tonight’s dinner." },
  { value: "shortlist_final", title: "Shortlist, then final", body: "Two rounds. Narrow it down, then pick." },
  { value: "ideas_shortlist_final", title: "Ideas, shortlist, final", body: "Three rounds. Big choices with lots of options." },
];

const DURATIONS = [
  { value: 24, label: "1 day" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
];

export default async function NewDecision({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { family } = await requireMembership();
  const data = await eventData(id, family.id);
  if (!data) notFound();
  const error = readError(await searchParams);

  return (
    <Screen>
      <TopBar back={`/app/events/${id}`} backLabel={data.event.title} />
      <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em]">New decision</h1>
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      <form action={createDecision} className="flex flex-col gap-6">
        <input type="hidden" name="eventId" value={id} />
        <Field label="What are we deciding?">
          <input name="title" required maxLength={100} placeholder="Where do we stay?" className={inputClass} autoFocus />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-2">How do we decide?</span>
          <div className="flex flex-col gap-2">
            {PLANS.map((p, i) => (
              <label key={p.value} className="group block cursor-pointer">
                <input type="radio" name="plan" value={p.value} defaultChecked={i === 0} className="sr-only" />
                <Card as="span" className="flex items-center gap-3 px-3.5 py-3 group-has-checked:border-2 group-has-checked:border-accent group-has-checked:shadow-accent">
                  <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-line-2 group-has-checked:border-accent group-has-checked:bg-accent">
                    <span className="h-2 w-2 rounded-full bg-transparent group-has-checked:bg-white" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-bold">{p.title}</span>
                    <span className="text-[13px] text-ink-2">{p.body}</span>
                  </span>
                </Card>
              </label>
            ))}
          </div>
        </div>

        <Field label="Options, one per line" hint="A quick vote needs 2, a shortlist 3. Starting with ideas? Leave this empty and everyone adds their own.">
          <textarea
            name="options"
            rows={5}
            placeholder={"Apartment in Alfama\nBeach house in Cascais\nHotel near Belém"}
            className="w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[16px] font-medium text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-2">Each round closes after</span>
          <div className="flex gap-1 rounded-[12px] bg-sand-2 p-1">
            {DURATIONS.map((d) => (
              <label key={d.value} className="group flex-1 cursor-pointer">
                <input type="radio" name="roundHours" value={d.value} defaultChecked={d.value === 72} className="sr-only" />
                <span className="flex h-[38px] items-center justify-center rounded-[9px] text-sm font-semibold text-ink-2 group-has-checked:bg-card group-has-checked:font-bold group-has-checked:text-ink group-has-checked:shadow-sm">{d.label}</span>
              </label>
            ))}
          </div>
          <span className="text-xs text-ink-3">A round also closes as soon as everyone has voted.</span>
        </div>

        <Card className="flex items-center justify-between px-3.5 py-3">
          <span className="flex flex-col">
            <span className="text-[15px] font-bold">Anyone can add ideas</span>
            <span className="text-[13px] text-ink-2">Turn off to keep it to you</span>
          </span>
          <input type="checkbox" name="anyoneCanAddOptions" value="on" defaultChecked className="h-6 w-6 accent-teal" />
        </Card>

        <Button type="submit">Start round 1</Button>
      </form>
    </Screen>
  );
}
