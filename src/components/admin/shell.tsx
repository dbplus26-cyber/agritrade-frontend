"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpenCheck,
  BookUser,
  ChevronDown,
  ChevronRight,
  Globe,
  HandCoins,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  MapPin,
  Settings,
  ShieldCheck,
  Sprout,
  Store,
  User as UserIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_HOME,
  activeNavKey,
  adminNavGroups,
  screenTitle,
} from "@/static-data/admin/nav";
import { HelpWrap } from "@/components/admin/help-tip";
import { useCurrentUser } from "@/hooks/use-current-user";
import { usePendingApprovalsCount } from "@/hooks/use-pending-approvals";
import { useConfirm } from "@/hooks/use-confirm";
import { useLogoutMutation } from "@/redux/auth/auth-api";
import { useAuthRole } from "@/hooks/use-auth-role";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";


/** Console-scoped shadcn sidebar tokens - white rail, slate lines, forest ring. */
const SIDEBAR_VARS = {
  "--sidebar-width": "224px",
  "--sidebar-width-icon": "56px",
  "--sidebar": "#ffffff",
  "--sidebar-foreground": "#39424f",
  "--sidebar-border": "#eceff3",
  "--sidebar-accent": "#f5f7f9",
  "--sidebar-accent-foreground": "#161c24",
  "--sidebar-primary": "#1E3D2B",
  "--sidebar-primary-foreground": "#ffffff",
  "--sidebar-ring": "#1E3D2B",
} as React.CSSProperties;

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  STAFF: "Office staff",
  AGENT: "Field agent",
};

/** Shared sign-out flow: confirm, call the API (client session clears
 * regardless of the server result), land on /login. */
function useSignOut() {
  const router = useRouter();
  const { confirm, confirmationDialog } = useConfirm();
  const [logout, { isLoading }] = useLogoutMutation();

  const signOut = async () => {
    const ok = await confirm({
      title: "Sign out?",
      description: "You'll need your password to sign back in.",
      confirmText: "Sign out",
    });
    if (!ok) return;
    await logout()
      .unwrap()
      .catch(() => {});
    notify.success("Signed out");
    router.replace("/login");
  };

  return { signOut, isLoading, confirmationDialog };
}

/** Initials-or-photo avatar used by the navbar menu. */
function UserAvatar({ size = 30 }: { size?: number }) {
  const user = useCurrentUser();
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "··";
  if (user?.profilePicture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, avatar-sized
      <img
        src={user.profilePicture}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full bg-console font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </span>
  );
}

/** Top-right profile menu (dms-frontend convention): avatar trigger opening
 * an account card with the profile link and sign out. */
function NavbarUser() {
  const user = useCurrentUser();
  const router = useRouter();
  const { isSuperAdmin } = useAuthRole();
  const { signOut, isLoading, confirmationDialog } = useSignOut();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console/40 sm:rounded-[8px] sm:pl-2"
        >
          {user ? (
            <span className="hidden text-right sm:block">
              <span className="block max-w-[160px] truncate text-[13px] font-semibold leading-tight text-adm-ink">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-[11px] leading-tight text-adm-muted">
                {ROLE_LABEL[user.role] ?? ""}
              </span>
            </span>
          ) : null}
          <UserAvatar size={32} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <div className="flex items-center gap-2.5 border-b border-adm-hairline px-3.5 py-3">
            <UserAvatar size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-adm-ink">
                {user ? `${user.firstName} ${user.lastName}` : "Signed in"}
              </div>
              <div className="truncate text-[11.5px] text-adm-muted">
                {user?.email ?? ""}
              </div>
              <div className="text-[11px] text-adm-faint">
                {(user && ROLE_LABEL[user.role]) ?? ""}
              </div>
            </div>
          </div>
          <div>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[13px]"
              onClick={() => router.push(`${ADMIN_HOME}/profile`)}
            >
              <UserIcon className="h-3.5 w-3.5" aria-hidden="true" />
              My profile
            </DropdownMenuItem>
            {isSuperAdmin ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-[13px]"
                onClick={() => router.push(`${ADMIN_HOME}/settings`)}
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isLoading}
              className="cursor-pointer gap-2 text-[13px] text-console-red focus:text-console-red"
              onClick={() => void signOut()}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmationDialog}
    </>
  );
}

