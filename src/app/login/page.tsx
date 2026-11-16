import Link from "next/link";
import { redirect } from "next/navigation";
import { signInWithGoogle } from "@/app/auth/actions";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { Ink } from "@/app/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "We couldn't sign you in. Please try again.",
  oauth: "We couldn't start the Google sign-in flow. Please try again.",
  missing_code: "That sign-in link was invalid. Please try again.",
};

type SignupRules = { restricted: boolean; domains: string[] };

function domainList(domains: string[]) {
  const named = domains.map((d) => `@${d}`);
  return named.length <= 2 ? named.join(" or ") : `${named.slice(0, -1).join(", ")}, or ${named.at(-1)}`;
}

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

  // Missing before the access migration is applied: then signups are open.
  const { data: rulesData } = await supabase.rpc("signup_rules");
  const rules = (rulesData as SignupRules | null) ?? { restricted: false, domains: [] };
  const gated = rules.restricted && rules.domains.length > 0;

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center justify-center gap-7 px-5 pb-12 pt-24 text-center sm:px-8">
      <h1 className="word text-6xl sm:text-8xl">
        <Ink text="Sign in to keep going." />
      </h1>
      <p className="rise max-w-sm text-lg text-ink-2 [animation-delay:500ms]">
        One tap with Google. Classmates only ever see vote totals, never how you voted.
      </p>
      {error && (
        <p role="alert" className="max-w-md text-[15px] text-down-ink">
          {error === "signup_blocked"
            ? gated
              ? `New accounts are limited to ${domainList(rules.domains)} emails right now. Sign in with your school Google account, or ask an admin to add your email.`
              : "We couldn't create an account for that email. Try your school Google account, or ask an admin to add you."
            : (ERROR_MESSAGES[error] ?? "Something went wrong. Please try again.")}
        </p>
      )}
      <form action={signInWithGoogle} className="rise [animation-delay:700ms]">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="group inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#fff" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
          </svg>
          Continue with Google
        </button>
      </form>
      {gated && error !== "signup_blocked" && (
        <p className="max-w-sm text-sm text-ink-3">
          New here? Use your {domainList(rules.domains)} Google account. Already have an account? Any Google login you&apos;ve used before still works.
        </p>
      )}
      <Link href="/?start=choose" className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
        not now
      </Link>
    </main>
  );
}
