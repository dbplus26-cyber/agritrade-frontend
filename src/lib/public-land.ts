import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import { slugify } from "@/lib/slug";

/**
 * The live plot register behind /land, fetched from the real backend under the
 * `land-plots` cache tag (same seam as public-commodities). The endpoint ships
 * with the backend's land module - until it exists the fetch reads as
 * unavailable and the page renders its empty register.
 *
 * Emptiness is honest BY DESIGN: no published plots (or the API down) renders
 * the "NO PLOTS ON FILE" ledger page, never stand-in listings.
 */

export type PublicPlotStatus = "AVAILABLE" | "RESERVED";

/**
 * Wire contract for the backend's public land-plots DTO: published,
 * non-sold plots only; `priceGhs` is a decimal string present
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
  /**
   * Every published photo of the plot, in register order - a buyer judging
   * land wants the frontage, the access road and the survey pillar. `photo`
   * is simply the first of these, kept for the summary cards.
   */
  photos?: { alt: string | null; url: string }[];
}

/** URL key for a plot's page: its register reference, e.g. "tml-014". */
export function plotSlug(plot: PublicLandPlot): string {
  return slugify(plot.reference);
}

/**
 * A plot's photos in register order, cover-photo fallback included. Lives in
 * this lib (not a component file) because both server pages (the plot detail)
 * and the client register grid read it - a client module cannot export a
 * plain function to a server component.
 */
export function plotPhotos(
  plot: PublicLandPlot,
): { alt: null | string; url: string }[] {
  if (plot.photos?.length) {
    return plot.photos.map((photo) => ({ alt: photo.alt ?? null, url: photo.url }));
  }
  return plot.photo ? [{ alt: plot.photoAlt, url: plot.photo }] : [];
}

/** The backend's list meta - mirrors `buildPaginationMeta`. */
export interface PublicListMeta {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
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

/**
 * One SERVER page of the published plots, with the register-wide meta. The
 * /land pager follows this rather than slicing a full download client-side,
 * so the page holds whatever the register grows to.
 */
export async function fetchPublicLandPlotsPage(window: {
  limit: number;
  page: number;
}): Promise<{ meta: PublicListMeta; plots: PublicLandPlot[] } | null> {
  try {
    const res = await fetch(
      `${env.SERVER_URI}/api/v1/public/land-plots?page=${String(window.page)}&limit=${String(window.limit)}`,
      { next: { revalidate: 3600, tags: [CACHE_TAGS.LAND_PLOTS] } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { plots?: PublicLandPlot[] };
      meta?: PublicListMeta;
    };
    if (!body.data?.plots || !body.meta) return null;
    return { meta: body.meta, plots: body.data.plots };
  } catch {
    return null;
  }
}
