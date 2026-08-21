"use client";

import { useMemo, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  SectionHeading,
  ToneBadge,
  type Tone,
} from "@/components/admin/ui";
import { HelpWrap } from "@/components/admin/help-tip";
import { Input } from "@/components/ui/input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetStockBalancesQuery } from "@/redux/stock/stock-api";
import type { IStocktakeLineInput } from "@/types/ops.types";
import { StocktakeStatus } from "@/types/ops.types";

/** Shared bits for the stocktake screens - status vocabulary + count sheet. */

const STOCKTAKE_STATUS: Record<StocktakeStatus, { label: string; tone: Tone }> =
  {
    [StocktakeStatus.DRAFT]: { label: "Draft", tone: "harvest" },
    [StocktakeStatus.SUBMITTED]: { label: "Submitted", tone: "sky" },
    [StocktakeStatus.APPROVED]: { label: "Approved", tone: "leaf" },
    [StocktakeStatus.CANCELLED]: { label: "Cancelled", tone: "slate" },
  };

/** What the count is doing at each stage, and what approving it will do. */
const STOCKTAKE_STATUS_HELP: Record<StocktakeStatus, string> = {
  [StocktakeStatus.DRAFT]:
    "The count sheet is still being filled in and changes nothing yet.",
  [StocktakeStatus.SUBMITTED]:
    "The count is in and compared against the books; it is waiting on approval.",
  [StocktakeStatus.APPROVED]:
    "The count was accepted, and stock has been corrected to match what was there.",
  [StocktakeStatus.CANCELLED]:
    "The count was abandoned, and stock was left exactly as it was.",
};

export function StocktakeStatusBadge({ status }: { status: StocktakeStatus }) {
  const s = STOCKTAKE_STATUS[status] ?? { label: status, tone: "slate" as Tone };
  const help = STOCKTAKE_STATUS_HELP[status];
  const badge = <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
  return help ? <HelpWrap text={help}>{badge}</HelpWrap> : badge;
}

export const STOCKTAKE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: StocktakeStatus.DRAFT, label: "Draft" },
  { value: StocktakeStatus.SUBMITTED, label: "Submitted" },
  { value: StocktakeStatus.APPROVED, label: "Approved" },
  { value: StocktakeStatus.CANCELLED, label: "Cancelled" },
] as const;

/** A prior count fed back into the sheet when editing a DRAFT. */
export interface CountSheetInitialLine {
  commodityId: string;
  commodityName: string;
  countedKg: number;
}

const MAX_LINES = 100;

/**
 * The physical count sheet: every commodity the warehouse has a ledger row
 * for (zero balances included), each with a counted-kg input, plus an
 * add-a-commodity row for produce found on the floor with no book balance at
 * all. Counts are held as raw strings (no onChange clamping) and validated on
 * save; blank rows are simply not counted. Deliberately blind - book balances
 * are not shown here, so the count records what is actually on the floor.
 */
