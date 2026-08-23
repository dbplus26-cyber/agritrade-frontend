"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import {
  ActionRow,
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  AdminPageHeader,
  adminSelectClass,
  ToneBadge,
} from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { CardGridSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
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
            // Zero is allowed: "0 before loading / 100 on arrival" is the
            // credit-sale shape.
            .refine(
              (v) =>
                v !== "" && Number(v) >= 0 && Number(v) <= 100 && !Number.isNaN(Number(v)),
              { message: "0–100" },
            ),
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
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[480px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New payment policy</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Milestone percentages must add up to 100.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5"
        >
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              className={cn(adminInputClass, errors.name && "border-console-red")}
              placeholder="e.g. 50/50 on arrival"
              {...register("name")}
            />
          </AdminField>

          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              <span className="min-w-0">Milestones</span>
              <HelpTip
                label="What is a milestone?"
                text="One stage of paying: a share of the price, and the moment the buyer has to hand it over."
              />
            </span>
            {fields.map((field, i) => (
              <div
                key={field.id}
                // Stacked until the form itself is 520px wide, which on a
                // phone drawer it never is: label, percent and trigger on one
                // row would leave each about 70px at 375px and overflow at
                // 280px. The label takes its own line, the rest share the next.
                className="grid grid-cols-1 gap-2 @min-[520px]:grid-cols-[minmax(0,1fr)_70px_130px_auto] @min-[520px]:items-center"
              >
                <Input
                  aria-label={`Milestone ${String(i + 1)} label`}
                  className={cn(adminInputClass, "min-w-0")}
                  placeholder="Label"
                  {...register(`milestones.${i}.label`)}
                />
                <div className="grid grid-cols-[70px_minmax(0,1fr)_auto] items-center gap-2 @min-[520px]:contents">
                  <Input
                    aria-label={`Milestone ${String(i + 1)} percent`}
                    className={cn(adminInputClass, "min-w-0")}
                    inputMode="decimal"
                    placeholder="%"
                    {...register(`milestones.${i}.percent`)}
                  />
                  <Controller
                    control={control}
                    name={`milestones.${i}.trigger` as const}
                    render={({ field: triggerField }) => (
                      <SimpleSelect
                        ariaLabel={`Milestone ${String(i + 1)} trigger`}
                        className={cn(adminSelectClass, "w-full min-w-0")}
                        value={triggerField.value}
                        onChange={triggerField.onChange}
                        placeholder="Choose when it is due"
                        options={TRIGGER_OPTIONS}
                      />
                    )}
                  />
                  {fields.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove milestone ${String(i + 1)}`}
                      onClick={() => remove(i)}
                      className="cursor-pointer px-1 text-[11px] text-console-red"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            ))}
            {errors.milestones?.message ? (
              <p className="text-[11px] text-console-red">
                {errors.milestones.message}
              </p>
            ) : null}
            <AdminButton
              type="button"
              variant="outline"
              className="w-fit"
              onClick={() =>
                append({ label: "", percent: "", trigger: "ON_ARRIVAL" })
              }
            >
              + Add milestone
            </AdminButton>
          </div>

          <label className="flex items-center gap-2 text-[11.5px] text-adm-ink">
            <input type="checkbox" {...register("isDefault")} />
            Make this the default policy
          </label>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} loading={isLoading} size="lg">
              {isLoading ? "Creating…" : "Create policy"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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

  /**
   * Ungated, like the register row it sits beside in spirit.
   *
   * Retiring a policy is undone by tapping the same word again, and here the
   * two words are bare text links a thumb's width apart from Delete. A dialog
   * on the reversible one is what teaches somebody to tap through the dialog
   * on the one that is not. What the change did is said afterwards instead,
   * where it is useful and costs nothing.
   */
  const toggleActive = async () => {
    try {
      await update({
        id: policy.id,
        body: { isActive: !policy.isActive },
      }).unwrap();
      notify.success(policy.isActive ? "Deactivated" : "Activated", {
        description: policy.isActive
          ? "New sales can no longer choose it. Sales already on it keep their terms, and Activate puts it back."
          : "It can be chosen on new sales again.",
      });
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
    // At most ONE tag, and dimming carries the rest. "Default" and "Inactive"
    // as two pills in the same corner is two things asking to be read before
    // the name is, and they are mutually exclusive in practice - so the corner
    // holds whichever applies and an inactive card additionally recedes.
    <AdminCard
      className={cn(
        "flex h-full flex-col p-5",
        !policy.isActive && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* No clamp and no truncation: a policy name is what the reader is
            looking for, and half of it is no use. It wraps. Two lines are
            reserved so most cards still start their bar at the same height,
            and a longer name simply takes the room it needs. */}
        <h2 className="min-h-[2.6em] text-[12.5px] leading-[1.3] font-semibold text-adm-ink [overflow-wrap:anywhere]">
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
          above already separates the shares, so dividers would draw the same
          boundary twice. */}
      <ul className="mt-3.5 flex flex-col gap-2">
        {policy.milestones.map((m, i) => (
          <li
            key={`${m.label}-${String(i)}`}
            className="flex gap-3 text-[11.5px] leading-[1.4]"
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

      {/* Quiet outline buttons at the foot of the card: they read as
          buttons at rest, and Delete carries its red at rest too. */}
      <ActionRow className="mt-auto pt-4">
        {!policy.isDefault && policy.isActive ? (
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => void makeDefault()}
          >
            Make default
          </AdminButton>
        ) : null}
        {!policy.isDefault ? (
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => void toggleActive()}
          >
            {policy.isActive ? "Deactivate" : "Activate"}
          </AdminButton>
        ) : null}
        {isSuperAdmin ? (
          <AdminButton
            size="sm"
            variant="outline"
            className="text-console-red hover:bg-console-red/10 hover:text-console-red"
            disabled={deleteState.isLoading}
            loading={deleteState.isLoading}
            onClick={() => void onDelete()}
          >
            Delete
          </AdminButton>
        ) : null}
      </ActionRow>
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
    // No 680px cap: at some widths that is narrower than one card plus a
    // gutter, which asks the grid for three columns inside the width of
    // roughly one and a half.
    <div>
      <AdminPageHeader
        title="Payment Policies"
        hint="When a buyer has to pay you: the deposit and balance split."
        sub="The payment terms sales resolve against (sale > buyer > default)"
      />

      {/* Policies are immutable by design: sales freeze a snapshot of their
          terms, so there is deliberately no edit action here. */}
      <p className="mb-4 text-[11px] leading-[1.5] text-adm-muted">
        A policy can&apos;t be edited once created. Sales freeze their terms at
        confirmation, so create a new policy when the terms change.
      </p>

      {/* No search or filters on this list, so the create action takes the
          toolbar's place; the empty state carries its own. */}
      {!isLoading && !isError && policies.length === 0 ? null : (
        <div className="mb-6 flex items-center gap-1.5 sm:gap-2">
          <AdminButton
            aria-label="New policy"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">New policy</span>
          </AdminButton>
        </div>
      )}

      {isLoading ? (
        <CardGridSkeleton cards={4} columns={2} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : policies.length === 0 ? (
        <RegisterEmpty
          filtered={false}
          noun="payment policies"
          title="No payment policies"
          description="Create the first policy sales will resolve their terms against."
          actionLabel="New policy"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        // Two things fight the alignment here. `items-start` tells the grid
        // NOT to stretch its cards, which guarantees ragged bottoms. And
        // viewport breakpoints inside a shell with a ~225px sidebar fire
        // `xl:grid-cols-3` while the content area still only has room for two,
        // squeezing three columns into the width of two. Container queries
        // measure the content area itself.
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
