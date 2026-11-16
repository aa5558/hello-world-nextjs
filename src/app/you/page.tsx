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
    body = (
      <>
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="rise h-20 w-20 rounded-full object-cover ring-4 ring-white" />
        ) : (
          <span aria-hidden className="rise flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl text-ink ring-1 ring-line">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="text-sm text-ink-3">{name}, you&apos;re in your</p>
        <h1 className="word text-6xl sm:text-8xl">
          <Ink text={era.name} />
        </h1>
        <p className="rise text-ink-2 [animation-delay:500ms]">Based on {era.basis}.</p>
        <p className="rise max-w-md text-lg text-ink-2 [animation-delay:650ms]">
          {photos.length} {photos.length === 1 ? "meme" : "memes"} · {myCaptions.length} {myCaptions.length === 1 ? "caption" : "captions"} ·{" "}
          {signed(points)} on your captions · {votesCast ?? 0} {votesCast === 1 ? "vote" : "votes"} cast
        </p>
      </>
    );
  } else if (section === "memes") {
    body =
      photos.length === 0 ? (
        <>
          <h1 className="word text-6xl sm:text-8xl">No memes yet.</h1>
          <p className="text-lg text-ink-2">Your first one takes about a minute.</p>
          <Action href="/create">Make one</Action>
        </>
      ) : (
        <>
          <h1 className="word text-5xl sm:text-7xl">Your memes</h1>
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
          <h1 className="word text-6xl sm:text-8xl">No captions yet.</h1>
          <p className="text-lg text-ink-2">Take on the AI on someone&apos;s photo.</p>
          <Action href="/play?mode=turn">Your turn</Action>
        </>
      ) : (
        <>
          <h1 className="word text-5xl sm:text-7xl">Your captions</h1>
          <MyCaptionList captions={myCaptions} />
        </>
      );
  } else if (section === "achievements") {
    const unlocked = achievements.filter((a) => a.unlocked).length;
    body = (
      <>
        <h1 className="word text-5xl sm:text-7xl">
          {unlocked} of {achievements.length}
        </h1>
        <p className="text-ink-2">Earned only from what you&apos;ve actually done.</p>
        <ul className="grid w-full max-w-2xl gap-2 text-left sm:grid-cols-2">
          {achievements.map((a, i) => (
            <li
              key={a.key}
              className={`rise flex items-start gap-3 rounded-[20px] px-5 py-4 ${a.unlocked ? "bg-white ring-1 ring-line" : "bg-transparent ring-1 ring-dashed ring-line"}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.unlocked ? "bg-punch" : "bg-ice"}`} />
              <span className="flex-1">
                <span className={`block text-lg font-medium ${a.unlocked ? "text-ink" : "text-ink-3"}`}>{a.title}</span>
                <span className="block text-sm text-ink-3">{a.body}</span>
              </span>
              <span className="text-sm tabular-nums text-ink-3">{a.unlocked ? "earned" : a.progress}</span>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="word text-5xl sm:text-7xl">{welcome ? "Welcome in." : "Account"}</h1>
        {welcome && <p className="text-lg text-ink-2">Add your name so classmates know who beat the AI.</p>}
        {!welcome && (!profile?.first_name || !profile?.last_name) && (
          <p className="text-ink-2">Your profile is missing a first and/or last name.</p>
        )}
        <p className="text-sm text-ink-3">Signed in as {user.email}</p>
        <AccountForm firstName={profile?.first_name ?? ""} lastName={profile?.last_name ?? ""} avatarUrl={profile?.avatar_url ?? null} />
        <form action={signOut}>
          <button type="submit" className="text-sm text-ink-3 underline-offset-4 hover:text-down-ink hover:underline">
            Sign out
          </button>
        </form>
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center px-5 pb-12 pt-20 text-center sm:px-8 sm:pt-24">
      <nav aria-label="You" className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        {SECTIONS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "era" ? "/you" : `/you?s=${s.key}`}
            aria-current={section === s.key ? "page" : undefined}
            className={`underline-offset-4 transition ${section === s.key ? "text-ink underline decoration-punch decoration-2" : "text-ink-3 hover:text-ink"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <section key={section} className="screen-in flex w-full flex-1 flex-col items-center justify-center gap-6 py-10">
        {body}
      </section>
      {nextSection && (
        <Link href={`/you?s=${nextSection.key}`} className="group inline-flex items-center gap-2 text-ink-2 transition hover:text-ink">
          your {nextSection.label} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </main>
  );
}
