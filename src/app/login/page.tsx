import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  oauth: "We couldn't start the Google sign-in flow. Please try again.",
  missing_code: "That sign-in link was invalid. Please try again.",
};

const PERKS = [
  ["🗳️", "Vote blind, then see who really wrote it"],
  ["✍️", "Throw your own captions into the ring"],
  ["🏆", "Win the daily challenge (and the bragging rights)"],
];

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = safeNext(searchParams.next);
  const error = typeof searchParams.error === "string" ? searchParams.error : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next);
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <section className="animate-fade-up flex flex-col gap-6">
        <p className="eyebrow">sign in</p>
        <h1 className="display text-5xl text-ink sm:text-7xl">
          Your meme era
          <br />
          <span className="serif text-sky-deep">starts here.</span>
        </h1>
        <ul className="flex flex-col gap-3">
          {PERKS.map(([emoji, text]) => (
            <li key={text} className="flex items-center gap-3 text-[16px] text-ink-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-line">
                {emoji}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      <section className="glass animate-fade-up relative overflow-hidden rounded-[36px] p-8 [animation-delay:120ms] sm:p-10">
        <span aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ice/70 blur-3xl" />
        <div className="relative flex flex-col gap-5">
          <span className="orb flex h-14 w-14 items-center justify-center rounded-full">
            <span className="display text-xl text-ink">mm</span>
          </span>
          <div>
            <h2 className="display text-3xl">Hey bestie 👋</h2>
            <p className="mt-1 text-sm text-ink-2">One tap with your Google account and you&apos;re in.</p>
          </div>
          {error && (
            <p role="alert" className="rounded-[18px] bg-down-soft px-4 py-3 text-sm text-down-ink">
              {ERROR_MESSAGES[error] ?? "Something went wrong. Please try again."}
            </p>
          )}
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className="btn btn-primary btn-lg w-full">
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
                <path fill="#fff" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continue with Google
            </button>
          </form>
          <p className="text-xs leading-relaxed text-ink-3">
            Classmates only ever see vote totals, never how you voted.
          </p>
        </div>
      </section>
    </main>
  );
}
