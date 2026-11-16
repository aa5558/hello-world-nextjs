"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { Logo } from "./Logo";

type NavItem = { href: string; label: string; icon: IconName; match: string[] };

// One navigation system: Home | Battles | Create | Leaderboard | Profile.
// A restrained top bar on desktop; a bottom tab bar with a raised Create
// button on phones.
export function NavBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  const createHref = signedIn ? "/create" : "/login?next=/create";
  const home: NavItem = { href: "/", label: "Home", icon: "home", match: ["/", "/g/"] };
  const battles: NavItem = { href: "/battles", label: "Battles", icon: "versus", match: ["/battles", "/surprise"] };
  const leaderboard: NavItem = { href: "/challenge", label: "Leaderboard", icon: "trophy", match: ["/challenge"] };
  const profile: NavItem = signedIn
    ? { href: "/me", label: "Profile", icon: "user", match: ["/me", "/profile"] }
    : { href: "/login", label: "Sign in", icon: "user", match: ["/login"] };
  const items = [home, battles, leaderboard, profile];

  function isActive(item: NavItem) {
    return item.match.some((m) => (m === "/" ? pathname === "/" : pathname.startsWith(m)));
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
            {items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-2 font-medium transition ${
                  isActive(item) ? "text-plum" : "text-ink-2 hover:text-ink"
                }`}
              >
                {item.label}
                {isActive(item) && (
                  <span aria-hidden className="absolute inset-x-3.5 -bottom-[13px] h-[2px] rounded-full bg-gold" />
                )}
              </Link>
            ))}
            <Link href={createHref} className="btn btn-primary btn-sm ml-3">
              <Icon name="plus" className="h-4 w-4" /> Create
            </Link>
          </nav>

          <Link
            href={signedIn ? "/profile" : "/login"}
            aria-label={signedIn ? "Account settings" : "Sign in"}
            className="flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-2 ring-1 ring-line md:hidden"
          >
            {signedIn ? "Account" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-2 pt-1.5">
          <TabLink item={home} active={isActive(home)} />
          <TabLink item={battles} active={isActive(battles)} />
          <Link
            href={createHref}
            aria-label="Create a meme"
            aria-current={pathname.startsWith("/create") ? "page" : undefined}
            className="flex flex-col items-center gap-1 text-[10.5px] font-semibold text-plum"
          >
            <span className="orb -mt-6 flex h-14 w-14 items-center justify-center rounded-full ring-4 ring-paper transition active:scale-90">
              <Icon name="plus" className="h-6 w-6" />
            </span>
            Create
          </Link>
          <TabLink item={leaderboard} active={isActive(leaderboard)} />
          <TabLink item={profile} active={isActive(profile)} />
        </div>
      </nav>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 py-1 text-[10.5px] font-medium transition ${
        active ? "text-plum" : "text-ink-3"
      }`}
    >
      <span className={`flex h-7 w-11 items-center justify-center rounded-full transition ${active ? "bg-lavender/70" : ""}`}>
        <Icon name={item.icon} className="h-[19px] w-[19px]" />
      </span>
      {item.label}
    </Link>
  );
}
