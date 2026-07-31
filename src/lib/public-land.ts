import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";

/**
 * The live plot register behind /land, fetched from the real backend under the
 * `land-plots` cache tag (same seam as public-commodities). The endpoint ships
 * with the backend's land module (M11) - until it exists the fetch reads as
 * unavailable and the page renders its empty register.
 *
 * Emptiness is honest BY DESIGN: no published plots (or the API down) renders
 * the "NO PLOTS ON FILE" ledger page, never stand-in listings.
 */

export type PublicPlotStatus = "AVAILABLE" | "RESERVED";

/**
 * Wire contract for the backend's public land-plots DTO (design doc 5.9):
 * published, non-sold plots only; `priceGhs` is a decimal string present
 * only when the owner shows that plot's price; ownership documents are
 * never part of this payload.
 */
export interface PublicLandPlot {
  /** The owner's own description; the card prints it in full. */
  description: string | null;
  id: string;
  /** Register code, e.g. "TML-014". */
  reference: string;
  /** Display title, e.g. "Kumbungu Road, Plot 14". */
  name: string;
  /** Free-text size convention, e.g. "100 × 100 ft". */
  sizeText: string;
  /** Intended use, e.g. "residential". */
  use: string | null;
  /** Decimal GHS (e.g. "45000.00"); null when the price stays off the site. */
  priceGhs: string | null;
  status: PublicPlotStatus;
  photo: string | null;
  photoAlt: string | null;
}

/** Fetches the published plots, or null when the API is unreachable. */
export async function fetchPublicLandPlots(): Promise<PublicLandPlot[] | null> {
  try {
    const res = await fetch(`${env.SERVER_URI}/api/v1/public/land-plots`, {
      next: { revalidate: 3600, tags: [CACHE_TAGS.LAND_PLOTS] },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { plots?: PublicLandPlot[] };
    };
    return body.data?.plots ?? null;
  } catch {
    return null;
  }
}
