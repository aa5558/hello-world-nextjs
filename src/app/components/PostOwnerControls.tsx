"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, updatePostContext } from "@/app/posts/actions";

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

  function remove() {
    if (
      !window.confirm(
        "Delete this post? The photo, all its captions, and all votes on them will be gone for good."
      )
    ) {
      return;
    }
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

  const button =
    "rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-black/10 hover:bg-black/5 disabled:opacity-40 dark:ring-white/15 dark:hover:bg-white/10";

  return (
    <div className="flex flex-col gap-2">
      {editing ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={`context-${generationId}`} className="text-xs font-semibold">
            Context
          </label>
          <input
            id={`context-${generationId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={200}
            autoFocus
            placeholder="Add some context (optional)"
            className="rounded-lg border border-black/15 bg-surface px-3 py-2 text-sm dark:border-white/20"
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={pending} className={button}>
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(context ?? "");
              }}
              disabled={pending}
              className={button}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-black/50 dark:text-white/50">Your post:</span>
          <button type="button" onClick={() => setEditing(true)} disabled={pending} className={button}>
            ✏️ Edit context
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`${button} text-red-600`}
          >
            {pending ? "Deleting…" : "🗑️ Delete post"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
