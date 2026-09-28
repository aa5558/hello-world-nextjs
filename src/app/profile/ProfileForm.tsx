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
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Profile photo"
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-black/10" />
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="avatar" className="text-sm font-medium">
            Photo
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="first_name" className="text-sm font-medium">
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          defaultValue={firstName}
          placeholder="First name"
          className="rounded-md border border-black/15 px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="last_name" className="text-sm font-medium">
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          defaultValue={lastName}
          placeholder="Last name"
          className="rounded-md border border-black/15 px-3 py-2"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-700">Profile saved.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
