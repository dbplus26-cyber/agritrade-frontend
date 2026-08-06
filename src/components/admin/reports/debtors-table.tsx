"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { CardHeader } from "@/components/admin/dashboard/chart-kit";
import { HelpWrap } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/ListPagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useGetDebtorsQuery } from "@/redux/reports/reports-api";

const PAGE_SIZE = 10;

/**
 * Unified debtors (commodity + land) with a name search and pagination. Every
 * outstanding balance across both books in one table; money is redaction-aware.
 */
export function DebtorsTable({ exportHref }: { exportHref: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search.trim(), 400);

  const { data, isFetching } = useGetDebtorsQuery({
    limit: PAGE_SIZE,
    page,
    search: debounced || undefined,
  });
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <AdminCard className="min-w-0 px-5 py-4">
      <CardHeader
        title="Debtors - outstanding balances"
        hint="Everyone who still owes you money, on grain orders and on land, in one list."
        right={
          <a
            href={exportHref}
            className="text-[12px] text-console hover:underline"
          >
            Export CSV
          </a>
        }
      />

      <div className="relative mb-3 max-w-[280px]">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search buyer name…"
          aria-label="Search debtors by buyer name"
          className="h-9 pr-8 text-[13px]"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-adm-faint hover:bg-adm-sunken hover:text-adm-muted"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-[13px] text-adm-muted">
          {isFetching
            ? "Loading…"
            : debounced
              ? "No debtors match that name."
              : "No outstanding balances. Everyone is paid up."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          {/* Fixed layout with declared column widths. Left to itself the
              browser sized every column from its content, so the buyer name -
              the one unbounded value here - took roughly three quarters of
              the row and squeezed the figures into columns so narrow that
              "GHS 59,377.38" wrapped. The figures are why this table exists;
              they get the room they need first, and the name takes what is
              left and wraps to at most two lines. */}
          <table className="w-full min-w-[720px] table-fixed text-[13px]">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[9rem]" />
              <col className="w-[9rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
              <col className="w-[8rem]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] text-adm-muted uppercase">
                <th className="py-1.5 pr-3">Buyer</th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="Which side of the business the debt sits on: a grain order, or a plot of land.">
                    Book
                  </HelpWrap>
                </th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="The order or sale number this debt belongs to, for looking it up.">
                    Ref
                  </HelpWrap>
                </th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="The full price the buyer signed up to pay.">
                    Agreed
                  </HelpWrap>
                </th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="How much of the agreed price has actually reached you so far.">
                    Paid
                  </HelpWrap>
                </th>
                <th className="py-1.5">
                  <HelpWrap text="What is still owed: the agreed price less everything paid.">
                    Balance
                  </HelpWrap>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-adm-hairline align-top">
                  <td className="py-1.5 pr-3 text-adm-ink">
                    <div className="line-clamp-2" title={r.buyer.name}>
                      {r.buyer.name}
                    </div>
                    {r.buyer.phone ? (
                      <div className="font-adminmono truncate text-[11.5px] text-adm-muted">
                        {r.buyer.phone}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-3">
                    <ToneBadge tone={r.kind === "LAND" ? "harvest" : "sky"}>
                      {r.kind === "LAND" ? "Land" : "Commodity"}
                    </ToneBadge>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className="block truncate" title={r.subject}>
                      <Mono className="text-adm-muted">{r.subject}</Mono>
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-adm-muted">
                    <Money value={r.agreedGhs} />
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-adm-muted">
                    <Money value={r.paidGhs} />
                  </td>
                  <td className="py-1.5 font-semibold whitespace-nowrap text-console-red">
                    <Money value={r.balanceGhs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="mt-3">
          <ListPagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </AdminCard>
  );
}
