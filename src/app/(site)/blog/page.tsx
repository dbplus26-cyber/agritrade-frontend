import Link from "next/link";
import { BlogSidebar, blogHref } from "@/components/blog/blog-sidebar";
import { PostCard } from "@/components/blog/post-card";
import { RegisterPager } from "@/components/ui/RegisterPager";
import { Reveal } from "@/components/ui/Reveal";
import { StencilLabel } from "@/components/ui/StencilLabel";
import {
  BLOG_PAGE_SIZE,
  fetchBlogPosts,
  fetchBlogTaxonomy,
} from "@/lib/public-blog";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog - notes from the grain trade",
  description:
    "Market notes, farming advice and news from DB Plus in Tamale: grain prices, planting seasons, land and how we trade.",
  path: "/blog",
  keywords: [
    "DB Plus blog",
    "grain market news Ghana",
    "maize prices Tamale",
    "farming tips Northern Region",
  ],
});

const one = (v: string | string[] | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const filters = {
    category: one(sp.category),
    search: one(sp.search)?.slice(0, 200),
    tag: one(sp.tag),
  };
  const filtered = Boolean(filters.category || filters.search || filters.tag);

  // The lead story sits above the register on the unfiltered first page only.
  const showFeatured = !filtered && page === 1;
  const [list, featured, taxonomy] = await Promise.all([
    fetchBlogPosts({ ...filters, limit: BLOG_PAGE_SIZE, page }),
    showFeatured ? fetchBlogPosts({ featured: true, limit: 1 }) : null,
    fetchBlogTaxonomy(),
  ]);
  const lead = featured?.posts[0];
  const posts = (list?.posts ?? []).filter((p) => p.id !== lead?.id);
  const activeCategory = taxonomy.categories.find(
    (c) => c.slug === filters.category,
  );
  const activeTag = taxonomy.tags.find((t) => t.slug === filters.tag);

  return (
    <div className="texture-grain bg-surface">
      <section className="mx-auto max-w-[1312px] px-5 pb-8 pt-10 lg:px-8 lg:pb-12 lg:pt-20">
        <div className="max-w-[900px]">
          <StencilLabel className="mb-4 block text-[11px] tracking-[0.3em] lg:text-[12px]">
            BLOG · FIELD NOTES
          </StencilLabel>
          <h1 className="mb-4 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:text-[52px] lg:leading-[1.05]">
            Notes from the grain trade.
          </h1>
          <p className="max-w-[60ch] text-[14px] leading-[1.65] text-soil lg:text-[16px] lg:leading-[1.7]">
            Market notes, farming advice and news from the yard in Tamale.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1312px] gap-10 px-5 pb-16 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12 lg:px-8 lg:pb-24">
        {/* First in source so phones get search and topics before the
            register; the grid moves it to the right-hand rail from lg. */}
        <div className="min-w-0 lg:order-2">
          <BlogSidebar
            categories={taxonomy.categories}
            filters={filters}
            tags={taxonomy.tags}
          />
        </div>
        <div className="min-w-0 lg:order-1">
          {filtered ? (
            <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-dotted border-soil/40 pb-4">
              <p className="min-w-0 text-[14px] text-soil [overflow-wrap:anywhere]">
                {list?.meta.total ?? 0}{" "}
                {list?.meta.total === 1 ? "article" : "articles"}
                {filters.search ? ` matching "${filters.search}"` : ""}
                {activeCategory ? ` in ${activeCategory.name}` : ""}
                {activeTag ? ` tagged #${activeTag.name}` : ""}
              </p>
              <Link
                href={blogHref({})}
                className="text-[13px] font-bold text-forest underline decoration-harvest decoration-2 underline-offset-4 hover:text-harvest-deep"
              >
                Clear filters
              </Link>
            </div>
          ) : null}

          {lead ? (
            <div className="mb-10">
              <PostCard post={lead} featured />
            </div>
          ) : null}

          {posts.length === 0 && !lead ? (
            <p className="max-w-[52ch] border-t border-dotted border-soil/40 pt-6 text-[14px] leading-[1.65] text-soil lg:text-[15px]">
              {filtered
                ? "No articles match that yet. Try another word or clear the filters."
                : "No articles on file yet. The first ones are on their way."}
            </p>
          ) : (
            <Reveal>
              <div className="grid gap-8 sm:grid-cols-2 lg:gap-7 xl:grid-cols-3">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
              <RegisterPager
                basePath={blogHref(filters)}
                className="mt-9 lg:mt-11"
                label="Blog pages"
                page={page}
                totalPages={list?.meta.totalPages ?? 1}
              />
            </Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
