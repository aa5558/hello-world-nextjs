import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { timeAgo } from "@/app/components/GenerationCard";
import { Icon } from "@/app/components/Icon";
import { EmptyCard } from "@/app/components/PageHero";
import { PostOwnerControls } from "@/app/components/PostOwnerControls";
import { RevealBadge } from "@/app/components/RevealBadge";
import { getMyCaptions } from "@/lib/battles";
import { getAchievements, getEra } from "@/lib/era";
import { VIBES, VIBE_EMOJI, isVibe } from "@/lib/captions";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Meme Era — Morningside Memes",
};

function Stat({ label, value, tone = "white" }: { label: string; value: string | number; tone?: "white" | "ice" }) {
  return (
    <div
      className={`flex flex-col justify-between gap-6 rounded-[26px] p-5 ${
        tone === "ice" ? "bg-ice shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" : "card"
      }`}
    >
      <span className="text-xs font-medium text-ink-2">{label}</span>
      <span className="display text-5xl tabular-nums">{value}</span>
    </div>
  );
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

export default async function MyPostsPage(props: PageProps<"/me">) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "captions" ? "captions" : "photos";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const [{ generations: photos, error }, myCaptions, { count: votesCast }, { data: profile }] = await Promise.all([
    getFeed(supabase, { ownerId: user.id, userId: user.id }),
    getMyCaptions(supabase),
    supabase.from("caption_votes").select("caption_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("profiles").select("first_name, avatar_url").eq("id", user.id).maybeSingle<{ first_name: string | null; avatar_url: string | null }>(),
  ]);
  const era = getEra(photos, myCaptions);
  const achievements = getAchievements(photos, myCaptions, votesCast ?? 0);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  const captionWins = myCaptions.filter((c) => c.rank === 1 && c.score > 0).length;
  const captionPoints = myCaptions.reduce((sum, c) => sum + c.score, 0);
  const best = [...myCaptions].sort((a, b) => b.score - a.score)[0];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-8 sm:px-6 sm:pt-12">
      <section className="animate-fade-up relative overflow-hidden rounded-[36px] bg-ink p-6 text-white sm:p-10">
        <span aria-hidden className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sky/40 blur-3xl" />
        <span aria-hidden className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-ai/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-[26px] object-cover ring-4 ring-white/15" />
          ) : (
            <span className="orb flex h-20 w-20 items-center justify-center rounded-[26px] text-4xl">{era.emoji}</span>
          )}
          <div className="flex flex-col gap-1">
            <p className="eyebrow !text-white/60">{profile?.first_name ? `${profile.first_name}, you're in your` : "you're in your"}</p>
            <h1 className="display text-4xl sm:text-6xl">
              {era.emoji} <span className="serif">{era.name}</span>
            </h1>
            <p className="text-sm text-white/70">Based on {era.basis}.</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Photos posted" value={photos.length} />
        <Stat label="Captions written" value={myCaptions.length} />
        <Stat label="Net votes on your captions" value={signed(captionPoints)} tone="ice" />
        <Stat label="Photos you're #1 on" value={captionWins} />
      </section>

      <section aria-labelledby="achievements" className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="achievements" className="display text-3xl">
            Achievements <span className="serif text-ink-2">{unlocked}/{achievements.length}</span>
          </h2>
          <p className="text-xs text-ink-3">earned from what you&apos;ve actually done</p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {achievements.map((a) => (
            <li
              key={a.key}
              className={`flex flex-col gap-2 rounded-[22px] p-3 transition ${
                a.unlocked ? "bg-white shadow-[0_14px_30px_-20px_rgba(22,38,61,0.4)] ring-1 ring-line" : "bg-powder/50 text-ink-3"
              }`}
            >
              <span aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-[14px] text-xl ${a.unlocked ? "orb" : "bg-white/70 grayscale"}`}>
                {a.emoji}
              </span>
              <span className={`text-sm font-semibold leading-tight ${a.unlocked ? "text-ink" : ""}`}>{a.title}</span>
              <span className="text-[11px] leading-snug">{a.body}</span>
              <span className={`chip mt-auto self-start ${a.unlocked ? "bg-human-soft text-human-ink" : "bg-white/70"}`}>
                {a.unlocked ? "✓ unlocked" : a.progress}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {best && best.score > 0 && (
        <Link
          href={`/g/${best.generationId}`}
          className="card lift group flex items-center gap-4 p-3 pr-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={best.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-[20px] object-cover" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">⭐ your best caption · {signed(best.score)}</p>
            <p className="display mt-1 truncate text-2xl">“{best.text}”</p>
            <p className="mt-0.5 text-sm text-ink-2">okay, this one&apos;s actually funny.</p>
          </div>
          <Icon name="arrow" className="h-5 w-5 shrink-0 text-ink-3 transition group-hover:text-ink" />
        </Link>
      )}

      <nav aria-label="My posts" className="flex gap-1 self-start rounded-full bg-powder/80 p-1 text-sm">
        {[
          { key: "photos", label: `📸 My photos (${photos.length})`, href: "/me" },
          {
            key: "captions",
            label: `✍️ My captions (${myCaptions.length})`,
            href: "/me?tab=captions",
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={tab === item.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 font-medium transition ${
              tab === item.key
                ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(22,38,61,0.18)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "photos" && (
        <section className="grid gap-4 md:grid-cols-2">
          {error && (
            <p role="alert" className="rounded-[22px] bg-down-soft p-4 text-sm text-down-ink md:col-span-2">
              We couldn&apos;t load your photos: {error}
            </p>
          )}
          {!error && photos.length === 0 && (
            <div className="md:col-span-2">
              <EmptyCard emoji="📸" title="No photos yet." body="You haven't posted a photo yet. Gemini is waiting.">
                <Link href="/create" className="btn btn-primary">
                  Post your first photo
                </Link>
              </EmptyCard>
            </div>
          )}
          {photos.map((photo) => {
            const vibe = isVibe(photo.vibe) ? VIBES[photo.vibe].label : photo.vibe;
            const humans = photo.captions.filter(
              (c) => c.reveal?.authorType === "human"
            ).length;
            return (
              <article key={photo.id} className="card flex flex-col gap-4 p-3">
                <Link href={`/g/${photo.id}`} className="group flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.imageUrl}
                    alt={photo.context ?? "Your photo"}
                    className="h-24 w-24 shrink-0 rounded-[20px] object-cover transition group-hover:scale-[1.03]"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="display truncate text-xl">{photo.dailyPrompt ?? "Photo"}</p>
                    <p className="text-xs text-ink-2">
                      {VIBE_EMOJI[photo.vibe] ?? "✨"} {vibe} · {timeAgo(photo.createdAt)}
                    </p>
                    <p className="text-xs text-ink-2">
                      {photo.captions.length} captions · {humans}{" "}
                      {humans === 1 ? "human challenger" : "human challengers"}
                    </p>
                  </div>
                  <span className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-powder text-ink transition group-hover:bg-ice">
                    <Icon name="arrow" className="h-4 w-4" />
                    <span className="sr-only">Open</span>
                  </span>
                </Link>
                <div className="px-1">
                  <PostOwnerControls generationId={photo.id} context={photo.context} />
                </div>
                <ol className="flex flex-col gap-1.5">
                  {photo.captions.map((caption, index) => (
                    <li
                      key={caption.id}
                      className="flex items-start gap-3 rounded-[16px] bg-background px-3 py-2 text-sm ring-1 ring-line"
                    >
                      <span className="display w-8 shrink-0 pt-0.5 text-right tabular-nums">
                        {signed(caption.score)}
                      </span>
                      <span className="flex-1 leading-snug">
                        {index === 0 && caption.score > 0 && "👑 "}
                        {caption.text}
                      </span>
                      <RevealBadge reveal={caption.reveal} />
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      )}

      {tab === "captions" && (
        <section className="flex flex-col gap-2">
          {myCaptions.length === 0 && (
            <EmptyCard
              emoji="✍️"
              title="No captions yet."
              body="You haven't written a caption yet. Pick any photo and try to beat the AI."
            >
              <Link href="/challenge" className="btn btn-primary">
                Go to today&apos;s challenge
              </Link>
            </EmptyCard>
          )}
          {myCaptions.map((caption) => (
            <Link
              key={caption.id}
              href={`/g/${caption.generationId}`}
              className="card lift flex items-center gap-4 p-3 pr-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={caption.imageUrl}
                alt=""
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-[18px] object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-[15px] font-medium leading-snug">{caption.text}</p>
                <p className="text-xs text-ink-3">
                  ▲ {caption.upvotes} · ▼ {caption.downvotes} · {timeAgo(caption.createdAt)} · tap to edit or delete
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="display text-2xl tabular-nums">{signed(caption.score)}</span>
                <span
                  className={`chip ${
                    caption.rank === 1 && caption.score > 0 ? "bg-butter text-butter-ink" : "bg-powder text-ink-2"
                  }`}
                >
                  #{caption.rank} of {caption.total}
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
