"use client";

import Link from "next/link";
import { Button, Card, Screen } from "@/components/ui";
import { useMessages } from "@/components/locale-provider";
import { interpolate } from "@/lib/messages";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useMessages();
  return (
    <Screen className="pt-14">
      <Card className="flex flex-col gap-3 p-5">
        <h1 className="font-display text-2xl font-bold">{t.homeErrorTitle}</h1>
        <p className="text-ink-2">{t.homeErrorBody}</p>
        {error.digest ? <p className="text-xs text-ink-3">{interpolate(t.homeErrorReference, { digest: error.digest })}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={reset}>
            {t.homeErrorTryAgain}
          </Button>
          <Link href="/app" className="inline-flex h-9 items-center rounded-[10px] bg-sand px-4 text-sm font-bold">
            {t.homeErrorHome}
          </Link>
        </div>
      </Card>
    </Screen>
  );
}
