import Link from "next/link";
import { Search } from "lucide-react";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { IBlogTaxonomyWithCount } from "@/types/blog.types";

export interface BlogFilters {
  category?: string;
  search?: string;
  tag?: string;
}

/** /blog with the given filters (page dropped: a new filter starts at 1). */
export function blogHref(filters: BlogFilters): string {
  const sp = new URLSearchParams();
  if (filters.search) sp.set("search", filters.search);
  if (filters.category) sp.set("category", filters.category);
  if (filters.tag) sp.set("tag", filters.tag);
  const qs = sp.toString();
  return qs ? `${routes.blog}?${qs}` : routes.blog;
}

const chip =
  "inline-flex min-h-[36px] max-w-full items-center gap-1.5 rounded-[2px] border-[1.5px] px-3 py-1.5 text-[13px] font-semibold transition-colors [overflow-wrap:anywhere]";
const chipOn = "border-forest bg-forest text-paper";
const chipOff = "border-forest/35 text-forest hover:bg-forest/5";

/**
 * Search plus the category and tag filters. Plain links and a GET form, so
 * every filtered view is a shareable, crawlable URL and works without JS.
 */
export function BlogSidebar({
  categories,
  filters,
  tags,
}: {
  categories: IBlogTaxonomyWithCount[];
  filters: BlogFilters;
  tags: IBlogTaxonomyWithCount[];
}) {
  return (
    <aside className="flex min-w-0 flex-col gap-8">
      <form action={routes.blog} method="get" role="search">
        <label htmlFor="blog-search" className="mb-2 block">
          <StencilLabel className="text-[11px] tracking-[0.24em]">
            SEARCH
          </StencilLabel>
        </label>
        {filters.category ? (
          <input type="hidden" name="category" value={filters.category} />
        ) : null}
        {filters.tag ? (
          <input type="hidden" name="tag" value={filters.tag} />
        ) : null}
        <div className="flex min-w-0 border-[1.5px] border-soil/50 bg-paper focus-within:border-forest">
          <input
            id="blog-search"
            name="search"
            type="search"
            defaultValue={filters.search ?? ""}
            placeholder="Search articles"
            maxLength={200}
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[16px] text-ink outline-none placeholder:text-soil/70 sm:text-[14px]"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-forest hover:bg-forest/5"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </form>

      {categories.length > 0 ? (
        <nav aria-label="Categories">
          <StencilLabel className="mb-3 block text-[11px] tracking-[0.24em]">
            CATEGORIES
          </StencilLabel>
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={blogHref({ ...filters, category: undefined })}
                className={cn(chip, !filters.category ? chipOn : chipOff)}
                aria-current={!filters.category ? "page" : undefined}
              >
                All
              </Link>
            </li>
            {categories.map((c) => {
              const on = filters.category === c.slug;
              return (
                <li key={c.id} className="max-w-full">
                  <Link
                    href={blogHref({
                      ...filters,
                      category: on ? undefined : c.slug,
                    })}
                    className={cn(chip, on ? chipOn : chipOff)}
                    aria-current={on ? "page" : undefined}
                  >
                    {c.name}
                    <span className="text-[11px] font-medium opacity-75">
                      {c.postCount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {tags.length > 0 ? (
        <nav aria-label="Tags">
          <StencilLabel className="mb-3 block text-[11px] tracking-[0.24em]">
            TAGS
          </StencilLabel>
          <ul className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = filters.tag === t.slug;
              return (
                <li key={t.id} className="max-w-full">
                  <Link
                    href={blogHref({
                      ...filters,
                      tag: on ? undefined : t.slug,
                    })}
                    className={cn(chip, "font-medium", on ? chipOn : chipOff)}
                    aria-current={on ? "page" : undefined}
                  >
                    #{t.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </aside>
  );
}
