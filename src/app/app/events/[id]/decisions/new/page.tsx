import { notFound } from "next/navigation";
import { DecisionForm } from "@/components/decision-form";
import { Screen, TopBar } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { eventData } from "@/lib/queries";

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
      <DecisionForm eventId={id} defaultDeadline={data.event.kind === "meal" ? "tonight" : "72"} />
    </Screen>
  );
}
