import Link from "next/link";
import { primaryNav, routes } from "@/lib/routes";
import { siteConfig } from "@/lib/site";
import { getSiteContact } from "@/lib/public-contact";

const pageLinks = primaryNav.flatMap<{ label: string; href: string }>(
  (item) =>
    "children" in item
      ? [...item.children]
      : item.href === routes.home
        ? []
        : [item],
);

export async function SiteFooter() {
  const contact = await getSiteContact();
  return (
    <footer className="texture-grain-dark bg-footer pb-24 text-surface/70 lg:pb-0">
      <div className="mx-auto max-w-[1312px] px-5 pb-8 pt-10 lg:px-8 lg:pt-12">
        <div className="grid gap-10 border-b border-dashed border-surface/25 pb-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-12">
          <div>
            <span className="stencil mb-3 block text-[15px] tracking-[0.14em] text-surface">
              {siteConfig.legalName.toUpperCase()}
            </span>
            <p className="max-w-[44ch] text-[13.5px] leading-[1.7]">
              Buying, aggregating and delivering maize, soya beans and
              groundnuts from Ghana&rsquo;s Northern Region.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-[13.5px] font-medium">
            <span className="stencil mb-1 text-[11px] tracking-[0.26em] text-harvest">
              PAGES
            </span>
            {pageLinks.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="w-fit transition-colors hover:text-surface"
              >
                {page.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2 text-[13.5px] font-medium">
            <span className="stencil mb-1 text-[11px] tracking-[0.26em] text-harvest">
              CONTACT
            </span>
            <a
              href={contact.phoneHref}
              className="w-fit transition-colors hover:text-surface"
            >
              {contact.phone}
              {contact.whatsapp === contact.phone ? " · WhatsApp same" : ""}
            </a>
            {contact.whatsapp === contact.phone ? null : (
              <a
                href={contact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit transition-colors hover:text-surface"
              >
                WhatsApp {contact.whatsapp}
              </a>
            )}
            <a
              href={`mailto:${contact.email}`}
              className="w-fit transition-colors hover:text-surface"
            >
              {contact.email}
            </a>
            <span>
              {siteConfig.city}, Northern Region, {siteConfig.country}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 pt-5 text-[12px] text-surface/45 sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} {siteConfig.legalName} · Photography:
            Wikimedia Commons contributors (CC BY-SA)
          </span>
          <div className="flex flex-wrap gap-5">
            <Link href={routes.terms} className="transition-colors hover:text-surface">
              Terms
            </Link>
            <Link
              href={routes.privacy}
              className="transition-colors hover:text-surface"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
