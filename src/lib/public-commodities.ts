import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import {
  availabilityBoard,
  commodityLots,
  type CommodityLine,
  type CommodityLot,
} from "@/static-data/availability";

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

const byName = <T extends { name: string }>(items: T[]) =>
  new Map(items.map((item) => [item.name.trim().toLowerCase(), item]));

/**
 * Board lines from the live feed, keeping the static market-context copy
 * where names match. Null (API down) or an empty publish list returns [] -
 * PlankRows renders its designed empty plank, never a stand-in list.
 */
export function toBoardLines(
  commodities: PublicCommodity[] | null,
): CommodityLine[] {
  if (!commodities || commodities.length === 0) return [];
  const staticByName = byName<CommodityLine>(availabilityBoard);
  return commodities.map((c) => {
    const known = staticByName.get(c.name.trim().toLowerCase());
    return {
      name: c.name,
      available: c.available,
      meta:
        known?.meta ??
        ([c.variety, c.qualityGrade].filter(Boolean).join(" · ") ||
          "Call for today's position"),
    };
  });
}

/** A lot file merged from the live feed and the static rich content. */
export interface MergedLot extends Omit<CommodityLot, "photo" | "boardName"> {
  /** The commodity's API id - the stable render key. */
  id: string;
  photo: string | null;
  inStock: boolean;
}

/**
 * Lot files from the live feed: API commodities matched to the static lot
 * content by name keep their rich copy and photography; API-only commodities
 * render from their own fields (photo included when present). API down or
 * nothing published returns [] - the page renders the empty register, not
 * stand-in files.
 */
export function toLots(commodities: PublicCommodity[] | null): MergedLot[] {
  if (!commodities || commodities.length === 0) return [];

  const lotByName = byName<CommodityLot>(
    commodityLots.map((l) => ({ ...l, name: l.name })),
  );
  return commodities.map((c, i) => {
    // Lot numbers follow the live feed's order for every entry - mixing the
    // static files' own numbering with generated ones can collide (two
    // LOT-02s) once the register grows past the launch commodities.
    const lotNo = `LOT-${String(i + 1).padStart(2, "0")}`;
    const known = lotByName.get(c.name.trim().toLowerCase());
    if (known) {
      return {
        ...known,
        id: c.id,
        lotNo,
        photo: c.photo ?? known.photo,
        inStock: c.available,
      };
    }
    return {
      id: c.id,
      name: c.name,
      lotNo,
      ghost: c.name.toUpperCase(),
      grades:
        [c.variety, c.qualityGrade].filter(Boolean).join(", ") ||
        "Graded to trade standard - call for the current specification",
      season: c.description ?? "Ask for the current position",
      soldAs: "Full truckloads, bagged and weighed over a certified scale",
      photo: c.photo,
      photoAlt: `${c.name} from the DB Plus warehouse`,
      subject: `${c.name} enquiry`,
      inStock: c.available,
    };
  });
}
