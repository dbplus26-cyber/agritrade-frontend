"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
 * One line in the mobile menu. The panel is a plain list of destinations and
 * nothing else: cards, group captions, left-column numerals and rules between
 * entries would all be decoration to read past on the way to seven words.
 *
 * So each row is the word alone, set at heading size straight on the paper,
 * on a target worth tapping. The current page is marked by SHAPE as well as
 * colour - a short gold rule under the word, plus the heavier weight - and
 * carries aria-current for assistive tech.
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
      // Rows drop in behind the panel's leading edge, a beat apart. The
      // global prefers-reduced-motion rule switches every one of these off.
      style={{
        animation: `menu-row-in .3s cubic-bezier(.23,1,.32,1) ${String(
          0.06 + index * 0.03,
        )}s backwards`,
      }}
      className={cn(
        "flex min-h-[52px] items-center px-6 font-display text-[21px] leading-none tracking-[-0.01em] transition-colors active:bg-harvest/12",
        active ? "font-bold text-forest" : "font-semibold text-forest/80",
      )}
    >
      <span
        className={cn(
          "relative",
          active &&
            "after:absolute after:-bottom-2 after:left-0 after:h-[3px] after:w-8 after:bg-harvest-deep",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/**
 * The drawer curve: quick off the mark, then a long settle, so the panel
 * reads as a sheet dropping into place rather than a box sliding on rails.
 * The exit runs on the same curve but shorter - the menu was asked to go, so
 * it should be gone before the eye has to wait for it.
 */
const sheetEase: [number, number, number, number] = [0.32, 0.72, 0, 1];
const sheetIn = { duration: 0.42, ease: sheetEase };
const sheetOut = { duration: 0.26, ease: sheetEase };
const fadeIn = { duration: 0.28, ease: "easeOut" as const };
const fadeOut = { duration: 0.18, ease: "easeOut" as const };

export function SiteHeader() {
  const pathname = usePathname();
  const contact = useSiteContact();
  const reduceMotion = useReducedMotion() === true;
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Escape closes the menu and hands focus back to the button that opened it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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

      {/* Mobile: the bar stays put and the menu drops from under it, so
          nothing the reader is looking at moves except the panel itself. It
          is a disclosure, not a modal: the page stays visible and dimmed
          beneath, the same button opens and closes it, and Escape or a tap on
          the dimmed page puts it away. */}
      <div className="relative lg:hidden">
        {/* The bar sits above the panel and the scrim on its own opaque
            ground, so the panel can wait tucked behind it before it drops
            and the bar is never dimmed. */}
        <div className="texture-grain relative z-20 flex h-16 items-center justify-between border-b border-soil/16 bg-surface px-5">
          <BrandMark onNavigate={closeMenu} />
          <button
            ref={triggerRef}
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
            className="group flex size-11 cursor-pointer items-center justify-center rounded-[2px] border-2 border-forest text-forest shadow-doc-sm transition-[background-color,scale] duration-150 active:scale-[0.96] active:bg-harvest/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            {/* Both glyphs share one slot: the bars turn out and shrink as
                the cross turns in, so the button reads as one mark changing
                state rather than two icons swapping. */}
            <span className="relative size-[19px]">
              <Menu
                aria-hidden="true"
                className="absolute inset-0 size-full transition-[rotate,scale,opacity] duration-200 ease-out group-aria-expanded:scale-75 group-aria-expanded:-rotate-90 group-aria-expanded:opacity-0"
                strokeWidth={2.4}
              />
              <X
                aria-hidden="true"
                className="absolute inset-0 size-full scale-75 rotate-90 opacity-0 transition-[rotate,scale,opacity] duration-200 ease-out group-aria-expanded:scale-100 group-aria-expanded:rotate-0 group-aria-expanded:opacity-100"
                strokeWidth={2.4}
              />
            </span>
          </button>
        </div>

        {/* Both layers animate on transform and opacity only, as full
            transform strings so they run on the compositor, and each can be
            reversed mid-flight: a tap on the cross while the panel is still
            dropping sends it back up from wherever it is. Under
            prefers-reduced-motion the panel fades in place instead of moving. */}
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              key="scrim"
              aria-hidden="true"
              onClick={closeMenu}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: fadeOut }}
              transition={fadeIn}
              // touch-none refuses a scroll gesture that starts on the scrim,
              // so the page holds still under the open menu.
              className="fixed inset-0 z-0 touch-none bg-ink/45"
            />
          ) : null}
          {menuOpen ? (
            <motion.div
              key="panel"
              id={menuId}
              initial={reduceMotion ? { opacity: 0 } : { transform: "translateY(-100%)" }}
              animate={reduceMotion ? { opacity: 1 } : { transform: "translateY(0%)" }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: fadeOut }
                  : { transform: "translateY(-100%)", transition: sheetOut }
              }
              transition={reduceMotion ? fadeIn : sheetIn}
              // The panel hangs from the bar and stops short of the fold, so
              // a strip of the page still shows below it. It is only as tall
              // as its own rows; the list takes the scroll if a short screen
              // cannot hold all seven.
              className="texture-grain absolute inset-x-0 top-full z-10 flex max-h-[calc(92dvh-4rem)] flex-col border-b border-soil/25 bg-surface shadow-[0_16px_34px_-18px_rgb(31_33_28/0.6)] will-change-transform"
            >
              {/* One flat list, in the order the site is read. The services
                  sit inline rather than in a captioned branch of their own,
                  which would cost two extra rows of chrome to say something
                  the page titles already say. */}
              <nav
                aria-label="Primary"
                className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-3"
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
              {/* One action, pinned clear of the home indicator: calling is
                  what a visitor on a phone actually wants, and WhatsApp
                  follows as a quiet second line rather than a second slab.
                  No stencilled caption and no address: that is the contact
                  page repeated at the bottom of a menu. */}
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
