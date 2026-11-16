"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { deleteCaption, editCaption } from "@/app/captions/actions";
import { Sheet, SheetItem } from "@/app/components/ui";
import { updateProfile, type ProfileFormState } from "@/app/profile/actions";
import type { MyCaption } from "@/lib/battles";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";

// Your captions, each with its standing on its photo and a "···" for edit /
// delete (edit only works until someone votes on it; the database enforces
// that).
export function MyCaptionList({ captions }: { captions: MyCaption[] }) {
  return (
    <ul className="grid w-full max-w-3xl gap-4 text-left sm:grid-cols-2">
      {captions.map((c, i) => (
        <MyCaptionRow key={c.id} caption={c} delay={i * 50} />
      ))}
    </ul>
  );
}

function MyCaptionRow({ caption, delay }: { caption: MyCaption; delay: number }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"none" | "menu" | "edit" | "delete">("none");
  const [draft, setDraft] = useState(caption.text);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    // An illuminated note pinned to the dressing-room wall.
    <li
      className={`rise panel lit ${["glow-green", "glow-cyan", "glow-pink", "glow-violet"][Math.round(delay / 50) % 4]} flex items-center gap-4 rounded-[20px] p-3 pr-3`}
      style={{ animationDelay: `${delay}ms`, transform: `rotate(${[-1.2, 0.9, -0.6, 1.3][Math.round(delay / 50) % 4]}deg)` }}
    >
      <Link href={`/g/${caption.generationId}`} className="shrink-0" aria-label="Open the meme">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={caption.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
      </Link>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug text-white">“{caption.text}”</span>
        <span className="tube glow-green mt-1 block text-[10px]">
          #{caption.rank} of {caption.total} on its photo · {caption.score > 0 ? `+${caption.score}` : caption.score}
        </span>
        {error && (
          <span role="alert" className="mt-1 block text-xs text-down-ink">
            {error}
          </span>
        )}
      </span>
      <button type="button" onClick={() => setSheet("menu")} aria-label="Edit or delete this caption" className="rounded-full px-3 py-2 text-ink-3 hover:text-ink">
        ···
      </button>

      <Sheet open={sheet === "menu"} onClose={() => setSheet("none")} title="Your caption">
        <SheetItem onClick={() => setSheet("edit")}>Edit</SheetItem>
        <SheetItem href={`/g/${caption.generationId}`}>Open the meme</SheetItem>
        <SheetItem danger onClick={() => setSheet("delete")}>
          Delete
        </SheetItem>
      </Sheet>
      <Sheet open={sheet === "edit"} onClose={() => setSheet("none")} title="Edit your caption">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await editCaption(caption.id, draft);
              if (res.error) {
                setError(res.error);
                setSheet("none");
                return;
              }
              setSheet("none");
              router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          <textarea
            aria-label="Caption"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={HUMAN_CAPTION_MAX}
            rows={3}
            className="field resize-none text-lg"
          />
          <p className="text-xs text-ink-3">You can edit until someone votes on it.</p>
          <button type="submit" disabled={pending} className="btn-neon glow-cyan self-start !py-3">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </Sheet>
      <Sheet open={sheet === "delete"} onClose={() => setSheet("none")} title="Delete your caption?">
        <p className="mb-5 text-ink-2">Its votes go with it.</p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteCaption(caption.id);
                if (res.error) setError(res.error);
                setSheet("none");
                router.refresh();
              })
            }
            className="btn-neon self-start !py-3 [--glow:255,122,138]"
          >
            {pending ? "Deleting…" : "Delete caption"}
          </button>
          <button type="button" onClick={() => setSheet("none")} className="chip-neon glow-violet !px-6 !py-3">
            Keep it
          </button>
        </div>
      </Sheet>
    </li>
  );
}

const initialProfile: ProfileFormState = {};

// Name and photo. Same action as before (updateProfile).
export function AccountForm({ firstName, lastName, avatarUrl }: { firstName: string; lastName: string; avatarUrl: string | null }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialProfile);
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  return (
    <form action={formAction} className="flex w-full max-w-md flex-col items-center gap-6">
      <label htmlFor="avatar" className="group relative cursor-pointer">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Profile photo" className="h-24 w-24 rounded-full object-cover ring-2 ring-green/70 shadow-[0_0_24px_-4px_#a3ff47] transition group-hover:opacity-80" />
        ) : (
          <span className="tube glow-green flex h-24 w-24 items-center justify-center rounded-full border border-green/40 text-[10px] transition group-hover:border-green">
            add photo
          </span>
        )}
        <span className="mt-2 block text-xs text-ink-3">Profile photo · tap to change</span>
      </label>
      <input
        id="avatar"
        name="avatar"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPreview(URL.createObjectURL(file));
        }}
        className="sr-only"
      />
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-left text-xs text-ink-3">
          First name
          <input
            id="first_name"
            name="first_name"
            defaultValue={firstName}
            className="neon-input !text-left text-xl"
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-xs text-ink-3">
          Last name
          <input
            id="last_name"
            name="last_name"
            defaultValue={lastName}
            className="neon-input !text-left text-xl"
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-down-ink">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rise text-sm text-ink-2">
          Saved.
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn-neon glow-green"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
