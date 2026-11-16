import { createClient } from "@/lib/supabase/server";
import { Opening } from "./Opening";

export const dynamic = "force-dynamic";

// The opening: an almost empty screen that unfolds as you interact.
// "?start=choose" skips straight to the Create / Play choice (the wordmark
// and the menu link back here that way).
export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <Opening signedIn={Boolean(user)} skipIntro={searchParams.start === "choose"} />;
}
