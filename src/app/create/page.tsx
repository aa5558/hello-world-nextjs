import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDailyPrompt } from "@/lib/captions";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
import { getDailyDrop, getLibraryImage, listLibraryImages } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";
// Generating an AI photo and then captioning it can take a while.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Meme Studio — Morningside Memes",
};

export default async function CreatePage(props: PageProps<"/create">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requested = typeof searchParams.image === "string" ? searchParams.image : null;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(requested ? `/create?image=${requested}` : "/create")}`);
  }

  const [dailyDrop, library, picked] = await Promise.all([
    getDailyDrop(supabase),
    listLibraryImages(supabase, 11),
    getLibraryImage(supabase, requested),
  ]);
  // A photo sent here from Surprise Me may not be among the newest ones.
  const choices = picked && !library.some((image) => image.id === picked.id) ? [picked, ...library] : library;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="animate-fade-up flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">meme studio</p>
          <h1 className="display text-5xl text-ink sm:text-7xl">
            Drop a photo. <span className="serif text-sky-deep">Let the AI cook.</span>
          </h1>
        </div>
        <div className="relative max-w-sm overflow-hidden rounded-[24px] bg-ice px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <p className="eyebrow text-ink">today&apos;s prompt</p>
          <p className="display mt-1 text-xl">{getDailyPrompt()}</p>
        </div>
      </header>
      <div className="animate-fade-up [animation-delay:100ms]">
        <CreateForm
          aiPhotosEnabled={AI_PHOTOS_ENABLED}
          dailyDrop={dailyDrop}
          library={choices}
          initialImageId={picked?.id ?? null}
        />
      </div>
    </main>
  );
}
