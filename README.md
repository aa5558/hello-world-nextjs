This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Live:** https://hello-world-nextjs-eight-blue.vercel.app

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Auth setup (Google sign-in + profiles)

This app gates `/profile` behind Supabase Auth using Google as the OAuth provider. To wire it up on a fresh Supabase project:

1. **Run the migration.** In the Supabase SQL Editor, run [`supabase/migrations/20260928000000_profiles.sql`](supabase/migrations/20260928000000_profiles.sql). It creates the `profiles` table, a trigger that inserts a row for every new `auth.users` signup, and an `avatars` storage bucket with policies scoping uploads to each user's own folder.
2. **Create a Google OAuth client** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add this as an **Authorized redirect URI**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. **Enable the Google provider** in the Supabase Dashboard under Authentication → Sign In / Providers, pasting the Client ID and Client Secret from step 2.
4. **Allow this app's callback URL** in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://<your-vercel-app>/auth/callback
   ```
5. Env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are already server-side only — no changes needed there.

New users are redirected to `/profile` after their first sign-in and prompted to fill in their name if it's missing. Signed-out visitors hitting `/profile` are redirected to `/login`.

## Morningside Memes: Humans vs. AI caption battles

**Can Columbia students be funnier than AI?** Signed-in users upload a photo, pick a caption voice, and Gemini writes four captions. Anyone signed in can then add their own caption to any photo. Human and AI captions are shown together with the author hidden; vote on one and it reveals whether a classmate or Gemini wrote it. A running scoreboard tracks which side wins more photos.

- **Battles** (`/`): the feed (newest or top this week), the Humans vs. Gemini scoreboard, and today's challenge.
- **Daily challenge** (`/challenge`): a new photo prompt every midnight New York time, a live leaderboard of every caption on today's photos, and yesterday's winner with its author revealed.
- **My Posts** (`/me`): your photos with every caption on them (author revealed, since they're on your photo), your own captions with their score and rank, and your stats.
- **Human or AI?** (home page): a guessing game on captions from past challenge days. It works without an account, so visitors can try the idea before signing in. Signed-out visitors can also browse every battle and the leaderboard.
- **🎲 Surprise Me** (`/surprise`, also a tab on Post): rolls a random photo already posted in the app and opens its battle, so you can jump in and caption without a photo of your own. Nothing is copied or generated; the photo stays its original owner's, and your caption is attributed to you. "Try another" re-rolls, avoiding the last few photos you've seen and your own.
- **AI-generated photos (off by default)**: set `ENABLE_AI_PHOTOS=true` to show a "Generate with AI" option on Post, where Gemini draws a photo from a description and then captions it (5 a day per user). Needs a Gemini API project with billing enabled; the free tier has no image quota.
- **Edit / delete your own content**: edit the context on your post or delete it (removes its captions and votes too); edit your own caption until someone votes on it, or delete it any time.
- Each post has a shareable `/g/<id>` link with a link-preview image.

Setup:

1. **Run the migration** [`supabase/migrations/20261005000000_captions_votes_rls.sql`](supabase/migrations/20261005000000_captions_votes_rls.sql) in the Supabase SQL Editor. It creates `generations` (photo + the exact prompt and model used), `captions`, and `caption_votes` (one row per user per caption, with a trigger that keeps the tallies on `captions`), the `generations` storage bucket, and turns on RLS for every table in `public`.
2. **Run the battles migration** [`supabase/migrations/20261012000000_human_vs_ai_battles.sql`](supabase/migrations/20261012000000_human_vs_ai_battles.sql). It adds `captions.author_type` (existing captions become `ai`) and `generations.challenge_date`, hides caption authorship from the API, and adds the functions below.
3. **Get a Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey) and add it as `GEMINI_API_KEY` in `.env.local` and in Vercel (Settings → Environment Variables). Optionally set `GEMINI_MODEL` (defaults to `gemini-flash-latest`) and `GEMINI_IMAGE_MODEL` (defaults to `gemini-2.5-flash-image`).

RLS summary:

| Table | Read | Write |
| --- | --- | --- |
| `profiles` | own row | update own row (insert via signup trigger) |
| `movies` | everyone | none |
| `generations` | everyone | insert as yourself, into today's challenge only; update only `context` on your own posts (column grant); delete your own posts |
| `captions` | everyone, but only `id, generation_id, text, upvotes, downvotes, score` (column grants) | AI captions: owner of a photo posted in the last 10 minutes. Human captions: only through `submit_human_caption()`. Tallies only via trigger |
| `caption_votes` | own votes | insert / update / delete own votes; never on your own human caption |

Who wrote a caption (`author_type`, `user_id`) is never readable directly. These `security definer` functions decide what each caller may see:

| Function | Who | What |
| --- | --- | --- |
| `caption_reveals(ids)` | signed in | authors of captions you voted on, wrote, or that are on your photo |
| `submit_human_caption(id, text)` | signed in | adds a human caption: 1–200 chars, max 3 per photo, 30 per day, no duplicates |
| `daily_winner(day)` | everyone | top caption of a *finished* day, author revealed |
| `battle_scoreboard()` | everyone | Humans vs. Gemini totals only |
| `my_captions()` | signed in | your own human captions with rank |
| `edit_human_caption(id, text)` | signed in | edit your own human caption, only while it has no votes |
| `delete_human_caption(id)` | signed in | delete your own human caption |
| `guess_round(exclude)` / `check_guess(id, guess)` | everyone | the guessing game; only uses captions from *finished* challenge days |

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
