"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateMyPurchaseMutation,
  useGetAgentCommoditiesQuery,
} from "@/redux/agent/agent-api";
import { FilePicker } from "@/components/ui/FilePicker";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  agentPurchaseSchema,
  type AgentPurchaseValues,
} from "@/validations/purchase-schema";
import { clearDraft, draftKey, loadDraft, saveDraft } from "./draft-storage";
import {
  AgentFieldError,
  agentInputClass,
  AgentLabel,
  AgentSubmitError,
} from "./agent-form-bits";

const DRAFT_KEY = "dbplus.agent.purchase.draft";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The village-scale form. Values and the idempotency key persist locally on
 * every change, so a dead zone, a reload, or a timed-out submit never loses
 * the entry - retrying sends the SAME key and the backend returns the
 * original purchase instead of debiting the float twice.
 */
export function AgentPurchaseForm() {
  const router = useRouter();
  const [createPurchase, { isLoading }] = useCreateMyPurchaseMutation();
  const commodities = useGetAgentCommoditiesQuery();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // One idempotency key per draft, minted at mount and kept until success.
  const idempotencyKey = useMemo(
    () => draftKey<AgentPurchaseValues>(DRAFT_KEY),
    [],
  );
  const draft = useMemo(() => loadDraft<AgentPurchaseValues>(DRAFT_KEY), []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AgentPurchaseValues>({
    resolver: zodResolver(agentPurchaseSchema),
    defaultValues: draft?.values ?? {
      commodityId: "",
      weightKg: "",
      unitPriceGhs: "",
      purchasedAt: today(),
      notes: "",
    },
  });

  // Persist every change (photo excluded - a File can't survive a reload).
  const values = watch();
  useEffect(() => {
    saveDraft(DRAFT_KEY, { key: idempotencyKey, values });
  }, [idempotencyKey, values]);

  const weightKg = Number(values.weightKg) || 0;
  const unitPriceGhs = Number(values.unitPriceGhs) || 0;
  const total = weightKg * unitPriceGhs;

  const onSubmit = async (v: AgentPurchaseValues) => {
    setSubmitError(null);
    try {
      await createPurchase({
        body: {
          commodityId: v.commodityId,
          weightKg: Number(v.weightKg),
          unitPriceGhs: Number(v.unitPriceGhs),
          purchasedAt: v.purchasedAt,
          ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
        },
        idempotencyKey,
        photo: photoFile ?? undefined,
      }).unwrap();
      clearDraft(DRAFT_KEY);
      notify.success("Purchase recorded - your float has been charged");
      router.replace("/agent/purchases");
    } catch (err) {
      // Keep the draft AND the key: the retry must reuse both.
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
        <AgentLabel htmlFor="commodityId">Commodity</AgentLabel>
        <select
          id="commodityId"
          className={cn(agentInputClass, errors.commodityId && "border-error")}
          {...register("commodityId")}
        >
          <option value="">Choose…</option>
          {(commodities.data?.data.commodities ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <AgentFieldError message={errors.commodityId?.message} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <AgentLabel htmlFor="weightKg">Weight (kg)</AgentLabel>
          <input
            id="weightKg"
            inputMode="decimal"
            placeholder="e.g. 120"
            className={cn(agentInputClass, errors.weightKg && "border-error")}
            {...register("weightKg")}
          />
          <AgentFieldError message={errors.weightKg?.message} />
        </div>
        <div>
          <AgentLabel htmlFor="unitPriceGhs">Price / kg (GH₵)</AgentLabel>
          <input
            id="unitPriceGhs"
            inputMode="decimal"
            placeholder="e.g. 5.00"
            className={cn(
              agentInputClass,
              errors.unitPriceGhs && "border-error",
            )}
            {...register("unitPriceGhs")}
          />
          <AgentFieldError message={errors.unitPriceGhs?.message} />
        </div>
      </div>

      <div className="flex items-baseline justify-between rounded border border-soil/25 bg-surface-alt/60 px-3 py-2">
        <span className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
          I paid
        </span>
        <span className="font-mono text-[16px] font-bold tabular-nums text-ink">
          {formatCedis(total)}
        </span>
      </div>

      <div>
        <AgentLabel htmlFor="purchasedAt">Purchase date</AgentLabel>
        <input
          id="purchasedAt"
          type="date"
          className={cn(agentInputClass, errors.purchasedAt && "border-error")}
          {...register("purchasedAt")}
        />
        <AgentFieldError message={errors.purchasedAt?.message} />
      </div>

      <div>
        <AgentLabel htmlFor="notes" optional>
          Notes
        </AgentLabel>
        <textarea
          id="notes"
          rows={2}
          placeholder="Supplier name, village, anything worth noting"
          className={cn(
            agentInputClass,
            "h-auto min-h-[56px] resize-y py-2",
            errors.notes && "border-error",
          )}
          {...register("notes")}
        />
        <AgentFieldError message={errors.notes?.message} />
      </div>

      <div>
        <AgentLabel optional>Weigh-slip photo</AgentLabel>
        {/* The slip is the evidence for the money, and in a gallery of near
            identical photos the wrong one is easy to tap. Seeing it before the
            submit is the only chance to catch that — after submit the purchase
            has already debited the float. */}
        <FilePicker
          accept="image/*"
          capture="environment"
          hint="Optional"
          onConfirm={(file) => { setPhotoFile(file); }}
          stage
          triggerLabel={photoFile ? "Replace photo" : "Take / choose photo"}
        />
      </div>

      <AgentSubmitError message={submitError} />

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-lg bg-forest px-4 py-3.5 text-[15px] font-semibold text-paper transition-colors hover:bg-board disabled:opacity-60"
      >
        {isLoading ? "Recording…" : "Record purchase"}
      </button>
      <p className="text-center text-[11.5px] text-soil/80">
        Bad network? Your entry is saved on this phone - just press the button
        again. It can never charge your float twice.
      </p>
    </form>
  );
}
