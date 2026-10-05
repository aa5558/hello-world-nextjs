import { redirect } from "next/navigation";
import { getDailyPrompt } from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/create");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Post a photo</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          AI writes four captions. Everyone votes on the best one.
        </p>
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">Today&apos;s prompt:</span>{" "}
          {getDailyPrompt()}
        </p>
      </div>
      <CreateForm />
    </main>
  );
}
