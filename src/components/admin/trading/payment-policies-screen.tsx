"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  ToneBadge,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { CardGridSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreatePaymentPolicyMutation,
  useDeletePaymentPolicyMutation,
  useGetPaymentPoliciesQuery,
  useUpdatePaymentPolicyMutation,
} from "@/redux/payment-policies/payment-policies-api";
import type {
  IPaymentPolicy,
  MilestoneTrigger,
} from "@/types/admin-sale.types";
import { milestoneTriggerLabel } from "./sale-bits";

/**
 * The split bar's segments, in order.
 *
 * One hue stepped down in weight rather than a set of different colours: the
 * milestones are shares of the same money, not separate categories, and giving
 * them four hues would say otherwise. Descending weight also matches how a
 * schedule is read - the first call on the money is the one that matters most,
 * and it lands darkest. Wraps after five, which is past any real policy.
 */
const SEGMENT_TONES = [
  "bg-console",
  "bg-console/70",
  "bg-console/50",
  "bg-console/35",
  "bg-console/25",
];

const TRIGGER_OPTIONS: { label: string; value: MilestoneTrigger }[] = [
  { label: "Before loading", value: "BEFORE_LOADING" },
  { label: "On arrival", value: "ON_ARRIVAL" },
  { label: "On demand", value: "ON_DEMAND" },
];

const policyFormSchema = z
  .object({
    name: z.string().trim().min(2, "Give the policy a name").max(100),
    isDefault: z.boolean(),
    milestones: z
      .array(
        z.object({
          label: z.string().trim().min(1, "Label the milestone").max(80),
          percent: z
            .string()
            .trim()
            .refine((v) => Number(v) > 0 && Number(v) <= 100, {
              message: "1–100",
            }),
          trigger: z.enum(["BEFORE_LOADING", "ON_ARRIVAL", "ON_DEMAND"]),
        }),
      )
      .min(1),
  })
  .refine(
    (v) =>
      v.milestones.reduce(
        (acc, m) => acc + Math.round(Number(m.percent) * 100),
        0,
      ) === 10_000,
    { message: "Percentages must add up to 100", path: ["milestones"] },
  );

type PolicyFormValues = z.infer<typeof policyFormSchema>;

