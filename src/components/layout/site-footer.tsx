import Image from "next/image";
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/ui/SocialIcons";
import { primaryNav, routes } from "@/lib/routes";
import { siteConfig } from "@/lib/site";
import { getSiteContact } from "@/lib/public-contact";
import { cn } from "@/lib/utils";

const pageLinks = primaryNav.flatMap<{ label: string; href: string }>(
  (item) =>
    "children" in item
      ? [...item.children]
      : item.href === routes.home
        ? []
        : [item],
);

/**
 * The social row under the company name. Built from `siteConfig.social`, so a
 * profile the company has not published simply drops out of the row rather
 * than shipping an icon that leads nowhere.
 */
const socialLinks = (
  [
    { Icon: FacebookIcon, href: siteConfig.social.facebook, label: "Facebook" },
    {
      Icon: InstagramIcon,
      href: siteConfig.social.instagram,
      label: "Instagram",
    },
    { Icon: TikTokIcon, href: siteConfig.social.tiktok, label: "TikTok" },
  ] as const
).filter((link) => link.href.length > 0);

/**
 * A footer link. On a phone these sit in a tight stack where a 20px line of
 * text is a fiddly thing to hit with a thumb, so each row clears the 44px tap
 * floor; from sm up it collapses back to the compact printed-index rhythm the
 * footer is drawn as.
 */
const footerLink =
  "flex min-h-11 w-fit items-center transition-colors hover:text-surface sm:min-h-0";

export async function SiteFooter() {
  const contact = await getSiteContact();
  return (
    // No bottom reservation any more: the mobile contact rail hugs the right
    // edge instead of a full-width bar, so the footer runs to the page end.
    <footer className="texture-grain-dark bg-footer text-surface/70">
      <div className="mx-auto max-w-[1312px] px-5 pb-8 pt-10 lg:px-8 lg:pt-12">
        <div className="grid gap-10 border-b border-dashed border-surface/25 pb-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-12">
          <div>
            {/* Mark beside the name, on the dark band. The artwork carries its
                own dark-green field, so it reads without a plate behind it. */}
            <div className="mb-3 flex items-center gap-2.5">
              <Image
                src="/logo-mark.png"
                alt=""
                width={72}
                height={72}
                className="h-9 w-9 shrink-0"
              />
              <span className="stencil block text-[15px] tracking-[0.14em] text-surface">
                {siteConfig.legalName.toUpperCase()}
              </span>
            </div>
            <p className="max-w-[44ch] text-[13.5px] leading-[1.7]">
              Buying, aggregating and delivering maize, soya beans and
              groundnuts from Ghana&rsquo;s Northern Region.
            </p>
            {socialLinks.length > 0 ? (
              <ul className="mt-4 flex flex-wrap items-center gap-2.5">
                {socialLinks.map(({ Icon, href, label }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${siteConfig.name} on ${label}`}
                      className="flex size-11 items-center justify-center rounded-[2px] border border-surface/25 text-surface/75 transition-colors hover:border-harvest hover:text-harvest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-harvest"
                    >
                      <Icon aria-hidden="true" className="size-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-0 text-[13.5px] font-medium sm:gap-2">
            <span className="stencil mb-1 text-[11px] tracking-[0.26em] text-harvest">
              PAGES
            </span>
            {pageLinks.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className={footerLink}
              >
                {page.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-0 text-[13.5px] font-medium sm:gap-2">
            <span className="stencil mb-1 text-[11px] tracking-[0.26em] text-harvest">
              CONTACT
            </span>
            <a
              href={contact.phoneHref}
              className={footerLink}
            >
              {contact.phoneLabel}
              {contact.hasPhone && !contact.whatsappIsSeparate
                ? " · WhatsApp same"
                : ""}
            </a>
            {!contact.whatsappIsSeparate ? null : (
              <a
                href={contact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
              >
                WhatsApp {contact.whatsapp}
              </a>
            )}
            {contact.hasEmail ? (
              // An address is one unbreakable word, so it is allowed to break
              // rather than run past the column on a narrow phone.
              <a
                href={`mailto:${contact.email}`}
                className={cn(footerLink, "max-w-full [overflow-wrap:anywhere]")}
              >
                {contact.email}
              </a>
            ) : null}
            <span className="py-2 sm:py-0">
              {siteConfig.city}, Northern Region, {siteConfig.country}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start justify-between gap-3 pt-5 text-[12px] text-surface/45 sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} {siteConfig.legalName} ·{" "}
            <span className="text-surface/70">Developed by</span>{" "}
            <a
              href="https://manuru.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-surface/80 transition-colors hover:text-surface hover:underline"
            >
              manuru
            </a>
          </span>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link href={routes.terms} className={footerLink}>
              Terms
            </Link>
            <Link href={routes.privacy} className={footerLink}>
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
