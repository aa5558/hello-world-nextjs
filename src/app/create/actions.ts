"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildCaptionPrompt, getDailyPrompt, isVibe } from "@/lib/captions";
import { generateCaptionsWithGemini } from "@/lib/gemini";
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

  const image = formData.get("image") as File | null;
  const vibe = formData.get("vibe");
  const context =
    (formData.get("context") as string | null)?.trim().slice(0, 200) || null;

  if (!image || image.size === 0) {
    return { error: "Pick a photo first." };
  }
  const extension = IMAGE_EXTENSIONS[image.type];
  if (!extension) {
    return { error: "Please upload a PNG, JPEG, or WEBP image." };
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be smaller than 4MB." };
  }
  if (!isVibe(vibe)) {
    return { error: "Pick a voice for your captions." };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);

  if ((count ?? 0) >= DAILY_GENERATION_LIMIT) {
    return {
      error: `You've hit today's limit of ${DAILY_GENERATION_LIMIT} posts. Go vote on some captions instead!`,
    };
  }

  const dailyPrompt = getDailyPrompt();
  const prompt = buildCaptionPrompt({ vibe, context, dailyPrompt });
  const imageBytes = await image.arrayBuffer();

  let captions: string[];
  let model: string;
  try {
    ({ captions, model } = await generateCaptionsWithGemini({
      image: imageBytes,
      mimeType: image.type,
      prompt,
    }));
  } catch (error) {
    console.error("Caption generation failed", error);
    return { error: "The AI couldn't caption that one. Try again in a moment." };
  }

  const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(imagePath, imageBytes, { contentType: image.type });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: generation, error: generationError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      image_path: imagePath,
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
      text,
    }))
  );

  if (captionsError) {
    return { error: "Couldn't save the captions. Please try again." };
  }

  revalidatePath("/");
  redirect(`/g/${generation.id}`);
}
