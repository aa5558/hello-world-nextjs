import { redirect } from "next/navigation";
import { getDailyPrompt } from "@/lib/captions";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
import { createClient } from "@/lib/supabase/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";
// Generating an AI photo and then captioning it can take a while.
export const maxDuration = 60;

export default async function CreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/create");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight">Post a photo</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Upload a photo and Gemini writes four captions. Then everyone on
          campus adds their own, and votes decide who&apos;s funnier. No photo
          handy? Hit Surprise Me.
        </p>
        <p className="rounded-xl bg-navy p-3 text-sm text-white">
          <span className="font-semibold text-columbia">📅 Today&apos;s challenge:</span>{" "}
          {getDailyPrompt()}
        </p>
      </div>
      <CreateForm aiPhotosEnabled={AI_PHOTOS_ENABLED} />
    </main>
  );
}
