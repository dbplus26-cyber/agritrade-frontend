/** Central route table — links never hardcode paths (dms-frontend convention). */
export const routes = {
  home: "/",
  about: "/about",
  contact: "/contact",
  commodities: "/commodities",
  land: "/land",
  farmingInvestment: "/farming-investment",
  farmingApply: "/farming-investment/apply",
  reviews: "/reviews",
  terms: "/terms",
  privacy: "/privacy",
  styleGuide: "/style-guide",
} as const;

/** The numbered primary nav, in board order. Services nest under 02. */
export const primaryNav = [
  { index: "01", label: "Home", href: routes.home },
  {
    index: "02",
    label: "Services",
    children: [
      { index: "01", label: "Commodities", href: routes.commodities },
      { index: "02", label: "Land", href: routes.land },
      { index: "03", label: "Farming Investment", href: routes.farmingInvestment },
    ],
  },
  { index: "03", label: "About", href: routes.about },
  { index: "04", label: "Reviews", href: routes.reviews },
  { index: "05", label: "Contact", href: routes.contact },
] as const;
