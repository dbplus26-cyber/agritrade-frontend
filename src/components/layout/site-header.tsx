"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, Phone, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { primaryNav, routes } from "@/lib/routes";
import { useSiteContact } from "@/components/providers/site-contact-provider";
import { cn } from "@/lib/utils";

/** The stencilled brand plate + wordmark, shared by header and mobile menu. */
function BrandMark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href={routes.home} onClick={onNavigate} className="flex items-center gap-3">
      {/* The real company mark. Its own artwork is a circle on a transparent
          field, so it needs no plate or border around it. */}
      <Image
        src="/logo-mark.png"
        alt=""
        width={72}
        height={72}
        priority
        className="h-9 w-9 shrink-0"
      />
      {/* Ultra-narrow screens (Galaxy Fold, ~280px) get the mark alone - the
          wordmark would crowd the menu button. */}
      <span className="hidden flex-col min-[360px]:flex">
        <span className="font-display text-[17px] font-bold leading-[1.1] tracking-[0.04em] text-forest lg:text-[19px]">
          DB PLUS
        </span>
        <span className="stencil text-[8px] leading-none tracking-[0.3em] text-harvest-deep lg:text-[9px]">
          TRADING · TAMALE
        </span>
      </span>
    </Link>
  );
}

/**
 * The mobile menu is one flat list, in the order the site is read: the
 * services are lifted out of their dropdown and take their place inline
 * rather than being filed under a caption of their own. A phone menu of seven
 * words does not need a table of contents.
 */
const mobileNav = primaryNav.flatMap<{ href: string; label: string }>((item) =>
  "children" in item ? [...item.children] : [item],
);

const desktopItem =
  "stencil relative flex items-baseline gap-1.5 px-3.5 py-3 text-[11px] tracking-[0.16em] text-soil transition-colors hover:text-ink bg-[linear-gradient(#D89C2E,#D89C2E)] bg-no-repeat bg-[length:0%_2px] bg-[position:14px_calc(100%-8px)] hover:bg-[length:60%_2px] [transition:background-size_.18s_ease,color_.18s_ease]";

/** The gold tag that marks the active nav item - the fill alone carries it. */
function ActiveTag({ label }: { label: string }) {
  return (
    <span className="stencil flex items-baseline rounded-[2px] bg-harvest px-3.5 py-3 text-[11px] tracking-[0.16em] text-ink shadow-[2px_2px_0_rgb(31_33_28/0.35)]">
      {label}
    </span>
  );
}

/**
 * One line in the mobile menu. The drawer is a plain list of destinations and
 * nothing else: group captions, left-column numerals, tinted active rows and
 * rules between entries would all be decoration to read past on the way to
 * seven words.
 *
 * So each row is the word alone, at a size worth tapping, on 56px rows with no
 * dividers. The current page is marked by SHAPE as well as colour - a single
 * gold rail on the leading edge, plus the heavier weight - and carries
 * aria-current for assistive tech.
 */
