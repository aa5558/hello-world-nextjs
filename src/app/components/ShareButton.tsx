"use client";

import { useState } from "react";
import { Icon } from "./Icon";

// Opens the phone's share sheet when there is one, otherwise copies the link.
export function ShareButton({ path, text, className = "btn btn-ghost btn-sm" }: { path: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Morningside Memes", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed: nothing to do.
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <Icon name="share" className="h-4 w-4" />
      <span aria-live="polite">{copied ? "Link copied" : "Send to the group chat"}</span>
    </button>
  );
}
