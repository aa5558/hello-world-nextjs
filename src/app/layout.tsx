import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Morningside Memes — Humans vs. AI",
  description:
    "Can Columbia students be funnier than AI? Caption photos, vote blind, and find out who wrote it.",
};

export const viewport: Viewport = {
  themeColor: "#0b2d5b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-20 sm:pb-0">
        <NavBar signedIn={Boolean(user)} />
        {children}
      </body>
    </html>
  );
}
