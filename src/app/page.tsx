import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold">Hello World</h1>
      <Link href="/movies" className="underline">
        View movies from Supabase
      </Link>
      {user ? (
        <Link href="/profile" className="underline">
          Go to your profile
        </Link>
      ) : (
        <Link href="/login" className="underline">
          Sign in
        </Link>
      )}
    </main>
  );
}
