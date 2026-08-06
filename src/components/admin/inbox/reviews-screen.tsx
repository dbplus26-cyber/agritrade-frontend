"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  Mono,
  ToneBadge,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardGridSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { REVIEW_MAX_CHARS, REVIEWER_NAME_MAX } from "@/lib/limits";
import { cn } from "@/lib/utils";
import {
  useCreateAdminReviewMutation,
  useDeleteReviewMutation,
  useGetAdminReviewsQuery,
  useGetReviewStatsQuery,
  usePublishReviewMutation,
  useRejectReviewMutation,
} from "@/redux/reviews/reviews-api";
import {
  REVIEW_STATUSES,
  type IAdminReview,
  type IReviewListQuery,
  type ReviewStatus,
} from "@/types/inbox.types";
import {
  REVIEW_ROLES,
  REVIEW_ROLE_LABELS,
  type ReviewRole,
} from "@/types/public-review.types";
import {
  adminReviewSchema,
  type AdminReviewValues,
} from "@/validations/inbox-schema";
import { InboxStatTile, REVIEW_STATUS_META, StarRow } from "./inbox-bits";

const FILTER_DEFAULTS = { status: "PENDING", role: "all" };
const PAGE_SIZE = 12;

/** Text longer than this gets the clamp + "Show more" toggle. */
const CLAMP_AT = 220;

const ROLE_OPTIONS = [
  { value: "all", label: "All roles" },
  ...REVIEW_ROLES.map((r) => ({ value: r, label: REVIEW_ROLE_LABELS[r] })),
];

function ReviewStats() {
  const { data } = useGetReviewStatsQuery();
  const stats = data?.data;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <InboxStatTile
        label="Total"
        hint="Every review customers have left, whatever you decided about it."
        value={stats?.total}
      />
      <InboxStatTile
        label="Pending"
        hint="Reviews waiting on you to decide whether they go on the website."
        value={stats?.pending}
      />
      <InboxStatTile
        label="Published"
        hint="Reviews live on the public website for customers to read."
        value={stats?.published}
      />
      <InboxStatTile
        label="Rejected"
        hint="Reviews you turned down, kept on file but never shown publicly."
        value={stats?.rejected}
      />
    </div>
  );
}

