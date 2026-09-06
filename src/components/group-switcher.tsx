import Link from "next/link";
import type { Membership } from "@/lib/auth";
import { switchGroup } from "@/lib/actions/family";
import { AvatarStack, Icon } from "./ui";

/**
 * Toggle between the groups you belong to, or start/join another. Server
 * rendered: each group is a `switchGroup` form, so switching works without
 * client JS (the details/summary handles the open state). `align` decides which
 * edge the menu drops from.
 */
export function GroupSwitcher({
  memberships,
  activeId,
  memberNames,
  align = "right",
}: {
  memberships: Membership[];
  activeId: string;
  memberNames?: string[];
  align?: "left" | "right";
}) {
  const active = memberships.find((m) => m.family.id === activeId) ?? memberships[0];
  if (!active) return null;
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        {memberNames ? <AvatarStack names={memberNames} size={30} max={4} /> : null}
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2">
          <span className="max-w-[8.5rem] truncate">{active.family.name}</span>
          <Icon name="chevron-down" size={16} stroke={2.25} className="text-ink-3 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className={`absolute z-30 mt-2 flex w-64 flex-col gap-0.5 rounded-card border border-line bg-card p-2 shadow-card ${align === "right" ? "right-0" : "left-0"}`}>
        <div className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {memberships.length > 1 ? "Your groups" : "Group"}
        </div>
        {memberships.map((m) => {
          const on = m.family.id === active.family.id;
          return (
            <form key={m.family.id} action={switchGroup}>
              <input type="hidden" name="familyId" value={m.family.id} />
              <button
                type="submit"
                aria-current={on ? "true" : undefined}
                className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-sm font-semibold hover:bg-sand ${on ? "text-ink" : "text-ink-2"}`}
              >
                <AvatarStack names={[m.family.name]} size={24} ring="#ffffff" />
                <span className="min-w-0 flex-1 truncate">{m.family.name}</span>
                {on ? <Icon name="check" size={16} stroke={3} className="shrink-0 text-teal" /> : null}
              </button>
            </form>
          );
        })}
        <div className="my-1 h-px bg-line" />
        <Link href="/app/family" className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-sm font-semibold text-ink-2 hover:bg-sand">
          <Icon name="users" size={16} /> Manage people
        </Link>
        <Link href="/app/family/new" className="flex items-center gap-2 rounded-[10px] px-2 py-2 text-sm font-semibold text-accent-deep hover:bg-sand">
          <Icon name="plus" size={16} stroke={2.5} /> New or join a group
        </Link>
      </div>
    </details>
  );
}
