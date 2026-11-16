import { redirect } from "next/navigation";

// The feed became Explore (one meme at a time).
export default async function FeedRedirect(props: PageProps<"/feed">) {
  const searchParams = await props.searchParams;
  redirect(searchParams.sort === "top" ? "/explore?sort=top" : "/explore");
}
