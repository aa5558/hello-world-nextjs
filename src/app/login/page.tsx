import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "@/app/auth/actions";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  oauth: "We couldn't start the Google sign-in flow. Please try again.",
  missing_code: "That sign-in link was invalid. Please try again.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/profile");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      {error && (
        <p className="max-w-sm text-center text-sm text-red-600">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
        </p>
      )}
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? ""} />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-4 py-2 font-medium text-black shadow-sm hover:bg-black/5"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
