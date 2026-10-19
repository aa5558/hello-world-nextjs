"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

type Options = { title: string; body: ReactNode; confirmLabel: string };

// A styled replacement for window.confirm(). `confirm()` opens the dialog
// and resolves true only if the person clicks the confirm button.
export function useConfirm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const [options, setOptions] = useState<Options | null>(null);

  const confirm = useCallback((next: Options) => {
    setOptions(next);
    // Open after React has rendered the new content.
    requestAnimationFrame(() => dialog.current?.showModal());
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(ok: boolean) {
    dialog.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
  }

  const element = (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close(false);
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[28px] border-0 bg-white p-0 text-ink shadow-[0_30px_80px_-20px_rgba(22,38,61,0.45)] backdrop:bg-ink/25 backdrop:backdrop-blur-sm"
    >
      {options && (
        <div className="flex flex-col gap-3 p-6">
          <h2 className="display text-2xl">{options.title}</h2>
          <div className="text-[15px] leading-relaxed text-ink-2">{options.body}</div>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => close(false)} className="btn btn-ghost">
              Keep it
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => close(true)}
              className="btn bg-down text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_-12px_rgba(236,91,55,0.9)]"
            >
              {options.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );

  return { confirm, dialog: element };
}
