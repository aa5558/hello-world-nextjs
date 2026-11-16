import { redirect } from "next/navigation";

// Surprise lives in two places now: a fresh library photo is "Surprise me"
// in Create, and a random posted photo is Play's "Your turn".
export default async function SurpriseRedirect(props: PageProps<"/surprise">) {
  const searchParams = await props.searchParams;
  redirect(searchParams.mode === "fresh" ? "/create?surprise=1" : "/play?mode=turn");
}
