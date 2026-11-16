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
    <ul className="flex w-full max-w-xl flex-col gap-2 text-left">
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
    <li className="rise flex items-center gap-4 rounded-[22px] bg-white p-3 pr-3 ring-1 ring-line" style={{ animationDelay: `${delay}ms` }}>
      <Link href={`/g/${caption.generationId}`} className="shrink-0" aria-label="Open the meme">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={caption.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
      </Link>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug text-ink">“{caption.text}”</span>
        <span className="mt-1 block text-xs text-ink-3">
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
            className="resize-none rounded-2xl bg-white p-4 text-lg outline-none ring-1 ring-line focus:ring-ink/40"
          />
          <p className="text-xs text-ink-3">You can edit until someone votes on it.</p>
          <button type="submit" disabled={pending} className="self-start rounded-full bg-ink px-6 py-3 font-medium text-white disabled:opacity-40">
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
            className="rounded-full bg-down-ink px-6 py-3 font-medium text-white disabled:opacity-40"
          >
            {pending ? "Deleting…" : "Delete caption"}
          </button>
          <button type="button" onClick={() => setSheet("none")} className="rounded-full px-6 py-3 ring-1 ring-line">
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
          <img src={preview} alt="Profile photo" className="h-24 w-24 rounded-full object-cover ring-4 ring-white transition group-hover:opacity-80" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-sm text-ink-3 ring-1 ring-line transition group-hover:ring-ink/30">
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
            className="border-0 border-b-[1.5px] border-ink/15 bg-transparent px-1 py-2 text-xl text-ink outline-none focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-xs text-ink-3">
          Last name
          <input
            id="last_name"
            name="last_name"
            defaultValue={lastName}
            className="border-0 border-b-[1.5px] border-ink/15 bg-transparent px-1 py-2 text-xl text-ink outline-none focus:border-ink"
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
        className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
