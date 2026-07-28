"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
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
      <span className="stencil grid h-9 w-9 shrink-0 place-items-center rounded-[3px] border-[2.5px] border-forest text-[12px] tracking-[0.02em] text-forest shadow-block-sm">
        DB
      </span>
      {/* Ultra-narrow screens (Galaxy Fold, ~280px) get the plate alone — the
          wordmark would crowd the MENU button. */}
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

const desktopItem =
  "stencil relative flex items-baseline gap-1.5 px-3.5 py-3 text-[11px] tracking-[0.16em] text-soil transition-colors hover:text-ink bg-[linear-gradient(#D89C2E,#D89C2E)] bg-no-repeat bg-[length:0%_2px] bg-[position:14px_calc(100%-8px)] hover:bg-[length:60%_2px] [transition:background-size_.18s_ease,color_.18s_ease]";

/** The gold tag that marks the active nav item — the fill alone carries it. */
function ActiveTag({ index, label }: { index: string; label: string }) {
  return (
    <span className="stencil flex items-baseline gap-1.5 rounded-[2px] bg-harvest px-3.5 py-3 text-[11px] tracking-[0.16em] text-ink shadow-[2px_2px_0_rgb(31_33_28/0.35)]">
      <span className="text-[9px] text-[#5F4A12]">{index}</span>
      {label}
    </span>
  );
}

/**
 * One row in the mobile index. The active page wears the same gold plate as
 * the desktop nav, plus a solid rail down its leading edge so the current
 * location is readable at a glance and not by colour alone (the numeral
 * darkens with it). Rows clear 54px, well over the 44px tap floor.
 */
