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
      <main className="p-8">
        <p className="text-red-600">Error loading movies: {error.message}</p>
      </main>
    );
  }

  const movies = (data ?? []) as Movie[];

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-semibold">Movies</h1>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4">Title</th>
            <th className="py-2 pr-4">Year</th>
            <th className="py-2">Rating</th>
          </tr>
        </thead>
        <tbody>
          {movies.map((movie) => (
            <tr key={movie.id} className="border-b">
              <td className="py-2 pr-4">{movie.title}</td>
              <td className="py-2 pr-4">{movie.year}</td>
              <td className="py-2">{movie.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {movies.length === 0 && <p className="mt-4">No movies found.</p>}
    </main>
  );
}
