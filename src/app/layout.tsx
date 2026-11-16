import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Neonderthaw, Tilt_Neon } from "next/font/google";
import { Menu } from "@/app/components/Menu";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Neon script for the signs.
const neonderthaw = Neonderthaw({
  variable: "--font-neonderthaw",
  subsets: ["latin"],
  weight: "400",
});

// Tube capitals for labels and buttons (its XROT/YROT axes tilt the letters).
const tiltNeon = Tilt_Neon({
  variable: "--font-tilt-neon",
  subsets: ["latin"],
  axes: ["XROT", "YROT"],
});

export const metadata: Metadata = {
  title: "Morningside · memes after dark",
  description:
    "Make something funny. Turn a campus moment into a meme, let the AI write captions, then play: which one's funnier?",
};

export const viewport: Viewport = {
  themeColor: "#05060d",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${neonderthaw.variable} ${tiltNeon.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <Menu signedIn={Boolean(user)} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
