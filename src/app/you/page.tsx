import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { Action, Ink } from "@/app/components/ui";
import { ExploreDeck } from "@/app/explore/ExploreDeck";
import { getMyCaptions } from "@/lib/battles";
import { getAchievements, getEra } from "@/lib/era";
import { getFeed } from "@/lib/feed";
import { loadResults } from "@/lib/results";
import { createClient } from "@/lib/supabase/server";
import { AccountForm, MyCaptionList } from "./YouParts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You · Morningside Memes",
};

const SECTIONS = [
  { key: "era", label: "era" },
  { key: "memes", label: "memes" },
  { key: "captions", label: "captions" },
  { key: "achievements", label: "achievements" },
  { key: "account", label: "account" },
] as const;
type Section = (typeof SECTIONS)[number]["key"];

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

// You: your era, your memes, your captions, achievements, and account,
// one section at a time.
export default async function YouPage(props: PageProps<"/you">) {
  const searchParams = await props.searchParams;
  const section: Section = SECTIONS.some((s) => s.key === searchParams.s) ? (searchParams.s as Section) : "era";
  const welcome = searchParams.welcome === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(section === "era" ? "/you" : `/you?s=${section}`)}`);

  const [{ generations: photos }, myCaptions, { count: votesCast }, { data: profile }] = await Promise.all([
    getFeed(supabase, { ownerId: user.id, userId: user.id }),
    getMyCaptions(supabase),
    supabase.from("caption_votes").select("caption_id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("first_name, last_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle<{ first_name: string | null; last_name: string | null; avatar_url: string | null }>(),
  ]);
  const era = getEra(photos, myCaptions);
  const achievements = getAchievements(photos, myCaptions, votesCast ?? 0);
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "you";
  const points = myCaptions.reduce((sum, c) => sum + c.score, 0);
  const at = SECTIONS.findIndex((s) => s.key === section);
  const nextSection = SECTIONS[at + 1];

  let body: ReactNode = null;

  if (section === "era") {
    // The mirror, ringed with bulbs, with your name lit on the glass.
    const bulbs = Array.from({ length: 10 });
    body = (
      <>
        <div className="relative rise">
          <div className="frame glow-gold relative flex w-[min(84vw,440px)] flex-col items-center gap-3 px-8 pb-10 pt-12">
            <div aria-hidden className="absolute inset-x-6 top-2 flex justify-between">
              {bulbs.map((_, i) => (
                <span key={i} className="bulb" />
              ))}
            </div>
            <div aria-hidden className="absolute inset-y-10 left-2 flex flex-col justify-between">
              {bulbs.slice(0, 5).map((_, i) => (
                <span key={i} className="bulb" />
              ))}
            </div>
            <div aria-hidden className="absolute inset-y-10 right-2 flex flex-col justify-between">
              {bulbs.slice(0, 5).map((_, i) => (
                <span key={i} className="bulb" />
              ))}
            </div>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-gold/60" />
            ) : (
              <span aria-hidden className="tube glow-gold flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 text-3xl">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="word glow-pink text-4xl sm:text-5xl">{name}</p>
            <p className="text-sm text-ink-3">you&apos;re in your</p>
            <h1 className="word glow-gold text-5xl sm:text-6xl">
              <Ink text={era.name} />
            </h1>
          </div>
        </div>
        <p className="rise text-ink-2 [animation-delay:500ms]">Based on {era.basis}.</p>
        <p className="tube glow-cyan rise max-w-lg text-[11px] leading-6 [animation-delay:650ms]">
          {photos.length} {photos.length === 1 ? "meme" : "memes"} · {myCaptions.length} {myCaptions.length === 1 ? "caption" : "captions"} ·{" "}
          {signed(points)} on your captions · {votesCast ?? 0} {votesCast === 1 ? "vote" : "votes"} cast
        </p>
      </>
    );
  } else if (section === "memes") {
    body =
      photos.length === 0 ? (
        <>
          <h1 className="word glow-violet text-6xl sm:text-8xl">No memes on the wall yet.</h1>
          <p className="text-lg text-ink-2">Your first one takes about a minute.</p>
          <Action href="/create">Make one</Action>
        </>
      ) : (
        <>
          <h1 className="word glow-violet text-5xl sm:text-7xl">Your memes</h1>
          <ExploreDeck
            items={photos}
            results={await loadResults(supabase, photos)}
            startId={null}
            currentUserId={user.id}
            basePath="/you"
            emptyHref="/create"
          />
        </>
      );
  } else if (section === "captions") {
    body =
      myCaptions.length === 0 ? (
        <>
          <h1 className="word glow-green text-6xl sm:text-8xl">No captions yet.</h1>
          <p className="text-lg text-ink-2">Take on the AI on someone&apos;s photo.</p>
          <Action href="/play?mode=turn" tone="gold">Open mic</Action>
        </>
      ) : (
        <>
          <h1 className="word glow-green text-5xl sm:text-7xl">Your captions</h1>
          <MyCaptionList captions={myCaptions} />
        </>
      );
  } else if (section === "achievements") {
    const unlocked = achievements.filter((a) => a.unlocked).length;
    body = (
      <>
        <h1 className="word glow-gold text-5xl sm:text-7xl">
          {unlocked} of {achievements.length} trophies
        </h1>
        <p className="text-ink-2">Earned only from what you&apos;ve actually done.</p>
        <ul className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {achievements.map((a, i) => (
            <li
              key={a.key}
              className={`rise panel ${a.unlocked ? "lit glow-gold" : "opacity-50"} flex flex-col items-center gap-2 rounded-[22px] px-3 py-5 text-center`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Trophy lit={a.unlocked} />
              <span className={`text-[15px] font-medium ${a.unlocked ? "text-white" : "text-ink-3"}`}>{a.title}</span>
              <span className="text-xs text-ink-3">{a.body}</span>
              <span className={`tube ${a.unlocked ? "glow-gold" : "glow-violet"} text-[10px] tabular-nums`}>{a.unlocked ? "earned" : a.progress}</span>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="word glow-green text-5xl sm:text-7xl">{welcome ? "Welcome in." : "Account"}</h1>
        {welcome && <p className="text-lg text-ink-2">Add your name so classmates know who beat the AI.</p>}
        {!welcome && (!profile?.first_name || !profile?.last_name) && (
          <p className="text-ink-2">Your profile is missing a first and/or last name.</p>
        )}
        <p className="text-sm text-ink-3">Signed in as {user.email}</p>
        <AccountForm firstName={profile?.first_name ?? ""} lastName={profile?.last_name ?? ""} avatarUrl={profile?.avatar_url ?? null} />
        <form action={signOut}>
          <button type="submit" className="chip-neon [--glow:255,122,138]">
            Sign out
          </button>
        </form>
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center px-5 pb-12 pt-20 text-center sm:px-8 sm:pt-24">
      <nav aria-label="You" className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "era" ? "/you" : `/you?s=${s.key}`}
            aria-current={section === s.key ? "page" : undefined}
            className={`chip-neon glow-green ${section === s.key ? "[border-color:rgba(var(--glow),0.95)] shadow-[0_0_22px_-4px_rgba(var(--glow),0.9)]" : "opacity-60 hover:opacity-100"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <section key={section} className="screen-in flex w-full flex-1 flex-col items-center justify-center gap-6 py-10">
        {body}
      </section>
      {nextSection && (
        <Link href={`/you?s=${nextSection.key}`} className="tube glow-green group inline-flex items-center gap-2 text-xs">
          your {nextSection.label} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </main>
  );
}

// A small trophy that lights up once earned.
function Trophy({ lit }: { lit: boolean }) {
  const c = lit ? "#ffcf5a" : "#8f8ab3";
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-10 w-10" style={lit ? { filter: "drop-shadow(0 0 8px rgba(255,207,90,0.8))" } : undefined} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 8h18v9a9 9 0 01-18 0V8z" fill={lit ? "rgba(255,207,90,0.18)" : "none"} />
      <path d="M15 12H9a6 6 0 006 7M33 12h6a6 6 0 01-6 7M24 26v8M17 40h14M19 34h10v6H19z" />
    </svg>
  );
}
