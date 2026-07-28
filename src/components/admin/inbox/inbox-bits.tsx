import { AdminCard, Mono, ToneBadge, type Tone } from "@/components/admin/ui";
import { Absent } from "@/components/admin/registry/registry-bits";
import type {
  EnquiryStatus,
  FarmApplicationStatus,
  ReviewStatus,
} from "@/types/inbox.types";

/**
 * Shared bits for the website-inbox screens (enquiries, reviews, farm
 * applications): status label/tone maps, their badges, and the headline
 * stat tile in the sales-register idiom.
 */

export const ENQUIRY_STATUS_META: Record<
  EnquiryStatus,
  { label: string; tone: Tone }
> = {
  NEW: { label: "New", tone: "harvest" },
  IN_PROGRESS: { label: "In progress", tone: "sky" },
  RESOLVED: { label: "Resolved", tone: "leaf" },
};

export function EnquiryStatusBadge({ status }: { status: EnquiryStatus }) {
  const meta = ENQUIRY_STATUS_META[status];
  return <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>;
}

export const REVIEW_STATUS_META: Record<
  ReviewStatus,
  { label: string; tone: Tone }
> = {
  PENDING: { label: "Pending", tone: "harvest" },
  PUBLISHED: { label: "Published", tone: "leaf" },
  REJECTED: { label: "Rejected", tone: "slate" },
};

export const FARM_APPLICATION_STATUS_META: Record<
  FarmApplicationStatus,
  { label: string; tone: Tone }
> = {
  NEW: { label: "New", tone: "harvest" },
  REVIEWING: { label: "Reviewing", tone: "sky" },
  APPROVED: { label: "Approved", tone: "leaf" },
  REJECTED: { label: "Rejected", tone: "slate" },
  CONVERTED: { label: "Converted", tone: "forest" },
};

export function FarmApplicationStatusBadge({
  status,
}: {
  status: FarmApplicationStatus;
}) {
  const meta = FARM_APPLICATION_STATUS_META[status];
  return <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>;
}

/** A headline stat tile; the value stays absent until the stats land. */
export function InboxStatTile({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-bold text-ink">
        {value === undefined ? <Absent /> : <Mono>{value}</Mono>}
      </div>
    </AdminCard>
  );
}

/** Accessible star row for the moderation cards (public review-card idiom). */
export function StarRow({ rating }: { rating: number }) {
  const clamped = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span
      role="img"
      aria-label={`${String(clamped)} out of 5`}
      className="flex items-center gap-[3px] text-[15px] leading-none"
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
