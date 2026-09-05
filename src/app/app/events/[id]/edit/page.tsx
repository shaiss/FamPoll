import { notFound } from "next/navigation";
import { Button, Card, Field, inputClass, Screen, TopBar } from "@/components/ui";
import { deleteEvent, updateEvent } from "@/lib/actions/events";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { eventData } from "@/lib/queries";

const KINDS = [
  { value: "trip", label: "Trip" },
  { value: "outing", label: "Day out" },
  { value: "meal", label: "Meal" },
  { value: "party", label: "Party" },
  { value: "other", label: "Something else" },
];

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { family, member } = await requireMembership();
  const data = await eventData(id, family.id);
  if (!data) notFound();
  const { event } = data;
  const organizer = member.role === "organizer";
  const canEdit = organizer || event.createdByMemberId === member.id;
  if (!canEdit) notFound();
  const error = readError(await searchParams);

  return (
    <Screen>
      <TopBar back={`/app/events/${event.id}`} backLabel={event.title} />
      <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em]">Edit event</h1>
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      <Card className="p-5">
        <form action={updateEvent} className="flex flex-col gap-5">
          <input type="hidden" name="eventId" value={event.id} />
          <Field label="Name">
            <input name="title" required maxLength={80} defaultValue={event.title} className={inputClass} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Kind</span>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <label key={k.value} className="group cursor-pointer">
                  <input type="radio" name="kind" value={k.value} defaultChecked={k.value === event.kind} className="sr-only" />
                  <span className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold group-has-checked:border-accent group-has-checked:bg-accent-tint group-has-checked:text-accent-deep">{k.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" hint="Clear both to leave the dates open.">
              <input type="date" name="startsOn" defaultValue={event.startsOn ?? ""} className={inputClass} />
            </Field>
            <Field label="Ends">
              <input type="date" name="endsOn" defaultValue={event.endsOn ?? ""} className={inputClass} />
            </Field>
          </div>
          <Button type="submit">Save changes</Button>
        </form>
      </Card>

      {organizer ? (
        <Card className="flex flex-col gap-3 border-accent-line p-5">
          <div className="flex flex-col gap-1">
            <div className="font-display text-lg font-bold">Delete this event</div>
            <p className="text-sm text-ink-2">Removes every decision, vote and log line under it. There is no undo. Marking it done instead keeps the record.</p>
          </div>
          <form action={deleteEvent} className="flex flex-col gap-3">
            <input type="hidden" name="eventId" value={event.id} />
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input type="checkbox" name="confirm" className="h-5 w-5 accent-accent" />
              Yes, delete “{event.title}” for everyone
            </label>
            <Button type="submit" variant="danger" size="sm">
              Delete event
            </Button>
          </form>
        </Card>
      ) : null}
    </Screen>
  );
}
