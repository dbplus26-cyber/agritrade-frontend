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
import { formatDateTime, formatTableDate } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
import {
  repaymentDocumentUrl,
  useAddRepaymentDocumentMutation,
  useGetRepaymentQuery,
  useRemoveRepaymentDocumentMutation,
} from "@/redux/farm/repayments-api";
import { ViewablePhoto } from "@/components/admin/photo-view";
import { FarmDocumentsSection } from "./farm-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetGrantsQuery } from "@/redux/farm/grants-api";
import type { IGrant } from "@/types/farm.types";

const LIST = "/admin/repayments";

const NotRecorded = () => <span className="text-adm-muted">Not recorded</span>;

/**
 * The grants this repayment is set against.
 *
 * The advance and the repayment are joined by the farmer and the season, not
 * by a foreign key, so this states the join rather than implying a precision
 * the record does not have: these are the season's advances to this farmer,
 * and the repayment comes off their total.
 */
function SettlingAgainst({
  farmerId,
  farmerName,
  seasonId,
  seasonName,
}: {
  farmerId: string;
  farmerName: string;
  seasonId: string;
  seasonName: string;
}) {
  const { data, isError, isLoading } = useGetGrantsQuery({
    farmerId,
    limit: 50,
    seasonId,
  });
  const grants = data?.data ?? [];

  return (
    <AdminCard className="px-5 py-4">
      <SectionHeading
        className="mb-1"
        hint="A repayment comes off what the farmer owes for the season as a whole, so it answers every advance below rather than any one of them."
      >
        Settling against
      </SectionHeading>
      <p className="mb-2.5 text-[11px] text-adm-muted [overflow-wrap:anywhere]">
        What {farmerName} was advanced in {seasonName}.
      </p>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ) : isError ? (
        <p className="text-[11.5px] text-console-red">
          Couldn&apos;t load this season&apos;s advances. Reload to try again.
        </p>
      ) : grants.length === 0 ? (
        <p className="text-[11.5px] text-adm-muted">
          Nothing was advanced to this farmer in {seasonName}, so this
          repayment stands on its own.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {grants.map((g: IGrant) => (
            <li key={g.id}>
              <Link
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-none border border-adm-line bg-adm-card px-3.5 py-2.5 transition-colors hover:bg-adm-sunken"
                href={`/admin/grants/${g.id}`}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <Mono className="text-[11px] font-semibold text-console">
                    {g.transactionNo}
                  </Mono>
                  <span className="min-w-0 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]">
                    {g.item.name}
                    <span className="text-adm-muted">
                      {" · "}
                      {g.quantity} {g.item.unitLabel}
                      {" · "}
                      {formatTableDate(g.grantedAt)}
                    </span>
                  </span>
                </span>
                <Mono className="flex-none text-[12px] font-semibold text-adm-ink">
                  <Money value={g.valueGhs} />
                </Mono>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

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

            {/* WHAT THIS IS PAYING OFF. A repayment carries no grant id -
                it settles the farmer's balance for a season, not one advance
                - so the honest link is every grant that season put out to
                this farmer. Without it the page is a receipt for money with
                nothing on it saying what the money was for, and the grant it
                answers is two searches away. */}
            <SettlingAgainst
              farmerId={r.farmer.id}
              farmerName={r.farmer.name}
              seasonId={r.season.id}
              seasonName={r.season.name}
            />

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
            <p className="font-adminmono mt-1 text-[19px] font-bold text-console tabular-nums sm:text-[26px]">
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
