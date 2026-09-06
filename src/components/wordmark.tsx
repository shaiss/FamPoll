import Link from "next/link";
import { brandFor } from "@/lib/brand";
import { getLocale } from "@/lib/locale-server";
import { Icon } from "./ui";

/**
 * The logo + product name. A server component so it can read the request's
 * locale and spell the name for the domain the visitor is on (Quorum / Cuórum /
 * Quórum). Pass `name` to skip the lookup when the caller already has it.
 */
export async function Wordmark({ size = 22, href, name }: { size?: number; href?: string; name?: string }) {
  const label = name ?? brandFor(await getLocale()).name;
  const inner = (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex items-center justify-center rounded-[10px] bg-accent text-white" style={{ width: size * 1.55, height: size * 1.55 }}>
        <Icon name="poll" size={size * 0.9} stroke={2.5} />
      </span>
      <span className="font-display font-extrabold tracking-[-0.02em]" style={{ fontSize: size }}>
        {label}
      </span>
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
