import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
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

// Oversized headlines.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

// The one italic word per headline.
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  title: "Morningside Memes — Humans vs. AI",
  description:
    "Your humor. Our AI. Upload a photo, let AI write captions, add your own, and see whose caption wins.",
};

export const viewport: Viewport = {
  themeColor: "#f8fcff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-28 sm:pb-0">
        <NavBar signedIn={Boolean(user)} />
        {children}
        <footer className="mx-auto mt-16 hidden w-full max-w-6xl items-center justify-between px-6 pb-10 text-xs text-ink-3 sm:flex">
          <span>
            morningside memes<span className="text-sky">.</span> made on morningside heights
          </span>
          <span>humans vs. ai, one caption at a time</span>
        </footer>
      </body>
    </html>
  );
}
