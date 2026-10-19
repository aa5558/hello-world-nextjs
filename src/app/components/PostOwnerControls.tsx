"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, updatePostContext } from "@/app/posts/actions";
import { useConfirm } from "./ConfirmDialog";

// Edit-context / delete controls shown to the owner of a post.
export function PostOwnerControls({
  generationId,
  context,
}: {
  generationId: string;
  context: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(context ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updatePostContext(generationId, draft);
      if (result.error) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  async function remove() {
    const ok = await confirm({
      title: "Delete this post?",
      body: "The photo, all its captions, and every vote on them will be gone for good.",
      confirmLabel: "Delete post",
    });
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePost(generationId);
      if (result.error) {
        setError(result.error);
      } else if (pathname.startsWith("/g/")) {
        router.push("/me");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {editing ? (
        <div className="flex flex-col gap-2 rounded-[22px] bg-background p-3 ring-1 ring-line">
          <label htmlFor={`context-${generationId}`} className="eyebrow">
            Context
          </label>
          <input
            id={`context-${generationId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            autoFocus
            placeholder="Add some context (optional)"
            className="field py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(context ?? "");
              }}
              disabled={pending}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-butter text-butter-ink">✨ your post</span>
          <button type="button" onClick={() => setEditing(true)} disabled={pending} className="btn btn-ghost btn-sm">
            ✏️ Edit context
          </button>
          <button type="button" onClick={remove} disabled={pending} className="btn btn-ghost btn-sm !text-down-ink">
            {pending ? "Deleting…" : "🗑️ Delete post"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-down-ink">
          {error}
        </p>
      )}
      {dialog}
    </div>
  );
}
