"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
} from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { useGetSeasonSummaryQuery } from "@/redux/farm/farm-books-api";
import {
  useDeleteSeasonMutation,
  useGetSeasonQuery,
  useSetSeasonActiveMutation,
} from "@/redux/farm/seasons-api";
import { ActiveBadge, formatFarmDate } from "./farm-bits";

const LIST = "/admin/seasons";

function StatTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-bold text-ink">{children}</div>
    </AdminCard>
  );
}

export function SeasonDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useGetSeasonQuery(id);
  const summary = useGetSeasonSummaryQuery(id);
  const [setActive] = useSetSeasonActiveMutation();
  const [deleteSeason, deleteState] = useDeleteSeasonMutation();
  const { confirm, confirmationDialog } = useConfirm();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.season;
  const stats = summary.data?.data.summary;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify.success(ok);
    } catch (err) {
      notify.error("Something went wrong", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete this season?",
      description:
        "Only possible while it has no grants or repayments booked against it.",
      confirmText: "Delete",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteSeason(s.id).unwrap();
      notify.success("Season deleted");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't delete the season", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All seasons" className="mb-2" />
      <AdminPageHeader
        title={s.name}
        sub={`${formatFarmDate(s.startsOn)}${
          s.endsOn ? ` - ${formatFarmDate(s.endsOn)}` : ""
        }`}
        actions={<ActiveBadge active={s.isActive} />}
      />

      {/* KPI strip - full width above the shell */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Farmers">{stats?.farmerCount ?? "-"}</StatTile>
        <StatTile label="Invested">
          <Money value={stats?.investedGhs ?? null} />
        </StatTile>
        <StatTile label="Recovered">
          <span className="text-leaf">
            <Money value={stats?.recoveredGhs ?? null} />
          </span>
        </StatTile>
        <StatTile label="Outstanding">
          <span className="text-console-red">
            <Money value={stats?.outstandingGhs ?? null} />
          </span>
        </StatTile>
      </div>

      <DetailShell
        aside={
          <AdminCard className="px-5 py-3">
            <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Season
            </p>
            <DetailGrid columns={2}>
              <DetailItem label="Starts">{formatFarmDate(s.startsOn)}</DetailItem>
              <DetailItem label="Ends">
                {s.endsOn ? (
                  formatFarmDate(s.endsOn)
                ) : (
                  <span className="text-soil">Open</span>
                )}
              </DetailItem>
              <DetailItem label="Status">
                {s.isActive ? "Active" : "Inactive"}
              </DetailItem>
            </DetailGrid>
            <div className="mt-3 border-t border-soil/12 pt-3.5">
              <div className="flex flex-wrap gap-2 xl:flex-col">
                <AdminButton variant="outline" className="h-9 px-4" asChild>
                  <Link href={`${LIST}/${s.id}/edit`}>Edit</Link>
                </AdminButton>
                <AdminButton
                  variant="outline"
                  className="h-9 px-4"
                  onClick={() =>
                    void run(
                      () => setActive({ active: !s.isActive, id: s.id }).unwrap(),
                      s.isActive ? "Season deactivated" : "Season activated",
                    )
                  }
                >
                  {s.isActive ? "Deactivate" : "Activate"}
                </AdminButton>
                <AdminButton
                  variant="outline"
                  className="h-9 px-4 text-console-red"
                  disabled={deleteState.isLoading}
                  onClick={() => void onDelete()}
                >
                  Delete
                </AdminButton>
              </div>
            </div>
          </AdminCard>
        }
        main={
          <>
          {stats ? (
            <AdminCard className="mb-4 px-5 py-3">
              <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Expected vs actual
              </p>
              <p className="mb-2 text-[12px] text-soil">
                The season plans against what actually came back - the read
                that makes next season&apos;s grant decisions better informed.
              </p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
                <div className="border-b border-soil/10 py-2">
                  <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                    Expected yield
                  </p>
                  <Mono className="text-[14px]">
                    {formatKg(stats.expectations.expectedYieldKg)}
                  </Mono>
                </div>
                <div className="border-b border-soil/10 py-2">
                  <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                    Actual yield
                  </p>
                  <Mono
                    className={
                      stats.expectations.actualYieldKg >=
                      stats.expectations.expectedYieldKg
                        ? "text-[14px] text-leaf"
                        : "text-[14px]"
                    }
                  >
                    {formatKg(stats.expectations.actualYieldKg)}
                  </Mono>
                </div>
                <div className="border-b border-soil/10 py-2">
                  <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                    Expected return
                  </p>
                  <Mono className="text-[14px]">
                    <Money value={stats.expectations.expectedReturnGhs} />
                  </Mono>
                </div>
                <div className="border-b border-soil/10 py-2">
                  <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                    Actual return
                  </p>
                  <Mono className="text-[14px]">
                    <Money value={stats.expectations.actualReturnGhs} />
                  </Mono>
                </div>
              </div>
            </AdminCard>
          ) : null}
          <AdminCard className="overflow-hidden">
            <div className="border-b border-soil/15 px-5 py-3 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Farmer balances
            </div>
            {summary.isLoading ? (
              <div className="p-5">
                <DataTableSkeleton />
              </div>
            ) : !stats || stats.farmerBalances.length === 0 ? (
              <EmptyState
                variant="plain"
                title="No activity yet"
                description="Grants and repayments booked to this season appear here."
              />
            ) : (
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-soil/15 text-left text-[11px] uppercase tracking-[0.06em] text-soil">
                    <th className="px-5 py-2 font-semibold">Farmer</th>
                    <th className="px-5 py-2 text-right font-semibold">Invested</th>
                    <th className="px-5 py-2 text-right font-semibold">Recovered</th>
                    <th className="px-5 py-2 text-right font-semibold">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.farmerBalances.map((b) => (
                    <tr
                      key={b.farmerId}
                      className="border-b border-soil/10 last:border-b-0 hover:bg-surface-alt/60"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/admin/farmers/${b.farmerId}/statement?seasonId=${s.id}`}
                          className="font-semibold text-console hover:underline"
                        >
                          {b.farmerName}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Mono>
                          <Money value={b.investedGhs} />
                        </Mono>
                      </td>
                      <td className="px-5 py-2.5 text-right text-leaf">
                        <Mono>
                          <Money value={b.recoveredGhs} />
                        </Mono>
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-console-red">
                        <Mono>
                          <Money value={b.outstandingGhs} />
                        </Mono>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AdminCard>
          </>
        }
      />

      {confirmationDialog}
    </div>
  );
}
