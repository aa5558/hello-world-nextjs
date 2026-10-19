"use client";

import { useState, useTransition } from "react";
import { deleteCaption, editCaption } from "@/app/captions/actions";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";
import { useConfirm } from "./ConfirmDialog";

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
  const { confirm, dialog } = useConfirm();

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

  async function remove() {
    const ok = await confirm({
      title: "Delete your caption?",
      body: "Its votes go with it. This can't be undone.",
      confirmLabel: "Delete caption",
    });
    if (!ok) return;
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
    "rounded-full px-2 py-0.5 font-semibold text-ink-2 transition hover:bg-white hover:text-ink disabled:opacity-40";

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2 pt-1">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={HUMAN_CAPTION_MAX}
          autoFocus
          aria-label="Edit your caption"
          className="field py-2 text-sm"
        />
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={save} disabled={pending || !draft.trim()} className="btn btn-primary btn-sm">
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
          {error && <span role="alert" className="text-down-ink">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {!hasVotes && (
        <button type="button" onClick={() => setEditing(true)} disabled={pending} className={link}>
          ✏️ Edit
        </button>
      )}
      <button type="button" onClick={remove} disabled={pending} className={link}>
        {pending ? "Deleting…" : "🗑️ Delete"}
      </button>
      {error && <span role="alert" className="text-down-ink">{error}</span>}
      {dialog}
    </div>
  );
}
