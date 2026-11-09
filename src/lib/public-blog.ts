import { CACHE_TAGS } from "@/config/cache-tags";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type { IPaginationMeta } from "@/types/api";
import type { IBlogPost, IBlogTaxonomyWithCount } from "@/types/blog.types";

/**
 * Server-side reads of the published blog, cached under the `blog` tag (the
 * backend purges it on every post, category and tag write). A down API reads
 * as null so pages render their honest empty state instead of failing.
 */
const OPTS = { next: { revalidate: 3600, tags: [CACHE_TAGS.BLOG] } };
const BASE = `${env.SERVER_URI}/api/v1/public/blog`;

export const BLOG_PAGE_SIZE = 9;

export interface BlogListFilters {
  category?: string;
  featured?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  tag?: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, OPTS);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchBlogPosts(
  filters: BlogListFilters,
): Promise<{ meta: IPaginationMeta; posts: IBlogPost[] } | null> {
  const body = await getJson<{ data?: IBlogPost[]; meta?: IPaginationMeta }>(
    `${BASE}/posts${toQueryString(filters)}`,
  );
  return body?.data && body.meta ? { meta: body.meta, posts: body.data } : null;
}

export async function fetchBlogPost(slug: string): Promise<IBlogPost | null> {
  const body = await getJson<{ data?: { post?: IBlogPost } }>(
    `${BASE}/posts/${encodeURIComponent(slug)}`,
  );
  return body?.data?.post ?? null;
}

export async function fetchBlogTaxonomy(): Promise<{
  categories: IBlogTaxonomyWithCount[];
  tags: IBlogTaxonomyWithCount[];
}> {
  const [cats, tags] = await Promise.all([
    getJson<{ data?: { categories?: IBlogTaxonomyWithCount[] } }>(
      `${BASE}/categories`,
    ),
    getJson<{ data?: { tags?: IBlogTaxonomyWithCount[] } }>(`${BASE}/tags`),
  ]);
  return {
    categories: cats?.data?.categories ?? [],
    tags: tags?.data?.tags ?? [],
  };
}

/** Every published post's slug and date, for the sitemap. Walks the pages,
 * capped at 5,000 articles - far past anything this blog will hold. */
export async function fetchAllBlogSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  const out: { slug: string; updatedAt: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetchBlogPosts({ limit: 100, page });
    if (!res) break;
    out.push(
      ...res.posts.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
    );
    if (page >= res.meta.totalPages) break;
  }
  return out;
}

/** "12 March 2026", in the site's locale. */
export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}
