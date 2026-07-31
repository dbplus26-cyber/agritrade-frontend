/** Central route table — links never hardcode paths (dms-frontend convention). */
export const routes = {
  home: "/",
  about: "/about",
  contact: "/contact",
  commodities: "/commodities",
  /** One commodity's page, keyed by its (unique) name. */
  commodity: (slug: string) => `/commodities/${slug}`,
  land: "/land",
  /** One plot's page, keyed by its (unique) register reference. */
  plot: (slug: string) => `/land/${slug}`,
  farmingInvestment: "/farming-investment",
  farmingApply: "/farming-investment/apply",
  reviews: "/reviews",
  terms: "/terms",
  privacy: "/privacy",
  styleGuide: "/style-guide",
} as const;

/** The primary nav, in board order. Services nest under their own entry. */
export const primaryNav = [
  { label: "Home", href: routes.home },
  {
    label: "Services",
    children: [
      { label: "Commodities", href: routes.commodities },
      { label: "Land", href: routes.land },
      { label: "Farming Investment", href: routes.farmingInvestment },
    ],
  },
  { label: "About", href: routes.about },
  { label: "Reviews", href: routes.reviews },
  { label: "Contact", href: routes.contact },
] as const;
