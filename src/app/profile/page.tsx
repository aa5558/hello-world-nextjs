import { redirect } from "next/navigation";

// Account settings live in You. New users arrive here from the auth
// callback (/profile?welcome=1); that welcome is kept.
export default async function ProfileRedirect(props: PageProps<"/profile">) {
  const searchParams = await props.searchParams;
  redirect(searchParams.welcome === "1" ? "/you?s=account&welcome=1" : "/you?s=account");
}
