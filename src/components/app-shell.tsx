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
  PanelLeft,
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

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "./ui/primitives/sidebar";

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
    <nav aria-label="Main navigation">
      <SidebarMenu>
        {navigation.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname === `${href}/`;
          return (
            <SidebarMenuItem
              key={href}
              className={href === "/settings" ? "mt-6" : ""}
            >
              <SidebarMenuButton
                render={<Link href={href} />}
                isActive={active}
                tooltip={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className="min-h-11 gap-3"
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <ShellContent>{children}</ShellContent>
    </SidebarProvider>
  );
}

function ShellContent({ children }: { children: ReactNode }) {
  const { state, error, notice, store } = useReadyHousehold();
  const pathname = usePathname();
  const { open, setOpen, openMobile, setOpenMobile, isMobile } = useSidebar();
  const [aboutOpen, setAboutOpen] = useState(false);
  const currentPage =
    navigation.find(
      (item) => item.href === pathname || `${item.href}/` === pathname,
    )?.label ?? "RoomieOS";
  const drawerOpen = openMobile;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpenMobile(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [setOpenMobile]);
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return (
    <>
      {" "}
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-[7px] bg-accent px-4 py-3 text-sm font-medium text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar collapsible="icon" aria-label="Sidebar">
        <SidebarHeader className="px-3 py-5">
          <Link
            href="/"
            aria-label="RoomieOS dashboard"
            className="mb-5 inline-flex self-start"
          >
            <Wordmark iconOnly={!open && !isMobile} />
          </Link>
          <p className="px-1 text-xs font-medium text-muted group-data-[collapsible=icon]:hidden">
            <span className="block truncate" title={state.household.name}>
              {state.household.name}
            </span>
          </p>
        </SidebarHeader>
        <SidebarContent className="px-3">
          <Navigation onNavigate={() => setOpenMobile(false)} />
        </SidebarContent>
        <SidebarFooter className="space-y-3 px-3 pb-5">
          <div className="flex items-start gap-2.5 text-sm text-muted group-data-[collapsible=icon]:hidden">
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
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="About this prototype"
                aria-label="About this prototype"
                onClick={() => {
                  setOpenMobile(false);
                  setAboutOpen(true);
                }}
                className="min-h-11"
              >
                <Info aria-hidden="true" />
                <span>About this prototype</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button
            variant="ghost"
            className="lg:hidden"
            onClick={() => setOpenMobile(false)}
          >
            Close navigation
          </Button>
        </SidebarFooter>
      </Sidebar>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-4 sm:px-5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                isMobile
                  ? "Open navigation"
                  : open
                    ? "Collapse sidebar"
                    : "Expand sidebar"
              }
              aria-expanded={isMobile ? drawerOpen : open}
              aria-controls={isMobile ? "mobile-navigation" : undefined}
              onClick={() => (isMobile ? setOpenMobile(true) : setOpen(!open))}
            >
              <PanelLeft aria-hidden="true" className="size-5" />
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
              <div
                className="min-w-0 flex-1"
                role={error ? undefined : "status"}
              >
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
          open={aboutOpen}
          onClose={() => setAboutOpen(false)}
          title="About RoomieOS"
          description="Your shared home, organized."
        >
          <div className="space-y-4 text-sm text-muted">
            <p>
              RoomieOS is an ENTI 407 prototype for coordinating household
              chores, shared expenses and house agreements.
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
    </>
  );
}
