import { UserButton } from "@clerk/nextjs";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { Avatar, Button, Card, Field, inputClass, Pill, SectionLabel, Screen, TopBar } from "@/components/ui";
import { addProxyMember, deleteFamily, demoteOrganizer, leaveFamily, makeOrganizer, reassignProxy, removeMember, renameMember, removeProxyMember, renameFamily, rotateInviteCode, setVotePrivacy } from "@/lib/actions/family";
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
  const organizers = members.filter((m) => m.role === "organizer" && m.userId !== null);
  const canDemote = organizer && organizers.length > 1;

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
          const canRename = mine || organizer;
          // Privacy is personal: only the seat's own person, or whoever votes for a proxy, sees or changes it.
          const controlsPrivacy = mine || managedByMe;
          const whose = mine ? "my" : `${m.displayName}’s`;
          return (
            <Card key={m.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.displayName} size={36} ring="#ffffff" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate font-semibold">
                  {m.displayName}
                  {mine ? " (you)" : ""}
                </div>
                <div className="text-xs text-ink-2">{m.role === "organizer" ? "Organizer" : proxy ? "No account · someone votes for them" : "Member"}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {organizer && !proxy && m.role !== "organizer" ? (
                  <form action={makeOrganizer}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Make organizer
                    </Button>
                  </form>
                ) : null}
                {canDemote && !proxy && m.role === "organizer" ? (
                  <form action={demoteOrganizer}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Make member
                    </Button>
                  </form>
                ) : null}
                {canRemove ? (
                  <form action={proxy ? removeProxyMember : removeMember}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                ) : proxy && !organizer ? (
                  <Pill>proxy</Pill>
                ) : null}
              </div>
            </div>
            {canRename ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">Rename</summary>
                <form action={renameMember} className="mt-2 flex gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <input name="displayName" defaultValue={m.displayName} required maxLength={60} className={`${inputClass} h-10 text-[15px]`} aria-label="Name" />
                  <Button type="submit" variant="ghost" size="sm">
                    Save
                  </Button>
                </form>
              </details>
            ) : null}
            {controlsPrivacy ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">Vote privacy</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-sm text-ink-2">
                    {mine ? "Your" : `${m.displayName}’s`} votes {m.votesHidden ? "start hidden." : "are shown by name."}
                  </p>
                  <p className="text-xs text-ink-3">Hidden votes are counted, and still recorded under the name. If anyone hides, that round shows counts only. You can show your hand on any decision.</p>
                  <form action={setVotePrivacy}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="votesHidden" value={m.votesHidden ? "0" : "1"} />
                    <Button type="submit" variant="ghost" size="sm">
                      {m.votesHidden ? `Show ${whose} votes by name` : `Hide ${whose} votes by default`}
                    </Button>
                  </form>
                </div>
              </details>
            ) : null}
            {organizer && proxy && organizers.length > 1 ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">Who votes for them</summary>
                <form action={reassignProxy} className="mt-2 flex gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <select name="toMemberId" aria-label="Hand to" className={`${inputClass} h-10 flex-1 text-[15px]`} defaultValue={organizers.find((o) => o.userId === m.managedByUserId)?.id ?? organizers[0].id}>
                    {organizers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.displayName}
                        {o.userId === user.id ? " (you)" : ""}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="ghost" size="sm">
                    Hand over
                  </Button>
                </form>
              </details>
            ) : null}
            </Card>
          );
        })}
      </section>

      {organizer ? (
        <Card className="p-4">
          <form action={addProxyMember} className="flex flex-col gap-3">
            <Field label="Add someone without a phone" hint="A kid or a grandparent. You cast their vote from your screen, and it counts like everyone else’s. Up to four per organizer.">
              <input name="displayName" required maxLength={60} placeholder="Ruby" className={inputClass} />
            </Field>
            <Button type="submit" variant="secondary">
              Add a seat
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-xs text-ink-3">Organizers add seats for kids and relatives without accounts, and can make another adult an organizer.</p>
      )}

      <form action={leaveFamily} className="flex justify-center">
        <Button type="submit" variant="ghost" size="sm">
          Leave this family
        </Button>
      </form>

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

      {organizer ? (
        <details className="rounded-card border border-line bg-card p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">Delete this family…</summary>
          <form action={deleteFamily} className="mt-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" name="confirm" /> Delete {family.name} and every event, decision and vote in it. This can’t be undone.
            </label>
            <Button type="submit" variant="danger" size="sm">
              Delete the whole family
            </Button>
          </form>
        </details>
      ) : null}
    </Screen>
  );
}
