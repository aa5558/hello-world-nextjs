"use server";

import type { Reveal } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export type VoteResult =
  | {
      upvotes: number;
      downvotes: number;
      vote: -1 | 0 | 1;
      reveal: Reveal | null;
    }
  | { error: string; signedOut?: boolean };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Records the signed-in user's vote on a caption. `vote` of 0 removes it.
// One row per (user, caption) in caption_votes; a trigger keeps the tallies
// on captions in sync. Voting earns the reveal of who wrote the caption.
export async function castVote(
  captionId: string,
  vote: -1 | 0 | 1
): Promise<VoteResult> {
  if (!UUID_PATTERN.test(captionId) || ![-1, 0, 1].includes(vote)) {
    return { error: "Invalid vote." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sign in to vote.", signedOut: true };
  }

  // The vote policies reject this too; checking first gives a clear message.
  const { data: ownCaption } = await supabase.rpc("is_own_human_caption", {
    p_caption_id: captionId,
  });
  if (ownCaption === true) {
    return { error: "You can't vote on your own caption." };
  }

  const { error } =
    vote === 0
      ? await supabase
          .from("caption_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("caption_id", captionId)
      : await supabase.from("caption_votes").upsert(
          {
            user_id: user.id,
            caption_id: captionId,
            vote,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,caption_id" }
        );

  if (error) {
    return { error: "Couldn't save your vote. Try again." };
  }

  const [{ data: caption, error: readError }, { data: reveals }] =
    await Promise.all([
      supabase
        .from("captions")
        .select("upvotes, downvotes")
        .eq("id", captionId)
        .single(),
      supabase.rpc("caption_reveals", { p_caption_ids: [captionId] }),
    ]);

  if (readError || !caption) {
    return { error: "Couldn't load the updated score." };
  }

  const reveal = (
    reveals as
      | { author_type: "ai" | "human"; author_name: string | null; is_mine: boolean }[]
      | null
  )?.[0];
  return {
    upvotes: caption.upvotes,
    downvotes: caption.downvotes,
    vote,
    reveal: reveal
      ? {
          authorType: reveal.author_type,
          authorName: reveal.author_name,
          isMine: reveal.is_mine,
        }
      : null,
  };
}
