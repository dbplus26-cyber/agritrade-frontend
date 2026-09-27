"use client";

import { useState } from "react";

import { AdminField, Mono, adminInputClass } from "@/components/admin/ui";
import { formatCedis } from "@/lib/format-money";
import { useGetMatchableOutflowsQuery } from "@/redux/expenses/expenses-api";
import type { IMatchableOutflow } from "@/types/expense.types";

export function ExistingOutflowPicker({
  accountId,
  onChange,
  single = false,
}: {
  accountId: string;
  onChange: (rows: IMatchableOutflow[]) => void;
  single?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<IMatchableOutflow[]>([]);
  const { data, isFetching, isError } = useGetMatchableOutflowsQuery(
    { accountId, search: search.trim() || undefined },
    { skip: !accountId },
  );

  const toggle = (row: IMatchableOutflow) => {
    const next = selected.some((item) => item.id === row.id)
      ? selected.filter((item) => item.id !== row.id)
      : single
        ? [row]
        : [...selected, row];
    setSelected(next);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <AdminField
        label="Find an existing debit"
        hint={
          single
            ? "Search the provider reference or cash book number and choose the transfer."
            : "Search the provider reference or cash book number. Select every transfer that paid this cost."
        }
      >
        <input
          className={adminInputClass}
          maxLength={120}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Provider reference or cash book number"
          value={search}
        />
      </AdminField>
      {!accountId ? (
        <p className="text-[11px] text-adm-muted">Choose the account first.</p>
      ) : null}
      {isError ? (
        <p className="text-[11px] text-console-red">
          Could not load account outflows.
        </p>
      ) : null}
      {accountId && !isFetching && data?.data.length === 0 ? (
        <p className="text-[11px] text-adm-muted">
          No unmatched outflows found on this account.
        </p>
      ) : null}
      {isFetching ? (
        <p className="text-[11px] text-adm-muted">Finding outflows…</p>
      ) : null}
      {data?.data.length ? (
        <div className="max-h-56 overflow-y-auto border border-adm-line">
          {data.data.map((row) => (
            <label
              key={row.id}
              className="flex min-h-[44px] cursor-pointer items-start gap-3 border-b border-adm-hairline p-2.5 last:border-b-0"
            >
              <input
                checked={selected.some((item) => item.id === row.id)}
                className="mt-1"
                onChange={() => toggle(row)}
                type={single ? "radio" : "checkbox"}
                name={single ? "existing-outflow" : undefined}
              />
              <span className="min-w-0 flex-1 text-[11.5px]">
                <Mono>{row.transactionNo}</Mono> ·{" "}
                {new Date(row.occurredAt).toLocaleDateString("en-GB")}
                {row.externalReference ? (
                  <span className="block">
                    Payment reference: {row.externalReference}
                  </span>
                ) : null}
                {row.reason ? (
                  <span className="block text-adm-muted">{row.reason}</span>
                ) : null}
              </span>
              <Mono className="text-[11.5px]">
                {formatCedis(row.amountGhs)}
              </Mono>
            </label>
          ))}
        </div>
      ) : null}
      {selected.length ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-adm-body">
            {selected.length} selected ·{" "}
            {formatCedis(selected.reduce((sum, row) => sum + row.amountGhs, 0))}{" "}
            already debited
          </p>
          {single ? (
            <button
              className="text-[11.5px] text-adm-muted underline"
              onClick={() => {
                setSelected([]);
                onChange([]);
              }}
              type="button"
            >
              Clear selection
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
