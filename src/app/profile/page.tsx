import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { PageHero } from "@/app/components/PageHero";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-12">
      <div className="flex items-end justify-between gap-4">
        <PageHero
          eyebrow="profile"
          title={
            <>
              It&apos;s giving <span className="serif">you.</span>
            </>
          }
        />
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost btn-sm">
            Sign out
          </button>
        </form>
      </div>

      {welcome && (
        <p className="rounded-[22px] bg-ice px-5 py-4 text-[15px] text-ink">
          <span className="font-semibold">Welcome in 👋</span> Add your first and last name to finish setting up
          your profile.
        </p>
      )}
      {!welcome && isIncomplete && (
        <p className="rounded-[22px] bg-butter px-5 py-4 text-[15px] text-butter-ink">
          Your profile is missing a first and/or last name. Add them below.
        </p>
      )}

      <div className="card flex flex-col gap-6 p-6 sm:p-8">
        <p className="text-sm text-ink-2">
          Signed in as <span className="font-semibold text-ink">{user.email}</span>
        </p>
        <ProfileForm
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </main>
  );
}
