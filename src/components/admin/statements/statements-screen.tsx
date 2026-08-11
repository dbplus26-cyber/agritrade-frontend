"use client";

// The financial-statements hub: pick a year, read the pre-generation checks
// and the headline figures the composed book carries, keep the opening
// position current, and generate the bindable PDF - the one-click book the
// owner prints, signs and stamps.
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminLinkClass,
  DetailShell,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  statementPdfUrl,
  useGetOpeningBalanceQuery,
  useGetStatementPeriodsQuery,
  useGetStatementPreviewQuery,
  useSetPeriodStatusMutation,
  useUpsertOpeningBalanceMutation,
} from "@/redux/statements/statements-api";
import type { IStatementPair } from "@/types/statement.types";
import {
  openingBalanceSchema,
  type OpeningBalanceValues,
} from "@/validations/statement-schema";

/** The years worth offering: from the year after opening to the current. */
const yearsFrom = (openingYear: number, now: number): number[] => {
  const years: number[] = [];
  for (let y = now; y > openingYear; y -= 1) years.push(y);
  return years;
};

/** One headline figure off the composed document. */
function Headline({
  label,
  pair,
  strong = false,
}: {
  label: string;
  pair: IStatementPair;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0 border-b border-adm-hairline py-2">
      <p className="text-[11px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        {label}
      </p>
      <Mono
        className={cn(
          "mt-0.5 block text-[15px] text-adm-ink tabular-nums",
          strong && "text-[17px] font-bold",
          pair.current < 0 && "text-console-red",
        )}
      >
        {formatCedis(pair.current)}
      </Mono>
      {pair.prior !== null ? (
        <p className="mt-0.5 text-[11.5px] text-adm-faint">
          prior year <Mono>{formatCedis(pair.prior)}</Mono>
        </p>
      ) : null}
    </div>
  );
}

/** The opening-position form: the one-time starting point the book rolls
 * forward from. Locked server-side once any year is finalised. */
function OpeningBalanceCard() {
  const { data, isLoading } = useGetOpeningBalanceQuery();
  const [save, saveState] = useUpsertOpeningBalanceMutation();
  const [editing, setEditing] = useState(false);
  const opening = data?.data.openingBalance ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OpeningBalanceValues>({
    resolver: zodResolver(openingBalanceSchema),
    values: opening
      ? {
          asOfDate: opening.asOfDate.slice(0, 10),
          cashGhs: String(opening.cashGhs),
          inventoryGhs: String(opening.inventoryGhs),
          notes: opening.notes ?? "",
          payablesGhs: String(opening.payablesGhs),
          receivablesGhs: String(opening.receivablesGhs),
        }
      : undefined,
  });

  const onSubmit = async (values: OpeningBalanceValues) => {
    try {
      await save({
        asOfDate: values.asOfDate,
        cashGhs: Number(values.cashGhs),
        inventoryGhs: Number(values.inventoryGhs),
        notes: values.notes?.trim() ? values.notes.trim() : null,
        payablesGhs: Number(values.payablesGhs),
        receivablesGhs: Number(values.receivablesGhs),
      }).unwrap();
      notify.success("Opening position saved");
      setEditing(false);
    } catch (err) {
      notify.error("Couldn't save the opening position", {
        description: extractApiError(err).message,
      });
    }
  };

  if (isLoading) return null;

  return (
    <AdminCard className="px-5 py-4">
      <SectionHeading
        className="mb-1"
        hint="What the business held the day before its first statement year. Opening capital is derived from these plus the asset register - it is never typed."
        actions={
          !editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
              }}
              className={cn(adminLinkClass, "cursor-pointer text-[12.5px] font-semibold")}
            >
              {opening ? "Edit" : "Enter it"}
            </button>
          ) : null
        }
      >
        Opening position
      </SectionHeading>
      {!editing ? (
        opening ? (
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-x-6 gap-y-2 pt-1">
            {[
              ["As at", opening.asOfDate.slice(0, 10)],
              ["Inventory", formatCedis(opening.inventoryGhs)],
              ["Receivables", formatCedis(opening.receivablesGhs)],
              ["Payables", formatCedis(opening.payablesGhs)],
              ["Cash", formatCedis(opening.cashGhs)],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                  {label}
                </dt>
                <dd className="mt-0.5 text-[13px] text-adm-ink [overflow-wrap:anywhere]">
                  <Mono>{value}</Mono>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="pt-1 text-[13px] text-adm-muted">
            Not entered yet. The book needs its starting point - the balances
            as at 31 December of the year before the first statements.
          </p>
        )
      ) : (
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5 pt-2"
        >
          <AdminField
            label="Balances as at (31 December)"
            error={errors.asOfDate?.message}
          >
            <DateInput
              className={cn(adminInputClass, errors.asOfDate && "border-console-red")}
              {...register("asOfDate")}
            />
          </AdminField>
          <div className="grid gap-5 @min-[420px]:grid-cols-2">
            <AdminField label="Inventory (GHS)" error={errors.inventoryGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.inventoryGhs && "border-console-red")}
                {...register("inventoryGhs")}
              />
            </AdminField>
            <AdminField
              label="Receivables (GHS)"
              error={errors.receivablesGhs?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.receivablesGhs && "border-console-red")}
                {...register("receivablesGhs")}
              />
            </AdminField>
            <AdminField label="Payables (GHS)" error={errors.payablesGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.payablesGhs && "border-console-red")}
                {...register("payablesGhs")}
              />
            </AdminField>
            <AdminField label="Cash & bank (GHS)" error={errors.cashGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.cashGhs && "border-console-red")}
                {...register("cashGhs")}
              />
            </AdminField>
          </div>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              className="px-3.5"
              onClick={() => {
                reset();
                setEditing(false);
              }}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={saveState.isLoading} size="lg">
              {saveState.isLoading ? "Saving…" : "Save opening position"}
            </AdminButton>
          </div>
        </form>
      )}
    </AdminCard>
  );
}

