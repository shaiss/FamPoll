import { LinkButton, Screen } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { getMessages } from "@/lib/locale-server";

export default async function NotFound() {
  const t = await getMessages();
  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{t.authnotFoundTitle}</h1>
        <p className="text-ink-2">{t.authnotFoundBody}</p>
      </div>
      <div className="flex gap-2">
        <LinkButton href="/app" size="sm">
          {t.authgoToMyFamily}
        </LinkButton>
        <LinkButton href="/" variant="secondary" size="sm">
          {t.authhome}
        </LinkButton>
      </div>
    </Screen>
  );
}
