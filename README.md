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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
