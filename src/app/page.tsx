import Link from "next/link";
import { GenerationCard } from "@/app/components/GenerationCard";
import { getDailyPrompt } from "@/lib/captions";
import { getFeed, type FeedSort } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "new", label: "New" },
  { sort: "top", label: "Top this week" },
];

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const sort: FeedSort = searchParams.sort === "top" ? "top" : "new";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { generations, error } = await getFeed(supabase, {
    sort,
    userId: user?.id,
  });

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <section className="flex flex-col gap-3 rounded-xl bg-amber-50 p-5 text-amber-950">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Today&apos;s photo prompt
        </p>
        <p className="text-xl font-semibold">{getDailyPrompt()}</p>
        <Link
          href={user ? "/create" : "/login?next=/create"}
          className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {user ? "Post a photo" : "Sign in to post"}
        </Link>
      </section>

      <nav className="flex gap-2 text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.sort}
            href={tab.sort === "new" ? "/" : `/?sort=${tab.sort}`}
            className={`rounded-full px-3 py-1 ${
              tab.sort === sort
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-black/5 dark:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {error && (
        <p className="text-red-600">Error loading the feed: {error}</p>
      )}

      {!error && generations.length === 0 && (
        <p className="text-center text-black/60 dark:text-white/60">
          Nothing here yet. Be the first to post today.
        </p>
      )}

      {generations.map((generation) => (
        <GenerationCard
          key={generation.id}
          generation={generation}
          currentUserId={user?.id}
        />
      ))}
    </main>
  );
}
