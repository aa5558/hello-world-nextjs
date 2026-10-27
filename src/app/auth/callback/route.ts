import { NextResponse } from "next/server";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after the user completes the Google OAuth flow,
// with a `code` param to exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    // Supabase sends people back with an error instead of a code when their
    // account couldn't be created, which is what the signup allowlist does
    // to emails it doesn't recognize.
    const description = searchParams.get("error_description") ?? "";
    if (/saving new user|signup_not_allowed/i.test(description)) {
      return NextResponse.redirect(`${origin}/login?error=signup_blocked`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${searchParams.get("error") ? "auth" : "missing_code"}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.first_name || !profile?.last_name) {
      return NextResponse.redirect(`${origin}/profile?welcome=1`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
