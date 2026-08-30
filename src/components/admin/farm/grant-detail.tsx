"use client";

import Link from "next/link";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  DetailHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  SectionHeading,
} from "@/components/admin/ui";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
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
import { ViewablePhoto } from "@/components/admin/photo-view";
import { FarmDocumentsSection, GrantApprovalBadge } from "./farm-bits";
import { FarmCashSourceNote } from "./farm-cash-source";

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

  return (
    <div className="max-w-[1120px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Grants", href: LIST }]}
        current="Grant details"
      >
        <DetailHeader
          title="Grant details"
          hint="Inputs advanced to one farmer, and the terms for getting them back."
          sub={`Recorded ${formatDateTime(g.createdAt)}`}
          badges={<GrantApprovalBadge status={g.approval?.status} />}
          actions={
            <AdminButton variant="outline" asChild>
              <a
                href={receiptPdfUrl("grant", g.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </AdminButton>
          }
        />
      </DetailNav>

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            {/* Who took what */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-2">Who took what</SectionHeading>
              {/* The photo sits BESIDE the link, not inside it: a
                  ViewablePhoto is a button when there is something to open,
                  and a button nested in an anchor is invalid markup.
                  Keeping them siblings also keeps the underline on the NAME. */}
              <div className="flex min-w-0 items-center gap-2.5">
                <ViewablePhoto
                  name={g.farmer.name}
                  size={40}
                  src={g.farmer.photoUrl}
                />
                <Link
                  href={`/admin/farmers/${g.farmer.id}`}
                  className={cn(
                    adminLinkClass,
                    "group min-w-0 hover:no-underline",
                  )}
                >
                  <div className="truncate text-[12px] font-semibold underline-offset-2 group-hover:underline">
                    {g.farmer.name}
                  </div>
                  {[g.farmer.phone, g.farmer.community].filter(Boolean).length >
                  0 ? (
                    <div className="truncate text-[11px] text-adm-muted">
                      {[g.farmer.phone, g.farmer.community]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </Link>
              </div>
              <DetailGrid className="mt-3 border-t border-adm-hairline pt-1">
                {/* The grant's own number, filed as a fact: the page heading
                    names the page, so the record names itself here. */}
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
                {/* Beside the figure it belongs to. A grant that shows what it
                    cost and says nothing about where that came from leaves the
                    statement spending money the cash book never heard of.
                    `full` only when a reason has
                    to be read - an account label is a phrase, a reason is up to
                    300 characters of prose and takes the row. */}
                <DetailItem
                  full={Boolean(g.noCashReason)}
                  hint="The account that paid for these inputs - or, when no company money moved, why not."
                  label="Funded from"
                >
                  <FarmCashSourceNote
                    account={g.paymentAccount}
                    reason={g.noCashReason}
                  />
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
              <p className="mb-1 text-[11px] text-adm-muted">
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
              <p className="mt-1 text-[11px] text-adm-muted">
                Granted {formatDateTime(g.grantedAt)}
              </p>
            </AdminCard>

            {/* Season position */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">Season position</SectionHeading>
              <p className="mb-1 text-[11px] text-adm-muted">
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
