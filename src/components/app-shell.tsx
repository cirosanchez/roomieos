"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckSquare,
  House,
  Info,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Wordmark } from "./wordmark";
import { ProfileSwitcher } from "@/features/household/profile-switcher";
import { useReadyHousehold } from "@/state/household-provider";
import { InlineNotice } from "./ui/inline-notice";

const navigation = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/chores", label: "Chores", Icon: CheckSquare },
  { href: "/expenses", label: "Expenses", Icon: Wallet },
  { href: "/agreements", label: "Agreements", Icon: BookOpen },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {navigation.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname === `${href}/`;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-[7px] px-3 text-sm font-medium transition-colors ${href === "/settings" ? "mt-6" : ""} ${active ? "bg-selected text-accent" : "text-muted hover:bg-hover hover:text-ink"}`}
          >
            <Icon aria-hidden="true" className="size-[18px] shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { state, error, notice, store } = useReadyHousehold();
  const pathname = usePathname();
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const currentPage =
    navigation.find(
      (item) => item.href === pathname || `${item.href}/` === pathname,
    )?.label ?? "RoomieOS";
  const drawerOpen = drawerPath === pathname;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setDrawerPath(null);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-[7px] bg-accent px-4 py-3 text-sm font-medium text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside
        className="fixed inset-y-0 left-0 hidden w-[248px] flex-col border-r border-line bg-sidebar px-4 py-6 lg:flex"
        aria-label="Sidebar"
      >
        <Link
          href="/"
          aria-label="RoomieOS dashboard"
          className="mb-10 ml-2 inline-flex self-start"
        >
          <Wordmark />
        </Link>
        <p className="mb-3 px-3 text-xs font-medium text-muted">
          <span className="block truncate" title={state.household.name}>
            {state.household.name}
          </span>
        </p>
        <Navigation />
        <div className="mt-auto space-y-4 px-2 pt-8">
          <div className="flex items-start gap-2.5 text-sm text-muted">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <div>
              <p className="font-medium text-ink">Local prototype</p>
              <p className="mt-1 text-xs leading-relaxed">
                Saved on this browser only.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-xs"
            onClick={() => setAboutOpen(true)}
          >
            <Info aria-hidden="true" className="size-4" />
            About this prototype
          </Button>
        </div>
      </aside>

      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation"
            onClick={() => setDrawerPath(pathname)}
          >
            <Menu aria-hidden="true" className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Wordmark compact />
          </div>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-muted lg:flex">
            <House aria-hidden="true" className="size-4 shrink-0" />
            <span className="max-w-48 truncate" title={state.household.name}>
              {state.household.name}
            </span>
            <span aria-hidden="true" className="px-1 text-line-strong">
              /
            </span>
            <span className="truncate text-ink">{currentPage}</span>
          </div>
        </div>
        <ProfileSwitcher />
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1120px] px-4 py-8 outline-none sm:px-5 sm:py-10 lg:px-10 lg:py-12"
      >
        {(error || notice) && (
          <div className="mb-6 flex items-start justify-between gap-2 rounded-[7px] bg-subtle">
            <div className="min-w-0 flex-1" role={error ? undefined : "status"}>
              <InlineNotice tone={error ? "error" : "neutral"}>
                {error ?? notice}
              </InlineNotice>
            </div>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Dismiss message"
              onClick={() => store.dismissFeedback()}
            >
              <span aria-hidden="true">×</span>
            </Button>
          </div>
        )}
        {children}
      </main>

      <Dialog
        id="mobile-navigation"
        open={drawerOpen}
        onClose={() => setDrawerPath(null)}
        title="Navigation"
        variant="drawer"
      >
        <Navigation onNavigate={() => setDrawerPath(null)} />
        <div className="mt-8 border-t border-line pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => {
              setDrawerPath(null);
              setAboutOpen(true);
            }}
          >
            <Info aria-hidden="true" className="size-4" />
            About this prototype
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="About RoomieOS"
        description="Your shared home, organized."
      >
        <div className="space-y-4 text-sm text-muted">
          <p>
            RoomieOS is an ENTI 407 prototype for coordinating household chores,
            shared expenses and house agreements.
          </p>
          <p>
            Coordinate chores, shared expenses and house agreements. Household
            settings, roommate management and local saving are available.
          </p>
          <p>
            Your household stays in this browser only. Switching roommates
            changes the demo perspective; it does not sign anyone in or
            synchronize devices.
          </p>
          <p>
            Expense settlement records that the whole expense was resolved
            outside RoomieOS. The app does not move money.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
