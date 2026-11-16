import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getFeed, type FeedSort } from "@/lib/feed";
import { loadResults } from "@/lib/results";
import { createClient } from "@/lib/supabase/server";
import { ExploreDeck } from "./ExploreDeck";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore · Morningside Memes",
};

export default async function ExplorePage(props: PageProps<"/explore">) {
  const searchParams = await props.searchParams;
  const sort: FeedSort = searchParams.sort === "top" ? "top" : "new";
  const startId = typeof searchParams.id === "string" ? searchParams.id : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { generations, error } = await getFeed(supabase, { sort, userId: user?.id });
  const results = await loadResults(supabase, generations);

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center gap-5 px-5 pb-12 pt-20 sm:px-8 sm:pt-24">
      <nav aria-label="Order" className="flex gap-4 text-sm">
        {(
          [
            ["new", "fresh"],
            ["top", "top this week"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "new" ? "/explore" : "/explore?sort=top"}
            aria-current={sort === key ? "page" : undefined}
            className={`underline-offset-4 transition ${sort === key ? "text-ink underline decoration-punch decoration-2" : "text-ink-3 hover:text-ink"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="pt-20 text-ink-2">
          We couldn&apos;t load memes just now. Try again in a moment.
        </p>
      ) : (
        <Suspense>
          <ExploreDeck
            key={sort}
            items={generations}
            results={results}
            startId={startId}
            currentUserId={user?.id ?? null}
            basePath="/explore"
            emptyHref={user ? "/create" : "/login?next=/create"}
          />
        </Suspense>
      )}
    </main>
  );
}
