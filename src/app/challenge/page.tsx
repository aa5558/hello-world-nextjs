import { redirect } from "next/navigation";

// The Daily Drop and leaderboard became Results.
export default function ChallengeRedirect() {
  redirect("/results");
}
