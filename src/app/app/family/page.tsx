import { UserButton } from "@clerk/nextjs";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { Avatar, Button, Card, Field, inputClass, Pill, SectionLabel, Screen, TopBar } from "@/components/ui";
import { addProxyMember, removeMember, removeProxyMember, renameFamily, rotateInviteCode } from "@/lib/actions/family";
import { brand } from "@/lib/brand";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { familyMembers } from "@/lib/queries";
import { baseUrl } from "@/lib/url";

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, family, member } = await requireMembership();
  const error = readError(await searchParams);
  const [members, base] = await Promise.all([familyMembers(family.id), baseUrl()]);
  const inviteUrl = `${base}/join/${family.inviteCode}`;
  const organizer = member.role === "organizer";

  return (
    <Screen>
      <TopBar back="/app" backLabel="Home" right={<UserButton />} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{family.name}</h1>
        <p className="text-sm text-ink-2">Everyone here can vote on every event.</p>
      </div>
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}

      <Card className="flex flex-col gap-3 p-4">
        <SectionLabel>Invite link</SectionLabel>
        <code className="break-all rounded-[10px] bg-sand px-3 py-2 text-[13px]">{inviteUrl}</code>
        <div className="grid grid-cols-2 gap-2">
          <ShareButton url={inviteUrl} title={`Join ${family.name} on ${brand.name}`} text={`Vote with us on ${brand.name}`} />
          <CopyButton text={inviteUrl} />
        </div>
        <p className="text-xs text-ink-3">Anyone with the link can join after signing in.</p>
        {organizer ? (
          <form action={rotateInviteCode}>
            <Button type="submit" variant="ghost" size="sm">
              Make a new link (old one stops working)
            </Button>
          </form>
        ) : null}
      </Card>

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={`${members.length} seats`}>Members</SectionLabel>
        {members.map((m) => {
          const proxy = m.userId === null;
          const mine = m.userId === user.id;
          const managedByMe = m.managedByUserId === user.id;
          const canRemove = proxy ? managedByMe || organizer : organizer && !mine && m.role !== "organizer";
          return (
            <Card key={m.id} className="flex items-center gap-3 p-3">
              <Avatar name={m.displayName} size={36} ring="#ffffff" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate font-semibold">
                  {m.displayName}
                  {mine ? " (you)" : ""}
                </div>
                <div className="text-xs text-ink-2">{m.role === "organizer" ? "Organizer" : proxy ? "No account · someone votes for them" : "Member"}</div>
              </div>
              {canRemove ? (
                <form action={proxy ? removeProxyMember : removeMember}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              ) : proxy ? (
                <Pill>proxy</Pill>
              ) : null}
            </Card>
          );
        })}
      </section>

      <Card className="p-4">
        <form action={addProxyMember} className="flex flex-col gap-3">
          <Field label="Add someone without a phone" hint="A kid or a grandparent. You cast their vote from your screen, and it counts like everyone else’s. Up to four per adult.">
            <input name="displayName" required maxLength={60} placeholder="Ruby" className={inputClass} />
          </Field>
          <Button type="submit" variant="secondary">
            Add a seat
          </Button>
        </form>
      </Card>

      {organizer ? (
        <Card className="p-4">
          <form action={renameFamily} className="flex flex-col gap-3">
            <Field label="Rename the family">
              <input name="name" defaultValue={family.name} required maxLength={60} className={inputClass} />
            </Field>
            <Button type="submit" variant="ghost" size="sm">
              Save name
            </Button>
          </form>
        </Card>
      ) : null}
    </Screen>
  );
}
