"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AdminButton,
  AdminCard,
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
  ToneBadge,
} from "@/components/admin/ui";
import {
  avatarOf,
  cellText,
  isTagCell,
  type RegisterConfig,
  type RegisterRow,
} from "@/static-data/admin/registers";

/** The design's destructive dialog: a checkbox gates the red button.
 * shadcn Dialog restyled to the console's red-tinted destructive look. */
function DeleteDialog({
  refText,
  registerTitle,
  onCancel,
  onConfirm,
}: {
  refText: string;
  registerTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-80 bg-[rgb(11_15_20/0.45)] supports-backdrop-filter:backdrop-blur-none"
        className="font-admin z-81 block w-[min(420px,calc(100vw-32px))] max-w-none overflow-hidden rounded-none bg-adm-card p-0 text-adm-ink shadow-[0_12px_40px_rgb(11_15_20/0.18)] ring-0 sm:max-w-none"
      >
        <div className="flex items-center gap-2.5 border-b border-[#E5C4BF] bg-[#F8E9E7] px-5 py-3.5">
          <span
            aria-hidden="true"
            className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-console-red text-[14px] font-bold text-white"
          >
            !
          </span>
          <DialogTitle className="font-admin text-[15px] leading-normal font-bold text-console-red-deep">
            Delete {refText}
          </DialogTitle>
        </div>
        <div className="px-5 py-4.5">
          <DialogDescription className="text-[14px] leading-[1.55] text-adm-ink">
            This permanently removes <strong>{refText}</strong> from {registerTitle}. Linked
            records keep their history in the audit log.
          </DialogDescription>
          <label className="mt-3.5 flex cursor-pointer items-start gap-2 text-[13px] text-adm-muted">
            <Checkbox
              checked={checked}
              onCheckedChange={(next) => setChecked(next === true)}
              className="mt-0.5 size-[15px] data-checked:border-console-red data-checked:bg-console-red data-checked:text-white"
            />
            <span>I understand this cannot be undone.</span>
          </label>
        </div>
        <DialogFooter className="mx-0 mb-0 flex-row justify-end gap-2 rounded-none border-t border-adm-hairline bg-adm-sunken px-5 py-3.5">
          <AdminButton variant="secondary" onClick={onCancel}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" disabled={!checked} onClick={onConfirm}>
            Delete
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The one record-detail template: ref header with tone chip and big figures,
 * label/value field grid, optional ledger card, Edit link and gated Delete.
 */
export function RecordDetail({
  slug,
  register,
  row,
}: {
  slug: string;
  register: RegisterConfig;
  row: RegisterRow;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const refText = cellText(row[0]);
  const tagIdx = register.headers.findIndex((h) => h.tag);
  const tagCell = tagIdx >= 0 ? row[tagIdx] : undefined;
  const tag = tagCell !== undefined && isTagCell(tagCell) ? tagCell : null;
  const av = register.avatar ? avatarOf(refText) : null;
  const figs = register.figs.map((i) => {
    const cell = row[i];
    const styled = cell !== undefined && typeof cell === "object" && !isTagCell(cell) ? cell : null;
    return {
      label: register.headers[i].l,
      value: cellText(cell) || "—",
      color: styled?.c ?? "#161c24",
    };
  });
  const fields = register.headers
    .map((h, i) => (h.tag ? null : { label: h.l, value: cellText(row[i]) || "—" }))
    .filter((f): f is { label: string; value: string } => f !== null);

  const confirmDelete = () => {
    setDeleting(false);
    notify.success(`${refText} deleted`);
    router.push(`/admin/${slug}`);
  };

  const ledger = register.ledger;

  const recordCard = (
    <AdminCard className="px-5 py-3.5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-adm-muted">
        Record
      </div>
      <DetailGrid columns={ledger ? 2 : 3}>
        {fields.map((field) => (
          <DetailItem key={field.label} label={field.label}>
            <span className="font-medium tabular-nums">{field.value}</span>
          </DetailItem>
        ))}
      </DetailGrid>
    </AdminCard>
  );

  const ledgerCard = ledger ? (
    <AdminCard className="overflow-hidden">
      <div className="border-b border-adm-hairline px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-adm-muted">
        {ledger.title}
      </div>
      <div className="grid h-8 grid-cols-[96px_1fr_auto] items-center gap-3 border-b border-adm-line bg-adm-sunken px-5 text-[10px] font-bold uppercase tracking-[0.09em] text-adm-muted md:grid-cols-[96px_1fr_auto_auto]">
        <span>Date</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
        <span className="hidden text-right md:block">Balance</span>
      </div>
      {ledger.rows.map((entry) => (
        <div
          key={`${entry.date}-${entry.desc}`}
          className="grid h-[42px] grid-cols-[96px_1fr_auto] items-center gap-3 border-b border-adm-hairline px-5 text-[13px] last:border-0 md:grid-cols-[96px_1fr_auto_auto]"
        >
          <span className="whitespace-nowrap text-adm-muted">{entry.date}</span>
          <span className="truncate text-adm-ink">{entry.desc}</span>
          <Mono className="text-right font-semibold whitespace-nowrap">
            <span style={{ color: entry.amtColor }}>{entry.amount}</span>
          </Mono>
          <Mono className="hidden text-right whitespace-nowrap text-adm-muted md:block">
            {entry.after}
          </Mono>
        </div>
      ))}
    </AdminCard>
  ) : null;

  return (
    <div className="max-w-[1120px]">
      <Link
        href={`/admin/${slug}`}
        className="mb-2.5 inline-block text-[13px] font-semibold text-console hover:underline"
      >
        ← {register.title}
      </Link>

      <AdminCard className="mb-4 px-5 py-4.5">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div className="flex min-w-0 items-start gap-3">
            {av ? (
              <span
                aria-hidden="true"
                className="font-adminmono mt-0.5 inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-[15px] font-bold"
                style={{ background: av.bg, color: av.fg }}
              >
                {av.init}
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[20px] font-bold tracking-[-0.01em] text-adm-ink">
                  {register.single} — {refText}
                </h1>
                {tag ? <ToneBadge tone={tag.tone}>{tag.t}</ToneBadge> : null}
              </div>
              <p className="mt-1 text-[12.5px] text-adm-muted">{register.sub}</p>
            </div>
          </div>
          {!register.readOnly ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/${slug}/${encodeURIComponent(refText)}/edit`}
                className="inline-flex h-[34px] items-center whitespace-nowrap rounded-[6px] bg-console px-4 text-[13px] font-semibold text-white transition-colors hover:bg-console-deep"
              >
                Edit
              </Link>
              <AdminButton
                variant="secondary"
                className="h-[34px] border-[#E5C4BF] text-[13px] text-console-red hover:bg-[#FBF3F2]"
                onClick={() => setDeleting(true)}
              >
                Delete
              </AdminButton>
            </div>
          ) : null}
        </div>
        {figs.length > 0 ? (
          <div
            className="mt-4 grid gap-3 border-t border-adm-hairline pt-4"
            style={{ gridTemplateColumns: `repeat(${figs.length}, minmax(0, 1fr))` }}
          >
            {figs.map((fig) => (
              <div key={fig.label}>
                <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-adm-muted">
                  {fig.label}
                </div>
                <Mono className="text-[19px] font-bold whitespace-nowrap">
                  <span style={{ color: fig.color }}>{fig.value}</span>
                </Mono>
              </div>
            ))}
          </div>
        ) : null}
      </AdminCard>

      {ledgerCard ? (
        <DetailShell main={ledgerCard} aside={recordCard} />
      ) : (
        recordCard
      )}

      {deleting ? (
        <DeleteDialog
          refText={refText}
          registerTitle={register.title}
          onCancel={() => setDeleting(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}
