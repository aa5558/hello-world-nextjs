"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; icon: string; match: string };

// Top bar on desktop, bottom tab bar on phones.
export function NavBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/", label: "Battles", icon: "⚔️", match: "/" },
    { href: "/challenge", label: "Daily", icon: "📅", match: "/challenge" },
    {
      href: signedIn ? "/create" : "/login?next=/create",
      label: "Post",
      icon: "➕",
      match: "/create",
    },
    {
      href: signedIn ? "/me" : "/login?next=/me",
      label: "My Posts",
      icon: "🗂️",
      match: "/me",
    },
    signedIn
      ? { href: "/profile", label: "Profile", icon: "👤", match: "/profile" }
      : { href: "/login", label: "Sign in", icon: "👤", match: "/login" },
  ];

  function isActive(item: NavItem) {
    return item.match === "/"
      ? pathname === "/" || pathname.startsWith("/g/")
      : pathname.startsWith(item.match);
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-black/10 bg-background/85 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-sm text-columbia">
              MM
            </span>
            <span>Morningside Memes</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 font-medium transition ${
                  isActive(item)
                    ? "bg-navy text-white dark:bg-columbia dark:text-navy"
                    : "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-white/10">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                isActive(item)
                  ? "text-navy dark:text-columbia"
                  : "text-black/50 dark:text-white/50"
              }`}
            >
              <span aria-hidden className="text-lg leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
