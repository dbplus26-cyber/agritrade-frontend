import { routes } from "@/lib/routes";

/**
 * Central site config - canonical URL, brand strings, and SEO defaults.
 *
 * The base URL comes from `NEXT_PUBLIC_BASE_URL`, centralised here
 * (khadys-kitchen convention) so nothing redeclares origins. Trailing slash is
 * stripped so `${siteUrl}/path` is always safe.
 */

// NEXT_PUBLIC_BASE_URL is the source of truth and should be set in
// production: it lands in every canonical, OG url and sitemap entry.
//
// The fallback is the business's REAL domain - dbplus.org is registered and
// live, so a deploy that forgets the env var still stamps its own SEO
// surface rather than a deployment-specific *.vercel.app host that crawlers
// cannot reach through deployment protection. (An earlier guessed-domain
// fallback was removed while no domain was confirmed; this one is confirmed.)
export const siteUrl = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://dbplus.org"
).replace(/\/$/, "");

export const siteConfig = {
  name: "DB Plus",
  legalName: "DB Plus Trading Ltd",
  shortName: "DB Plus",
  /** Full home-page title (the layout template's `default`). */
  title: "DB Plus · Bulk grain trading from Tamale, Ghana",
  description:
    "Maize, soya beans and groundnuts bought at the farm gate across Ghana's Northern Region - weighed honestly, aggregated in Tamale and trucked south by the load.",
  locale: "en_GH",
  /**
   * Contact details are OWNER DATA, not code: the live values come from the
   * backend settings block and are merged over these in `public-contact.ts`.
   * These stand in only while the settings block is blank or unreachable.
   */
  phone: "0244961887",
  whatsapp: "0244961887",
  email: "firstfastcom@gmail.com",
  /**
   * Where the call/WhatsApp links point while no number is configured: the
   * contact page, never a `tel:`/`wa.me` that dials nobody.
   */
  phoneHref: routes.contact,
  whatsappHref: routes.contact,
  /**
   * The company's social profiles, shown as icons in the footer.
   *
   * These live in code rather than the settings registry on purpose: a
   * profile URL is set once and effectively never changes, unlike the phone
   * line. A BLANK entry renders NO icon at all, never a link to a profile
   * that does not exist.
   *
   * BLANK until each handle is confirmed to belong to DB Plus. They were
   * guessed from the trading name and never verified, so shipping them meant
   * the company footer might link customers to a stranger's page - and a
   * wrong social link is harder to notice, and does more damage, than a
   * missing one. Fill in each URL as the owner confirms it.
   */
  social: {
    facebook: "",
    instagram: "",
    tiktok: "",
  },
  address: "Aboabu Super Market",
  hours: "Mon – Sat 7:00 – 17:00 · Sunday closed",
  city: "Tamale",
  country: "Ghana",
  /** Viridian forest - theme-color and the OG image field. */
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
