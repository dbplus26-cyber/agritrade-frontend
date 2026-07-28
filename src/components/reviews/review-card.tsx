import { DocCard } from "@/components/ui/DocCard";
import {
  REVIEW_ROLE_LABELS,
  type IPublicReview,
} from "@/types/public-review.types";
import { cn } from "@/lib/utils";

/** Accessible star row: one label for screen readers, glyphs hidden. */
function StarRow({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span
      role="img"
      aria-label={`${String(clamped)} out of 5`}
      className="flex items-center gap-[3px] text-[16px] leading-none"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          className={star <= clamped ? "text-harvest" : "text-soil/30"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/**
 * One review filed as a document: star row, the quote (clamped - the full
 * text is in the title tooltip), then the ledger footer with author, role,
 * date and the provenance mark. VERIFIED TRANSACTION means the office
 * matched it to a real receipt; ADMIN-source reviews were recorded by the
 * office itself.
 */
export function ReviewCard({
  review,
  className,
}: {
  review: IPublicReview;
  className?: string;
}) {
  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
  return (
    <DocCard
      tint="paper"
      className={cn("flex h-full flex-col px-5 pb-5 pt-5 sm:px-6", className)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <StarRow rating={review.rating} />
        {review.verified ? (
          <span className="stencil rounded-[2px] border border-leaf/55 px-2 py-1 text-[9px] leading-none tracking-[0.12em] text-forest">
            VERIFIED TRANSACTION ✓
          </span>
        ) : review.source === "ADMIN" ? (
          <span className="stencil rounded-[2px] border border-soil/40 px-2 py-1 text-[9px] leading-none tracking-[0.12em] text-soil">
            RECORDED BY DB PLUS
          </span>
        ) : null}
      </div>
      <blockquote
        title={review.text}
        className="mb-4 line-clamp-6 min-w-0 text-[14px] leading-[1.7] text-ink [overflow-wrap:anywhere]"
      >
        &ldquo;{review.text}&rdquo;
      </blockquote>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-dotted border-soil/40 pt-3">
        <span className="min-w-0 font-display text-[15px] font-bold text-forest [overflow-wrap:anywhere]">
          {review.authorName}
        </span>
        <span className="stencil text-[10px] tracking-[0.14em] text-harvest-deep">
          {REVIEW_ROLE_LABELS[review.role].toUpperCase()} · {date.toUpperCase()}
        </span>
      </div>
    </DocCard>
  );
}