export function StocktakeCountSheet({
  warehouseId,
  initialLines,
  initialNotes = "",
  saving,
  submitLabel,
  onCancel,
  onSave,
}: {
  warehouseId: string;
  initialLines?: CountSheetInitialLine[];
  initialNotes?: string;
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSave: (lines: IStocktakeLineInput[], notes: string) => void;
}) {
  const balances = useGetStockBalancesQuery({ warehouseId, includeZero: true });
  const commoditiesQuery = useGetCommoditiesQuery({ isActive: true, limit: 100 });

  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initialLines ?? []).map((l) => [l.commodityId, String(l.countedKg)]),
    ),
  );
  const [added, setAdded] = useState<string[]>([]);
  const [notes, setNotes] = useState(initialNotes);
  const [formError, setFormError] = useState<string | null>(null);

  const balanceRows = useMemo(() => balances.data?.data ?? [], [balances.data]);
  const balanceIds = useMemo(
    () => new Set(balanceRows.map((r) => r.commodityId)),
    [balanceRows],
  );

  // Names for commodities that have no balance row: the registry first, then
  // the initial lines (covers commodities deactivated since the draft).
  const nameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of commoditiesQuery.data?.data ?? []) map.set(c.id, c.name);
    for (const l of initialLines ?? []) {
      if (!map.has(l.commodityId)) map.set(l.commodityId, l.commodityName);
    }
    return map;
  }, [commoditiesQuery.data, initialLines]);

  // Rows beyond the warehouse's ledger: user-added ones plus any prior counts
  // whose commodity carries no balance row.
  const extraIds = useMemo(
    () =>
      [...new Set([...Object.keys(counts), ...added])].filter(
        (id) => !balanceIds.has(id),
      ),
    [counts, added, balanceIds],
  );

  const addableOptions = useMemo(
    () =>
      (commoditiesQuery.data?.data ?? []).filter(
        (c) => !balanceIds.has(c.id) && !extraIds.includes(c.id),
      ),
    [commoditiesQuery.data, balanceIds, extraIds],
  );

  const setCount = (commodityId: string, value: string) => {
    setCounts((prev) => ({ ...prev, [commodityId]: value }));
  };

  const removeExtra = (commodityId: string) => {
    setAdded((prev) => prev.filter((id) => id !== commodityId));
    setCounts((prev) => {
      const next = { ...prev };
      delete next[commodityId];
      return next;
    });
  };

  const save = () => {
    const rowIds = [...balanceRows.map((r) => r.commodityId), ...extraIds];
    const lines: IStocktakeLineInput[] = [];
    for (const id of rowIds) {
      const raw = (counts[id] ?? "").trim();
      if (!raw) continue;
      const value = Number(raw);
      if (Number.isNaN(value) || value < 0) {
        setFormError(
          `"${nameOf.get(id) ?? "A commodity"}" needs a counted weight of zero or more.`,
        );
        return;
      }
      lines.push({ commodityId: id, countedKg: value });
    }
    if (lines.length === 0) {
      setFormError("Count at least one commodity before saving.");
      return;
    }
    if (lines.length > MAX_LINES) {
      setFormError(`A stocktake holds at most ${MAX_LINES} lines.`);
      return;
    }
    setFormError(null);
    onSave(lines, notes.trim());
  };

  if (balances.isLoading) {
    return (
      <AdminCard className="flex flex-col gap-3 px-5 py-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </AdminCard>
    );
  }
  if (balances.isError) {
    return (
      <ErrorMessage
        description={extractApiError(balances.error).message}
        onRetry={() => void balances.refetch()}
      />
    );
  }

  const countRow = (commodityId: string, name: string, removable: boolean) => (
    <div
      key={commodityId}
      className="flex items-center gap-3 border-b border-adm-hairline py-2 last:border-b-0"
    >
      <span
        className="min-w-0 flex-1 text-[13.5px] font-medium text-adm-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere]"
        title={name}
      >
        {name}
      </span>
      {removable ? (
        <button
          type="button"
          onClick={() => removeExtra(commodityId)}
          aria-label={`Remove ${name} from the sheet`}
          className="flex-none cursor-pointer text-[12px] text-console-red"
        >
          ✕
        </button>
      ) : null}
      <Input
        inputMode="decimal"
        placeholder="Not counted"
        aria-label={`Counted kg for ${name}`}
        value={counts[commodityId] ?? ""}
        onChange={(e) => setCount(commodityId, e.target.value)}
        className={cn(
          adminInputClass,
          "h-9 w-[110px] flex-none px-2.5 text-right font-adminmono tabular-nums min-[400px]:w-[130px]",
        )}
      />
      <span className="w-6 flex-none text-[12px] text-adm-muted">kg</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <AdminCard className="px-4 py-3 sm:px-5 sm:py-4">
        <SectionHeading className="mb-1">Count sheet</SectionHeading>
        <p className="mb-2 text-[12px] text-adm-muted">
          Enter what was physically counted. Leave a line blank to skip it -
          book balances are compared only when the sheet is submitted.
        </p>
        {balanceRows.length === 0 && extraIds.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">
            This warehouse has no ledger lines yet - add the commodities found
            below.
          </p>
        ) : null}
        {balanceRows.map((r) => countRow(r.commodityId, r.commodityName, false))}
        {extraIds.map((id) =>
          countRow(id, nameOf.get(id) ?? "Unknown commodity", true),
        )}

        {addableOptions.length > 0 ? (
          <div className="mt-3 border-t border-adm-hairline pt-3">
            <AdminField
              label="Add a commodity"
              optional
              hint="For produce found on the floor with no book balance."
            >
              <SimpleSelect
                className={cn(adminInputClass, "cursor-pointer")}
                value=""
                onChange={(v) => setAdded((prev) => [...prev, v])}
                placeholder="Choose a commodity…"
                options={addableOptions.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            </AdminField>
          </div>
        ) : null}
      </AdminCard>

      <AdminCard className="px-4 py-3 sm:px-5 sm:py-4">
        <AdminField label="Notes" optional>
          <Input
            placeholder="e.g. counted after morning offloading"
            className={adminInputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </AdminField>
      </AdminCard>

      {formError ? (
        <p
          role="alert"
          className="rounded-none border border-console-red/40 bg-console-red/5 px-3 py-2 text-[12.5px] font-medium text-console-red"
        >
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
        <AdminButton
          type="button"
          size="lg"
          disabled={saving}
          loading={saving}
          onClick={save}
        >
          {saving ? "Saving…" : submitLabel}
        </AdminButton>
      </div>
    </div>
  );
}
