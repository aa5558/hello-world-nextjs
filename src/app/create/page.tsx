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
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
      <div className="animate-fade-up flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
        <p className="eyebrow">new post</p>
        <h1 className="display text-5xl text-ink sm:text-7xl">
          Drop a photo.
          <br />
          <span className="serif text-sky-deep">Let the AI cook.</span>
        </h1>
        <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
          Upload a photo and Gemini writes four captions. Then everyone on campus adds their own, and
          votes decide who&apos;s funnier. No photo handy? Hit Surprise Me.
        </p>
        <div className="relative overflow-hidden rounded-[28px] bg-ice p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <span aria-hidden className="absolute right-4 top-4 text-5xl">
            📅
          </span>
          <p className="eyebrow text-ink">today&apos;s challenge</p>
          <p className="display mt-2 max-w-[80%] text-2xl">{getDailyPrompt()}</p>
        </div>
      </div>
      <div className="card p-5 sm:p-8">
        <CreateForm aiPhotosEnabled={AI_PHOTOS_ENABLED} />
      </div>
    </main>
  );
}
