import { routes } from "@/lib/routes";

/**
 * Central site config — canonical URL, brand strings, and SEO defaults.
 *
 * The base URL comes from `NEXT_PUBLIC_BASE_URL`, centralised here
 * (khadys-kitchen convention) so nothing redeclares origins. Trailing slash is
 * stripped so `${siteUrl}/path` is always safe.
 */

// NEXT_PUBLIC_BASE_URL is the real source of truth and MUST be set in
// production: it lands in every canonical, OG url and sitemap entry.
//
// The fallbacks are deliberately not a guessed business domain. The previous
// `https://dbplus.com` fallback is a domain the business may not own, so any
// deploy that forgot the env var handed our whole SEO surface - canonicals,
// OG tags, sitemap - to a stranger's server. Vercel exposes the deployment
// host so previews still get a real absolute origin; everything else lands on
// the dev server, which is obviously wrong rather than quietly wrong.
const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;

export const siteUrl = (
  process.env.NEXT_PUBLIC_BASE_URL ||
  (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")
).replace(/\/$/, "");

export const siteConfig = {
  name: "DB Plus",
  legalName: "DB Plus Trading Ltd",
  shortName: "DB Plus",
  /** Full home-page title (the layout template's `default`). */
  title: "DB Plus · Bulk grain trading from Tamale, Ghana",
  description:
    "Maize, soya beans and groundnuts bought at the farm gate across Ghana's Northern Region — weighed honestly, aggregated in Tamale and trucked south by the load.",
  locale: "en_GH",
  /**
   * Contact details are OWNER DATA, not code: the live values come from the
   * backend settings block and are merged over these in `public-contact.ts`.
   *
   * Phone and email are intentionally EMPTY. The placeholders that used to sit
   * here ("+233 24 000 0000", "info@dbplus.example" - .example is a reserved,
   * undeliverable TLD) were rendered as real contacts in the header, footer,
   * hero and legal pages, so every share and every walk-up enquiry hit a dead
   * number. A missing contact is recoverable; a confidently wrong one is not.
   * Fill these in ONLY with numbers the owner confirms, as the offline
   * fallback for when the settings API is unreachable.
   */
  phone: "",
  email: "",
  /**
   * Where the call/WhatsApp links point while no number is configured: the
   * contact page, never a `tel:`/`wa.me` that dials nobody.
   */
  phoneHref: routes.contact,
  whatsappHref: routes.contact,
  address: "Industrial Area, off Bolgatanga Road, Tamale, Northern Region",
  hours: "Mon – Sat 7:00 – 17:00 · Sunday closed",
  city: "Tamale",
  country: "Ghana",
  /** Viridian forest — theme-color and the OG image field. */
  themeColor: "#155744",
  /** Pale husk page background. */
  backgroundColor: "#EFF1E8",
  ink: "#1F211C",
  keywords: [
    "DB Plus",
    "grain trading Ghana",
    "maize supplier Ghana",
    "soya beans Ghana",
    "groundnuts supplier",
    "Tamale commodities",
    "Northern Region maize",
    "bulk grain Accra",
    "bulk grain Kumasi",
    "agro commodities Tamale",
    "farm gate aggregation",
    "truckload grain delivery",
  ],
} as const;