/** Gold count pill used on nav rows. */
function NavBadge({ count }: { count: number }) {
  return (
    <span className="font-adminmono rounded-full bg-console-gold px-[7px] py-px text-[10.5px] font-bold text-white">
      {count}
    </span>
  );
}

/** Sign-out row anchoring the rail (the profile itself lives in the navbar menu).
 * When the rail is collapsed to icons the label hides, leaving just the icon. */
function SidebarSignOut() {
  const { signOut, isLoading, confirmationDialog } = useSignOut();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={isLoading}
        title={collapsed ? "Sign out" : undefined}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 py-3.5 text-left text-[13px] font-semibold text-adm-body hover:bg-adm-sunken hover:text-console-red disabled:opacity-50",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <LogOut className="h-[15px] w-[15px] flex-none" aria-hidden="true" />
        {collapsed ? null : "Sign out"}
      </button>
      {confirmationDialog}
    </>
  );
}

/**
 * lucide icon per nav group, shown on each collapsible dropdown header.
 *
 * Every group needs an entry. The header renders the icon only when one is
 * found, so a missing key is not an error - the group just sits in the rail
 * with a blank where its neighbours have a mark, which is how "Money out" and
 * "Website" went unnoticed. Add the icon in the same change as the group.
 *
 * All concrete objects rather than abstractions, which is what keeps them
 * readable at 16px and tells them apart at a glance in a collapsed rail.
 */
const GROUP_ICON: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  Trading: Store,
  // Money LEAVING the business - payouts, floats, the company's own account.
  // A hand paying out rather than a banknote or a wallet: those say "money",
  // and every group under this one is about money too. The direction is the
  // distinguishing fact.
  "Money out": HandCoins,
  Land: MapPin,
  Farm: Sprout,
  // The statement books: generated, printed, signed and stamped - a book
  // with a check for "the accounts, done".
  Books: BookOpenCheck,
  Directory: BookUser,
  // The public site: everything here arrived through it - enquiries, reviews,
  // applications - so the group is named for the door, not the post.
  Website: Globe,
  Admin: ShieldCheck,
};

/** The rail itself - shadcn Sidebar pinned to the console's exact look, with
 * each nav group rendered as a collapsible dropdown (dms-frontend convention).
 * The group that owns the active screen starts open and reopens on navigation.
 * On mobile shadcn renders it as a sheet, opened from the Menu tab below. */
