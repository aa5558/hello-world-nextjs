"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDailyPrompt, IMAGE_PROMPT_MAX, isVibe } from "@/lib/captions";
import {
  generateImageWithGemini,
  ImageGenerationUnavailableError,
} from "@/lib/gemini";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
import { getLibraryImage } from "@/lib/library";
import { finishCaptionRequest, PipelineError, runCaptionPipeline } from "@/lib/pipeline";
import { createClient } from "@/lib/supabase/server";

export type CreateFormState = {
  error?: string;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
// Keeps the free Gemini quota from being drained by one account.
const DAILY_GENERATION_LIMIT = 10;
// Image generation costs much more than captioning, so it gets its own cap.
const DAILY_AI_PHOTO_LIMIT = 5;

export async function createGeneration(
  _prevState: CreateFormState,
  formData: FormData
): Promise<CreateFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/create");
  }

  // AI photos are switched off unless ENABLE_AI_PHOTOS=true; the form hides
  // the option, and this stops anyone posting the field by hand.
  const requested = formData.get("source");
  const source =
    AI_PHOTOS_ENABLED && requested === "ai"
      ? "ai"
      : requested === "library"
        ? "library"
        : "upload";
  const vibe = formData.get("vibe");
  const context =
    (formData.get("context") as string | null)?.trim().slice(0, 200) || null;
  const imagePrompt =
    (formData.get("image_prompt") as string | null)?.trim().replace(/\s+/g, " ") ?? "";

  if (!isVibe(vibe)) {
    return { error: "Pick a voice for your captions." };
  }

  const image = formData.get("image") as File | null;
  if (source === "upload") {
    if (!image || image.size === 0) {
      return { error: "Pick a photo first." };
    }
    if (!IMAGE_EXTENSIONS[image.type]) {
      return { error: "Please upload a PNG, JPEG, or WEBP image." };
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return { error: "Image must be smaller than 4MB." };
    }
  } else if (source === "library") {
    // Checked again below when the image is loaded.
  } else if (imagePrompt.length < 3 || imagePrompt.length > IMAGE_PROMPT_MAX) {
    return {
      error: `Describe the photo you want in 3–${IMAGE_PROMPT_MAX} characters.`,
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count }, { count: aiPhotoCount }] = await Promise.all([
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since),
    supabase
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("image_source", "ai")
      .gte("created_at", since),
  ]);

  if ((count ?? 0) >= DAILY_GENERATION_LIMIT) {
    return {
      error: `You've hit today's limit of ${DAILY_GENERATION_LIMIT} posts. Go vote on some captions instead!`,
    };
  }
  if (source === "ai" && (aiPhotoCount ?? 0) >= DAILY_AI_PHOTO_LIMIT) {
    return {
      error: `You've generated ${DAILY_AI_PHOTO_LIMIT} AI photos today. Upload a real one instead!`,
    };
  }

  let imageBytes: ArrayBuffer;
  let mimeType: string;
  let sourceImageId: string | null = null;
  if (source === "upload") {
    imageBytes = await image!.arrayBuffer();
    mimeType = image!.type;
  } else if (source === "library") {
    // Only released, active library images are visible here (RLS), so a
    // hand-edited id can't pull in an unreleased Daily Drop.
    const picked = await getLibraryImage(supabase, formData.get("library_image"));
    if (!picked) {
      return { error: "That photo isn't available anymore. Pick another one." };
    }
    const response = await fetch(picked.url);
    mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !IMAGE_EXTENSIONS[mimeType]) {
      return { error: "We couldn't load that photo. Try another one." };
    }
    imageBytes = await response.arrayBuffer();
    if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
      return { error: "That photo is too large to caption." };
    }
    sourceImageId = picked.id;
  } else {
    try {
      ({ image: imageBytes, mimeType } = await generateImageWithGemini(imagePrompt));
    } catch (error) {
      console.error("Image generation failed", error);
      return {
        error:
          error instanceof ImageGenerationUnavailableError
            ? "AI photo generation isn't available right now. Upload a photo instead."
            : "The AI couldn't draw that one. Try a different description.",
      };
    }
    if (!IMAGE_EXTENSIONS[mimeType] || imageBytes.byteLength > MAX_IMAGE_BYTES) {
      return { error: "The AI photo came back in a format we can't use. Try again." };
    }
  }

  const dailyPrompt = getDailyPrompt();

  let run: Awaited<ReturnType<typeof runCaptionPipeline>>;
  try {
    run = await runCaptionPipeline(supabase, {
      vibe,
      context,
      dailyPrompt,
      imagePrompt: source === "ai" ? imagePrompt : null,
      image: imageBytes,
      mimeType,
    });
  } catch (error) {
    console.error("Caption generation failed", error);
    return {
      error:
        error instanceof PipelineError
          ? error.userMessage
          : "The AI couldn't caption that one. Try again in a moment.",
    };
  }
  const { captions, model, prompt, requestId } = run;
  const fail = async (message: string) => {
    await finishCaptionRequest(supabase, requestId, false, message);
    return { error: message };
  };

  const imagePath = `${user.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`;
  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(imagePath, imageBytes, { contentType: mimeType });

  if (uploadError) {
    return fail(`Upload failed: ${uploadError.message}`);
  }

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      image_path: imagePath,
      image_source: source === "ai" ? "ai" : "upload",
      image_prompt: source === "ai" ? imagePrompt : null,
      // Only sent when set, so posting still works before the column exists.
      ...(sourceImageId ? { source_image_id: sourceImageId } : {}),
      context,
      vibe,
      daily_prompt: dailyPrompt,
      model,
      prompt,
    })
    .select("id")
    .single();

  if (generationError || !generation) {
    await supabase.storage.from("generations").remove([imagePath]);
    return fail("Couldn't save your post. Please try again.");
  }

  const { error: captionsError } = await supabase.from("captions").insert(
    captions.map((text) => ({
      generation_id: generation.id,
      user_id: user.id,
      author_type: "ai",
      text,
    }))
  );

  if (captionsError) {
    return fail("Couldn't save the captions. Please try again.");
  }

  await finishCaptionRequest(supabase, requestId, true, undefined, generation.id);

  revalidatePath("/");
  revalidatePath("/challenge");
  revalidatePath("/me");
  redirect(`/g/${generation.id}?new=1`);
}
