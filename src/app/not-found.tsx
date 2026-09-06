import { LinkButton, Screen } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <Screen className="pt-14">
      <Wordmark href="/" />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">That page isn’t here.</h1>
        <p className="text-ink-2">The link may be old, or the event it pointed to was removed.</p>
      </div>
      <div className="flex gap-2">
        <LinkButton href="/app" size="sm">
          Go to my groups
        </LinkButton>
        <LinkButton href="/" variant="secondary" size="sm">
          Home
        </LinkButton>
      </div>
    </Screen>
  );
}
