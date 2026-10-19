"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";

const initialState: ProfileFormState = {};

export function ProfileForm({
  firstName,
  lastName,
  avatarUrl,
}: {
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState
  );
  const [preview, setPreview] = useState<string | null>(avatarUrl);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex items-center gap-5">
        <div className="orb rounded-full p-1">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Profile photo" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/60 text-3xl">🙂</div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Profile photo</span>
          <label htmlFor="avatar" className="btn btn-ghost btn-sm cursor-pointer self-start">
            Choose a photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="sr-only"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="first_name" className="text-sm font-semibold">
            First name
          </label>
          <input id="first_name" name="first_name" defaultValue={firstName} placeholder="First name" className="field" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="last_name" className="text-sm font-semibold">
            Last name
          </label>
          <input id="last_name" name="last_name" defaultValue={lastName} placeholder="Last name" className="field" />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-[18px] bg-down-soft px-4 py-3 text-sm text-down-ink">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-[18px] bg-human-soft px-4 py-3 text-sm font-medium text-human-ink">
          Profile saved ✨
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary btn-lg self-start">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
