import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
import { getDailyDrop, getLibraryImage, listLibraryImages } from "@/lib/library";
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
    <main className="flex flex-1 flex-col">
      <CreateForm
        submissionId={crypto.randomUUID()}
        aiPhotosEnabled={AI_PHOTOS_ENABLED}
        dailyDrop={dailyDrop}
        library={choices}
        initialImageId={picked?.id ?? null}
      />
    </main>
  );
}
