"use client";

import { useState } from "react";
import { useGetMyPurchasesQuery } from "@/redux/agent/agent-api";
import { ListPagination } from "@/components/ui/ListPagination";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis, formatKg } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { PurchaseStatus, type IPurchase } from "@/types/purchase.types";

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  [PurchaseStatus.RECORDED]: "Recorded",
  [PurchaseStatus.IN_TRANSIT]: "In transit",
  [PurchaseStatus.RECEIVED]: "Received",
  [PurchaseStatus.VOIDED]: "Voided",
};

const STATUS_CLASS: Record<PurchaseStatus, string> = {
  [PurchaseStatus.RECORDED]: "bg-harvest/15 text-harvest-deep",
  [PurchaseStatus.IN_TRANSIT]: "bg-surface-alt text-soil",
  [PurchaseStatus.RECEIVED]: "bg-leaf/15 text-forest",
  [PurchaseStatus.VOIDED]: "bg-surface-alt text-soil/70",
};

function PurchaseCard({ p }: { p: IPurchase }) {
  return (
    <div className="rounded-none border border-soil/25 bg-paper px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[14px] font-semibold text-ink">
          {p.commodity.name}
          <span className="ml-1.5 font-mono text-[12.5px] font-medium text-soil tabular-nums">
            {formatKg(p.weightKg)}
          </span>
        </p>
        <span className="font-mono text-[14px] font-bold whitespace-nowrap tabular-nums text-ink">
          {formatCedis(p.totalGhs)}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[12px] text-soil/80">
          {new Date(p.purchasedAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}{" "}
          · {formatCedis(p.unitPriceGhs)}/kg
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
            STATUS_CLASS[p.status],
          )}
        >
          {STATUS_LABEL[p.status]}
        </span>
      </div>
    </div>
  );
}

/** My purchases, newest first - a simple card list, no table. */
export function AgentPurchasesList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useGetMyPurchasesQuery({
    page,
    limit: 10,
  });
  const purchases = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  if (isLoading)
    return <p className="py-4 text-[13px] text-soil">Loading your purchases…</p>;
  if (isError)
    return (
      <div className="py-4">
        <p className="text-[13px] text-error">{extractApiError(error).message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-1 text-[13px] font-medium text-forest underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  if (purchases.length === 0)
    return (
      <p className="py-4 text-[13px] text-soil">
        No purchases yet - record your first from the home screen.
      </p>
    );

  return (
    <div className="flex flex-col gap-2.5">
      {purchases.map((p) => (
        <PurchaseCard key={p.id} p={p} />
      ))}
      <ListPagination
        page={page}
        totalPages={Math.max(1, Math.ceil(total / 10))}
        onPageChange={setPage}
        className="mt-1"
      />
    </div>
  );
}
