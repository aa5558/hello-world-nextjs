import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Movie = {
  id: number;
  title: string;
  year: number | null;
  rating: number | null;
};

export default async function MoviesPage() {
  const { data, error } = await supabase
    .from("movies")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return (
      <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center justify-center px-5 text-center">
        <p role="alert" className="text-down-ink">Error loading movies: {error.message}</p>
      </main>
    );
  }

  const movies = (data ?? []) as Movie[];

  // The Week 3 Supabase list, in the same quiet language as the rest.
  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center px-5 pb-16 pt-24 text-center sm:px-8">
      <h1 className="word glow-gold text-6xl sm:text-8xl">Movies.</h1>
      <p className="mt-3 text-sm text-ink-3">from the archive · straight from Supabase</p>
      {movies.length === 0 ? (
        <p className="mt-10 text-ink-2">No movies found.</p>
      ) : (
        <table className="mt-10 w-full border-collapse text-left">
          <thead className="text-xs text-ink-3">
            <tr>
              <th className="py-3 font-normal">Title</th>
              <th className="px-3 py-3 font-normal">Year</th>
              <th className="py-3 text-right font-normal">Rating</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((movie, i) => (
              <tr key={movie.id} className="rise border-t border-line" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <td className="py-4 text-lg text-white">{movie.title}</td>
                <td className="px-3 py-4 text-ink-2">{movie.year}</td>
                <td className="py-4 text-right tabular-nums text-ink-2">{movie.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
