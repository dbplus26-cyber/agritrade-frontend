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
              className={cn(adminInputClass, errors.name && "border-error")}
              placeholder="e.g. 50/50 on arrival"
              {...register("name")}
            />
          </AdminField>

          <div className="flex flex-col gap-2">
            <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
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
                    className="text-[12px] text-console-red"
                  >
                    ✕
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            {errors.milestones?.message ? (
              <p className="text-[12px] text-error">
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

          <label className="flex items-center gap-2 text-[13px] text-ink">
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
    <AdminCard className="px-4 py-3">
      {/* The tag pins to the top of the title, not its vertical middle - a
          policy name here routinely runs to three lines. */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-[14px] font-bold text-ink">
          {policy.name}
        </span>
        <span className="flex flex-none gap-1.5">
          {policy.isDefault ? (
            <ToneBadge tone="forest">Default</ToneBadge>
          ) : null}
          {policy.isActive ? null : (
            <ToneBadge tone="slate">Inactive</ToneBadge>
          )}
        </span>
      </div>
      {/* The SCHEDULE is what a policy is, so it is set as one: the share
          leads each row at figure weight, the trigger explains it beneath.
          Previously the share and its trigger shared one truncating line and
          the percentage - the single number that matters - was the part being
          cut off ("80% ·…"). */}
      <div className="flex flex-col divide-y divide-soil/10 border-y border-soil/10">
        {policy.milestones.map((m, i) => (
          <div
            key={`${m.label}-${String(i)}`}
            className="flex items-baseline gap-3 py-1.5"
          >
            <span className="font-adminmono w-[3.25rem] flex-none text-[13.5px] font-bold text-console tabular-nums">
              {m.percent}%
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-ink">
                {m.label}
              </span>
              <span className="block truncate text-[11.5px] text-soil">
                {milestoneTriggerLabel(m.trigger)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {!policy.isDefault && policy.isActive ? (
          <AdminButton
            variant="outline"
            className="h-8 px-3 text-[12.5px]"
            onClick={() => void makeDefault()}
          >
            Make default
          </AdminButton>
        ) : null}
        {!policy.isDefault ? (
          <AdminButton
            variant="ghost"
            className="h-8 px-3 text-[12.5px]"
            onClick={() => void toggleActive()}
          >
            {policy.isActive ? "Deactivate" : "Activate"}
          </AdminButton>
        ) : null}
        {isSuperAdmin ? (
          <AdminButton
            variant="ghost"
            className="h-8 px-3 text-[12.5px] text-console-red"
            disabled={deleteState.isLoading}
            onClick={() => void onDelete()}
          >
            Delete
          </AdminButton>
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
    <div className="max-w-[680px]">
      <AdminPageHeader
        title="Payment Policies"
        sub="The payment terms sales resolve against (sale > buyer > default)"
        actions={
          <AdminButton className="h-9 px-4" onClick={() => setCreateOpen(true)}>
            + New policy
          </AdminButton>
        }
      />

      {/* Policies are immutable by design: sales freeze a snapshot of their
          terms, so there is deliberately no edit action here. */}
      <p className="mb-3 text-[12.5px] text-soil">
        Policies can&apos;t be edited once created - create a new policy for new
        terms instead.
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
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
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
