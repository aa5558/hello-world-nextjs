"use client";

import { useState, useTransition } from "react";
import { deleteCaption, editCaption } from "@/app/captions/actions";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";

// Edit / delete controls on a caption the viewer wrote. Editing is only
// offered before anyone has voted on it (the database enforces the same).
export function CaptionOwnerActions({
  captionId,
  text,
  hasVotes,
  onEdited,
  onDeleted,
}: {
  captionId: string;
  text: string;
  hasVotes: boolean;
  onEdited: (text: string) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await editCaption(captionId, draft);
      if (result.error) {
        setError(result.error);
      } else {
        onEdited(draft.trim().replace(/\s+/g, " "));
        setEditing(false);
      }
    });
  }

  function remove() {
    if (!window.confirm("Delete your caption? Its votes will be deleted too.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteCaption(captionId);
      if (result.error) {
        setError(result.error);
      } else {
        onDeleted();
      }
    });
  }

  const link =
    "font-semibold text-black/50 hover:text-black disabled:opacity-40 dark:text-white/50 dark:hover:text-white";

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 pt-1">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={HUMAN_CAPTION_MAX}
          autoFocus
          aria-label="Edit your caption"
          className="rounded-lg border border-black/15 bg-surface px-2 py-1.5 text-sm dark:border-white/20"
        />
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={save} disabled={pending || !draft.trim()} className={link}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(text);
              setError(null);
            }}
            disabled={pending}
            className={link}
          >
            Cancel
          </button>
          {error && <span role="alert" className="text-red-600">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      {!hasVotes && (
        <button type="button" onClick={() => setEditing(true)} disabled={pending} className={link}>
          ✏️ Edit
        </button>
      )}
      <button type="button" onClick={remove} disabled={pending} className={link}>
        {pending ? "Deleting…" : "🗑️ Delete"}
      </button>
      {error && <span role="alert" className="text-red-600">{error}</span>}
    </div>
  );
}