function MobileNavItem({
  active,
  href,
  index,
  label,
  onNavigate,
}: {
  active: boolean;
  href: string;
  /** Row position, used only to stagger the opening animation. */
  index: number;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      // Rows deal themselves in from the drawer's edge, a beat apart. The
      // global prefers-reduced-motion rule switches every one of these off.
      style={{
        animation: `menu-row-in .34s cubic-bezier(.22,.9,.3,1) ${String(
          0.04 + index * 0.035,
        )}s backwards`,
      }}
      // Each row is a filed card, the same object the rest of the site is
      // built from: soil hairline, bright paper, hard offset shadow, squared
      // corners. The current page is the card that has been pulled forward -
      // gold edge, gold tint and a heavier shadow.
      className={cn(
        "group relative mx-4 my-[3px] flex min-h-[54px] items-center justify-between gap-3 rounded-[2px] border pl-4 pr-3 transition-[box-shadow,transform,background-color,border-color] active:translate-x-px active:translate-y-px",
        active
          ? "border-harvest-deep/45 bg-harvest/15 shadow-block-sm"
          : "border-soil/30 bg-paper shadow-doc-sm active:shadow-none",
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] bg-harvest-deep"
        />
      ) : null}
      <span
        className={cn(
          "font-display text-[18px] transition-colors",
          active ? "font-bold text-forest" : "font-medium text-soil",
        )}
      >
        {label}
      </span>
      {/* A quiet chevron gives every row somewhere to go, and leans in on the
          current page so the marked row is the one that looks live. */}
      <ChevronRight
        aria-hidden="true"
        strokeWidth={2.4}
        className={cn(
          "size-4 shrink-0 transition-[transform,color]",
          active
            ? "translate-x-0.5 text-harvest-deep"
            : "text-soil/35 group-active:translate-x-0.5",
        )}
      />
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const contact = useSiteContact();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => {
    setMenuOpen(false);
  };

  const services = primaryNav.find((item) => "children" in item);
  const serviceLinks = services && "children" in services ? services.children : [];
  const onServicePage = serviceLinks.some((s) => pathname.startsWith(s.href));

  return (
    // Sticky so the nav stays reachable however deep the page - z-50 clears
    // the hero (z-2), the board (z-1) and every stamp/ghost on the way down.
    <header className="texture-grain sticky top-0 z-50 bg-surface shadow-[0_10px_24px_-20px_rgb(31_33_28/0.45)]">
      {/* Desktop: brand · numbered nav · dispatch line, closed by the ledger rule. */}
      <div className="mx-auto hidden h-[88px] max-w-[1312px] grid-cols-[auto_1fr_auto] items-stretch px-8 lg:grid">
        <div className="flex items-center border-r border-dotted border-soil/50 pr-6">
          <BrandMark />
        </div>
        <nav
          aria-label="Primary"
          className="flex items-center justify-center gap-1 px-2.5"
        >
          {primaryNav.map((item) =>
            "children" in item ? (
              // Non-modal: a modal menu locks the body and takes the
              // scrollbar out of the layout while it is open, which shunts
              // the whole page sideways on every open and close.
              <DropdownMenu key={item.label} modal={false}>
                {onServicePage ? (
                  <DropdownMenuTrigger className="cursor-pointer">
                    <ActiveTag label={item.label} />
                  </DropdownMenuTrigger>
                ) : (
                  <DropdownMenuTrigger className={cn(desktopItem, "cursor-pointer uppercase")}>
                    {item.label}
                    <ChevronDown aria-hidden="true" className="size-2.5 self-center" strokeWidth={3.2} />
                  </DropdownMenuTrigger>
                )}
                {/* The plate chrome lives on the base DropdownMenuContent now -
                    every dropdown in the app wears this same services skin. */}
                <DropdownMenuContent align="start" className="min-w-[236px]">
                  <DropdownMenuLabel className="stencil px-4 pb-1 pt-3 text-[9px] tracking-[0.26em] text-harvest-deep">
                    SERVICES
                  </DropdownMenuLabel>
                  {item.children.map((service, i) => (
                    <DropdownMenuItem
                      key={service.href}
                      asChild
                      className={cn(
                        "cursor-pointer rounded-none px-4 py-3.5 focus:bg-harvest/12",
                        i < item.children.length - 1 &&
                          "border-b border-dotted border-soil/40",
                      )}
                    >
                      <Link
                        href={service.href}
                        className="flex items-center font-display text-[15px] font-bold text-forest"
                      >
                        {service.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : pathname === item.href ? (
              <ActiveTag key={item.href} label={item.label} />
            ) : (
              <Link key={item.href} href={item.href} className={cn(desktopItem, "uppercase")}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="flex flex-col items-end justify-center gap-1 border-l border-dotted border-soil/50 pl-6">
          <span className="stencil text-[9px] leading-none tracking-[0.28em] text-harvest-deep">
            DISPATCH LINE
          </span>
          <a
            href={contact.phoneHref}
            className="font-display text-[17px] font-bold tracking-[0.02em] text-forest transition-colors hover:text-harvest-deep"
          >
            {contact.phoneLabel}
          </a>
        </div>
      </div>
      <div aria-hidden="true" className="ledger-rule mx-auto hidden max-w-[1312px] px-8 lg:block" />

      {/* Mobile: brand + the menu sheet. */}
      <div className="flex h-16 items-center justify-between border-b border-soil/16 px-5 lg:hidden">
        <BrandMark />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          {/* Icon only, with the label on aria-label so the control still
              announces itself. */}
          <SheetTrigger
            aria-label="Open menu"
            className="flex size-11 cursor-pointer items-center justify-center rounded-[2px] border-2 border-forest text-forest shadow-doc-sm transition-colors active:bg-harvest/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            <Menu aria-hidden="true" className="size-[19px]" strokeWidth={2.4} />
          </SheetTrigger>
          <SheetContent
            side="right"
            showCloseButton={false}
            // A hand's width of the page stays visible behind the drawer, so
            // the reader keeps their place; the full-width slide reads as a
            // sheet of paper pulled over rather than a panel popping in.
            overlayClassName="bg-ink/45"
            // The width is variant-scoped on purpose: the base SheetContent
            // sets `data-[side=right]:w-3/4`, which out-specifies a plain
            // `w-*` and silently wins.
            // No gradient here: `.texture-grain` owns background-image (it is
            // declared after Tailwind's utilities and wins), and tailwind-merge
            // reads the v3-era `bg-gradient-to-b` as a background COLOUR, which
            // would silently drop `bg-surface` and leave the panel see-through.
            className="texture-grain flex flex-col gap-0 border-l-0 bg-surface p-0 shadow-[-10px_0_34px_-16px_rgb(31_33_28/0.6)] duration-[280ms] ease-[cubic-bezier(.22,.9,.3,1)] data-[side=right]:w-[min(330px,86vw)] data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full"
          >
            {/* A gold thread runs under the brand: one warm line is what stops
                the sheet reading as an empty page, and it ties the drawer to
                the tags and buttons that carry the same colour. */}
            <SheetHeader className="relative gap-0 p-0 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-harvest/70 after:via-soil/20 after:to-transparent">
              <div className="flex items-center justify-between gap-3 px-6 py-3.5">
                <BrandMark onNavigate={closeMenu} />
                <SheetClose
                  aria-label="Close menu"
                  className="-mr-2.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-soil transition-colors active:bg-soil/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <X aria-hidden="true" className="size-5" strokeWidth={2} />
                </SheetClose>
              </div>
              <SheetTitle className="sr-only">Site menu</SheetTitle>
            </SheetHeader>
            {/* One flat list, in the order the site is read. The services sit
                inline rather than in a captioned branch of their own, which
                would cost two extra rows of chrome to say something the page
                titles already say. */}
            <nav
              aria-label="Primary"
              className="flex flex-1 flex-col py-3 overflow-y-auto overscroll-contain"
            >
              {mobileNav.map((item, i) => (
                <MobileNavItem
                  key={item.href}
                  index={i}
                  active={
                    item.href === routes.home
                      ? pathname === routes.home
                      : pathname.startsWith(item.href)
                  }
                  href={item.href}
                  label={item.label}
                  onNavigate={closeMenu}
                />
              ))}
            </nav>
            {/* One action, pinned clear of the home indicator: calling is what
                a visitor on a phone actually wants, and WhatsApp follows as a
                quiet second line rather than a second slab. No stencilled
                caption and no address: that is the contact page repeated at
                the bottom of a menu. */}
            <div className="mt-auto border-t border-soil/12 bg-surface-alt/50 px-6 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-4">
              {contact.hasPhone ? (
                <a
                  href={contact.phoneHref}
                  onClick={closeMenu}
                  className="shadow-block flex min-h-12 items-center justify-center gap-2.5 rounded-[2px] bg-harvest text-[15px] font-bold text-ink transition-[transform,box-shadow] active:translate-x-px active:translate-y-px active:shadow-[1px_1px_0_rgb(31_33_28/0.85)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <Phone aria-hidden="true" className="size-[17px]" strokeWidth={2.3} />
                  Call {contact.phone}
                </a>
              ) : (
                <Link
                  href={routes.contact}
                  onClick={closeMenu}
                  className="shadow-block flex min-h-12 items-center justify-center rounded-[2px] bg-harvest text-[15px] font-bold text-ink transition-[transform,box-shadow] active:translate-x-px active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  Contact us
                </Link>
              )}
              {contact.hasWhatsapp ? (
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="mt-2.5 flex min-h-11 items-center justify-center gap-2 rounded-[2px] border border-forest/45 bg-surface text-[14px] font-bold text-forest shadow-doc-sm transition-[transform,box-shadow] active:translate-x-px active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <WhatsAppIcon aria-hidden="true" className="size-[16px]" />
                  WhatsApp us
                </a>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
