"use client";

import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
  ToneBadge,
} from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
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
import { avatarOf } from "@/lib/avatar";
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
  const a = avatarOf(r.farmer.name);

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All repayments" className="mb-2" />
      <AdminPageHeader
        title="Repayment details"
        hint="One delivery of produce from a farmer against their advance."
        sub={`Recorded ${formatDateTime(r.createdAt)}`}
        actions={
          r.intoStock ? <ToneBadge tone="sky">Taken into stock</ToneBadge> : null
        }
      />

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            {/* Who repaid what */}
            <AdminCard className="px-5 py-4">
              <div className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Who repaid what
              </div>
              <Link
                href={`/admin/farmers/${r.farmer.id}`}
                className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              >
                {r.farmer.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                  <img
                    src={r.farmer.photoUrl}
                    alt={r.farmer.name}
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
                  <div className="truncate text-[14px] font-semibold text-adm-ink hover:underline">
                    {r.farmer.name}
                  </div>
                  {[r.farmer.phone, r.farmer.community].filter(Boolean).length >
                  0 ? (
                    <div className="truncate text-[12px] text-adm-muted">
                      {[r.farmer.phone, r.farmer.community]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              </Link>
              <DetailGrid className="mt-3 border-t border-adm-hairline pt-1">
                <DetailItem label="Receipt no" mono strong>
                  {r.transactionNo}
                </DetailItem>
                <DetailItem label="Commodity">{r.commodity.name}</DetailItem>
                <DetailItem label="Weight" mono>
                  {formatKg(r.weightKg)}
                </DetailItem>
                <DetailItem label="Rate per kg" mono>
                  <Money value={r.ratePerKgGhs} />
                </DetailItem>
                <DetailItem label="Value credited" mono strong>
                  <span className="text-console">
                    <Money value={r.valueGhs} />
                  </span>
                </DetailItem>
                <DetailItem label="Season">{r.season.name}</DetailItem>
                <DetailItem label="Received">
                  {formatDateTime(r.receivedAt)}
                </DetailItem>
                <DetailItem label="Received by">
                  {r.receivedByName ?? <NotRecorded />}
                </DetailItem>
                <DetailItem label="Recorded by">
                  {r.recordedBy?.name ?? <NotRecorded />}
                </DetailItem>
                <DetailItem label="Intake warehouse">
                  {r.intakeWarehouse ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {r.intakeWarehouse.name}
                      {r.intoStock ? (
                        <ToneBadge tone="sky">Taken into stock</ToneBadge>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-adm-muted">Not taken into stock</span>
                  )}
                </DetailItem>
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
              <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Evidence
              </div>
              <p className="mt-1 mb-1 text-[12px] text-adm-muted">
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
                text="What this produce was worth when it came in, and so how much it takes off what the farmer owes."
              />
            </p>
            <p className="font-adminmono mt-1 text-[26px] font-bold text-console tabular-nums">
              <Money value={r.valueGhs} />
            </p>
            <p className="mt-1 text-[12.5px] text-adm-muted">
              <Mono>{formatKg(r.weightKg)}</Mono> of {r.commodity.name} at{" "}
              <Mono>
                <Money value={r.ratePerKgGhs} />
              </Mono>{" "}
              per kg
            </p>
          </AdminCard>
        }
      />
    </div>
  );
}
