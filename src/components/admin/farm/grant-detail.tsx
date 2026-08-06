"use client";

import Link from "next/link";
import {
  adminLinkClass,
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  SectionHeading,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";
import {
  grantDocumentUrl,
  useAddGrantDocumentMutation,
  useGetGrantQuery,
  useRemoveGrantDocumentMutation,
} from "@/redux/farm/grants-api";
import { avatarOf } from "@/lib/avatar";
import { FarmDocumentsSection, GrantApprovalBadge } from "./farm-bits";

const LIST = "/admin/grants";

const NotRecorded = () => <span className="text-adm-muted">Not recorded</span>;

export function GrantDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetGrantQuery(id);
  const [addDoc, addDocState] = useAddGrantDocumentMutation();
  const [removeDoc] = useRemoveGrantDocumentMutation();

  if (isLoading) return <DetailSkeleton facts={6} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const g = data.data.grant;
  const a = avatarOf(g.farmer.name);

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All grants" className="mb-2" />
      <AdminPageHeader
        title="Grant details"
        hint="Inputs advanced to one farmer, and the terms for getting them back."
        sub={`Recorded ${formatDateTime(g.createdAt)}`}
        actions={<GrantApprovalBadge status={g.approval?.status} />}
      />

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            {/* Who took what */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-2">Who took what</SectionHeading>
              <Link
                href={`/admin/farmers/${g.farmer.id}`}
                // The underline belongs to the NAME, not to the photo and the
                // phone number beside it, so the anchor lends its colour and
                // its focus ring and hands the rule to the child.
                className={cn(
                  adminLinkClass,
                  "group flex min-w-0 items-center gap-2.5 hover:no-underline",
                )}
              >
                {g.farmer.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                  <img
                    src={g.farmer.photoUrl}
                    alt={g.farmer.name}
                    className="h-10 w-10 flex-none rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-[13px] font-bold"
                    style={{ background: a.bg, color: a.fg }}
                  >
                    {a.init}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold underline-offset-2 group-hover:underline">
                    {g.farmer.name}
                  </div>
                  {[g.farmer.phone, g.farmer.community].filter(Boolean).length >
                  0 ? (
                    <div className="truncate text-[12px] text-adm-muted">
                      {[g.farmer.phone, g.farmer.community]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              </Link>
              <DetailGrid className="mt-3 border-t border-adm-hairline pt-1">
                {/* The grant's own number. It was the page heading; the
                    heading names the page now, so the record names itself. */}
                <DetailItem label="Grant no" mono strong>
                  {g.transactionNo}
                </DetailItem>
                {/* The item stays plain: the input-items register has no read
                    page, only an edit form. */}
                <DetailItem label="Item">
                  {g.item.name} · {g.quantity} {g.item.unitLabel}
                </DetailItem>
                <DetailItem label="Season">
                  <Link
                    className={adminLinkClass}
                    href={`/admin/seasons/${g.season.id}`}
                  >
                    {g.season.name}
                  </Link>
                </DetailItem>
                <DetailItem label="Granted">
                  {formatDateTime(g.grantedAt)}
                </DetailItem>
                <DetailItem label="Value" mono strong>
                  <Money value={g.valueGhs} />
                </DetailItem>
                <DetailItem label="Recorded">
                  {formatDateTime(g.createdAt)}
                </DetailItem>
                {g.notes ? (
                  <DetailItem
                    label="Notes"
                    className="sm:col-span-2 xl:col-span-3"
                  >
                    {g.notes}
                  </DetailItem>
                ) : null}
              </DetailGrid>
            </AdminCard>

            {/* Agreement */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">Agreement</SectionHeading>
              <p className="mb-1 text-[12px] text-adm-muted">
                The signed agreement is the binding record behind this grant.
                Never shown publicly; downloads are logged.
              </p>
              <DetailGrid>
                {/* Date first, terms full-width under it. Side by side, a
                    paragraph of terms stretched the row several lines deep
                    and left the date stranded at the top of its cell. */}
                <DetailItem label="Due date">
                  {g.dueDate ? formatDateOnly(g.dueDate) : <NotRecorded />}
                </DetailItem>
                <DetailItem full label="Agreed terms">
                  {g.agreedTerms ?? <NotRecorded />}
                </DetailItem>
              </DetailGrid>
              <div className="mt-2 border-t border-adm-hairline pt-1">
                <FarmDocumentsSection
                  documents={g.documents}
                  urlOf={(documentId) => grantDocumentUrl(g.id, documentId)}
                  addBusy={addDocState.isLoading}
                  onAdd={(file, name) =>
                    addDoc({ file, id: g.id, name }).unwrap()
                  }
                  onRemove={(documentId) =>
                    removeDoc({ documentId, id: g.id }).unwrap()
                  }
                  defaultName="Grant agreement"
                />
              </div>
            </AdminCard>
          </div>
        }
        aside={
          <div className="flex flex-col gap-4">
            {/* Grant value */}
            <AdminCard className="px-5 py-4">
              <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                <span className="min-w-0">Grant value</span>
                <HelpTip
                  label="What is Grant value?"
                  text="What the inputs handed to this farmer were worth, and so what they owe back on it."
                />
              </p>
              <p className="font-adminmono mt-1 text-[26px] font-bold text-adm-ink tabular-nums">
                <Money value={g.valueGhs} />
              </p>
              <p className="mt-1 text-[12.5px] text-adm-muted">
                Granted {formatDateTime(g.grantedAt)}
              </p>
            </AdminCard>

            {/* Season position */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">Season position</SectionHeading>
              <p className="mb-1 text-[12px] text-adm-muted">
                {g.farmer.name}&apos;s running balance for {g.season.name}.
              </p>
              <DetailGrid columns={2}>
                <DetailItem
                  hint="What the seed, fertiliser and tools this farmer took this season were worth."
                  label="Invested"
                  mono
                >
                  <Money value={g.seasonBalance.investedGhs} />
                </DetailItem>
                <DetailItem
                  hint="What this farmer has paid back so far, in produce or in cash."
                  label="Recovered"
                  mono
                >
                  <span className="text-console">
                    <Money value={g.seasonBalance.recoveredGhs} />
                  </span>
                </DetailItem>
                <DetailItem
                  hint="What this farmer still owes: what they took, less what they have paid back."
                  label="Outstanding"
                  mono
                  strong
                >
                  <Money value={g.seasonBalance.outstandingGhs} />
                </DetailItem>
              </DetailGrid>
            </AdminCard>
          </div>
        }
      />
    </div>
  );
}
