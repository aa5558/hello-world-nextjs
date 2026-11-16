import { redirect } from "next/navigation";

// My Era and My Posts became You.
export default async function MeRedirect(props: PageProps<"/me">) {
  const searchParams = await props.searchParams;
  redirect(searchParams.tab === "captions" ? "/you?s=captions" : searchParams.tab === "photos" ? "/you?s=memes" : "/you");
}
