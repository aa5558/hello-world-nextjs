import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { NavBar } from "@/app/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The editorial serif: the wordmark and the occasional large heading.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Morningside Memes · The Campus Comedy Club",
  description:
    "Campus life, captioned. Turn a campus moment into a meme, challenge the AI's captions, and vote blind on what's funniest.",
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-28 md:pb-0">
        <NavBar signedIn={Boolean(user)} />
        {children}
        <footer className="mx-auto mt-20 hidden w-full max-w-5xl items-center justify-between border-t border-line px-6 py-8 text-xs text-ink-3 md:flex">
          <span>
            <span className="display text-sm text-ink">Morningside Memes</span> · the campus comedy club
          </span>
          <span>Campus life, captioned.</span>
        </footer>
      </body>
    </html>
  );
}
