import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { hasClerk } from "@/lib/env";
import { Wordmark } from "@/components/ui";

export default function SignUpPage() {
  if (!hasClerk) redirect("/setup");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center gap-8 px-5 pb-16 pt-16">
      <Wordmark />
      <SignUp />
    </main>
  );
}