function ConsoleSidebar({ activeKey }: { activeKey: string }) {
  const { setOpen, setOpenMobile, state } = useSidebar();
  const collapsed = state === "collapsed";
  const pendingApprovals = usePendingApprovalsCount();
  const { isSuperAdmin } = useAuthRole();
  // Owner-only entries are hidden from staff, who would only hit a 403; empty
  // groups then drop out entirely so no bare heading is left behind.
  const groups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((i) => isSuperAdmin || !i.ownerOnly),
    }))
    .filter((group) => group.items.length > 0);

  // The group holding the active screen - its dropdown opens by default and
  // reopens whenever navigation lands inside it.
  const activeGroupLabel = groups.find((group) =>
    group.items.some((i) => i.key === activeKey),
  )?.label;

  const [expanded, setExpanded] = useState<string[]>(() =>
    activeGroupLabel ? [activeGroupLabel] : [],
  );

  // Reopen the active group when navigation lands in a different one, using
  // React's adjust-state-during-render pattern (no effect, no cascading render).
  const [prevActiveGroup, setPrevActiveGroup] = useState(activeGroupLabel);
  if (activeGroupLabel !== prevActiveGroup) {
    setPrevActiveGroup(activeGroupLabel);
    if (activeGroupLabel && !expanded.includes(activeGroupLabel)) {
      setExpanded([...expanded, activeGroupLabel]);
    }
  }

  const toggle = (label: string) =>
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-0 border-b border-adm-hairline pb-4 pt-5 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0 px-5">
        {/* Collapsed to the icon rail the mark carries the brand alone, which
            is exactly what it is for; expanded it sits beside the wordmark. */}
        {collapsed ? (
          <Image
            src="/logo-mark.png"
            alt="DB Plus"
            width={64}
            height={64}
            className="h-8 w-8"
          />
        ) : (
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo-mark.png"
              alt=""
              width={72}
              height={72}
              className="h-9 w-9 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[16px] font-extrabold tracking-[0.14em] text-console">
                DB PLUS
              </div>
              <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-adm-faint">
                Trading · Tamale
              </div>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-1.5 pb-6 pt-2.5 group-data-[collapsible=icon]:px-1 [scrollbar-width:none]">
        <SidebarMenu className="gap-0.5">
          {groups.map((group) => {
            const Icon = GROUP_ICON[group.label];
            const isOpen = expanded.includes(group.label);
            const hasActive = group.items.some((i) => i.key === activeKey);
            return (
              <SidebarMenuItem key={group.label}>
                <SidebarMenuButton
                  title={collapsed ? group.label : undefined}
                  aria-expanded={isOpen}
                  // Collapsed: a click expands the rail and opens this group;
                  // expanded: it just toggles the dropdown.
                  onClick={() => {
                    if (collapsed) {
                      setOpen(true);
                      setExpanded((prev) =>
                        prev.includes(group.label)
                          ? prev
                          : [...prev, group.label],
                      );
                    } else {
                      toggle(group.label);
                    }
                  }}
                  className={cn(
                    "h-auto cursor-pointer justify-between gap-2 rounded-[6px] px-2.5 py-[7px] text-[13.5px] font-medium text-adm-body hover:bg-adm-sunken hover:text-adm-ink",
                    hasActive && (!isOpen || collapsed) && "text-console",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {Icon ? (
                      <Icon
                        className="h-[15px] w-[15px] flex-none"
                        aria-hidden="true"
                      />
                    ) : null}
                    {collapsed ? null : (
                      <span className="whitespace-nowrap">{group.label}</span>
                    )}
                  </span>
                  {collapsed ? null : isOpen ? (
                    <ChevronDown
                      className="h-3.5 w-3.5 flex-none text-adm-faint"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="h-3.5 w-3.5 flex-none text-adm-faint"
                      aria-hidden="true"
                    />
                  )}
                </SidebarMenuButton>

                {!collapsed && isOpen ? (
                  <div className="ml-[15px] mt-0.5 flex flex-col gap-px border-l border-adm-hairline pl-2">
                    {group.items.map((item) => (
                      <SidebarMenuButton
                        key={item.key}
                        asChild
                        isActive={activeKey === item.key}
                        className="h-auto justify-between gap-2 rounded-[6px] px-2.5 py-[6px] text-[13px] font-normal text-adm-body hover:bg-adm-sunken hover:text-adm-ink data-[active=true]:bg-console data-[active=true]:font-semibold data-[active=true]:text-white"
                      >
                        <Link
                          href={item.href}
                          onClick={() => setOpenMobile(false)}
                        >
                          {/* HelpWrap (a span), not HelpTip (a button): a
                              button nested inside an anchor is invalid HTML
                              and browsers handle it inconsistently. */}
                          <HelpWrap
                            className="cursor-pointer whitespace-nowrap"
                            side="right"
                            text={item.hint ?? item.label}
                          >
                            {item.label}
                          </HelpWrap>
                          {item.badge === "approvals" && pendingApprovals > 0 ? (
                            <NavBadge count={pendingApprovals} />
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    ))}
                  </div>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-adm-hairline p-0">
        <SidebarSignOut />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

const MOBILE_TABS = [
  { key: "dashboard", label: "Dashboard", href: ADMIN_HOME, icon: "▦" },
  { key: "approvals", label: "Approvals", href: `${ADMIN_HOME}/approvals`, icon: "✓" },
  { key: "purchases", label: "Purchases", href: `${ADMIN_HOME}/purchases`, icon: "⇄" },
] as const;

/** Bottom tabs (mobile) - the Menu tab opens the shadcn sidebar sheet. */
function MobileTabs({ activeKey }: { activeKey: string }) {
  const { openMobile, setOpenMobile } = useSidebar();
  const pendingApprovals = usePendingApprovalsCount();
  return (
    <nav
      aria-label="Console quick navigation"
      className="fixed inset-x-0 bottom-0 z-[60] grid h-[62px] grid-cols-4 border-t border-adm-line bg-adm-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {MOBILE_TABS.map((tab) => {
        const active = activeKey === tab.key && !openMobile;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            onClick={() => setOpenMobile(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-[3px]",
              active ? "text-console" : "text-adm-muted",
            )}
          >
            <span aria-hidden="true" className="text-[18px] leading-none">
              {tab.icon}
            </span>
            <span className="text-[10.5px] font-semibold">{tab.label}</span>
            {tab.key === "approvals" && pendingApprovals > 0 ? (
              <span className="font-adminmono absolute right-[24%] top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-console-red text-[9.5px] font-bold text-white">
                {pendingApprovals}
              </span>
            ) : null}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-[3px]",
          openMobile ? "text-console" : "text-adm-muted",
        )}
      >
        <span aria-hidden="true" className="text-[18px] leading-none">
          ☰
        </span>
        <span className="text-[10.5px] font-semibold">Menu</span>
      </button>
    </nav>
  );
}

/**
 * The console chrome (from the DB Plus Console design), built on the shadcn
 * Sidebar: 224px white rail with collapsible grouped nav + a sign-out footer, a
 * 54px breadcrumb topbar with the account menu (top right, dms-frontend style),
 * and - on mobile - bottom tabs whose Menu tab opens the sidebar as a sheet.
 */
/** Breadcrumb beside the rail trigger: DB Plus / Section / (New | Detail).
 * The section links back to its register when a sub-page is open, and the
 * trail never disappears - on tiny widths only the brand root hides. */
function Crumbs() {
  const pathname = usePathname();
  const title = screenTitle(pathname);
  const segments = pathname
    .slice(ADMIN_HOME.length)
    .split("/")
    .filter(Boolean);
  const section = segments[0];
  const sub =
    segments.length > 1 ? (segments[1] === "new" ? "New" : "Detail") : null;

  return (
    <nav
      aria-label="Breadcrumb"
      // Desktop only: on a phone the page already says its own name in its
      // h1, and repeating it an inch above wasted the bar - the topbar
      // carries the brand there instead (see the header).
      className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[13px] text-adm-muted max-md:hidden"
    >
      <span className="text-adm-faint">DB Plus</span>
      <span className="text-adm-strong">/</span>
      {sub && section ? (
        <>
          <Link
            href={`${ADMIN_HOME}/${section}`}
            className="text-adm-muted transition-colors hover:text-console"
          >
            {title}
          </Link>
          <span className="text-adm-faint">/</span>
          <span
            aria-current="page"
            className="overflow-hidden text-ellipsis font-semibold text-adm-ink"
          >
            {sub}
          </span>
        </>
      ) : (
        <span
          aria-current="page"
          className="overflow-hidden text-ellipsis font-semibold text-adm-ink"
        >
          {title}
        </span>
      )}
    </nav>
  );
}

/**
 * The console's closing rule: who owns the system and who built it. Sits under
 * the scrolling content rather than pinned, so it never competes with the work
 * on screen.
 *
 * Desktop only. On a phone or tablet the credit line is dead weight at the end
 * of every scroll, and below `md` it sat on top of the tab bar's clearance as
 * well. `hidden` is display:none, so the manuru link leaves the tab order with
 * it - nothing to trap focus. The tab-bar clearance it used to carry now lives
 * on SidebarInset, which is the element that still needs it.
 */
function ConsoleFooter() {
  return (
    <footer className="mt-auto hidden border-t border-adm-hairline px-4 pb-5 pt-4 lg:block lg:px-[26px]">
      <div className="mx-auto flex w-full max-w-[1360px] flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo-mark.png"
            alt=""
            width={56}
            height={56}
            className="h-7 w-7 shrink-0"
          />
          <span className="text-[11.5px] leading-tight text-adm-muted">
            <span className="block font-semibold text-adm-ink">DB Plus</span>
            Trading · Tamale
          </span>
        </div>
        <p className="text-[11px] text-adm-muted/80">
          © {new Date().getFullYear()} DB Plus. All rights reserved.
          <span className="ml-1">
            Developed by{" "}
            <a
              href="https://manuru.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-console underline-offset-2 hover:underline"
            >
              manuru
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeKey = activeNavKey(pathname);

  return (
    // PRINT DROPS THE CONSOLE. A statement or a waybill is a document, and
    // printing one used to put the rail, the topbar, the crumbs and the footer
    // on the paper with it - the screens each hid their own chrome with
    // `print:hidden`, but nothing hid the shell they sit inside, which is
    // most of what ends up on the page. Hidden here, once, rather than by
    // every printable screen remembering to reach up and do it.
    <SidebarProvider style={SIDEBAR_VARS}>
      <div className="contents print:hidden">
        <ConsoleSidebar activeKey={activeKey} />
      </div>

      {/* The bottom padding clears the fixed tab bar, which is 62px tall plus
          its own safe-area inset - the footer used to add that inset on top,
          and it is desktop-only now, so the full clearance belongs here. */}
      <SidebarInset className="min-w-0 bg-transparent pb-[calc(env(safe-area-inset-bottom)+62px)] md:pb-0 print:pb-0">
        <header className="sticky top-0 z-40 flex h-[54px] flex-none items-center gap-3 border-b border-adm-line bg-adm-card px-4 lg:px-[26px] print:hidden">
          {/* Collapse/expand the rail (sheet on mobile) - dms behaviour in the
              console skin, living on the topbar's left edge. */}
          <SidebarTrigger className="h-[30px] w-[30px] flex-none cursor-pointer rounded-[6px] border border-adm-line bg-adm-card text-adm-muted hover:bg-adm-sunken hover:text-adm-ink max-md:hidden" />
          {/* On a phone the bar's left edge carries the company mark instead
              of the page heading - every page already states its own name in
              its h1, and the account menu keeps the right edge to itself. */}
          <span className="flex items-center gap-2 md:hidden">
            <Image
              src="/logo-mark.png"
              alt=""
              width={44}
              height={44}
              className="h-[22px] w-[22px] shrink-0"
            />
            <span className="text-[13px] font-bold tracking-[0.14em] text-adm-ink">
              DB PLUS
            </span>
          </span>
          <Crumbs />
          <div className="flex-1" />
          {/* The notifications bell returns here when the notifications feed
              ships (Step 7) - an inert bell with a badge would advertise an
              unbuilt feature. */}
          <NavbarUser />
        </header>

        {/* A named CONTAINER, not just a layout box. Everything inside the
            console sizes itself against this element's width rather than the
            viewport's - which matters because the sidebar eats 16rem. On a
            768px tablet a viewport-based `md:` fires while the content area is
            only ~512px wide, which is exactly how a table ends up rendered
            into half the room it was designed for. */}
        <main className="@container/main mx-auto w-full min-w-0 max-w-[1360px] flex-1 p-4 lg:p-[26px] print:max-w-none print:p-0">
          {children}
        </main>
        <div className="print:hidden">
          <ConsoleFooter />
        </div>
      </SidebarInset>

      <div className="print:hidden">
        <MobileTabs activeKey={activeKey} />
      </div>
    </SidebarProvider>
  );
}
