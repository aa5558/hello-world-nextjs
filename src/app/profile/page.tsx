import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export default async function ProfilePage(props: PageProps<"/profile">) {
  const searchParams = await props.searchParams;
  const welcome = searchParams.welcome === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  const isIncomplete = !profile?.first_name || !profile?.last_name;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <form action={signOut}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </div>

      {welcome && (
        <p className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          Welcome! Please add your first and last name to finish setting up
          your profile.
        </p>
      )}
      {!welcome && isIncomplete && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Your profile is missing a first and/or last name — add them below.
        </p>
      )}

      <p className="text-sm text-black/60">Signed in as {user.email}</p>

      <ProfileForm
        firstName={profile?.first_name ?? ""}
        lastName={profile?.last_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
      />
    </main>
  );
}
