"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PostActionResult = { error?: string; success?: boolean };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revalidatePost(generationId: string) {
  revalidatePath(`/g/${generationId}`);
  revalidatePath("/");
  revalidatePath("/challenge");
  revalidatePath("/me");
}

// Edits the context line on your own post. RLS only lets owners update, and
// a column grant limits it to `context`.
export async function updatePostContext(
  generationId: string,
  context: string
): Promise<PostActionResult> {
  if (!UUID_PATTERN.test(generationId)) {
    return { error: "Something went wrong. Refresh and try again." };
  }
  const trimmed = context.trim().replace(/\s+/g, " ").slice(0, 200) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in to edit your post." };
  }

  const { data, error } = await supabase
    .from("generations")
    .update({ context: trimmed })
    .eq("id", generationId)
    .eq("user_id", user.id)
    .select("id");

  if (error || !data?.length) {
    return { error: "Couldn't save your changes." };
  }

  revalidatePost(generationId);
  return { success: true };
}

// Deletes your own post along with its captions and votes (via ON DELETE
// CASCADE), then removes the photo from storage.
export async function deletePost(
  generationId: string
): Promise<PostActionResult> {
  if (!UUID_PATTERN.test(generationId)) {
    return { error: "Something went wrong. Refresh and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sign in to delete your post." };
  }

  const { data, error } = await supabase
    .from("generations")
    .delete()
    .eq("id", generationId)
    .eq("user_id", user.id)
    .select("image_path");

  if (error || !data?.length) {
    return { error: "Couldn't delete that post." };
  }

  await supabase.storage.from("generations").remove([data[0].image_path]);

  revalidatePost(generationId);
  return { success: true };
}
