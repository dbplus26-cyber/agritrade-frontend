"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateMyExpenseMutation,
  useGetAgentExpenseCategoriesQuery,
} from "@/redux/agent/agent-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
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

/** Field expense off the float (porters, offloading) - same retry-safe
 * draft + idempotency contract as the purchase form. */
export function AgentExpenseForm() {
  const router = useRouter();
  const [createExpense, { isLoading }] = useCreateMyExpenseMutation();
  const categories = useGetAgentExpenseCategoriesQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKey = useMemo(
    () => draftKey<AgentExpenseValues>(DRAFT_KEY),
    [],
  );
  const draft = useMemo(() => loadDraft<AgentExpenseValues>(DRAFT_KEY), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgentExpenseValues>({
    resolver: zodResolver(agentExpenseSchema),
    defaultValues: draft?.values ?? {
      categoryId: "",
      amountGhs: "",
      description: "",
      incurredAt: today(),
    },
  });

  // Gated after success for the same reason as the purchase form: the last
  // pre-unmount re-render otherwise re-saves the cleared draft with its
  // SPENT idempotency key, and the next expense silently replays into this
  // one on the backend.
  const submitted = useRef(false);
  const values = watch();
  useEffect(() => {
    if (submitted.current) return;
    saveDraft(DRAFT_KEY, { key: idempotencyKey, values });
  }, [idempotencyKey, values]);

  const onSubmit = async (v: AgentExpenseValues) => {
    setSubmitError(null);
    try {
      await createExpense({
        body: {
          categoryId: v.categoryId,
          amountGhs: Number(v.amountGhs),
          incurredAt: v.incurredAt,
          ...(v.description?.trim()
            ? { description: v.description.trim() }
            : {}),
        },
        idempotencyKey,
      }).unwrap();
      submitted.current = true;
      clearDraft(DRAFT_KEY);
      notify.success("Expense recorded off your float");
      router.replace("/agent");
    } catch (err) {
      setSubmitError(extractApiError(err).message);
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
        <select
          id="categoryId"
          className={cn(agentInputClass, errors.categoryId && "border-error")}
          {...register("categoryId")}
        >
          <option value="">Choose…</option>
          {(categories.data?.data.expenseCategories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <AgentFieldError message={errors.categoryId?.message} />
      </div>

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
          <input
            id="incurredAt"
            type="date"
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
        className="rounded-lg bg-forest px-4 py-3.5 text-[15px] font-semibold text-paper transition-colors hover:bg-board disabled:opacity-60"
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
