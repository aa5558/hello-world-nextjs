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
      <main className="mx-auto w-full max-w-2xl px-4 pt-10">
        <p role="alert" className="rounded-[22px] bg-down-soft p-4 text-sm text-down-ink">Error loading movies: {error.message}</p>
      </main>
    );
  }

  const movies = (data ?? []) as Movie[];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-10">
      <p className="eyebrow">from the archive</p>
      <h1 className="display mb-6 mt-1 text-5xl">Movies</h1>
      <div className="card overflow-hidden">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-powder/60 text-xs text-ink-2">
            <tr>
              <th className="px-5 py-3 font-semibold">Title</th>
              <th className="px-3 py-3 font-semibold">Year</th>
              <th className="px-5 py-3 font-semibold">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td className="px-5 py-3 font-medium">{movie.title}</td>
                <td className="px-3 py-3 text-ink-2">{movie.year}</td>
                <td className="px-5 py-3 text-ink-2">{movie.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movies.length === 0 && <p className="p-5 text-sm text-ink-2">No movies found.</p>}
      </div>
    </main>
  );
}
