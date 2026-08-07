import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import type {
  IPublicReview,
  IPublicReviewListResponse,
} from "@/types/public-review.types";

/**
 * Published customer reviews, fetched from the real backend under the
 * `reviews` cache tag (purged when the office approves or removes a review;
 * the 5-minute ISR window is the backstop for a lost purge - the backend
 * also caches this endpoint ~60s on its side).
 *
 * Emptiness is honest BY DESIGN: no approved reviews (or the API down)
 * returns null and the band simply doesn't render - never stand-in
 * testimonials.
 */
export async function fetchPublicReviews(
  limit = 50,
): Promise<IPublicReview[] | null> {
  try {
    const res = await fetch(
      `${env.SERVER_URI}/api/v1/public/reviews?limit=${String(limit)}`,
      { next: { revalidate: 300, tags: [CACHE_TAGS.REVIEWS] } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Partial<IPublicReviewListResponse["data"]>;
    };
    return body.data?.reviews ?? null;
  } catch {
    return null;
  }
}

/** The backend's list meta - mirrors `buildPaginationMeta`. */
export interface PublicListMeta {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

/**
 * One SERVER page of the published reviews (the newest-50 register), with the
 * register-wide meta. The reviews page's pager follows this rather than
 * rendering the whole register in one column - same opt-in contract as the
 * commodity and land feeds.
 */
export async function fetchPublicReviewsPage(window: {
  limit: number;
  page: number;
}): Promise<{ meta: PublicListMeta; reviews: IPublicReview[] } | null> {
  try {
    const res = await fetch(
      `${env.SERVER_URI}/api/v1/public/reviews?page=${String(window.page)}&limit=${String(window.limit)}`,
      { next: { revalidate: 300, tags: [CACHE_TAGS.REVIEWS] } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Partial<IPublicReviewListResponse["data"]>;
      meta?: PublicListMeta;
    };
    if (!body.data?.reviews || !body.meta) return null;
    return { meta: body.meta, reviews: body.data.reviews };
  } catch {
    return null;
  }
}
