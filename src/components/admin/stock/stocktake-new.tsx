"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminSelectClass,
  SectionHeading,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { SimpleSelect } from "@/components/ui/simple-select";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { useCreateStocktakeMutation } from "@/redux/stocktakes/stocktakes-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import type { IStocktakeLineInput } from "@/types/ops.types";
import { StocktakeCountSheet } from "./stocktake-bits";

const LIST = "/admin/stocktakes";

/**
 * /admin/stocktakes/new - pick the warehouse, then count it. The sheet lists
 * every commodity the warehouse has a ledger row for (zero balances
 * included); saving files the count as a DRAFT.
 */
export function StocktakeNew() {
  const router = useRouter();
  const [warehouseId, setWarehouseId] = useState("");
  const [createStocktake, { isLoading: saving }] = useCreateStocktakeMutation();
  const warehouses = useGetWarehousesQuery({ isActive: true, limit: 100 });

  const onSave = async (lines: IStocktakeLineInput[], notes: string) => {
    try {
      const created = await createStocktake({
        warehouseId,
        lines,
        ...(notes ? { notes } : {}),
      }).unwrap();
      notify.success("Stocktake saved as a draft");
      router.push(`${LIST}/${created.data.stocktake.id}`);
    } catch (err) {
      notify.error("Couldn't save the stocktake", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All stocktakes" className="mb-2" />
      <AdminPageHeader
        title="New stocktake"
        hint="Count what is physically in a warehouse. Approving corrects the system to match."
        sub="Count what is physically on the floor; the book is compared at submit"
      />

      <AdminCard className="mb-4 px-4 py-3 sm:px-5 sm:py-4">
        <SectionHeading className="mb-3">Which warehouse</SectionHeading>
        <AdminField
          label="Warehouse"
          hint={
            warehouseId
              ? undefined
              : "Choose the warehouse to bring up its count sheet."
          }
        >
          <SimpleSelect
            className={adminSelectClass}
            value={warehouseId}
            onChange={setWarehouseId}
            placeholder="Choose a warehouse…"
            options={(warehouses.data?.data ?? []).map((w) => ({
              value: w.id,
              label: w.name,
            }))}
          />
        </AdminField>
      </AdminCard>

      {warehouseId ? (
        <StocktakeCountSheet
          // Remount on warehouse change so stale counts never carry over.
          key={warehouseId}
          warehouseId={warehouseId}
          saving={saving}
          submitLabel="Save draft"
          onCancel={() => router.push(LIST)}
          onSave={(lines, notes) => void onSave(lines, notes)}
        />
      ) : null}
    </div>
  );
}
