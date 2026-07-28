"use client";

import Link from "next/link";
import {
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
} from "@/components/admin/ui";
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
import { avatarOf } from "@/static-data/admin/registers";
import { FarmDocumentsSection, GrantApprovalBadge } from "./farm-bits";

const LIST = "/admin/grants";

const NotRecorded = () => <span className="text-soil">Not recorded</span>;

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
        title={`Grant ${g.transactionNo}`}
        sub={`Recorded ${formatDateTime(g.createdAt)}`}
        actions={<GrantApprovalBadge status={g.approval?.status} />}
      />

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            {/* Who took what */}
            <AdminCard className="px-5 py-4">
              <div className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Who took what
              </div>
              <Link
                href={`/admin/farmers/${g.farmer.id}`}
                className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
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
                  <div className="truncate text-[14px] font-semibold text-ink hover:underline">
                    {g.farmer.name}
                  </div>
                  {[g.farmer.phone, g.farmer.community].filter(Boolean).length >
                  0 ? (
                    <div className="truncate text-[12px] text-soil">
                      {[g.farmer.phone, g.farmer.community]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
              </Link>
              <DetailGrid className="mt-3 border-t border-soil/10 pt-1">
                <DetailItem label="Item">
                  {g.item.name} · {g.quantity} {g.item.unitLabel}
                </DetailItem>
                <DetailItem label="Season">{g.season.name}</DetailItem>
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
              <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Agreement
              </div>
              <p className="mt-1 mb-1 text-[12px] text-soil">
                The signed agreement is the binding record behind this grant.
                Never shown publicly; downloads are logged.
              </p>
              <DetailGrid>
                <DetailItem label="Agreed terms">
                  {g.agreedTerms ?? <NotRecorded />}
                </DetailItem>
                <DetailItem label="Due date">
                  {g.dueDate ? formatDateOnly(g.dueDate) : <NotRecorded />}
                </DetailItem>
              </DetailGrid>
              <div className="mt-2 border-t border-soil/10 pt-1">
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
              <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Grant value
              </p>
              <p className="font-adminmono mt-1 text-[26px] font-bold text-ink tabular-nums">
                <Money value={g.valueGhs} />
              </p>
              <p className="mt-1 text-[12.5px] text-soil">
                Granted {formatDateTime(g.grantedAt)}
              </p>
            </AdminCard>

            {/* Season position */}
            <AdminCard className="px-5 py-4">
              <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Season position
              </div>
              <p className="mt-1 mb-1 text-[12px] text-soil">
                {g.farmer.name}&apos;s running balance for {g.season.name}.
              </p>
              <DetailGrid columns={2}>
                <DetailItem label="Invested" mono>
                  <Money value={g.seasonBalance.investedGhs} />
                </DetailItem>
                <DetailItem label="Recovered" mono>
                  <span className="text-leaf">
                    <Money value={g.seasonBalance.recoveredGhs} />
                  </span>
                </DetailItem>
                <DetailItem label="Outstanding" mono strong>
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
