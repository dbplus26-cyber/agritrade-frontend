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
  SectionHeading,
  adminLinkClass,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { ConsoleTableSkeleton, DetailSkeleton } from "@/components/admin/skeletons";
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
  hint,
  children,
}: {
  label: string;
  /** One sentence on what this figure counts, on hover beside the label. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What does ${label} count?`} text={hint} /> : null}
      </div>
      <div className="mt-1 text-[19px] font-bold text-adm-ink">{children}</div>
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

  if (isLoading) return <DetailSkeleton facts={4} table />;
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
        title="Season details"
        hint="One planting cycle. Grants and repayments are recorded against it."
        sub={`${formatFarmDate(s.startsOn)}${
          s.endsOn ? ` - ${formatFarmDate(s.endsOn)}` : ""
        }`}
        actions={<ActiveBadge active={s.isActive} />}
      />

      {/* KPI strip - full width above the shell */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          hint="How many farmers have taken inputs or brought produce back in this season."
          label="Farmers"
        >
          {stats?.farmerCount ?? "-"}
        </StatTile>
        <StatTile
          hint="What the seed, fertiliser and tools handed out this season were worth."
          label="Invested"
        >
          <Money value={stats?.investedGhs ?? null} />
        </StatTile>
        <StatTile
          hint="What farmers have already paid back this season, in produce or in cash."
          label="Recovered"
        >
          <span className="text-console">
            <Money value={stats?.recoveredGhs ?? null} />
          </span>
        </StatTile>
        <StatTile
          hint="What farmers still owe on this season's inputs: invested less recovered."
          label="Outstanding"
        >
          <span className="text-console-red">
            <Money value={stats?.outstandingGhs ?? null} />
          </span>
        </StatTile>
      </div>

      <DetailShell
        aside={
          <AdminCard className="px-5 py-3">
            <SectionHeading className="mb-1">Season</SectionHeading>
            <DetailGrid columns={2}>
              {/* The name is here rather than in the page heading, which now
                  says what KIND of page this is. Something has to say which
                  season. */}
              <DetailItem full label="Name" strong>
                {s.name}
              </DetailItem>
              <DetailItem label="Starts">{formatFarmDate(s.startsOn)}</DetailItem>
              <DetailItem label="Ends">
                {s.endsOn ? (
                  formatFarmDate(s.endsOn)
                ) : (
                  <span className="text-adm-muted">Open</span>
                )}
              </DetailItem>
              <DetailItem label="Status">
                {s.isActive ? "Active" : "Inactive"}
              </DetailItem>
            </DetailGrid>
            <div className="mt-3 border-t border-adm-hairline pt-3.5">
              <div className="flex flex-wrap gap-2 xl:flex-col">
                <AdminButton variant="outline" asChild>
                  <Link href={`${LIST}/${s.id}/edit`}>Edit</Link>
                </AdminButton>
                <AdminButton
                  variant="outline"
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
                  className="text-console-red"
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
              <SectionHeading className="mb-1">
                Expected vs actual
              </SectionHeading>
              <p className="mb-2 text-[12px] text-adm-muted">
                The season plans against what actually came back - the read
                that makes next season&apos;s grant decisions better informed.
              </p>
              {/* Four facts, so they keep a four-column grid rather than
                  DetailGrid's auto-fit - but the pairs themselves are
                  DetailItems, which they used to hand-roll a size adrift. */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
                <DetailItem
                  label="Expected yield"
                  mono
                  hint="The produce this season's grants were meant to bring back, added up across every farmer."
                >
                  {formatKg(stats.expectations.expectedYieldKg)}
                </DetailItem>
                <DetailItem
                  label="Actual yield"
                  mono
                  hint="The produce farmers have actually brought back to you this season."
                >
                  {/* Green only when the season has met what it planned for. */}
                  <span
                    className={
                      stats.expectations.actualYieldKg >=
                      stats.expectations.expectedYieldKg
                        ? "text-console"
                        : undefined
                    }
                  >
                    {formatKg(stats.expectations.actualYieldKg)}
                  </span>
                </DetailItem>
                <DetailItem
                  label="Expected return"
                  mono
                  hint="What the expected produce was reckoned to be worth when the grants went out."
                >
                  <Money value={stats.expectations.expectedReturnGhs} />
                </DetailItem>
                <DetailItem
                  label="Actual return"
                  mono
                  hint="What the produce farmers actually brought back was worth when it was taken in."
                >
                  <Money value={stats.expectations.actualReturnGhs} />
                </DetailItem>
              </div>
            </AdminCard>
          ) : null}
          <AdminCard className="overflow-hidden">
            {/* The rule stays on the band; the heading owns only its text,
                so mb-0 leaves the band's py-3 as the gap under it. */}
            <div className="border-b border-adm-hairline px-5 py-3">
              <SectionHeading className="mb-0">Farmer balances</SectionHeading>
            </div>
            {summary.isLoading ? (
              <div className="p-5">
                <ConsoleTableSkeleton bare columns={3} rows={5} />
              </div>
            ) : !stats || stats.farmerBalances.length === 0 ? (
              <EmptyState
                variant="plain"
                title="No activity yet"
                description="Grants and repayments booked to this season appear here."
              />
            ) : (
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="border-b border-adm-hairline text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted">
                    <th className="px-5 py-2">Farmer</th>
                    <th className="px-5 py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        Invested
                        <HelpTip
                          label="What does the Invested column show?"
                          text="What the inputs this farmer took this season were worth."
                        />
                      </span>
                    </th>
                    <th className="px-5 py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        Recovered
                        <HelpTip
                          label="What does the Recovered column show?"
                          text="What this farmer has already paid back, in produce or in cash."
                        />
                      </span>
                    </th>
                    <th className="px-5 py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        Outstanding
                        <HelpTip
                          label="What does the Outstanding column show?"
                          text="What this farmer still owes you on this season's inputs."
                        />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.farmerBalances.map((b) => (
                    <tr
                      key={b.farmerId}
                      className="border-b border-adm-hairline last:border-b-0 hover:bg-adm-sunken"
                    >
                      <td className="px-5 py-2.5">
                        <Link
                          href={`/admin/farmers/${b.farmerId}/statement?seasonId=${s.id}`}
                          className={cn(adminLinkClass, "font-semibold")}
                        >
                          {b.farmerName}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Mono>
                          <Money value={b.investedGhs} />
                        </Mono>
                      </td>
                      <td className="px-5 py-2.5 text-right text-console">
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
