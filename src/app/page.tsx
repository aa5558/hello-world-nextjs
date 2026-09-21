import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold">Hello World</h1>
      <Link href="/movies" className="underline">
        View movies from Supabase
      </Link>
    </main>
  );
}
