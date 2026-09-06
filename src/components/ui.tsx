import Link from "next/link";
import type { ReactNode } from "react";
import { avatarColor, initials } from "@/lib/format";

export function Avatar({ name, size = 28, ring = "#faf6f0" }: { name: string; size?: number; ring?: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.38), border: `2px solid ${ring}` }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 26, max = 6, ring }: { names: string[]; size?: number; max?: number; ring?: string }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <span className="inline-flex items-center">
      {shown.map((n, i) => (
        <span key={n + i} style={{ marginLeft: i === 0 ? 0 : -Math.round(size * 0.3) }}>
          <Avatar name={n} size={size} ring={ring} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="inline-flex items-center justify-center rounded-full bg-line text-ink-2 font-bold"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36), marginLeft: -Math.round(size * 0.3), border: `2px solid ${ring ?? "#faf6f0"}` }}
        >
          +{rest}
        </span>
      ) : null}
    </span>
  );
}

export function Card({ children, className = "", accent = false, as = "div" }: { children: ReactNode; className?: string; accent?: boolean; as?: "div" | "span" }) {
  const cls = `rounded-card border bg-card ${accent ? "border-accent-line shadow-accent" : "border-line"} ${className}`;
  if (as === "span") return <span className={`block ${cls}`}>{children}</span>;
  return <div className={cls}>{children}</div>;
}

export function SectionLabel({ children, right, tone = "muted" }: { children: ReactNode; right?: ReactNode; tone?: "muted" | "accent" | "teal" }) {
  const color = tone === "accent" ? "text-accent" : tone === "teal" ? "text-teal-deep" : "text-ink-2";
  return (
    <div className="flex items-center justify-between">
      <div className={`text-xs font-bold uppercase tracking-[0.08em] ${color}`}>{children}</div>
      {right ? <div className="text-xs font-semibold text-ink-2">{right}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" | "teal" }) {
  const cls =
    tone === "accent" ? "bg-accent-tint text-accent-deep" : tone === "teal" ? "bg-teal-tint text-teal-deep" : "bg-sand text-ink-2";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{children}</span>;
}

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "dark" | "danger";
  size?: "md" | "sm";
  className?: string;
};

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-[14px] font-bold transition active:scale-[0.98] disabled:opacity-50";
const buttonVariant = {
  primary: "bg-accent text-white shadow-button hover:bg-accent-deep",
  secondary: "bg-card text-ink border border-line hover:bg-sand",
  ghost: "bg-sand text-ink hover:bg-sand-2",
  dark: "bg-ink text-white hover:bg-black",
  danger: "bg-card text-accent-deep border border-accent-line hover:bg-accent-tint",
};
const buttonSize = { md: "h-[52px] px-5 text-base", sm: "h-9 px-4 text-sm rounded-[10px]" };

export function Button({ children, variant = "primary", size = "md", className = "", ...rest }: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${buttonBase} ${buttonVariant[variant]} ${buttonSize[size]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ children, href, variant = "primary", size = "md", className = "" }: ButtonProps & { href: string }) {
  return (
    <Link href={href} className={`${buttonBase} ${buttonVariant[variant]} ${buttonSize[size]} ${className}`}>
      {children}
    </Link>
  );
}

export function TopBar({ back, backLabel, right }: { back?: string; backLabel?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      {back ? (
        <Link href={back} className="inline-flex items-center gap-1 text-[15px] font-semibold text-ink-2 hover:text-ink">
          <Icon name="chevron-left" size={20} />
          <span>{backLabel}</span>
        </Link>
      ) : (
        <span />
      )}
      {right ?? null}
    </div>
  );
}

export function Progress({ decided, open, total }: { decided: number; open: number; total: number }) {
  const d = total ? (decided / total) * 100 : 0;
  const o = total ? (open / total) * 100 : 0;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-sand-2">
      <div className="bg-teal" style={{ width: `${d}%` }} />
      <div className="bg-accent" style={{ width: `${o}%` }} />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-[52px] w-full rounded-[14px] border border-line bg-card px-4 text-[17px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-3 focus:border-accent";

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto flex w-full max-w-md flex-col gap-6 px-5 pb-16 pt-6 ${className}`}>{children}</main>;
}

const paths: Record<string, ReactNode> = {
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.5" />
    </>
  ),
  share: <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  poll: (
    <>
      <path d="M4 6h16v10H9l-5 4V6z" />
      <path d="M9 11.5l2 2 4-4.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4.5-6.2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({ name, size = 16, stroke = 2, className = "" }: { name: keyof typeof paths | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? null}
    </svg>
  );
}
