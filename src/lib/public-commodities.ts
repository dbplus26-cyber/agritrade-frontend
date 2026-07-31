import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import type { CommodityLine } from "@/static-data/availability";

/**
 * The live availability feed behind the plank board and the lot files, fetched
 * from the real backend under the `commodities` cache tag. The backend purges
 * the tag after every stock or register write (POST /api/revalidate), so the
 * 1-hour ISR window is only the backstop for a lost purge.
 *
 * Emptiness is honest BY DESIGN: nothing published (or the API down) returns
 * null and the board renders its designed empty state - never a stand-in list
 * that makes the warehouse look stocked when the register says otherwise.
 */

/** Mirrors the backend `PublicCommodityDTO`. */
export interface PublicCommodity {
  id: string;
  name: string;
  description: string | null;
  photo: string | null;
  variety: string | null;
  qualityGrade: string | null;
  available: boolean;
}

/** Fetches the published commodities, or null when the API is unreachable. */
export async function fetchPublicCommodities(): Promise<
  PublicCommodity[] | null
> {
  try {
    const res = await fetch(`${env.SERVER_URI}/api/v1/public/commodities`, {
      next: { revalidate: 3600, tags: [CACHE_TAGS.COMMODITIES] },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { commodities?: PublicCommodity[] };
    };
    return body.data?.commodities ?? null;
  } catch {
    return null;
  }
}

/**
 * Board lines from the live feed. Null (API down) or an empty publish list
 * returns [] - StockRegister renders its one honest empty line, never a
 * stand-in list.
 *
 * The context line under each name is the commodity's OWN variety and grade.
 * It used to prefer a hand-written line of market copy where the name matched
 * a launch commodity ("Main harvest from September"), which meant the site
 * could contradict the register: the office edits a commodity in the console
 * and the board keeps announcing something nobody typed.
 */
export function toBoardLines(
  commodities: PublicCommodity[] | null,
): CommodityLine[] {
  if (!commodities || commodities.length === 0) return [];
  return commodities.map((c) => ({
    name: c.name,
    available: c.available,
    meta:
      [c.variety, c.qualityGrade].filter(Boolean).join(" · ") ||
      "Call for today's position",
  }));
}

/**
 * A lot file on /commodities. Every field is the commodity's OWN record, as
 * the office keeps it in the console: name, variety, quality grade,
 * description, photo and whether it is available. Nothing else - the page used
 * to merge a bundle of hand-written "grades / season / sold as" copy over the
 * feed, so a reader was shown paragraphs about moisture readings and truckload
 * terms that nobody had entered anywhere and the office could not correct.
 */
export interface PublicLot {
  /** The commodity's API id - the stable render key. */
  id: string;
  name: string;
  /** Register position, e.g. "LOT-01". */
  lotNo: string;
  /** Uppercased name, used as the decorative ghost watermark. */
  ghost: string;
  variety: null | string;
  qualityGrade: null | string;
  description: null | string;
  photo: null | string;
  photoAlt: string;
  /** Contact prefill subject for the enquiry CTA. */
  subject: string;
  inStock: boolean;
}

/**
 * Lot files from the live feed, one per published commodity. API down or
 * nothing published returns [] - the page renders the empty register, not
 * stand-in files.
 */
export function toLots(commodities: PublicCommodity[] | null): PublicLot[] {
  if (!commodities || commodities.length === 0) return [];
  return commodities.map((c, i) => ({
    id: c.id,
    name: c.name,
    // Lot numbers follow the live feed's order, so they stay stable for a
    // given register and never collide.
    lotNo: `LOT-${String(i + 1).padStart(2, "0")}`,
    ghost: c.name.toUpperCase(),
    variety: c.variety,
    qualityGrade: c.qualityGrade,
    description: c.description,
    photo: c.photo,
    photoAlt: `${c.name} from the DB Plus warehouse`,
    subject: `${c.name} enquiry`,
    inStock: c.available,
  }));
}
