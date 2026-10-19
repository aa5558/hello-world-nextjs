"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";

type NavItem = { href: string; label: string; icon: IconName; match: string };

// A floating glass bar on desktop; a bottom dock with a glossy Post button
// on phones.
export function NavBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  const postHref = signedIn ? "/create" : "/login?next=/create";
  const items: NavItem[] = [
    { href: "/", label: "Battles", icon: "flame", match: "/" },
    { href: "/challenge", label: "Daily", icon: "calendar", match: "/challenge" },
    {
      href: signedIn ? "/me" : "/login?next=/me",
      label: "My Posts",
      icon: "grid",
      match: "/me",
    },
  ];
  const account: NavItem = signedIn
    ? { href: "/profile", label: "Profile", icon: "user", match: "/profile" }
    : { href: "/login", label: "Sign in", icon: "user", match: "/login" };

  function isActive(item: NavItem) {
    return item.match === "/"
      ? pathname === "/" || pathname.startsWith("/g/") || pathname.startsWith("/surprise")
      : pathname.startsWith(item.match);
  }

  return (
    <>
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6">
        <div className="glass mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full py-2 pl-3 pr-2">
          <div className="sm:hidden">
            <Logo compact />
          </div>
          <div className="hidden sm:block">
            <Logo />
          </div>
          <p className="display text-[17px] text-ink sm:hidden">
            morningside memes<span className="text-sky">.</span>
          </p>

          <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-powder/70 p-1 text-sm md:flex">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  isActive(item)
                    ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(22,38,61,0.18)]"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <nav aria-label="Main" className="hidden items-center gap-1 text-sm sm:flex md:hidden">
              {items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive(item) ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 font-medium ${isActive(item) ? "bg-powder text-ink" : "text-ink-2"}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href={account.href}
              aria-current={isActive(account) ? "page" : undefined}
              className={`hidden rounded-full px-3 py-1.5 text-sm font-medium transition sm:block ${
                isActive(account) ? "bg-powder text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              {account.label}
            </Link>
            <Link href={postHref} className="btn btn-primary btn-sm hidden sm:inline-flex">
              Post <Icon name="arrow" className="h-4 w-4" />
            </Link>
            <Link
              href={account.href}
              aria-label={account.label}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-powder text-ink sm:hidden"
            >
              <Icon name="user" className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Phone dock */}
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-30 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="glass mx-auto grid max-w-md grid-cols-5 items-center rounded-[26px] !bg-white/90 px-1 py-1.5">
          {[items[0], items[1]].map((item) => (
            <DockLink key={item.label} item={item} active={isActive(item)} />
          ))}
          <Link
            href={postHref}
            aria-label="Post a photo"
            aria-current={pathname.startsWith("/create") ? "page" : undefined}
            className="orb mx-auto -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-ink ring-4 ring-background transition active:scale-90"
          >
            <Icon name="plus" className="h-6 w-6" />
          </Link>
          <DockLink item={items[2]} active={isActive(items[2])} />
          <DockLink item={account} active={isActive(account)} />
        </div>
      </nav>
    </>
  );
}

function DockLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-medium transition ${
        active ? "text-ink" : "text-ink-3"
      }`}
    >
      <span className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-powder" : ""}`}>
        <Icon name={item.icon} className="h-[19px] w-[19px]" />
      </span>
      {item.label}
    </Link>
  );
}
