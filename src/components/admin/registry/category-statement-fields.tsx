"use client";

import { type Control, Controller, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { AdminField, ChoiceCards, adminInputClass } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import {
  STATEMENT_SECTION_LEGEND,
  STATEMENT_SECTION_OPTIONS,
} from "@/lib/statement-section";
import { cn } from "@/lib/utils";
import type { ExpenseCategoryValues } from "@/validations/registry-schema";

/**
 * The two facts about a category the financial statements read.
 *
 * Unasked, every category files as running costs whatever it is: haulage
 * inflates gross profit, and nothing can say that a category is tax rather
 * than a cost of the year. The section is asked as sentences, in the owner's
 * words, because it is the one field on this form that changes what the
 * year's profit says.
 *
 * Shared by the quick-add dialog and the full page form so the question is
 * asked identically in both.
 */
export function CategoryStatementFields({
  control,
  disabled = false,
  errors,
  register,
  readOnlyClass = "",
}: {
  control: Control<ExpenseCategoryValues>;
  disabled?: boolean;
  errors: FieldErrors<ExpenseCategoryValues>;
  register: UseFormRegister<ExpenseCategoryValues>;
  readOnlyClass?: string;
}) {
  return (
    <>
      <Controller
        control={control}
        name="statementSection"
        render={({ field }) => (
          <fieldset disabled={disabled} className="min-w-0 disabled:opacity-100">
            <ChoiceCards
              legend={STATEMENT_SECTION_LEGEND}
              name="statementSection"
              onChange={field.onChange}
              options={STATEMENT_SECTION_OPTIONS}
              value={field.value}
            />
            {errors.statementSection?.message ? (
              <p role="alert" className="mt-1 text-[11px] text-console-red">
                {errors.statementSection.message}
              </p>
            ) : null}
          </fieldset>
        )}
      />
      <AdminField
        label="Heading on the statements"
        optional
        hint="The accountant's wording it prints under, if different from the name - several categories can share one heading."
        error={errors.statementHeading?.message}
      >
        <Input
          placeholder="e.g. Travelling & Transport"
          disabled={disabled}
          className={cn(
            adminInputClass,
            readOnlyClass,
            errors.statementHeading && "border-console-red",
          )}
          {...register("statementHeading")}
        />
      </AdminField>
    </>
  );
}
