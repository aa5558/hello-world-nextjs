"use server";

import { revalidatePath } from "next/cache";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";

export type CaptionFormState = {
  error?: string;
  success?: boolean;
  // Changes on every success so the form knows to clear itself.
  submittedAt?: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Messages for the exceptions raised by submit_human_caption().
const ERROR_MESSAGES: Record<string, string> = {
  not_signed_in: "Sign in to add a caption.",
  invalid_length: `Captions need to be 1–${HUMAN_CAPTION_MAX} characters.`,
  not_found: "That photo doesn't exist anymore.",
  post_limit: "You've already added 3 captions to this photo. Let them cook.",
  daily_limit: "You've hit today's limit of 30 captions. Come back tomorrow!",
  duplicate: "Someone already wrote that exact caption. Get more creative 😉",
};

// Adds a human-written caption to a photo so it can battle Gemini's.
export async function submitCaption(
  _prevState: CaptionFormState,
  formData: FormData
): Promise<CaptionFormState> {
  const generationId = formData.get("generation_id");
  const text = (formData.get("text") as string | null)?.trim() ?? "";

  if (typeof generationId !== "string" || !UUID_PATTERN.test(generationId)) {
    return { error: "Something went wrong. Refresh and try again." };
  }
  if (text.length === 0 || text.length > HUMAN_CAPTION_MAX) {
    return { error: ERROR_MESSAGES.invalid_length };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: ERROR_MESSAGES.not_signed_in };
  }

  const { error } = await supabase.rpc("submit_human_caption", {
    p_generation_id: generationId,
    p_text: text,
  });

  if (error) {
    return {
      error:
        ERROR_MESSAGES[error.message] ?? "Couldn't post your caption. Try again.",
    };
  }

  revalidatePath(`/g/${generationId}`);
  revalidatePath("/");
  revalidatePath("/challenge");
  revalidatePath("/me");
  revalidatePath("/surprise");
  return { success: true, submittedAt: Date.now() };
}

export type CaptionActionResult = { error?: string; success?: boolean };

const EDIT_ERROR_MESSAGES: Record<string, string> = {
  ...ERROR_MESSAGES,
  not_found: "That caption isn't yours or no longer exists.",
  has_votes: "People already voted on this one, so it can't be edited. You can still delete it.",
};

// Edits your own human caption. The database only allows it before anyone
// has voted on it.
export async function editCaption(
  captionId: string,
  text: string
): Promise<CaptionActionResult> {
  const trimmed = text.trim();
  if (!UUID_PATTERN.test(captionId)) {
    return { error: "Something went wrong. Refresh and try again." };
  }
  if (trimmed.length === 0 || trimmed.length > HUMAN_CAPTION_MAX) {
    return { error: ERROR_MESSAGES.invalid_length };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edit_human_caption", {
    p_caption_id: captionId,
    p_text: trimmed,
  });

  if (error) {
    return {
      error: EDIT_ERROR_MESSAGES[error.message] ?? "Couldn't save your edit.",
    };
  }

  revalidateCaptionPages();
  return { success: true };
}

// Deletes your own human caption and the votes on it.
export async function deleteCaption(
  captionId: string
): Promise<CaptionActionResult> {
  if (!UUID_PATTERN.test(captionId)) {
    return { error: "Something went wrong. Refresh and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_human_caption", {
    p_caption_id: captionId,
  });

  if (error) {
    return {
      error: EDIT_ERROR_MESSAGES[error.message] ?? "Couldn't delete your caption.",
    };
  }

  revalidateCaptionPages();
  return { success: true };
}

// Captions show up on every page, and editing one doesn't say which photo
// it belongs to, so refresh the layout everywhere.
function revalidateCaptionPages() {
  revalidatePath("/", "layout");
}
