"use client";

import Link from "next/link";
import { Button, Card, Screen } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Screen className="pt-14">
      <Card className="flex flex-col gap-3 p-5">
        <h1 className="font-display text-2xl font-bold">Something went sideways.</h1>
        <p className="text-ink-2">That didn’t go through. Try again in a moment; if it keeps happening, go home and come back.</p>
        {error.digest ? <p className="text-xs text-ink-3">Reference {error.digest}</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={reset}>
            Try again
          </Button>
          <Link href="/app" className="inline-flex h-9 items-center rounded-[10px] bg-sand px-4 text-sm font-bold">
            Home
          </Link>
        </div>
      </Card>
    </Screen>
  );
}
