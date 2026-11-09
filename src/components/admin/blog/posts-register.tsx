"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { RecordCardGridSkeleton } from "@/components/admin/skeletons";
import { AdminButton, AdminPageHeader, ToneBadge } from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import {
  useGetBlogPostsQuery,
  useGetBlogTaxonomyQuery,
} from "@/redux/blog/blog-admin-api";
import type { IBlogPostListQuery } from "@/types/blog.types";

const LIST = "/admin/blog";
const FILTER_DEFAULTS = { status: "all", category: "all", size: "12" };
const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
] as const;

export function PostsRegister() {
  const router = useRouter();
  const {
    page,
    setPage,
    filters,
    setFilter,
    resetFilters,
    search: searchInput,
    setSearch,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });
  const { data: categories } = useGetBlogTaxonomyQuery("categories");
  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "All" },
      ...(categories ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const search = (queryParams.search as string | undefined) ?? "";
  const { status, category } = filters;
  const pageSize = Number(filters.size) || 12;
  const queryArgs = useMemo<IBlogPostListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as "draft" | "published" } : {}),
      ...(category !== "all" ? { categoryId: category } : {}),
    }),
    [page, pageSize, search, status, category],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetBlogPostsQuery(queryArgs);
  const posts = data?.data ?? [];
  const meta = data?.meta;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (category !== "all" ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  const pristine = !isLoading && !isError && posts.length === 0 && !filtered;

  return (
    <div>
      <AdminPageHeader
        title="Blog posts"
        sub="Articles on the public website's blog - drafts, published and featured"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search title or summary…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={meta?.total ?? 0}
          noun="posts"
          action={
            <AdminButton asChild aria-label="New post">
              <Link href={`${LIST}/new`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New post</span>
              </Link>
            </AdminButton>
          }
          panelClassName="sm:grid-cols-2"
          chips={
            activeFilterCount === 0 ? undefined : (
              <>
                {status !== "all" ? (
                  <FilterChip onRemove={() => setFilter("status", "all")}>
                    Status: {labelOf(STATUS_OPTIONS, status)}
                  </FilterChip>
                ) : null}
                {category !== "all" ? (
                  <FilterChip onRemove={() => setFilter("category", "all")}>
                    Category: {labelOf(categoryOptions, category)}
                  </FilterChip>
                ) : null}
              </>
            )
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_OPTIONS}
            active={status !== "all"}
          />
          <ConsoleLabeledSelect
            label="Category"
            value={category}
            onChange={(v) => setFilter("category", v)}
            options={categoryOptions}
            active={category !== "all"}
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <RecordCardGridSkeleton cards={6} media />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : posts.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="posts"
          description="Write the first article for the website's blog."
          actionLabel="Write your first post"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`${LIST}/${p.id}`}
              className="flex min-w-0 flex-col overflow-hidden rounded-none border border-adm-line bg-adm-card shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-adm-strong"
            >
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                <img
                  src={p.coverImage}
                  alt=""
                  className="h-[130px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[130px] w-full items-center justify-center bg-adm-sunken text-[11px] text-adm-faint">
                  No cover
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col px-4 py-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <ToneBadge tone={p.isPublished ? "leaf" : "slate"}>
                    {p.isPublished ? "Published" : "Draft"}
                  </ToneBadge>
                  {p.isFeatured ? (
                    <ToneBadge tone="harvest">Featured</ToneBadge>
                  ) : null}
                </div>
                <div
                  title={p.title}
                  className="min-w-0 line-clamp-2 text-[13px] font-semibold text-adm-ink [overflow-wrap:anywhere]"
                >
                  {p.title}
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-2 text-[11px] text-adm-muted">
                  <span className="min-w-0 line-clamp-1 [overflow-wrap:anywhere]">
                    {p.category?.name ?? "No category"}
                  </span>
                  <span>
                    {p.isPublished
                      ? formatDateOnly(p.publishedAt)
                      : `Edited ${formatDateOnly(p.updatedAt)}`}{" "}
                    · {p.commentCount} comments
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="mt-4">
          <ListPagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