/** One moderation card: provenance, the words, then the decision. */
function ReviewModCard({
  review,
  canDelete,
  busy,
  onPublish,
  onReject,
  onDelete,
}: {
  review: IAdminReview;
  canDelete: boolean;
  /** True while any decision is in flight - keeps double-clicks out. */
  busy: boolean;
  onPublish: (review: IAdminReview) => void;
  onReject: (review: IAdminReview) => void;
  onDelete: (review: IAdminReview) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = review.status === "PENDING";
  const clampable = review.text.length > CLAMP_AT;

  return (
    <AdminCard className="flex h-full flex-col px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <StarRow rating={review.rating} />
        {review.verified ? (
          <ToneBadge tone="leaf">Verified transaction</ToneBadge>
        ) : review.source === "ADMIN" ? (
          <ToneBadge tone="slate">Recorded by us</ToneBadge>
        ) : null}
      </div>

      <blockquote
        className={cn(
          "mt-3 min-w-0 text-[13.5px] leading-[1.7] text-adm-ink [overflow-wrap:anywhere]",
          clampable && !expanded && "line-clamp-4",
        )}
      >
        &ldquo;{review.text}&rdquo;
      </blockquote>
      {clampable ? (
        <button
          type="button"
          onClick={() => {
            setExpanded((e) => !e);
          }}
          className="mt-1 self-start cursor-pointer text-[12px] font-semibold text-console hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}

      <div className="mt-auto pt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-dotted border-adm-line pt-3">
          <span className="min-w-0 text-[13.5px] font-bold text-adm-ink [overflow-wrap:anywhere]">
            {review.authorName}
          </span>
          <ToneBadge tone="sky">{REVIEW_ROLE_LABELS[review.role]}</ToneBadge>
          <span className="ml-auto text-[12px] whitespace-nowrap text-adm-muted">
            {formatDateTime(review.createdAt)}
          </span>
        </div>
        {review.transactionNo ? (
          <Mono className="mt-1.5 block text-[11.5px] text-adm-muted/80">
            {review.transactionNo}
          </Mono>
        ) : null}

        {isPending || canDelete ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isPending ? (
              <>
                <AdminButton
                  type="button"
                  variant="gold"
                  disabled={busy}
                  onClick={() => {
                    onPublish(review);
                  }}
                  className="h-8 px-3.5 text-[12.5px]"
                >
                  Publish
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    onReject(review);
                  }}
                  className="h-8 px-3.5 text-[12.5px]"
                >
                  Reject
                </AdminButton>
              </>
            ) : null}
            {canDelete ? (
              <AdminButton
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  onDelete(review);
                }}
                className="ml-auto h-8 px-2.5 text-[12.5px] text-console-red hover:text-console-red"
              >
                Delete
              </AdminButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminCard>
  );
}

/** "+ Add review" - a review the office took by phone or on paper. */
function AddReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createReview, { isLoading }] = useCreateAdminReviewMutation();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminReviewValues>({
    resolver: zodResolver(adminReviewSchema),
    defaultValues: { authorName: "", role: "CUSTOMER", rating: 0, text: "" },
  });

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) reset();
  };

  const onSubmit = async (values: AdminReviewValues) => {
    try {
      await createReview({
        authorName: values.authorName.trim(),
        rating: values.rating,
        text: values.text.trim(),
        role: values.role,
      }).unwrap();
      notify.success("Review recorded", {
        description: "It is published on the website immediately.",
      });
      close(false);
    } catch (err) {
      notify.error("Couldn't record the review", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Record a review</DialogTitle>
          <DialogDescription>
            For reviews taken by phone or on paper. It publishes immediately,
            marked as recorded by the office - never as verified.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField
            label="Reviewer's name"
            error={errors.authorName?.message}
          >
            <input
              maxLength={REVIEWER_NAME_MAX}
              placeholder="e.g. Amina Alhassan"
              className={cn(
                adminInputClass,
                errors.authorName && "border-console-red",
              )}
              {...register("authorName")}
            />
          </AdminField>
          <AdminField
            label="They dealt with us as"
            error={errors.role?.message}
          >
            <select className={adminSelectClass} {...register("role")}>
              {REVIEW_ROLES.map((r) => (
                <option key={r} value={r}>
                  {REVIEW_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Rating" error={errors.rating?.message}>
            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label="Rating"
                  aria-invalid={Boolean(errors.rating) || undefined}
                  className="flex items-center gap-1"
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <label key={star} className="cursor-pointer">
                      <input
                        type="radio"
                        name="admin-review-rating"
                        value={star}
                        checked={field.value === star}
                        onChange={() => {
                          field.onChange(star);
                        }}
                        aria-label={`${String(star)} star${star > 1 ? "s" : ""}`}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block px-0.5 text-[26px] leading-none transition-colors peer-focus-visible:rounded-[6px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf",
                          star <= field.value ? "text-console-gold" : "text-adm-faint",
                        )}
                      >
                        ★
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
          </AdminField>
          <AdminField label="Their words" error={errors.text?.message}>
            <textarea
              rows={4}
              maxLength={REVIEW_MAX_CHARS}
              placeholder="What they said, as close to their words as possible."
              className={cn(
                adminInputClass,
                "h-auto min-h-[112px] w-full resize-y py-2",
                errors.text && "border-console-red",
              )}
              {...register("text")}
            />
          </AdminField>
          <DialogFooter className="mt-1 gap-2">
            <AdminButton
              type="button"
              variant="outline"
              onClick={() => {
                close(false);
              }}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading}>
              {isLoading ? "Recording…" : "Record review"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** /admin/reviews - the moderation queue for website reviews. */
export function ReviewsScreen() {
  const { isSuperAdmin } = useAuthRole();
  const { confirm, confirmationDialog } = useConfirm();
  const [adding, setAdding] = useState(false);
  const {
    page,
    search: searchInput,
    filters,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });
  const search = (queryParams.search as string | undefined) ?? "";

  const [publishReview, publishState] = usePublishReviewMutation();
  const [rejectReview, rejectState] = useRejectReviewMutation();
  const [deleteReview, deleteState] = useDeleteReviewMutation();
  const busy =
    publishState.isLoading || rejectState.isLoading || deleteState.isLoading;

  const queryArgs = useMemo<IReviewListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: filters.status as ReviewStatus,
      ...(filters.role !== "all" ? { role: filters.role as ReviewRole } : {}),
      ...(search ? { search } : {}),
    }),
    [page, filters.status, filters.role, search],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAdminReviewsQuery(queryArgs);
  // Same cache entry as the ReviewStats tiles - RTK Query dedupes the hook.
  const { data: statsData } = useGetReviewStatsQuery();
  const reviews = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const isPendingView = filters.status === "PENDING";
  const activeFilterCount = filters.role !== "all" ? 1 : 0;
  // A register with nothing on file and nothing narrowing it shows ONLY the
  // empty state. The status tabs are navigation, not filters, so pristine
  // additionally requires the WHOLE register to be empty (stats total 0) -
  // an empty Pending tab must not hide the way to a populated Published tab.
  const pristine =
    !isLoading &&
    !isError &&
    reviews.length === 0 &&
    !search &&
    activeFilterCount === 0 &&
    statsData?.data.total === 0;

  const onPublish = async (review: IAdminReview) => {
    try {
      await publishReview(review.id).unwrap();
      notify.success("Review published", {
        description: `${review.authorName}'s review is now on the website.`,
      });
    } catch (err) {
      notify.error("Couldn't publish the review", {
        description: extractApiError(err).message,
      });
    }
  };

  const onReject = async (review: IAdminReview) => {
    const confirmed = await confirm({
      title: "Reject this review?",
      description: `${review.authorName}'s review will not appear on the website. You can still publish it later from the Rejected tab.`,
      confirmText: "Reject review",
    });
    if (!confirmed) return;
    try {
      await rejectReview(review.id).unwrap();
      notify.success("Review rejected");
    } catch (err) {
      notify.error("Couldn't reject the review", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async (review: IAdminReview) => {
    const confirmed = await confirm({
      title: "Delete this review?",
      description: `${review.authorName}'s review will be removed permanently. This cannot be undone.`,
      confirmText: "Delete review",
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteReview(review.id).unwrap();
      notify.success("Review deleted");
    } catch (err) {
      notify.error("Couldn't delete the review", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Reviews"
        hint="Customer reviews waiting to be published or already live."
        sub="Moderate what the website shows the world"
      />

      {pristine ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No reviews yet"
            description="Reviews submitted on the website land here for a decision - or record one the office took by phone or on paper."
            actionLabel="+ Add review"
            onAction={() => {
              setAdding(true);
            }}
          />
        </AdminCard>
      ) : (
        <>
          <ReviewStats />

          {/* Status tabs - the default is what needs deciding. */}
          <div className="mb-4 flex gap-1.5">
            {REVIEW_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter("status", value);
                }}
                aria-pressed={filters.status === value}
                className={cn(
                  "cursor-pointer rounded-[6px] border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  filters.status === value
                    ? "border-console bg-console text-white"
                    : "border-adm-line bg-adm-card text-adm-muted hover:border-console/60",
                )}
              >
                {REVIEW_STATUS_META[value].label}
              </button>
            ))}
          </div>

          <ConsoleFilterBar
            search={searchInput}
            onSearch={setSearch}
            searchPlaceholder="Search name or words…"
            activeCount={activeFilterCount}
            onClear={resetFilters}
            action={
              <AdminButton
                className="h-8 px-3.5 text-[13px]"
                onClick={() => {
                  setAdding(true);
                }}
              >
                + Add review
              </AdminButton>
            }
          >
            <ConsoleLabeledSelect
              label="Role"
              value={filters.role}
              onChange={(v) => {
                setFilter("role", v);
              }}
              options={ROLE_OPTIONS}
              active={filters.role !== "all"}
              className="lg:w-[160px]"
            />
          </ConsoleFilterBar>

          {isLoading ? (
            <CardGridSkeleton />
          ) : isError ? (
            <ErrorMessage
              description={extractApiError(error).message}
              onRetry={() => void refetch()}
            />
          ) : reviews.length === 0 ? (
            <AdminCard className="overflow-hidden">
              {search || activeFilterCount > 0 ? (
                <EmptyState
                  variant="plain"
                  title="No matching reviews"
                  description="Nothing matches this search and filter combination."
                  actionLabel="Clear search & filters"
                  onAction={() => {
                    setSearch("");
                    resetFilters();
                  }}
                />
              ) : (
                <EmptyState
                  variant="plain"
                  title={
                    isPendingView
                      ? "Nothing waiting for moderation"
                      : filters.status === "PUBLISHED"
                        ? "Nothing published yet"
                        : "Nothing rejected"
                  }
                  description={
                    isPendingView
                      ? "Reviews submitted on the website land here for a decision."
                      : filters.status === "PUBLISHED"
                        ? "Publish a pending review or record one the office received."
                        : "Reviews you turn down are kept here, out of sight."
                  }
                />
              )}
            </AdminCard>
          ) : (
            <>
              <div
                className={cn(
                  "grid gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
                  isFetching && "pointer-events-none opacity-60",
                )}
                aria-busy={isFetching || undefined}
              >
                {reviews.map((review) => (
                  <ReviewModCard
                    key={review.id}
                    review={review}
                    canDelete={isSuperAdmin}
                    busy={busy}
                    onPublish={(r) => void onPublish(r)}
                    onReject={(r) => void onReject(r)}
                    onDelete={(r) => void onDelete(r)}
                  />
                ))}
              </div>
              <ListPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="mt-4"
              />
            </>
          )}
        </>
      )}

      <AddReviewDialog open={adding} onOpenChange={setAdding} />
      {confirmationDialog}
    </div>
  );
}
