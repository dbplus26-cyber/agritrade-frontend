"use client";

import { DateInput } from "@/components/ui/date-input";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateMyExpenseMutation,
  useGetAgentExpenseCategoriesQuery,
  useGetMyPurchasesQuery,
} from "@/redux/agent/agent-api";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  COST_TREATMENT_LEGEND,
  COST_TREATMENT_OPTIONS,
  treatmentToCapitalise,
} from "@/lib/cost-treatment";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { PURCHASE_VOIDED_CODE, PurchaseStatus } from "@/types/purchase.types";
import {
  agentExpenseSchema,
  type AgentExpenseValues,
} from "@/validations/float-schema";
import { clearDraft, draftKey, loadDraft, saveDraft } from "./draft-storage";
import {
  AgentFieldError,
  agentInputClass,
  AgentLabel,
  AgentSubmitError,
} from "./agent-form-bits";

const DRAFT_KEY = "dbplus.agent.expense.draft";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * How many of the agent's own purchases the picker offers. Field costs are
 * run up against the loads of the last few days, so a short recent page is
 * the whole answer nearly every time and keeps the request small on a
 * village line; anything older is the office's job to attribute.
 */
const RECENT_PURCHASES = 20;

/**
 * Radix reserves the empty string, so "not for a purchase" needs a value of
 * its own in the picker; it is turned back into "" before it reaches the form
 * so the draft and the payload never learn the sentinel.
 */
const NO_PURCHASE = "__none__";
const NO_PURCHASE_LABEL = "Not for a particular purchase";

/**
 * The server's refusals, in the words the person on the phone can act on.
 * A 404 here has one meaning - the picked purchase is not this agent's, or
 * has since been removed - and the generic "couldn't find what you were
 * looking for" would send them hunting through the wrong screen.
 */
const purchaseRefusal = (status: number | string | undefined, code?: string) =>
  code === PURCHASE_VOIDED_CODE
    ? "That purchase was voided, so nothing more can be charged to it."
    : status === 404
      ? "That purchase is not one of yours, or was removed. Choose it again."
      : null;

/** Field expense off the float (porters, offloading) - same retry-safe
 * draft + idempotency contract as the purchase form. */
