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
  PanelLeftOpen,
  PanelLeftClose,
  Menu,
  X,
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

function Navigation({
  onNavigate,
  items = navigation.filter((item) => item.href !== "/settings"),
}: {
  onNavigate?: () => void;
  items?: typeof navigation;
}) {
  const pathname = usePathname();
  return (
    <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center">
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname === `${href}/`;
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              render={<Link href={href} />}
              isActive={active}
              tooltip={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className="min-h-11 gap-3 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink data-active:bg-selected data-active:text-accent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden [&_svg]:size-[18px]"
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
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
  const collapsed = !open && !isMobile;

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
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-[7px] bg-accent px-4 py-3 text-sm font-medium text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar collapsible="icon" aria-label="Sidebar">
        <SidebarHeader
          className={`shrink-0 border-b border-line ${collapsed ? "items-center gap-1 px-2 py-3" : "h-20 flex-row items-center justify-between gap-1 px-3 py-2"}`}
        >
          <Link
            href="/"
            aria-label="RoomieOS dashboard"
            onClick={() => setOpenMobile(false)}
            className={`inline-flex min-h-11 min-w-0 items-center rounded-lg ${collapsed ? "w-11 justify-center" : "pl-1"}`}
          >
            <Wordmark iconOnly={collapsed} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isMobile
                ? "Close navigation"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
            aria-expanded={isMobile ? openMobile : open}
            aria-controls={
              isMobile ? "mobile-navigation" : "desktop-navigation"
            }
            onClick={() => (isMobile ? setOpenMobile(false) : setOpen(!open))}
            className="text-muted hover:bg-hover hover:text-ink"
            title={
              isMobile
                ? "Close navigation"
                : collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
            }
          >
            {isMobile ? (
              <X aria-hidden="true" className="size-[18px]" />
            ) : collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-[18px]" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-[18px]" />
            )}
          </Button>
        </SidebarHeader>
        {!collapsed && (
          <div className="mx-3 my-4 flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-page px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-subtle text-muted">
              <House aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] leading-4 text-muted">Household</p>
              <p
                className="truncate text-sm font-medium text-ink"
                title={state.household.name}
              >
                {state.household.name}
              </p>
            </div>
          </div>
        )}
        <nav
          id="desktop-navigation"
          aria-label="Main navigation"
          className="flex min-h-0 flex-1 flex-col"
        >
          <SidebarContent
            className={`gap-0 px-2 ${collapsed ? "pt-2" : "pt-1"}`}
          >
            <p className="mb-2 px-3 text-xs font-medium text-muted group-data-[collapsible=icon]:hidden">
              Workspace
            </p>
            <Navigation onNavigate={() => setOpenMobile(false)} />
          </SidebarContent>
          <SidebarFooter className="mt-auto gap-1 border-t border-line px-2 py-3">
            <Navigation
              items={navigation.filter((item) => item.href === "/settings")}
              onNavigate={() => setOpenMobile(false)}
            />
            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              <SidebarMenuItem>
                <SidebarMenuButton
                  id="about-prototype"
                  tooltip="About this prototype"
                  aria-label="About this prototype"
                  onClick={() => {
                    setOpenMobile(false);
                    setAboutOpen(true);
                  }}
                  className="min-h-11 gap-3 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden [&_svg]:size-[18px]"
                >
                  <Info aria-hidden="true" />
                  <span>About RoomieOS</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <div
              role="note"
              aria-label="Local prototype. Saved on this browser only."
              title="Local prototype. Saved on this browser only."
              className="mt-2 flex min-h-11 items-center gap-3 border-t border-line px-3 pt-3 text-muted group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="text-xs font-medium">Local prototype</p>
                <p className="mt-0.5 text-[11px]">Saved on this browser only</p>
              </div>
            </div>
          </SidebarFooter>
        </nav>
      </Sidebar>
      <div className="min-w-0 flex-1">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-line px-4 sm:px-5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              id="mobile-nav-toggle"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              aria-controls="mobile-navigation"
              onClick={() => setOpenMobile(true)}
            >
              <Menu aria-hidden="true" className="size-5" />
            </Button>
            <div className="lg:hidden">
              <Wordmark compact />
            </div>
            <div className="hidden min-w-0 items-center gap-2 text-sm text-muted lg:flex">
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
          returnFocusId={isMobile ? "mobile-nav-toggle" : "about-prototype"}
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
