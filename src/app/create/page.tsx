import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
import { getDailyPrompt } from "@/lib/captions";
import { getDailyDrop, getLibraryImage, listLibraryImages, pickLibraryImage } from "@/lib/library";
import { SURPRISE_HISTORY } from "@/lib/surprise";
import { createClient } from "@/lib/supabase/server";
import { CreateForm } from "./CreateForm";

export const dynamic = "force-dynamic";
// Generating an AI photo and then captioning it can take a while.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Create · Morningside Memes",
};

export default async function CreatePage(props: PageProps<"/create">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requested = typeof searchParams.image === "string" ? searchParams.image : null;
  const surprised = searchParams.surprise === "1";
  const seen = (typeof searchParams.seen === "string" ? searchParams.seen : "").split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!user) {
    const back = surprised ? "/create?surprise=1" : requested ? `/create?image=${requested}` : "/create";
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  // "Surprise me": a random released library photo, avoiding recent ones.
  const [dailyDrop, library, picked] = await Promise.all([
    getDailyDrop(supabase),
    listLibraryImages(supabase, 11),
    surprised ? pickLibraryImage(supabase, seen) : getLibraryImage(supabase, requested),
  ]);
  const surpriseHref = `/create?surprise=1&seen=${[...seen, ...(picked ? [picked.id] : [])].slice(-SURPRISE_HISTORY).join(",")}`;
  // A photo sent here from Surprise Me may not be among the newest ones.
  const choices = picked && !library.some((image) => image.id === picked.id) ? [picked, ...library] : library;

  return (
    <main className="flex flex-1 flex-col">
      <CreateForm
        key={picked?.id ?? "upload"}
        submissionId={crypto.randomUUID()}
        aiPhotosEnabled={AI_PHOTOS_ENABLED}
        dailyDrop={dailyDrop}
        library={choices}
        initialImageId={picked?.id ?? null}
        dailyPrompt={getDailyPrompt()}
        surpriseHref={surpriseHref}
        surprised={surprised && Boolean(picked)}
      />
    </main>
  );
}