export function AgentExpenseForm() {
  const router = useRouter();
  const [createExpense, { isLoading }] = useCreateMyExpenseMutation();
  const categories = useGetAgentExpenseCategoriesQuery();
  const purchases = useGetMyPurchasesQuery({ limit: RECENT_PURCHASES });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKey = useMemo(
    () => draftKey<AgentExpenseValues>(DRAFT_KEY),
    [],
  );
  const draft = useMemo(() => loadDraft<AgentExpenseValues>(DRAFT_KEY), []);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgentExpenseValues>({
    resolver: zodResolver(agentExpenseSchema),
    // Spread over the defaults rather than replacing them, so a draft saved
    // on this phone by an older build of the form still loads whole.
    defaultValues: {
      categoryId: "",
      purchaseId: "",
      treatment: "goods",
      amountGhs: "",
      description: "",
      incurredAt: today(),
      ...draft?.values,
    },
  });

  // Gated after success for the same reason as the purchase form: the last
  // pre-unmount re-render otherwise re-saves the cleared draft with its
  // SPENT idempotency key, and the next expense silently replays into this
  // one on the backend.
  const submitted = useRef(false);
  const values = watch();
  const forPurchase = Boolean(values.purchaseId);
  useEffect(() => {
    if (submitted.current) return;
    saveDraft(DRAFT_KEY, { key: idempotencyKey, values });
  }, [idempotencyKey, values]);

  const onSubmit = async (v: AgentExpenseValues) => {
    setSubmitError(null);
    try {
      // Both attribution keys travel together or not at all: an ordinary
      // field cost carries neither, and the treatment is only a fact once a
      // purchase is named.
      const treatment = v.treatment ?? "goods";
      const attribution = v.purchaseId
        ? { purchaseId: v.purchaseId, capitalise: treatmentToCapitalise(treatment) }
        : {};
      await createExpense({
        body: {
          categoryId: v.categoryId,
          amountGhs: Number(v.amountGhs),
          incurredAt: v.incurredAt,
          ...(v.description?.trim()
            ? { description: v.description.trim() }
            : {}),
          ...attribution,
        },
        idempotencyKey,
      }).unwrap();
      submitted.current = true;
      clearDraft(DRAFT_KEY);
      notify.success(
        !v.purchaseId
          ? "Expense recorded off your float"
          : treatmentToCapitalise(treatment)
            ? "Recorded - it is now part of what those goods cost"
            : "Recorded as a cost of this month",
      );
      router.replace("/agent");
    } catch (err) {
      const { code, message, status } = extractApiError(err);
      setSubmitError(
        (v.purchaseId ? purchaseRefusal(status, code) : null) ?? message,
      );
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3.5"
    >
      <div>
        <AgentLabel htmlFor="categoryId">Category</AgentLabel>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <SimpleSelect
              id="categoryId"
              className={cn(agentInputClass, errors.categoryId && "border-error")}
              value={field.value}
              onChange={field.onChange}
              placeholder="Choose a category…"
              options={(categories.data?.data.expenseCategories ?? []).map(
                (c) => ({ value: c.id, label: c.name }),
              )}
            />
          )}
        />
        <AgentFieldError message={errors.categoryId?.message} />
      </div>

      <div>
        <AgentLabel htmlFor="purchaseId" optional>
          For a purchase?
        </AgentLabel>
        <Controller
          control={control}
          name="purchaseId"
          render={({ field }) => (
            <SimpleSelect
              id="purchaseId"
              className={agentInputClass}
              value={field.value || NO_PURCHASE}
              onChange={(v) => field.onChange(v === NO_PURCHASE ? "" : v)}
              placeholder="Choose the purchase"
              options={[
                { value: NO_PURCHASE, label: NO_PURCHASE_LABEL },
                ...(purchases.isLoading
                  ? [
                      {
                        value: "__loading__",
                        label: "Loading your purchases…",
                        disabled: true,
                      },
                    ]
                  : []),
                // A voided load cannot take a cost, so it is not offered.
                ...(purchases.data?.data ?? [])
                  .filter((p) => p.status !== PurchaseStatus.VOIDED)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.transactionNo} - ${p.commodity.name} ${formatKg(p.weightKg)}`,
                  })),
              ]}
            />
          )}
        />
        <p className="mt-1 text-[11.5px] text-soil/80">
          Haulage, loading or porters for one load? Name the load, so the cost
          sits with those goods.
        </p>
      </div>

      {forPurchase ? (
        <fieldset className="rounded border border-soil/35 bg-paper px-3 py-2.5">
          <legend className="px-1 text-[12px] font-semibold text-soil">
            {COST_TREATMENT_LEGEND}
          </legend>
          <div className="flex flex-col gap-2.5">
            {COST_TREATMENT_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-start gap-2.5 text-ink"
              >
                <input
                  type="radio"
                  value={o.value}
                  className="mt-0.5 size-4 shrink-0 accent-forest"
                  {...register("treatment")}
                />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-soil/80">
                    {o.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-soil/80">
            Decided once. It cannot be changed after the expense is saved.
          </p>
        </fieldset>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <AgentLabel htmlFor="amountGhs">Amount (GH₵)</AgentLabel>
          <input
            id="amountGhs"
            inputMode="decimal"
            placeholder="e.g. 40"
            className={cn(agentInputClass, errors.amountGhs && "border-error")}
            {...register("amountGhs")}
          />
          <AgentFieldError message={errors.amountGhs?.message} />
        </div>
        <div>
          <AgentLabel htmlFor="incurredAt">Date</AgentLabel>
          <DateInput
            id="incurredAt"
            placeholder="Pick the day it was paid"
            className={cn(agentInputClass, errors.incurredAt && "border-error")}
            {...register("incurredAt")}
          />
          <AgentFieldError message={errors.incurredAt?.message} />
        </div>
      </div>

      <div>
        <AgentLabel htmlFor="description" optional>
          What was it for?
        </AgentLabel>
        <input
          id="description"
          placeholder="e.g. Porters at Savelugu"
          className={cn(agentInputClass, errors.description && "border-error")}
          {...register("description")}
        />
        <AgentFieldError message={errors.description?.message} />
      </div>

      <AgentSubmitError message={submitError} />

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-none bg-forest px-4 py-3.5 text-[15px] font-semibold text-paper transition-colors hover:bg-board disabled:opacity-60"
      >
        {isLoading ? "Recording…" : "Record expense"}
      </button>
      <p className="text-center text-[11.5px] text-soil/80">
        Bad network? Your entry is saved on this phone - just press the button
        again. It can never charge your float twice.
      </p>
    </form>
  );
}
