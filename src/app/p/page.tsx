import type { Metadata } from "next";
import { Card, LinkButton, Screen } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { brandFor } from "@/lib/brand";
import { getLocale, getMessages } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const b = brandFor(await getLocale());
  const t = await getMessages();
  return { title: interpolateMeta(t.pubMetaPersonalLinkTitle, b.name), robots: { index: false } };
}

function interpolateMeta(title: string, brand: string) {
  return `${title} · ${brand}`;
}

export default async function PersonalLinkHelpPage() {
  const t = await getMessages();
  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <Card className="flex flex-col gap-3 p-5">
        <h1 className="font-display text-2xl font-bold">{t.seatNeedLinkTitle}</h1>
        <p className="text-ink-2">{t.seatNeedLinkBody}</p>
        <LinkButton href="/" variant="secondary">{t.pubHome}</LinkButton>
      </Card>
    </Screen>
  );
}
