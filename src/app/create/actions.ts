"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  buildCaptionPrompt,
  getDailyPrompt,
  IMAGE_PROMPT_MAX,
  isVibe,
} from "@/lib/captions";
import {
  generateCaptionsWithGemini,
  generateImageWithGemini,
  ImageGenerationUnavailableError,
} from "@/lib/gemini";
import { AI_PHOTOS_ENABLED } from "@/lib/features";
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
  const source =
    AI_PHOTOS_ENABLED && formData.get("source") === "ai" ? "ai" : "upload";
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
  if (source === "upload") {
    imageBytes = await image!.arrayBuffer();
    mimeType = image!.type;
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
  const prompt = buildCaptionPrompt({
    vibe,
    context,
    dailyPrompt,
    imagePrompt: source === "ai" ? imagePrompt : null,
  });

  let captions: string[];
  let model: string;
  try {
    ({ captions, model } = await generateCaptionsWithGemini({
      image: imageBytes,
      mimeType,
      prompt,
    }));
  } catch (error) {
    console.error("Caption generation failed", error);
    return { error: "The AI couldn't caption that one. Try again in a moment." };
  }

  const imagePath = `${user.id}/${crypto.randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`;
  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(imagePath, imageBytes, { contentType: mimeType });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      image_path: imagePath,
      image_source: source,
      image_prompt: source === "ai" ? imagePrompt : null,
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
    return { error: "Couldn't save your post. Please try again." };
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
    return { error: "Couldn't save the captions. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/challenge");
  revalidatePath("/me");
  redirect(`/g/${generation.id}`);
}
