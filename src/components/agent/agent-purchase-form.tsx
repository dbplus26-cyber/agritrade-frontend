"use client";

import { DateInput } from "@/components/ui/date-input";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreateMyPurchaseMutation,
  useGetAgentCommoditiesQuery,
} from "@/redux/agent/agent-api";
import { FilePicker } from "@/components/ui/FilePicker";
import { SimpleSelect } from "@/components/ui/simple-select";
import { extractApiError } from "@/lib/extract-api-error";
import { cedisProduct, formatCedis } from "@/lib/format-money";
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
    control,
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
      // Cash at the scale is the ordinary field case, so it is the default -
      // but it is a CHOICE, because a farmer paid at the weekend is real and
      // has to be recordable too.
      paidNow: true,
      paymentMethod: "CASH",
      notes: "",
    },
  });

  // Persist every change (photo excluded - a File can't survive a reload).
  // The ref gates the effect after success: react-hook-form re-renders once
  // more before router.replace unmounts the form, and without the gate that
  // re-render re-saves the cleared draft - with its SPENT idempotency key -
  // so the next purchase submits under it and is silently swallowed by the
  // backend's replay lookup.
  const submitted = useRef(false);
  const values = watch();
  useEffect(() => {
    if (submitted.current) return;
    saveDraft(DRAFT_KEY, { key: idempotencyKey, values });
  }, [idempotencyKey, values]);

  const weightKg = Number(values.weightKg) || 0;
  const unitPriceGhs = Number(values.unitPriceGhs) || 0;
  const total = cedisProduct(weightKg, unitPriceGhs);
  const paidNow = values.paidNow;

  const onSubmit = async (v: AgentPurchaseValues) => {
    setSubmitError(null);
    try {
      await createPurchase({
        body: {
          commodityId: v.commodityId,
          weightKg: Number(v.weightKg),
          unitPriceGhs: Number(v.unitPriceGhs),
          purchasedAt: v.purchasedAt,
          // The purchase and the payment travel together in ONE request: cash
          // changes hands as the grain is weighed, and making somebody submit
          // twice on a 2G connection is two chances to lose half of it. The
          // server still records them as two things, because they are.
          ...(v.paidNow
            ? {
                payment: {
                  amountGhs: cedisProduct(
                    Number(v.weightKg),
                    Number(v.unitPriceGhs),
                  ),
                  method: v.paymentMethod,
                },
              }
            : {}),
          ...(v.notes?.trim() ? { notes: v.notes.trim() } : {}),
        },
        idempotencyKey,
        photo: photoFile ?? undefined,
      }).unwrap();
      submitted.current = true;
      clearDraft(DRAFT_KEY);
      notify.success(
        v.paidNow
          ? "Purchase recorded - your float has been charged"
          : "Purchase recorded - this farmer is still owed",
      );
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
        <Controller
          control={control}
          name="commodityId"
          render={({ field }) => (
            <SimpleSelect
              id="commodityId"
              className={cn(agentInputClass, errors.commodityId && "border-error")}
              value={field.value}
              onChange={field.onChange}
              placeholder="Choose a commodity…"
              options={(commodities.data?.data.commodities ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
          )}
        />
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
          {paidNow ? "I paid" : "I owe"}
        </span>
        <span className="font-mono text-[16px] font-bold tabular-nums text-ink">
          {formatCedis(total)}
        </span>
      </div>

      {/* Recording a purchase does not charge the float by itself: a farmer
          paid at the weekend has to be recordable too. Two big taps, because
          this is answered with a thumb at a village scale. */}
      <div>
        <AgentLabel>Did you pay for this?</AgentLabel>
        <Controller
          control={control}
          name="paidNow"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Paid now", value: true },
                { label: "Paying later", value: false },
              ].map((option) => (
                <button
                  aria-pressed={field.value === option.value}
                  className={cn(
                    "min-h-[44px] rounded border px-3 py-2 text-[14px] font-semibold transition-colors active:opacity-80",
                    field.value === option.value
                      ? "border-soil bg-soil text-white"
                      : "border-soil/30 bg-surface text-ink",
                  )}
                  key={option.label}
                  onClick={() => field.onChange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      {paidNow ? (
        <div>
          <AgentLabel htmlFor="paymentMethod">How did you pay?</AgentLabel>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <SimpleSelect
                className={agentInputClass}
                id="paymentMethod"
                onChange={field.onChange}
                options={[
                  { label: "Cash", value: "CASH" },
                  { label: "Mobile money", value: "MOMO" },
                ]}
                placeholder="Choose how you paid"
                value={field.value}
              />
            )}
          />
          <p className="mt-1 text-[12px] text-soil">
            This comes out of your float either way.
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-soil">
          Your float is not charged. Record the payment from your purchases
          list once you have paid.
        </p>
      )}

      <div>
        <AgentLabel htmlFor="purchasedAt">Purchase date</AgentLabel>
        <DateInput
          id="purchasedAt"
          placeholder="Pick the purchase date"
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
            submit is the only chance to catch that - after submit the purchase
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
        className="rounded-none bg-forest px-4 py-3.5 text-[15px] font-semibold text-paper transition-colors hover:bg-board disabled:opacity-60"
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
