"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { primaryNav, routes } from "@/lib/routes";
import { useSiteContact } from "@/components/providers/site-contact-provider";
import { cn } from "@/lib/utils";

/** The stencilled brand plate + wordmark, shared by header and mobile menu. */
function BrandMark() {
  return (
    <Link href={routes.home} className="flex items-center gap-3">
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

export function SiteHeader() {
  const pathname = usePathname();
  const contact = useSiteContact();
  const [menuOpen, setMenuOpen] = useState(false);

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
            {contact.phone}
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
            className="w-[min(390px,100vw)] gap-0 overflow-y-auto border-l-0 bg-surface p-0"
          >
            <SheetHeader className="border-b-[1.5px] border-soil/50 px-5 pb-3 pt-5">
              <SheetTitle className="stencil text-left text-[10px] tracking-[0.28em] text-harvest-deep">
                INDEX
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Primary" className="flex flex-col">
              {primaryNav.map((item) =>
                "children" in item ? (
                  <div
                    key={item.label}
                    className="border-b border-dotted border-soil/40 bg-harvest/8"
                  >
                    <div className="px-5 pb-1 pt-3">
                      <span className="stencil text-[10px] tracking-[0.26em] text-harvest-deep">
                        {item.index} — SERVICES
                      </span>
                    </div>
                    {item.children.map((service, i) => {
                      const active = pathname.startsWith(service.href);
                      return (
                        <Link
                          key={service.href}
                          href={service.href}
                          onClick={() => setMenuOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center justify-between border-l-[3px] border-harvest py-3.5 pl-[17px] pr-5 font-display text-[17px] font-bold text-forest",
                            i < item.children.length - 1 &&
                              "border-b border-dotted border-soil/35",
                            active && "bg-harvest/25",
                          )}
                        >
                          {service.label}
                          <span aria-hidden="true" className="stencil text-[15px] text-harvest-deep">
                            {active ? "●" : "→"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : pathname === item.href ? (
                  // The active page wears the same gold tag as the desktop nav.
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current="page"
                    className="flex items-center justify-between border-b border-dotted border-soil/40 bg-harvest px-5 py-[15px] font-display text-[17px] font-bold text-ink"
                  >
                    {item.label}
                    <span className="stencil text-[10px] tracking-[0.14em] text-[#5F4A12]">
                      {item.index}
                    </span>
                  </Link>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between border-b border-dotted border-soil/40 px-5 py-[15px] font-display text-[17px] font-bold text-forest"
                  >
                    {item.label}
                    <span className="stencil text-[10px] tracking-[0.14em] text-harvest-deep">
                      {item.index}
                    </span>
                  </Link>
                ),
              )}
            </nav>
            <div className="grid grid-cols-2 gap-3 border-t-[1.5px] border-soil/50 px-5 pb-5 pt-4">
              <a
                href={contact.phoneHref}
                className="shadow-block block rounded-[2px] bg-harvest p-3.5 text-center text-[14px] font-bold text-ink"
              >
                Call
              </a>
              <a
                href={contact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="shadow-doc-sm block rounded-[2px] border-2 border-forest p-[11px] text-center text-[14px] font-bold text-forest"
              >
                WhatsApp
              </a>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