/** Create a new payment policy. */
function CreatePolicyDialog({ onClose }: { onClose: () => void }) {
  const [create, { isLoading }] = useCreatePaymentPolicyMutation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: {
      isDefault: false,
      milestones: [
        { label: "Deposit", percent: "80", trigger: "BEFORE_LOADING" },
        { label: "Balance", percent: "20", trigger: "ON_ARRIVAL" },
      ],
      name: "",
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones",
  });

  const onSubmit = async (values: PolicyFormValues) => {
    try {
      await create({
        isDefault: values.isDefault,
        milestones: values.milestones.map((m) => ({
          label: m.label,
          percent: Number(m.percent),
          trigger: m.trigger,
        })),
        name: values.name,
      }).unwrap();
      notify.success("Payment policy created");
      onClose();
    } catch (err) {
      notify.error("Couldn't create the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New payment policy</DialogTitle>
          <DialogDescription>
            Milestone percentages must add up to 100.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              className={cn(adminInputClass, errors.name && "border-console-red")}
              placeholder="e.g. 50/50 on arrival"
              {...register("name")}
            />
          </AdminField>

          <div className="flex flex-col gap-2">
            <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Milestones
            </span>
            {fields.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_70px_130px_auto] gap-2"
              >
                <Input
                  className={adminInputClass}
                  placeholder="Label"
                  {...register(`milestones.${i}.label`)}
                />
                <Input
                  className={adminInputClass}
                  inputMode="decimal"
                  placeholder="%"
                  {...register(`milestones.${i}.percent`)}
                />
                <select
                  className={cn(adminSelectClass, "w-full")}
                  {...register(`milestones.${i}.trigger`)}
                >
                  {TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="cursor-pointer text-[12px] text-console-red"
                  >
                    ✕
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {errors.milestones?.message ? (
              <p className="text-[12px] text-console-red">
                {errors.milestones.message}
              </p>
            ) : null}
            <AdminButton
              type="button"
              variant="outline"
              className="h-8 w-fit px-3 text-[12.5px]"
              onClick={() =>
                append({ label: "", percent: "", trigger: "ON_ARRIVAL" })
              }
            >
              + Add milestone
            </AdminButton>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-adm-ink">
            <input type="checkbox" {...register("isDefault")} />
            Make this the default policy
          </label>

          <DialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Creating…" : "Create policy"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PolicyCard({ policy }: { policy: IPaymentPolicy }) {
  const [update] = useUpdatePaymentPolicyMutation();
  const [deletePolicy, deleteState] = useDeletePaymentPolicyMutation();
  const { confirm, confirmationDialog } = useConfirm();
  // Deleting a policy is owner-only on the backend; hide it from staff.
  const { isSuperAdmin } = useAuthRole();

  const makeDefault = async () => {
    try {
      await update({ id: policy.id, body: { isDefault: true } }).unwrap();
      notify.success(`${policy.name} is now the default`);
    } catch (err) {
      notify.error("Couldn't set the default", {
        description: extractApiError(err).message,
      });
    }
  };

  const toggleActive = async () => {
    const ok = await confirm({
      title: policy.isActive
        ? `Deactivate ${policy.name}?`
        : `Activate ${policy.name}?`,
      description: policy.isActive
        ? "New sales won't be able to choose this policy. Existing sales keep their snapshot."
        : "This policy becomes selectable on new sales again.",
      confirmText: policy.isActive ? "Deactivate" : "Activate",
      isDestructive: policy.isActive,
    });
    if (!ok) return;
    try {
      await update({
        id: policy.id,
        body: { isActive: !policy.isActive },
      }).unwrap();
      notify.success(policy.isActive ? "Deactivated" : "Activated");
    } catch (err) {
      notify.error("Couldn't update the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete ${policy.name}?`,
      description:
        "Only possible while no sale or buyer references this policy. If it has been used, deactivate it instead - existing sales keep their snapshot either way.",
      confirmText: "Delete",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deletePolicy(policy.id).unwrap();
      notify.success("Policy deleted");
    } catch (err) {
      // The backend refuses with a DEACTIVATE_INSTEAD-style message when the
      // policy is referenced; surface it verbatim.
      notify.error("Couldn't delete the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    // h-full + flex-col is what lines a row of these up: the grid stretches
    // every card to the tallest in its row, and the column layout lets the
    // actions take mt-auto and sit on the bottom edge of all of them.
    //
    // At most ONE tag, and dimming carries the rest. The card used to show
    // "Default" and "Inactive" as two pills in the same corner, which is two
    // things asking to be read before the name is. They are mutually
    // exclusive in practice, so the corner holds whichever applies and an
    // inactive card additionally recedes.
    <AdminCard
      className={cn(
        "flex h-full flex-col p-5",
        !policy.isActive && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* No clamp and no truncation: a policy name is the thing you are
            looking for, and half of it is no use. It wraps. Two lines are
            reserved so most cards still start their bar at the same height,
            and a longer name simply takes the room it needs. */}
        <h2 className="min-h-[2.6em] text-[15px] leading-[1.3] font-semibold text-adm-ink [overflow-wrap:anywhere]">
          {policy.name}
        </h2>
        <span className="flex-none">
          {policy.isDefault ? (
            <ToneBadge tone="forest">Default</ToneBadge>
          ) : policy.isActive ? null : (
            <ToneBadge tone="slate">Inactive</ToneBadge>
          )}
        </span>
      </div>

      {/* THE SIGNATURE. A policy is a split of 100, and that is the one fact
          worth seeing from across the grid - 80/20 and 50/50 should not look
          alike, which as a list of numbers they do. Each segment's width IS
          its percentage, so the bar is the data rather than a decoration of
          it, and the eye compares policies without reading any of them.
          aria-hidden because every figure in it is spelled out underneath. */}
      <div
        aria-hidden="true"
        className="mt-3 flex h-2 overflow-hidden rounded-full bg-adm-hairline"
      >
        {policy.milestones.map((m, i) => (
          <div
            key={`bar-${m.label}-${String(i)}`}
            className={SEGMENT_TONES[i % SEGMENT_TONES.length]}
            style={{ width: `${String(m.percent)}%` }}
          />
        ))}
      </div>

      {/* One line per milestone, not two, and no rules between them. The bar
          above already separates the shares, so dividers were drawing the
          same boundary twice. */}
      <ul className="mt-3.5 flex flex-col gap-2">
        {policy.milestones.map((m, i) => (
          <li
            key={`${m.label}-${String(i)}`}
            className="flex gap-3 text-[13px] leading-[1.4]"
          >
            <span className="font-adminmono w-9 flex-none tabular-nums text-adm-ink">
              {m.percent}%
            </span>
            <span className="min-w-0 flex-1 text-adm-body [overflow-wrap:anywhere]">
              {m.label}
              <span className="text-adm-muted"> · {milestoneTriggerLabel(m.trigger)}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Plain text actions on one quiet line. Three filled and outlined
          buttons in three colours were competing with the name and the bar
          for the top of the reading order, on a card whose job is to be
          scanned rather than acted on - the actions are the rarest thing
          anyone does here. Destructive intent shows on hover, not at rest. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-[12.5px]">
        {!policy.isDefault && policy.isActive ? (
          <button
            type="button"
            className="text-adm-muted transition-colors hover:text-console"
            onClick={() => void makeDefault()}
          >
            Make default
          </button>
        ) : null}
        {!policy.isDefault ? (
          <button
            type="button"
            className="text-adm-muted transition-colors hover:text-console"
            onClick={() => void toggleActive()}
          >
            {policy.isActive ? "Deactivate" : "Activate"}
          </button>
        ) : null}
        {isSuperAdmin ? (
          <button
            type="button"
            className="text-adm-muted transition-colors hover:text-console-red disabled:opacity-50"
            disabled={deleteState.isLoading}
            onClick={() => void onDelete()}
          >
            Delete
          </button>
        ) : null}
      </div>
      {confirmationDialog}
    </AdminCard>
  );
}

export function PaymentPoliciesScreen() {
  const { data, isLoading, isError, error, refetch } =
    useGetPaymentPoliciesQuery({ limit: 100 });
  const [createOpen, setCreateOpen] = useState(false);
  const policies = data?.data ?? [];

  return (
    // No 680px cap. It was narrower than one card plus a gutter at some
    // widths, so the grid was being asked for three columns inside the width
    // of roughly one and a half.
    <div>
      <AdminPageHeader
        title="Payment Policies"
        hint="When a buyer has to pay you: the deposit and balance split."
        sub="The payment terms sales resolve against (sale > buyer > default)"
        actions={
          <AdminButton className="h-9 px-4" onClick={() => setCreateOpen(true)}>
            + New policy
          </AdminButton>
        }
      />

      {/* Policies are immutable by design: sales freeze a snapshot of their
          terms, so there is deliberately no edit action here. */}
      <p className="mb-4 max-w-[62ch] text-[12.5px] leading-[1.5] text-adm-muted">
        A policy can&apos;t be edited once created. Sales freeze their terms at
        confirmation, so create a new policy when the terms change.
      </p>

      {isLoading ? (
        <CardGridSkeleton cards={4} columns={2} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : policies.length === 0 ? (
        <EmptyState
          variant="plain"
          title="No payment policies"
          description="Create the first policy sales will resolve their terms against."
          actionLabel="New policy"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        // Two things were fighting the alignment here. `items-start` told the
        // grid NOT to stretch its cards, which is the setting that guarantees
        // ragged bottoms. And the breakpoints were viewport ones inside a
        // shell with a ~225px sidebar, so `xl:grid-cols-3` fired while the
        // content area still only had room for two - three columns squeezed
        // into the width of two is most of what read as "scattered".
        // Container queries measure the content area itself.
        <div className="grid gap-4 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {policies.map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </div>
      )}

      {createOpen ? (
        <CreatePolicyDialog onClose={() => setCreateOpen(false)} />
      ) : null}
    </div>
  );
}
