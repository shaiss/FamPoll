import { RefreshOnFocus } from "@/components/refresh-on-focus";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <RefreshOnFocus />
      {children}
    </div>
  );
}
