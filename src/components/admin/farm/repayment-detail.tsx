"use client";

import Link from "next/link";
import {
  adminLinkClass,
  AdminCard,
  DetailGrid,
  DetailHeader,
  DetailItem,
  DetailShell,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
import {
  repaymentDocumentUrl,
  useAddRepaymentDocumentMutation,
  useGetRepaymentQuery,
  useRemoveRepaymentDocumentMutation,
} from "@/redux/farm/repayments-api";
import { ViewablePhoto } from "@/components/admin/photo-view";
import { FarmDocumentsSection } from "./farm-bits";

const LIST = "/admin/repayments";

const NotRecorded = () => <span className="text-adm-muted">Not recorded</span>;

export function RepaymentDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetRepaymentQuery(id);
  const [addDoc, addDocState] = useAddRepaymentDocumentMutation();
  const [removeDoc] = useRemoveRepaymentDocumentMutation();

  if (isLoading) return <DetailSkeleton facts={6} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const r = data.data.repayment;
  // A cash repayment carries no crop, no weight and no valuation rate. Every
  // one of those is read through this flag rather than printed straight, so a
  // null never lands on the page as a blank and a missing weight never lands
  // as "0 kg" - which would read as a farmer who handed over nothing.
  const isCash = r.kind === "CASH";

  return (
    <div className="max-w-[1120px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Repayments", href: LIST }]}
        current="Repayment details"
      />
      <DetailHeader
        title="Repayment details"
        hint="One repayment from a farmer against their advance, in produce or in cash."
        sub={`Recorded ${formatDateTime(r.createdAt)}`}
        badges={
          isCash || r.intoStock ? (
            <>
              {isCash ? <ToneBadge tone="leaf">Repaid in cash</ToneBadge> : null}
              {r.intoStock ? (
                <ToneBadge tone="sky">Taken into stock</ToneBadge>
              ) : null}
            </>
          ) : null
        }
      />

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            {/* Who repaid what */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-2">
                Who repaid what
              </SectionHeading>
              {/* The photo sits BESIDE the link, not inside it: a
                  ViewablePhoto is a button when there is something to open,
                  and a button nested in an anchor is invalid markup.
                  Keeping them siblings also keeps the underline on the NAME. */}
              <div className="flex min-w-0 items-center gap-2.5">
                <ViewablePhoto
                  name={r.farmer.name}
                  size={40}
                  src={r.farmer.photoUrl}
                />
                <Link
                  href={`/admin/farmers/${r.farmer.id}`}
                  className={cn(
                    adminLinkClass,
                    "group min-w-0 hover:no-underline",
                  )}
                >
                  <div className="truncate text-[12px] font-semibold underline-offset-2 group-hover:underline">
                    {r.farmer.name}
                  </div>
                  {[r.farmer.phone, r.farmer.community].filter(Boolean).length >
                  0 ? (
                    <div className="truncate text-[11px] text-adm-muted">
                      {[r.farmer.phone, r.farmer.community]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </Link>
              </div>
              <DetailGrid className="mt-3 border-t border-adm-hairline pt-1">
                <DetailItem label="Receipt no" mono strong>
                  {r.transactionNo}
                </DetailItem>
                {isCash ? (
                  // Money in, and the account it landed in. This is the whole
                  // shape a cash repayment has: no crop, no weight, no rate.
                  <DetailItem
                    hint="The account this money was paid into. A receipt is posted to the cash book for it."
                    label="Paid into"
                  >
                    {r.paymentAccount ? (
                      r.paymentAccount.label
                    ) : (
                      <NotRecorded />
                    )}
                  </DetailItem>
                ) : (
                  <>
                    <DetailItem label="Commodity">
                      {r.commodity ? (
                        <Link
                          className={adminLinkClass}
                          href={`/admin/commodities/${r.commodity.id}`}
                        >
                          {r.commodity.name}
                        </Link>
                      ) : (
                        <NotRecorded />
                      )}
                    </DetailItem>
                    <DetailItem label="Weight" mono>
                      {r.weightKg === null ? (
                        <NotRecorded />
                      ) : (
                        formatKg(r.weightKg)
                      )}
                    </DetailItem>
                    <DetailItem label="Rate per kg" mono>
                      <Money value={r.ratePerKgGhs} />
                    </DetailItem>
                  </>
                )}
                <DetailItem label="Value credited" mono strong>
                  <span className="text-console">
                    <Money value={r.valueGhs} />
                  </span>
                </DetailItem>
                <DetailItem label="Season">
                  <Link
                    className={adminLinkClass}
                    href={`/admin/seasons/${r.season.id}`}
                  >
                    {r.season.name}
                  </Link>
                </DetailItem>
                <DetailItem label="Received">
                  {formatDateTime(r.receivedAt)}
                </DetailItem>
                {/* "Received by" is free text typed on the intake form - who
                    physically took delivery at the shed. It is not a user
                    record, so there is nothing to point at. */}
                <DetailItem label="Received by">
                  {r.receivedByName ?? <NotRecorded />}
                </DetailItem>
                <DetailItem label="Recorded by">
                  {r.recordedBy ? (
                    <Link
                      className={adminLinkClass}
                      href={`/admin/users/${r.recordedBy.id}`}
                    >
                      {r.recordedBy.name}
                    </Link>
                  ) : (
                    <NotRecorded />
                  )}
                </DetailItem>
                {/* Money cannot be taken into a warehouse, so a cash repayment
                    is not asked the question and is not answered it either. */}
                {isCash ? null : (
                <DetailItem label="Intake warehouse">
                  {r.intakeWarehouse ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Link
                        className={adminLinkClass}
                        href={`/admin/warehouses/${r.intakeWarehouse.id}`}
                      >
                        {r.intakeWarehouse.name}
                      </Link>
                      {r.intoStock ? (
                        <ToneBadge tone="sky">Taken into stock</ToneBadge>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-adm-muted">Not taken into stock</span>
                  )}
                </DetailItem>
                )}
                {r.notes ? (
                  <DetailItem
                    label="Notes"
                    className="sm:col-span-2 xl:col-span-3"
                  >
                    {r.notes}
                  </DetailItem>
                ) : null}
              </DetailGrid>
            </AdminCard>

            {/* Evidence */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">Evidence</SectionHeading>
              <p className="mb-1 text-[11px] text-adm-muted">
                The signed receipt or weigh slip is what settles &quot;I already
                paid&quot; disputes. Never shown publicly; downloads are logged.
              </p>
              <FarmDocumentsSection
                documents={r.documents}
                urlOf={(documentId) => repaymentDocumentUrl(r.id, documentId)}
                addBusy={addDocState.isLoading}
                onAdd={(file, name) => addDoc({ file, id: r.id, name }).unwrap()}
                onRemove={(documentId) =>
                  removeDoc({ documentId, id: r.id }).unwrap()
                }
                defaultName="Repayment receipt"
              />
            </AdminCard>
          </div>
        }
        aside={
          <AdminCard className="px-5 py-4">
            <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              <span className="min-w-0">Value credited</span>
              <HelpTip
                label="What is Value credited?"
                text="What this repayment was worth when it came in, and so how much it takes off what the farmer owes. The same figure whichever way the farmer settled."
              />
            </p>
            <p className="font-adminmono mt-1 text-[26px] font-bold text-console tabular-nums">
              <Money value={r.valueGhs} />
            </p>
            {/* How the figure above was arrived at. On a cash repayment there
                is no weight and no rate to work it from, so the line says
                where the money went instead of printing two blanks. */}
            <p className="mt-1 text-[11px] text-adm-muted [overflow-wrap:anywhere]">
              {isCash ? (
                r.paymentAccount ? (
                  <>Paid into {r.paymentAccount.label}</>
                ) : (
                  "Paid in cash"
                )
              ) : (
                <>
                  <Mono>
                    {r.weightKg === null ? "-" : formatKg(r.weightKg)}
                  </Mono>{" "}
                  {r.commodity ? `of ${r.commodity.name} ` : ""}at{" "}
                  <Mono>
                    <Money value={r.ratePerKgGhs} />
                  </Mono>{" "}
                  per kg
                </>
              )}
            </p>
          </AdminCard>
        }
      />
    </div>
  );
}
