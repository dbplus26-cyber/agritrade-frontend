"use client";

import { Controller, type Control, type FieldErrors, type Path, type UseFormRegister } from "react-hook-form";
import { AdminField, adminInputClass, adminSelectClass } from "@/components/admin/ui";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { SimpleSelect } from "@/components/ui/simple-select";
import { PAYMENT_METHOD_OPTIONS } from "@/components/admin/trading/sale-bits";
import type { ExpensePaymentValues } from "@/validations/expense-payment-fields";
import { cn } from "@/lib/utils";

/** The two answers to "has this been paid", in the order they are given. */
const PAID_CHOICES = [
  { label: "Paid now", value: true },
  { label: "Paying later", value: false },
] as const;

/**
 * The payment half of a cost form: has it been paid, how, out of which
 * account, against which reference.
 *
 * One component for the three screens that record a cost - the expenses
 * register, a purchase, a trip - because the question is the same question and
 * a person who learns it in one place should not meet a different shape of it
 * in the next. It also keeps the rules together with the controls they belong
 * to: the account picker narrows by method, and the reference is optional for
 * cash, both of which the server enforces and neither of which is guessable
 * from the field names.
 */
export function ExpensePaymentFields<T extends ExpensePaymentValues>({
  control,
  errors,
  idPrefix,
  method,
  owedNote,
  paidNow,
  register,
}: {
  control: Control<T>;
  errors: FieldErrors<T>;
  /** Distinguishes this form's inputs when two live on one page. */
  idPrefix: string;
  method: "BANK" | "CASH" | "MOMO";
  /** What the screen says happens when the cost is left owed. */
  owedNote: string;
  paidNow: boolean;
  register: UseFormRegister<T>;
}) {
  const fieldError = (name: "paymentAccountId" | "reference"): string | undefined =>
    (errors[name as keyof FieldErrors<T>] as { message?: string } | undefined)
      ?.message;

  return (
    <section className="grid gap-5 border-t border-adm-hairline pt-5">
      {/* Two taps, both thumb-sized and side by side at every width: this is
          the question the whole screen turns on, and it is answered far more
          often than it is read. */}
      <div>
        <span className="mb-1 flex text-[11.5px] font-semibold text-adm-ink">
          Has this been paid?
        </span>
        <Controller
          control={control}
          name={"paidNow" as Path<T>}
          render={({ field }) => (
            <div
              aria-label="Has this been paid?"
              className="grid grid-cols-2 gap-2"
              role="group"
            >
              {PAID_CHOICES.map((choice) => (
                <button
                  aria-pressed={field.value === choice.value}
                  className={cn(
                    "min-h-[44px] cursor-pointer rounded-none border px-3 text-[11.5px] font-semibold transition-colors",
                    field.value === choice.value
                      ? "border-console bg-console text-white"
                      : "border-adm-line bg-adm-card text-adm-body hover:bg-adm-sunken",
                  )}
                  key={choice.label}
                  onClick={() => {
                    field.onChange(choice.value);
                  }}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {paidNow ? (
        <>
          <AdminField label="How it was paid">
            <Controller
              control={control}
              name={"method" as Path<T>}
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  id={`${idPrefix}-method`}
                  onChange={field.onChange}
                  placeholder="Choose how it was paid"
                  options={PAYMENT_METHOD_OPTIONS}
                  value={field.value as string}
                />
              )}
            />
          </AdminField>

          {/* Offered for cash too: somebody who pays for a repair out of the
              money they are holding is where that money went, and booking it
              to the office till says the cash is in a box it left. */}
          <Controller
            control={control}
            name={"paymentAccountId" as Path<T>}
            render={({ field }) => (
              <PaymentAccountField
                direction="out"
                error={fieldError("paymentAccountId")}
                method={method}
                onChange={field.onChange}
                value={field.value as string}
              />
            )}
          />

          <AdminField
            error={fieldError("reference")}
            hint="The transfer or MoMo id. Recording the same one twice against this cost is refused."
            label="Reference"
            optional={method === "CASH"}
          >
            <input
              className={adminInputClass}
              id={`${idPrefix}-reference`}
              placeholder="e.g. TRF884512"
              {...register("reference" as Path<T>)}
            />
          </AdminField>
        </>
      ) : (
        <p className="text-[11px] text-adm-muted">{owedNote}</p>
      )}
    </section>
  );
}
