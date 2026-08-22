/**
 * The shape of one line on the availability register, plus a small sample set
 * for the style guide.
 *
 * The live site NEVER reads the sample: the register is built from the
 * published commodities in `lib/public-commodities`, and each line is
 * described by its own variety and grade. Nothing on a line may be
 * hand-written here - copy the console cannot reach is copy the office cannot
 * correct.
 *
 * A commodity never disappears from the register; it degrades from
 * "AVAILABLE NOW" to "ASK US".
 */
export interface CommodityLine {
  name: string;
  available: boolean;
  /** One line of market context shown under the name on desktop planks. */
  meta: string;
  /**
   * URL key for the commodity's page. Present on every live line; the sample
   * set below leaves it out, so the style guide renders a plain row rather
   * than a link to a commodity that does not exist.
   */
  slug?: string;
}

export const availabilityBoard: CommodityLine[] = [
  { name: "Maize", available: true, meta: "Main harvest from September" },
  { name: "Soya beans", available: true, meta: "Aggregating through December" },
  { name: "Groundnuts", available: false, meta: "Sourced against firm orders" },
];

/** The districts DB Plus buys across, listed on the About page. */
export const sourcingDistricts = [
  "Tamale Metro",
  "Savelugu",
  "Kumbungu",
  "Tolon",
  "Mion",
  "Yendi",
  "Karaga",
  "Gushegu",
] as const;
