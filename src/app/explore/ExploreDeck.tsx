"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Sparkles } from "@/app/components/Sparkles";
import { Quiet, Sheet, SheetItem } from "@/app/components/ui";
import { Tilt } from "@/app/components/Tilt";
import { SampleMeme } from "@/app/components/SampleMeme";
import { play } from "@/lib/sound";
import { deleteCaption, editCaption, submitCaption, type CaptionFormState } from "@/app/captions/actions";
import { deletePost, updatePostContext } from "@/app/posts/actions";
import { castVote } from "@/app/votes/actions";
import type { BattleResult } from "@/lib/battles";
import { HUMAN_CAPTION_MAX, VIBES, isVibe } from "@/lib/captions";
import type { FeedCaption, FeedGeneration, Reveal } from "@/lib/feed";

const RESULT_LINES: Record<BattleResult["winner"], string> = {
  human: "Final: humans won this one.",
  ai: "Final: the AI took it.",
  tie: "Final: a dead heat.",
  no_contest: "Final: no humans showed up, so the AI won by default.",
};

type VoteState = { upvotes: number; downvotes: number; vote: -1 | 0 | 1; reveal: Reveal | null };

// Explore: one meme at a time. Swipe, use the arrow keys, or tap ← / →.
// Everything you can do with a meme lives on this one screen: vote blind
// (the author appears once you vote), write your own caption, share it, and,
// on your own posts and captions, edit or delete them.
export function ExploreDeck({
  items,
  results,
  startId,
  currentUserId,
  basePath,
  emptyHref,
}: {
  items: FeedGeneration[];
  results: Record<string, BattleResult>;
  startId: string | null;
  currentUserId: string | null;
  // Where the address bar should point for the current meme, e.g. "/explore".
  basePath: string;
  emptyHref: string;
}) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(
    items.find((g) => g.id === startId)?.id ?? items[0]?.id ?? null
  );
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [overview, setOverview] = useState(false);
  const index = Math.max(0, items.findIndex((g) => g.id === currentId));
  const item = items[index] ?? null;

  const go = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const next = (index + delta + items.length) % items.length;
      setDirection(delta >= 0 ? "next" : "prev");
      setCurrentId(items[next].id);
    },
    [index, items]
  );

  // Keep the address shareable: /explore?id=… (the address bar only).
  useEffect(() => {
    if (!item) return;
    const url = new URL(window.location.href);
    if (basePath === "/explore") {
      url.searchParams.set("id", item.id);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, [item, basePath]);

  // Arrow keys move between memes (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [role=dialog]")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  // Swipe on the photo.
  const touchX = useRef<number | null>(null);

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-6">
        <h1 className="word glow-violet text-5xl sm:text-7xl">The gallery is empty.</h1>
        <SampleMeme createHref={emptyHref} compact />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div
        key={item.id}
        className={`flex w-full flex-col items-center gap-5 ${direction === "next" ? "slide-next" : "slide-prev"}`}
      >
        {/* The gallery: the current meme lit in front, its neighbours hanging
            further back in the dark (tap them to walk over). */}
        <figure
          className="relative flex w-full flex-col items-center [perspective:1400px]"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          {items.length > 1 && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => go(-1)}
                className="frame glow-violet absolute left-0 top-1/2 hidden w-40 -translate-y-1/2 opacity-30 blur-[1px] transition duration-500 [transform:translateY(-50%)_rotateY(38deg)_translateZ(-160px)] hover:opacity-60 lg:block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={items[(index - 1 + items.length) % items.length].imageUrl} alt="" className="aspect-[4/5] w-full rounded-[10px] object-cover" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => go(1)}
                className="frame glow-violet absolute right-0 top-1/2 hidden w-40 -translate-y-1/2 opacity-30 blur-[1px] transition duration-500 [transform:translateY(-50%)_rotateY(-38deg)_translateZ(-160px)] hover:opacity-60 lg:block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={items[(index + 1) % items.length].imageUrl} alt="" className="aspect-[4/5] w-full rounded-[10px] object-cover" />
              </button>
            </>
          )}
          <div className="relative">
            <span aria-hidden className="spotlight" />
            <Tilt className="rounded-[22px]" max={7} lift={16} light="violet">
              <div className="frame glow-violet">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.context ?? item.dailyPrompt ?? "A campus photo"}
                  className="max-h-[42svh] w-auto max-w-[78vw] rounded-[12px] object-contain lg:max-w-[440px]"
                />
              </div>
            </Tilt>
          </div>
          <figcaption className="tube glow-violet mt-4 text-[10px]">
            {[item.context, item.dailyPrompt && `“${item.dailyPrompt}”`, isVibe(item.vibe) ? VIBES[item.vibe].label.toLowerCase() : null]
              .filter(Boolean)
              .join(" · ")}
          </figcaption>
        </figure>

        <Meme
          key={item.id}
          item={item}
          result={results[item.id] ?? null}
          currentUserId={currentUserId}
          onDeleted={() => {
            if (basePath.startsWith("/g/")) router.push("/explore");
            else router.refresh();
          }}
        />
      </div>

      {/* Moving around */}
      <nav aria-label="Memes" className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous meme"
          className="btn-neon glow-violet !h-12 !w-12 !p-0 text-lg"
        >
          ←
        </button>
        <button type="button" onClick={() => setOverview(true)} className="tube glow-violet min-w-16 text-xs tabular-nums">
          {index + 1} / {items.length}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next meme"
          className="btn-neon glow-cyan !h-12 !w-12 !p-0 text-lg"
        >
          →
        </button>
      </nav>

      {overview && (
        <div role="dialog" aria-modal="true" aria-label="All memes" className="screen-in fixed inset-0 z-50 overflow-y-auto bg-background/95 px-5 pb-10 pt-6 backdrop-blur-md sm:px-8">
          <div className="mx-auto flex max-w-5xl items-center justify-between pb-6">
            <p className="text-sm text-ink-3">{items.length} memes</p>
            <button type="button" onClick={() => setOverview(false)} className="chip-neon glow-violet">
              Close
            </button>
          </div>
          <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((g, i) => (
              <li key={g.id} className="rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <button
                  type="button"
                  onClick={() => {
                    setDirection(i >= index ? "next" : "prev");
                    setCurrentId(g.id);
                    setOverview(false);
                  }}
                  className={`frame block w-full overflow-hidden !p-1.5 transition hover:scale-[1.03] ${g.id === item.id ? "glow-pink" : "glow-violet"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.imageUrl} alt={g.context ?? "A campus photo"} loading="lazy" className="aspect-square w-full rounded-[10px] object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// One meme's captions and actions.
function Meme({
  item,
  result,
  currentUserId,
  onDeleted,
}: {
  item: FeedGeneration;
  result: BattleResult | null;
  currentUserId: string | null;
  onDeleted: () => void;
}) {
  const router = useRouter();
  const isMine = Boolean(currentUserId && item.userId === currentUserId);
  const [sheet, setSheet] = useState<"none" | "post" | "edit-post" | "delete-post">("none");
  const [writing, setWriting] = useState(false);
  const [contextDraft, setContextDraft] = useState(item.context ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function share() {
    const url = new URL(`/g/${item.id}`, window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: "Morningside Memes", text: item.captions[0]?.text ?? "Which caption is funnier?", url });
      else {
        await navigator.clipboard.writeText(url);
        setError("Link copied.");
      }
    } catch {
      // Share sheet dismissed.
    }
  }

  return (
    <section aria-label="This meme" className="flex w-full max-w-xl flex-col gap-2 text-left">
      {item.captions.length === 0 && <p className="text-center text-ink-3">No captions yet.</p>}
      <ul aria-label="Captions on this meme" className="flex flex-col gap-2">
        {item.captions.map((caption, i) => (
          <CaptionLine key={caption.id} caption={caption} signedIn={Boolean(currentUserId)} delay={i * 60} />
        ))}
      </ul>

      {result && <p aria-label="Final result" className="pt-2 text-center text-sm text-ink-2">{RESULT_LINES[result.winner]}</p>}

      {writing ? (
        <WriteYours generationId={item.id} onDone={() => setWriting(false)} />
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3">
          {currentUserId ? (
            <button
              type="button"
              onClick={() => setWriting(true)}
              className="btn-neon glow-gold !px-5 !py-3 !text-sm"
            >
              Write yours
            </button>
          ) : (
            <Quiet href={`/login?next=${encodeURIComponent(`/g/${item.id}`)}`}>sign in to vote or write yours</Quiet>
          )}
          <Quiet onClick={share}>share</Quiet>
          {isMine && <Quiet onClick={() => setSheet("post")}>··· your meme</Quiet>}
        </div>
      )}
      {error && (
        <p role="status" className="text-center text-sm text-ink-2">
          {error}
        </p>
      )}

      <Sheet open={sheet === "post"} onClose={() => setSheet("none")} title="Your meme">
        <SheetItem onClick={() => setSheet("edit-post")}>Edit the context line</SheetItem>
        <SheetItem onClick={share}>Share</SheetItem>
        <SheetItem danger onClick={() => setSheet("delete-post")}>Delete this meme</SheetItem>
      </Sheet>

      <Sheet open={sheet === "edit-post"} onClose={() => setSheet("none")} title="Edit the context line">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await updatePostContext(item.id, contextDraft);
              if (res.error) return setError(res.error);
              setSheet("none");
              router.refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          <input
            aria-label="Context"
            value={contextDraft}
            onChange={(e) => setContextDraft(e.target.value)}
            maxLength={200}
            placeholder="e.g. 2am in Butler"
            className="neon-input !text-left text-xl"
          />
          <button type="submit" disabled={pending} className="btn-neon glow-cyan self-start !py-3">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </Sheet>

      <Sheet open={sheet === "delete-post"} onClose={() => setSheet("none")} title="Delete this meme?">
        <p className="mb-5 text-ink-2">Its captions and votes go with it. This can&apos;t be undone.</p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deletePost(item.id);
                if (res.error) return setError(res.error);
                setSheet("none");
                onDeleted();
              })
            }
            className="btn-neon self-start !py-3 [--glow:255,122,138]"
          >
            {pending ? "Deleting…" : "Delete post"}
          </button>
          <button type="button" onClick={() => setSheet("none")} className="chip-neon glow-violet !px-6 !py-3">
            Keep it
          </button>
        </div>
      </Sheet>
    </section>
  );
}

// One caption: blind until you vote (or it's yours), then its author fades in.
function CaptionLine({ caption, signedIn, delay }: { caption: FeedCaption; signedIn: boolean; delay: number }) {
  const router = useRouter();
  const [state, setState] = useState<VoteState>({
    upvotes: caption.upvotes,
    downvotes: caption.downvotes,
    vote: caption.myVote,
    reveal: caption.reveal,
  });
  const [justRevealed, setJustRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "menu" | "edit" | "delete">("none");
  const [draft, setDraft] = useState(caption.text);
  const [pending, startTransition] = useTransition();
  const mine = state.reveal?.isMine ?? false;
  const score = state.upvotes - state.downvotes;

  function vote(v: -1 | 1) {
    if (!signedIn) {
      router.push("/login?next=/explore");
      return;
    }
    const next = state.vote === v ? 0 : v;
    const had = Boolean(state.reveal);
    play(next === 0 ? "select" : "vote");
    startTransition(async () => {
      const res = await castVote(caption.id, next);
      if ("error" in res) return setError(res.error);
      setError(null);
      setState({ upvotes: res.upvotes, downvotes: res.downvotes, vote: res.vote, reveal: res.reveal ?? state.reveal });
      if (!had && res.reveal) setJustRevealed(true);
    });
  }

  return (
    <li
      className={`rise panel relative flex items-center gap-3 rounded-[22px] px-4 py-3.5 transition sm:px-5 ${state.vote === 1 ? "lit glow-pink" : state.vote === -1 ? "lit glow-violet" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {justRevealed && <Sparkles />}
      <div className="min-w-0 flex-1">
        <p className="text-[17px] leading-snug text-white">“{caption.text}”</p>
        <p className="mt-1 text-xs text-ink-3">
          {state.reveal ? (
            <span className={`inline-flex items-center gap-1.5 ${justRevealed ? "rise" : ""}`}>
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${state.reveal.authorType === "ai" ? "bg-ai" : "bg-human"}`} />
              {state.reveal.authorType === "ai" ? "written by AI" : mine ? "yours" : `written by ${state.reveal.authorName ?? "a classmate"}`}
            </span>
          ) : (
            "human or AI? vote to find out"
          )}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-down-ink">
            {error}
          </p>
        )}
      </div>

      {mine ? (
        <button type="button" onClick={() => setSheet("menu")} aria-label="Your caption: edit or delete" className="rounded-full px-2 py-1 text-ink-3 hover:text-ink">
          ···
        </button>
      ) : (
        <div className="flex flex-col items-center" role="group" aria-label="Vote">
          <button
            type="button"
            onClick={() => vote(1)}
            disabled={pending}
            aria-label="Upvote"
            aria-pressed={state.vote === 1}
            className={`flex h-8 w-9 items-center justify-center rounded-full transition hover:bg-panel-2 active:scale-90 ${state.vote === 1 ? "text-pink [text-shadow:0_0_10px_#ff3cac]" : "text-ink-3"}`}
          >
            ▲
          </button>
          <span className="text-xs tabular-nums text-ink-2" aria-label={`Score ${score}`}>
            {score}
          </span>
          <button
            type="button"
            onClick={() => vote(-1)}
            disabled={pending}
            aria-label="Downvote"
            aria-pressed={state.vote === -1}
            className={`flex h-8 w-9 items-center justify-center rounded-full transition hover:bg-panel-2 active:scale-90 ${state.vote === -1 ? "text-violet [text-shadow:0_0_10px_#a46bff]" : "text-ink-3"}`}
          >
            ▼
          </button>
        </div>
      )}

      <Sheet open={sheet === "menu"} onClose={() => setSheet("none")} title="Your caption">
        <SheetItem onClick={() => setSheet("edit")}>Edit</SheetItem>
        <SheetItem danger onClick={() => setSheet("delete")}>Delete</SheetItem>
      </Sheet>
      <Sheet open={sheet === "edit"} onClose={() => setSheet("none")} title="Edit your caption">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await editCaption(caption.id, draft);
              if (res.error) return setError(res.error);
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
                if (res.error) return setError(res.error);
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

const initialCaptionState: CaptionFormState = {};

// "Write yours": one field, one action.
export function WriteYours({ generationId, onDone }: { generationId: string; onDone?: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(submitCaption, initialCaptionState);
  const [text, setText] = useState("");

  // After a successful submit: refresh the data and close the field.
  useEffect(() => {
    if (!state.submittedAt) return;
    router.refresh();
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.submittedAt]);

  return (
    <form action={formAction} className="rise flex flex-col items-center gap-4 pt-3">
      <input type="hidden" name="generation_id" value={generationId} />
      <label htmlFor={`caption-${generationId}`} className="word glow-gold text-4xl sm:text-5xl">
        Can you beat it?
      </label>
      <input
        id={`caption-${generationId}`}
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={HUMAN_CAPTION_MAX}
        autoFocus
        aria-label="Your caption"
        placeholder="your caption…"
        className="neon-input text-xl sm:text-2xl"
      />
      {state.error && (
        <p role="alert" className="text-sm text-down-ink">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || text.trim().length === 0}
          className="btn-neon glow-gold"
        >
          {pending ? "Adding…" : "Add my caption"} <span aria-hidden>→</span>
        </button>
        {onDone && <Quiet onClick={onDone}>cancel</Quiet>}
      </div>
      <p className="text-xs text-ink-3">It goes in blind, next to the AI&apos;s.</p>
    </form>
  );
}