export function StatementsScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const opening = useGetOpeningBalanceQuery();
  const periods = useGetStatementPeriodsQuery();
  const [setStatus] = useSetPeriodStatusMutation();
  const { confirm, confirmationDialog } = useConfirm();

  const openingYear = opening.data?.data.openingBalance
    ? Number(opening.data.data.openingBalance.asOfDate.slice(0, 4))
    : null;
  const hasOpening = openingYear !== null;
  const preview = useGetStatementPreviewQuery(year, { skip: !hasOpening });

  const period = periods.data?.data.periods.find((p) => p.year === year);
  const isFinal = period?.status === "FINAL";
  const statement = preview.data?.data.statement;
  const errors = statement?.checks.filter((c) => c.level === "error") ?? [];
  const warnings = statement?.checks.filter((c) => c.level === "warning") ?? [];

  const onToggleFinal = async () => {
    const finalising = !isFinal;
    const ok = await confirm({
      title: finalising ? `Mark ${String(year)} final?` : `Reopen ${String(year)}?`,
      description: finalising
        ? "The DRAFT watermark comes off the generated book and the opening position locks. You can reopen the year later."
        : "The year goes back to draft: generated books carry the DRAFT watermark again and the opening position unlocks.",
      confirmText: finalising ? "Mark final" : "Reopen",
    });
    if (!ok) return;
    try {
      await setStatus({ status: finalising ? "FINAL" : "DRAFT", year }).unwrap();
      notify.success(finalising ? "Year marked final" : "Year reopened");
    } catch (err) {
      notify.error("Couldn't change the year's status", {
        description: extractApiError(err).message,
      });
    }
  };

  if (opening.isLoading) return <DetailSkeleton facts={6} />;

  const years = hasOpening ? yearsFrom(openingYear, currentYear) : [];

  return (
    <div className="max-w-[1120px]">
      <AdminPageHeader
        title="Financial Statements"
        hint="The complete statement book - income, position, cash flow and notes - generated from the records and printed for signature."
        sub="Generate the bindable statement book for a year, ready to print, sign and stamp"
        actions={
          hasOpening ? (
            <label className="flex items-center gap-2 text-[12.5px] text-adm-muted">
              Year
              <SimpleSelect
                value={String(year)}
                onChange={(v) => {
                  setYear(Number(v));
                }}
                className="h-[34px] cursor-pointer rounded-none border border-adm-line bg-adm-card px-2.5 text-[13.5px] font-semibold text-adm-ink outline-none focus:border-console"
                options={years.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
              />
            </label>
          ) : undefined
        }
      />

      <DetailShell
        asideFirstOnStack={false}
        main={
          <div className="flex flex-col gap-4">
            {!hasOpening ? (
              <AdminCard className="px-5 py-5">
                <SectionHeading className="mb-1">Start here</SectionHeading>
                <p className="text-[13.5px] leading-[1.6] text-adm-body">
                  The statements roll forward from a one-time opening position.
                  Enter it in the panel on the right, add your fixed assets to
                  the{" "}
                  <Link href="/admin/fixed-assets" className={adminLinkClass}>
                    asset register
                  </Link>
                  , and the book generates from there.
                </p>
              </AdminCard>
            ) : preview.isLoading ? (
              <AdminCard className="px-5 py-5">
                <p className="text-[13px] text-adm-muted">
                  Composing {year}
                  &hellip;
                </p>
              </AdminCard>
            ) : preview.isError ? (
              <ErrorMessage
                description={extractApiError(preview.error).message}
                onRetry={() => void preview.refetch()}
              />
            ) : statement ? (
              <>
                {/* Checks first: nothing should be printed past a red flag. */}
                {errors.length > 0 || warnings.length > 0 ? (
                  <AdminCard className="px-5 py-4">
                    <SectionHeading className="mb-2">
                      Before you print
                    </SectionHeading>
                    <ul className="flex flex-col gap-2">
                      {[...errors, ...warnings].map((check) => (
                        <li
                          key={check.code}
                          className={cn(
                            "rounded-none border px-3 py-2 text-[12.5px] leading-[1.55]",
                            check.level === "error"
                              ? "border-console-red/40 bg-console-red/5 text-console-red-deep"
                              : "border-console-gold/40 bg-console-gold/5 text-adm-body",
                          )}
                        >
                          {check.message}
                        </li>
                      ))}
                    </ul>
                  </AdminCard>
                ) : null}

                <AdminCard className="px-5 py-4">
                  <SectionHeading
                    className="mb-1"
                    actions={<ToneBadge tone={isFinal ? "leaf" : "harvest"}>{isFinal ? "Final" : "Draft"}</ToneBadge>}
                  >
                    The {year} book at a glance
                  </SectionHeading>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-8">
                    <Headline label="Turnover" pair={statement.income.turnover} />
                    <Headline
                      label="Gross profit"
                      pair={statement.income.grossProfit}
                    />
                    <Headline
                      label="Profit before tax"
                      pair={statement.income.profitBeforeTax}
                    />
                    <Headline
                      label="Tax provision"
                      pair={statement.income.taxProvision}
                    />
                    <Headline
                      label="Net profit after tax"
                      pair={statement.income.netProfitAfterTax}
                      strong
                    />
                    <Headline
                      label="Total assets"
                      pair={statement.position.totalAssets}
                    />
                    <Headline
                      label="Proprietor's capital"
                      pair={statement.capitalAccount.closing}
                    />
                    <Headline label="Cash position" pair={statement.position.cash} />
                  </div>
                </AdminCard>

                <AdminCard className="px-5 py-4">
                  <SectionHeading
                    className="mb-1"
                    hint="Opens the full bindable book: cover, contents, certificate of representation, the three statements and every note. Print it, bind it, sign the certificate and stamp it."
                  >
                    Generate the book
                  </SectionHeading>
                  <p className="mb-3 text-[12.5px] leading-[1.55] text-adm-muted">
                    {isFinal
                      ? "This year is final - the book prints clean, with no watermark."
                      : "The year is still draft: every page carries a DRAFT watermark until you mark it final."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton asChild disabled={errors.length > 0}>
                      <a
                        href={statementPdfUrl(year)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Generate statements (PDF)
                      </a>
                    </AdminButton>
                    <AdminButton
                      variant={isFinal ? "outline" : "gold"}
                      onClick={() => void onToggleFinal()}
                    >
                      {isFinal ? "Reopen the year" : "Mark year final"}
                    </AdminButton>
                  </div>
                </AdminCard>
              </>
            ) : null}
          </div>
        }
        aside={
          <div className="flex flex-col gap-4">
            <OpeningBalanceCard />
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">The inputs</SectionHeading>
              <ul className="flex flex-col gap-2 text-[13px]">
                <li>
                  <Link href="/admin/fixed-assets" className={adminLinkClass}>
                    Fixed-asset register
                  </Link>
                  <span className="text-adm-muted">
                    {" "}
                    - drives the PPE note, depreciation and capital allowances.
                  </span>
                </li>
                <li>
                  <Link href="/admin/drawings" className={adminLinkClass}>
                    Drawings ledger
                  </Link>
                  <span className="text-adm-muted">
                    {" "}
                    - the proprietor&rsquo;s withdrawals, on the capital account.
                  </span>
                </li>
                <li>
                  <Link
                    href="/admin/expense-categories"
                    className={adminLinkClass}
                  >
                    Expense categories
                  </Link>
                  <span className="text-adm-muted">
                    {" "}
                    - each carries the statement heading it files under.
                  </span>
                </li>
                <li>
                  <Link
                    href="/admin/statement-settings"
                    className={adminLinkClass}
                  >
                    Statement settings
                  </Link>
                  <span className="text-adm-muted">
                    {" "}
                    - the business name, logo, proprietor, bankers and
                    accountants the books print.
                  </span>
                </li>
              </ul>
            </AdminCard>
          </div>
        }
      />
      {confirmationDialog}
    </div>
  );
}
