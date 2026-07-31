/**
 * The shape of one line on the availability register, plus a small sample set
 * for the style guide.
 *
 * The live site NEVER reads the sample: the register is built from the
 * published commodities in `lib/public-commodities`, and each line is
 * described by its own variety and grade. The hand-written lot files that used
 * to live here - "grades", "season", "sold as" - were merged over the feed and
 * put paragraphs on the page that nobody had entered in the console and the
 * office could not correct, so they are gone.
 *
 * Design rule: a commodity never disappears from the register; it degrades
 * from "AVAILABLE NOW" to "ASK US".
 */
export interface CommodityLine {
  name: string;
  available: boolean;
  /** One line of market context shown under the name on desktop planks. */
  meta: string;
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
