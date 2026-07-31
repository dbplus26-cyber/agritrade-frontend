"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminCard,
  Mono,
  ToneBadge,
  adminSelectClass,
} from "@/components/admin/ui";
import {
  avatarOf,
  cellText,
  isTagCell,
  type RegisterCell,
  type RegisterConfig,
  type RegisterHeader,
  type RegisterRow,
} from "@/static-data/admin/registers";

function BodyCell({
  cell,
  header,
  first,
  avatar,
}: {
  cell: RegisterCell;
  header: RegisterHeader;
  first: boolean;
  avatar: boolean;
}) {
  const text = cellText(cell);
  if (first && avatar) {
    const av = avatarOf(text);
    return (
      <span className="inline-flex max-w-full min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="font-adminmono inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: av.bg, color: av.fg }}
        >
          {av.init}
        </span>
        <span className="block max-w-[20rem] truncate font-medium text-adm-ink">{text}</span>
      </span>
    );
  }
  if (header.tag && isTagCell(cell)) {
    return <ToneBadge tone={cell.tone}>{cell.t}</ToneBadge>;
  }
  const styled = typeof cell === "object" && !isTagCell(cell) ? cell : undefined;
  const style = {
    color: styled?.c ?? (header.align === "right" ? "#161c24" : "#39424f"),
    fontWeight: styled?.w ?? 400,
  };
  return header.align === "right" ? (
    <Mono className="whitespace-nowrap">
      <span style={style}>{text}</span>
    </Mono>
  ) : (
    <span className="whitespace-nowrap" style={style}>
      {text}
    </span>
  );
}

/**
 * The one register/list template: search, visual filters, config-driven
 * ConsoleDataTable (TanStack + shadcn Table) with tone chips and mono money
 * columns, pagination footer, rows linking to their record detail.
 */
export function RegisterTable({
  slug,
  register,
}: {
  slug: string;
  register: RegisterConfig & { rows: RegisterRow[] };
}) {
  const [query, setQuery] = useState("");

  const columns = useMemo<ColumnDef<RegisterRow, unknown>[]>(() => {
    const hrefOf = (row: RegisterRow) =>
      `/admin/${slug}/${encodeURIComponent(cellText(row[0]))}`;
    return register.headers.map((h, i) => ({
      id: String(i),
      accessorFn: (row: RegisterRow) => cellText(row[i]),
      header: h.l,
      enableSorting: false,
      meta: {
        // Applied to both th and td — column alignment + responsive hiding.
        className: cn(
          "px-4 py-0 text-[13px]",
          h.align === "right" && "text-right",
          h.wide ? "hidden xl:table-cell" : "table-cell",
        ),
        headerClassName:
          "h-[38px] whitespace-nowrap bg-adm-sunken py-0 text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted",
      },
      cell: ({ row }) =>
        i === 0 ? (
          // The real link, for keyboard + middle-click.
          <Link
            href={hrefOf(row.original)}
            className="outline-none focus-visible:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <BodyCell cell={row.original[i]} header={h} first avatar={!!register.avatar} />
          </Link>
        ) : (
          <BodyCell cell={row.original[i]} header={h} first={false} avatar={false} />
        ),
    }));
  }, [register, slug]);

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            {register.title}
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">{register.sub}</p>
        </div>
        {register.add ? (
          <Button asChild variant="harvest" className="h-[34px] px-4 text-[13.5px]">
            <Link href={`/admin/${slug}/new`}>{register.add}</Link>
          </Button>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex h-8 w-full max-w-[250px] items-center gap-1.5 rounded-[6px] border-[1.5px] border-adm-line bg-adm-card px-2.5 transition-colors focus-within:border-console">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="#a49b7e" strokeWidth="1.5" />
            <path d="M11 11l3.2 3.2" stroke="#a49b7e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={register.search}
            aria-label={register.search}
            className="h-full w-full min-w-0 rounded-none border-0 bg-transparent p-0 text-[13px] text-adm-ink outline-none placeholder:text-adm-faint focus-visible:ring-0 md:text-[13px]"
          />
        </label>
        {register.filters.map((filter) => (
          // Visual only until the backend supplies real facets.
          <Select key={filter} defaultValue={filter}>
            <SelectTrigger
              aria-label={`Filter by ${filter.toLowerCase()}`}
              className={cn(adminSelectClass, "h-8 w-auto text-[13px] text-adm-muted")}
            >
              {/* Static children keep the label server-rendered (Radix only
                  mirrors item text after hydration). */}
              <SelectValue>{filter}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={filter}>{filter}</SelectItem>
            </SelectContent>
          </Select>
        ))}
      </div>

      <AdminCard className="overflow-hidden">
        <ConsoleDataTable<RegisterRow>
          columns={columns}
          data={register.rows}
          itemNoun="records"
          globalFilter={query}
          rowHref={(row) => `/admin/${slug}/${encodeURIComponent(cellText(row[0]))}`}
          rowClassName={() => "h-11 hover:bg-adm-sunken"}
          emptyState={
            <EmptyState
              variant="plain"
              title={query ? "No matches" : "Nothing here yet"}
              description={
                query
                  ? "Try a different search."
                  : `${register.add ? register.add.replace("+ ", "") : "Records"} will appear here once created.`
              }
            />
          }
        />
      </AdminCard>
    </div>
  );
}