function MobileNavItem({
  active,
  href,
  index,
  label,
  onNavigate,
  sub = false,
}: {
  active: boolean;
  href: string;
  index: string;
  label: string;
  onNavigate: () => void;
  /** Service children sit one step in from their group header. */
  sub?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[54px] items-center justify-between gap-4 border-b border-dotted border-soil/35 py-3 pr-5 font-display font-bold transition-colors",
        sub ? "pl-[27px] text-[16px]" : "pl-5 text-[17px]",
        active ? "bg-harvest text-ink" : "text-forest active:bg-harvest/14",
      )}
    >
      {active ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-harvest-deep" />
      ) : null}
      {label}
      <span
        className={cn(
          "stencil shrink-0 text-[10px] tracking-[0.14em]",
          active ? "text-[#5F4A12]" : "text-harvest-deep",
        )}
      >
        {index}
      </span>
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
    // Sticky so the nav stays reachable however deep the page — z-50 clears
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
              <DropdownMenu key={item.label}>
                {onServicePage ? (
                  <DropdownMenuTrigger className="cursor-pointer">
                    <ActiveTag index={item.index} label={item.label} />
                  </DropdownMenuTrigger>
                ) : (
                  <DropdownMenuTrigger className={cn(desktopItem, "cursor-pointer uppercase")}>
                    <span className="text-[9px] text-harvest-deep">{item.index}</span>
                    {item.label}
                    <ChevronDown aria-hidden="true" className="size-2.5 self-center" strokeWidth={3.2} />
                  </DropdownMenuTrigger>
                )}
                {/* The plate chrome lives on the base DropdownMenuContent now —
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
                        className="flex items-center justify-between gap-5 font-display text-[15px] font-bold text-forest"
                      >
                        {service.label}
                        <span className="stencil text-[10px] tracking-[0.12em] text-harvest-deep">
                          {service.index}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : pathname === item.href ? (
              <ActiveTag key={item.href} index={item.index} label={item.label} />
            ) : (
              <Link key={item.href} href={item.href} className={cn(desktopItem, "uppercase")}>
                <span className="text-[9px] text-harvest-deep">{item.index}</span>
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

      {/* Mobile: brand + MENU sheet. */}
      <div className="flex h-16 items-center justify-between border-b border-soil/16 px-5 lg:hidden">
        <BrandMark />
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger className="stencil flex min-h-11 cursor-pointer items-center gap-2 rounded-[2px] border-2 border-forest px-3.5 text-[11px] tracking-[0.2em] text-forest shadow-doc-sm">
            MENU
            <Menu aria-hidden="true" className="size-[17px]" strokeWidth={2.4} />
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
            className="texture-grain flex flex-col gap-0 border-l-0 bg-surface p-0 shadow-[-8px_0_28px_-14px_rgb(31_33_28/0.55)] data-[side=right]:w-[min(324px,84vw)] data-open:slide-in-from-right-full data-closed:slide-out-to-right-full"
          >
            <SheetHeader className="gap-0 border-b-[2.5px] border-forest bg-surface-alt/70 p-0">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <BrandMark onNavigate={closeMenu} />
                <SheetClose
                  aria-label="Close menu"
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[2px] border-2 border-forest text-forest shadow-doc-sm transition-colors active:bg-harvest/20"
                >
                  <X aria-hidden="true" className="size-[19px]" strokeWidth={2.4} />
                </SheetClose>
              </div>
              <SheetTitle className="sr-only">Site menu</SheetTitle>
            </SheetHeader>
            <nav
              aria-label="Primary"
              className="flex flex-1 flex-col overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center gap-3 px-5 pb-2 pt-4">
                <span className="stencil text-[10px] tracking-[0.28em] text-harvest-deep">
                  INDEX
                </span>
                <span aria-hidden="true" className="h-px flex-1 bg-soil/30" />
              </div>
              {primaryNav.map((item) =>
                "children" in item ? (
                  // The services group is a tinted block with its own ruled
                  // header, so the three children read as one branch of the
                  // index instead of five flat rows.
                  <div key={item.label} className="bg-harvest/8">
                    <div className="flex items-center gap-3 border-y border-dotted border-soil/35 px-5 py-2.5">
                      <span className="stencil text-[10px] tracking-[0.26em] text-harvest-deep">
                        {item.index} · SERVICES
                      </span>
                      <span aria-hidden="true" className="h-px flex-1 bg-soil/25" />
                    </div>
                    {item.children.map((service) => (
                      <MobileNavItem
                        key={service.href}
                        active={pathname.startsWith(service.href)}
                        href={service.href}
                        // Composite numeral: a bare "03" here would sit
                        // directly above top-level "About 03" and read as a
                        // duplicate.
                        index={`${item.index}·${service.index}`}
                        label={service.label}
                        onNavigate={closeMenu}
                        sub
                      />
                    ))}
                  </div>
                ) : (
                  <MobileNavItem
                    key={item.href}
                    active={pathname === item.href}
                    href={item.href}
                    index={item.index}
                    label={item.label}
                    onNavigate={closeMenu}
                  />
                ),
              )}
            </nav>
            {/* Contact actions close the drawer, pinned to the bottom and
                clear of the home indicator. Unpublished channels are dropped
                rather than linked to nothing. */}
            <div className="mt-auto border-t-[2.5px] border-forest bg-surface-alt/70 px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-3.5">
              <span className="stencil mb-2 block text-[10px] tracking-[0.28em] text-harvest-deep">
                DISPATCH LINE
              </span>
              {contact.hasPhone ? (
                <a
                  href={contact.phoneHref}
                  onClick={closeMenu}
                  className="mb-3 block font-display text-[19px] font-bold tracking-[0.02em] text-forest"
                >
                  {contact.phone}
                </a>
              ) : null}
              {contact.hasPhone || contact.hasWhatsapp ? (
                <div className="grid grid-cols-2 gap-3">
                  {contact.hasPhone ? (
                    <a
                      href={contact.phoneHref}
                      onClick={closeMenu}
                      className="shadow-block flex min-h-11 items-center justify-center gap-2 rounded-[2px] bg-harvest text-[14px] font-bold text-ink"
                    >
                      <Phone aria-hidden="true" className="size-4" strokeWidth={2.3} />
                      Call
                    </a>
                  ) : null}
                  {contact.hasWhatsapp ? (
                    <a
                      href={contact.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMenu}
                      className={cn(
                        "shadow-doc-sm flex min-h-11 items-center justify-center gap-2 rounded-[2px] border-2 border-forest text-[14px] font-bold text-forest",
                        !contact.hasPhone && "col-span-2",
                      )}
                    >
                      <WhatsAppIcon aria-hidden="true" className="size-[17px]" />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={routes.contact}
                  onClick={closeMenu}
                  className="shadow-block flex min-h-11 items-center justify-center rounded-[2px] bg-harvest text-[14px] font-bold text-ink"
                >
                  Contact us
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
