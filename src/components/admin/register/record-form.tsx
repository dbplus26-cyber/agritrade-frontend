"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { Input } from "@/components/ui/input";
import { AdminButton, AdminCard, adminInputClass } from "@/components/admin/ui";
import {
  cellText,
  type RegisterConfig,
  type RegisterRow,
} from "@/static-data/admin/registers";

/** Field placeholders from the design, keyed by column label. */
const PLACEHOLDERS: Record<string, string> = {
  Lot: "LOT-0456",
  Ref: "Auto-numbered — e.g. E-0232",
  Plot: "PL-016",
  Date: "11 Jul 2026",
  Phone: "024 000 0000",
  Agent: "Full name — e.g. Ibrahim Fuseini",
  Farmer: "Full name — e.g. Abukari Yakubu",
  Supplier: "Business or person — e.g. Tia Farms",
  Buyer: "Company — e.g. Premium Foods Ltd",
  User: "Full name",
  Location: "Town or suburb — e.g. Vittin",
  Community: "e.g. Kumbungu",
  Warehouse: "e.g. Main WH, Tamale",
  Commodity: "e.g. Maize (white)",
  Weight: "e.g. 12,400 kg",
  Size: "e.g. 100 × 80 ft",
  Season: "e.g. 2026 Wet",
  Crop: "e.g. Maize",
  Type: "Inputs or cash",
  Method: "Mobile money, produce, cash…",
  Category: "Transport, Repairs, Loading…",
  Description: "What was this for?",
  Role: "Owner, Office or Agent",
  Visibility: "Full, Hidden or Own only",
  "Last active": "—",
  "Buys YTD": "0",
  "Sales YTD": "0",
  Farmers: "0",
  "Buys 30d": "0",
  "Volume 30d": "e.g. 12,400 kg",
};

/**
 * The one record-form template, generated from the register's headers (tag
 * columns are skipped — status comes from the workflow, not typing). Serves
 * both "new" (blank) and "edit" (prefilled from the row).
 */
export function RecordForm({
  slug,
  register,
  mode,
  row,
}: {
  slug: string;
  register: RegisterConfig;
  mode: "new" | "edit";
  row?: RegisterRow;
}) {
  const router = useRouter();

  const fields = register.headers
    .map((h, index) => (h.tag ? null : { ...h, index, required: index === 0 || !!h.money }))
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const [values, setValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    if (mode === "edit" && row) {
      for (const f of fields) {
        let v = cellText(row[f.index]);
        if (f.money) v = v.replace(/GH₵\s*/g, "").trim();
        initial[f.index] = v;
      }
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<number, boolean>>({});
  const [status, setStatus] = useState<"idle" | "error" | "saving">("idle");

  const refText = row ? cellText(row[0]) : "";
  const backHref =
    mode === "edit"
      ? `/admin/${slug}/${encodeURIComponent(refText)}`
      : `/admin/${slug}`;
  const errorCount = Object.values(errors).filter(Boolean).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "saving") return;
    const errs: Record<number, boolean> = {};
    for (const f of fields) {
      if (f.required && !(values[f.index] ?? "").trim()) errs[f.index] = true;
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatus("error");
      return;
    }
    setStatus("saving");
    // Stub until the backend lands — pretend to save, then head back.
    window.setTimeout(() => {
      notify.success(`${register.single} ${mode === "edit" ? "updated" : "created"}`);
      router.push(backHref);
    }, 800);
  };

  return (
    <div className="max-w-[560px]">
      <Link
        href={backHref}
        className="mb-2.5 inline-block text-[13px] font-semibold text-console hover:underline"
      >
        ← {register.title}
      </Link>
      <h1 className="mb-1 text-[22px] font-bold tracking-[-0.01em] text-ink">
        {mode === "edit"
          ? `Edit ${register.single.toLowerCase()} — ${refText}`
          : `New ${register.single.toLowerCase()}`}
      </h1>
      <p className="mb-4.5 text-[13px] text-soil">
        {mode === "edit" ? "Changes are logged in the audit trail" : register.sub}
      </p>

      <form onSubmit={submit} noValidate>
        {status === "error" && errorCount > 0 ? (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-[8px] border border-[#E5C4BF] bg-[#F8E9E7] px-3.5 py-3 text-[13px] text-console-red-deep"
          >
            <span className="font-bold">!</span>
            <span>
              Fix the highlighted field{errorCount > 1 ? "s" : ""} before saving.
            </span>
          </div>
        ) : null}

        <AdminCard className="flex flex-col gap-3.5 p-5">
          {fields.map((f) => {
            const hasError = !!errors[f.index];
            const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
              setValues((v) => ({ ...v, [f.index]: e.target.value }));
              setErrors((prev) => ({ ...prev, [f.index]: false }));
            };
            return (
              <div key={f.index}>
                <label
                  htmlFor={`reg-field-${f.index}`}
                  className="mb-[5px] block text-[13px] font-semibold text-soil"
                >
                  {f.l}
                  {f.required ? <span className="text-console-red"> *</span> : null}
                </label>
                {f.money ? (
                  <div
                    className={cn(
                      "flex h-[38px] items-center overflow-hidden rounded-[6px] border bg-paper focus-within:border-console focus-within:shadow-[0_0_0_3px_rgb(30_61_43/0.15)]",
                      hasError ? "border-console-red" : "border-soil/35",
                    )}
                  >
                    <span className="flex h-full items-center border-r border-soil/25 bg-surface-alt/70 px-2.5 text-[13px] text-soil">
                      GH₵
                    </span>
                    <Input
                      id={`reg-field-${f.index}`}
                      value={values[f.index] ?? ""}
                      onChange={onChange}
                      placeholder="0.00"
                      inputMode="decimal"
                      aria-invalid={hasError || undefined}
                      className="font-adminmono h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2.5 py-0 text-right text-[14px] tabular-nums text-ink outline-none placeholder:text-soil/70 focus-visible:ring-0 aria-invalid:ring-0"
                    />
                  </div>
                ) : (
                  <Input
                    id={`reg-field-${f.index}`}
                    type="text"
                    value={values[f.index] ?? ""}
                    onChange={onChange}
                    placeholder={PLACEHOLDERS[f.l] ?? `Enter ${f.l.toLowerCase()}`}
                    aria-invalid={hasError || undefined}
                    className={cn(
                      adminInputClass,
                      hasError &&
                        "border-console-red aria-invalid:border-console-red aria-invalid:ring-0",
                    )}
                  />
                )}
                {hasError ? (
                  <p className="mt-1 text-[12px] text-console-red">
                    Enter {f.money ? "the amount in cedis" : f.l.toLowerCase()}.
                  </p>
                ) : null}
              </div>
            );
          })}
        </AdminCard>

        <div className="mt-4 flex gap-2.5">
          <AdminButton
            type="submit"
            variant="primary"
            className="h-10 px-5 text-[14px]"
            disabled={status === "saving"}
          >
            {status === "saving" ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
          </AdminButton>
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-[6px] border border-soil/35 bg-paper px-4.5 text-[14px] font-semibold text-soil transition-colors hover:bg-surface-alt/70"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
