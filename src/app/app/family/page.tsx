import { UserButton } from "@clerk/nextjs";
import { CopyButton } from "@/components/copy-button";
import { ShareButton } from "@/components/share-button";
import { Avatar, Button, Card, Field, inputClass, Pill, SectionLabel, Screen, TopBar } from "@/components/ui";
import { addProxyMember, deleteFamily, demoteOrganizer, leaveFamily, makeOrganizer, reassignProxy, removeMember, renameMember, removeProxyMember, renameFamily, rotateInviteCode, setVotePrivacy } from "@/lib/actions/family";
import { brand } from "@/lib/brand";
import { requireMembership } from "@/lib/auth";
import { readError } from "@/lib/flash";
import { getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { familyMembers } from "@/lib/queries";
import { baseUrl } from "@/lib/url";

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user, family, member } = await requireMembership();
  const error = readError(await searchParams);
  const [members, base] = await Promise.all([familyMembers(family.id), baseUrl()]);
  const t = await getMessages();
  const inviteUrl = `${base}/join/${family.inviteCode}`;
  const organizer = member.role === "organizer";
  const organizers = members.filter((m) => m.role === "organizer" && m.userId !== null);
  const canDemote = organizer && organizers.length > 1;

  return (
    <Screen>
      <TopBar back="/app" backLabel={t.familybackHome} right={<UserButton />} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{family.name}</h1>
        <p className="text-sm text-ink-2">{t.familyintroSubtitle}</p>
      </div>
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}

      <Card className="flex flex-col gap-3 p-4">
        <SectionLabel>{t.familyinviteLinkLabel}</SectionLabel>
        <code className="break-all rounded-[10px] bg-sand px-3 py-2 text-[13px]">{inviteUrl}</code>
        <div className="grid grid-cols-2 gap-2">
          <ShareButton url={inviteUrl} title={interpolate(t.familyshareTitle, { family: family.name, brand: brand.name })} text={interpolate(t.familyshareText, { brand: brand.name })} />
          <CopyButton text={inviteUrl} />
        </div>
        <p className="text-xs text-ink-3">{t.familyinviteJoinNote}</p>
        {organizer ? (
          <form action={rotateInviteCode}>
            <Button type="submit" variant="ghost" size="sm">
              {t.familyrotateInvite}
            </Button>
          </form>
        ) : null}
      </Card>

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={interpolate(t.familyseatCount, { count: members.length })}>{t.familymembersHeading}</SectionLabel>
        {members.map((m) => {
          const proxy = m.userId === null;
          const mine = m.userId === user.id;
          const managedByMe = m.managedByUserId === user.id;
          const canRemove = proxy ? managedByMe || organizer : organizer && !mine && m.role !== "organizer";
          const canRename = mine || organizer;
          // Privacy is personal: only the seat's own person, or whoever votes for a proxy, sees or changes it.
          const controlsPrivacy = mine || managedByMe;
          return (
            <Card key={m.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={m.displayName} size={36} ring="#ffffff" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate font-semibold">
                  {m.displayName}
                  {mine ? t.familyyouSuffix : ""}
                </div>
                <div className="text-xs text-ink-2">{m.role === "organizer" ? t.familyroleOrganizer : proxy ? t.familyroleProxyDesc : t.familyroleMember}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {organizer && !proxy && m.role !== "organizer" ? (
                  <form action={makeOrganizer}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t.familymakeOrganizer}
                    </Button>
                  </form>
                ) : null}
                {canDemote && !proxy && m.role === "organizer" ? (
                  <form action={demoteOrganizer}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t.familymakeMember}
                    </Button>
                  </form>
                ) : null}
                {canRemove ? (
                  <form action={proxy ? removeProxyMember : removeMember}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t.familyremove}
                    </Button>
                  </form>
                ) : proxy && !organizer ? (
                  <Pill>{t.familyproxyPill}</Pill>
                ) : null}
              </div>
            </div>
            {canRename ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.familyrenameToggle}</summary>
                <form action={renameMember} className="mt-2 flex gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <input name="displayName" defaultValue={m.displayName} required maxLength={60} className={`${inputClass} h-10 text-[15px]`} aria-label={t.familynameFieldAria} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t.familysaveMember}
                  </Button>
                </form>
              </details>
            ) : null}
            {controlsPrivacy ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.familyvotePrivacyToggle}</summary>
                <div className="mt-2 flex flex-col gap-2">
                  <p className="text-sm text-ink-2">
                    {mine ? (m.votesHidden ? t.familyprivacyStatusMineHidden : t.familyprivacyStatusMineShown) : (m.votesHidden ? interpolate(t.familyprivacyStatusOtherHidden, { name: m.displayName }) : interpolate(t.familyprivacyStatusOtherShown, { name: m.displayName }))}
                  </p>
                  <p className="text-xs text-ink-3">{t.familyprivacyExplain}</p>
                  <form action={setVotePrivacy}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="votesHidden" value={m.votesHidden ? "0" : "1"} />
                    <Button type="submit" variant="ghost" size="sm">
                      {m.votesHidden ? (mine ? t.familyprivacyToggleMineShow : interpolate(t.familyprivacyToggleOtherShow, { name: m.displayName })) : (mine ? t.familyprivacyToggleMineHide : interpolate(t.familyprivacyToggleOtherHide, { name: m.displayName }))}
                    </Button>
                  </form>
                </div>
              </details>
            ) : null}
            {organizer && proxy && organizers.length > 1 ? (
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.familyproxyManagerToggle}</summary>
                <form action={reassignProxy} className="mt-2 flex gap-2">
                  <input type="hidden" name="memberId" value={m.id} />
                  <select name="toMemberId" aria-label={t.familyhandToAria} className={`${inputClass} h-10 flex-1 text-[15px]`} defaultValue={organizers.find((o) => o.userId === m.managedByUserId)?.id ?? organizers[0].id}>
                    {organizers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.displayName}
                        {o.userId === user.id ? t.familyyouSuffix : ""}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="ghost" size="sm">
                    {t.familyhandOver}
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
            <Field label={t.familyaddProxyLabel} hint={t.familyaddProxyHint}>
              <input name="displayName" required maxLength={60} placeholder={t.familyaddProxyPlaceholder} className={inputClass} />
            </Field>
            <Button type="submit" variant="secondary">
              {t.familyaddSeat}
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-xs text-ink-3">{t.familynonOrganizerNote}</p>
      )}

      <form action={leaveFamily} className="flex justify-center">
        <Button type="submit" variant="ghost" size="sm">
          {t.familyleave}
        </Button>
      </form>

      {organizer ? (
        <Card className="p-4">
          <form action={renameFamily} className="flex flex-col gap-3">
            <Field label={t.familyrenameFamilyLabel}>
              <input name="name" defaultValue={family.name} required maxLength={60} className={inputClass} />
            </Field>
            <Button type="submit" variant="ghost" size="sm">
              {t.familysaveName}
            </Button>
          </form>
        </Card>
      ) : null}

      {organizer ? (
        <details className="rounded-card border border-line bg-card p-4">
          <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.familydeleteToggle}</summary>
          <form action={deleteFamily} className="mt-3 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" name="confirm" /> {interpolate(t.familydeleteConfirm, { family: family.name })}
            </label>
            <Button type="submit" variant="danger" size="sm">
              {t.familydeleteButton}
            </Button>
          </form>
        </details>
      ) : null}
    </Screen>
  );
}
