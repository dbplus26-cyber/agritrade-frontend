"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { HelpTip } from "@/components/admin/help-tip";
import { CardGridSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  ToneBadge,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
} from "@/components/admin/ui";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateDriverPaymentPolicyMutation,
  useDeleteDriverPaymentPolicyMutation,
  useGetDriverPaymentPoliciesQuery,
  useUpdateDriverPaymentPolicyMutation,
} from "@/redux/driver-settlement/driver-settlement-api";
import type { IDriverPaymentPolicy } from "@/types/driver-settlement.types";

import {
  DRIVER_TRIGGER_OPTIONS,
  driverTriggerLabel,
  SEGMENT_TONES,
} from "./driver-policy-bits";

/**
 * Haulage terms as data - the driver-side twin of the sale payment policies
 * screen, and deliberately the same card so the two read as one idea seen from
 * two directions rather than as two unrelated features.
 *
 * The split bar is the signature for the same reason it is there: a policy is
 * a division of 100, and 30/70 and 50/50 should not look alike, which as a
 * list of numbers they do.
 */
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
            // Zero is allowed: "0 at loading / 100 on delivery" pays the
            // haulier after the goods land.
            .refine(
              (v) =>
                v !== "" && Number(v) >= 0 && Number(v) <= 100 && !Number.isNaN(Number(v)),
              { message: "0-100" },
            ),
          trigger: z.enum(["AT_LOADING", "ON_DELIVERY", "ON_DEMAND"]),
        }),
      )
      .min(1),
  })
  .refine(
    // Summed in cents, so 33.33 + 33.33 + 33.34 is accepted and float drift
    // cannot reject a schedule that is actually correct.
    (v) =>
      v.milestones.reduce(
        (acc, m) => acc + Math.round(Number(m.percent) * 100),
        0,
      ) === 10_000,
    { message: "Percentages must add up to 100", path: ["milestones"] },
  );

type PolicyFormValues = z.infer<typeof policyFormSchema>;

function CreatePolicyDialog({ onClose }: { onClose: () => void }) {
  const [create, { isLoading }] = useCreateDriverPaymentPolicyMutation();
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
        { label: "Fuel advance", percent: "30", trigger: "AT_LOADING" },
        { label: "Balance", percent: "70", trigger: "ON_DELIVERY" },
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
      notify.success("Driver policy created");
      onClose();
    } catch (err) {
      notify.error("Couldn't create the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New driver payment policy</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            How a haulier gets paid for a trip. The shares must add up to 100.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          // The milestone rows below query this element's width, not the
          // viewport's - the dialog is portaled out of the console's
          // `@container/main`, so without a container here the `@min-` rules
          // never resolve and the row stays stacked even on a wide screen.
          className="@container flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              className={adminInputClass}
              placeholder="e.g. 30/70 advance"
              {...register("name")}
            />
          </AdminField>

          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                Milestones
              </span>
              <HelpTip
                label="What is a milestone?"
                text="One slice of the fee and when it falls due. The slices must add up to 100."
              />
            </div>

            <ul className="flex flex-col gap-2">
              {fields.map((field, i) => (
                <li
                  key={field.id}
                  // Stacked below 520px: a label, a percent and a trigger on
                  // one row inside a dialog leaves each about 90px on a phone,
                  // which is not enough for any of them.
                  className="grid grid-cols-1 gap-2 @min-[520px]:grid-cols-[minmax(0,1fr)_5rem_9rem_auto] @min-[520px]:items-center"
                >
                  <Input
                    aria-label={`Milestone ${String(i + 1)} label`}
                    className={adminInputClass}
                    placeholder="What this covers"
                    {...register(`milestones.${i}.label` as const)}
                  />
                  <Input
                    aria-label={`Milestone ${String(i + 1)} percent`}
                    className={cn(adminInputClass, "text-right")}
                    inputMode="decimal"
                    placeholder="%"
                    {...register(`milestones.${i}.percent` as const)}
                  />
                  <Controller
                    control={control}
                    name={`milestones.${i}.trigger` as const}
                    render={({ field }) => (
                      <SimpleSelect
                        ariaLabel={`Milestone ${String(i + 1)} trigger`}
                        className={adminSelectClass}
                        value={field.value}
                        onChange={field.onChange}
                        options={DRIVER_TRIGGER_OPTIONS}
                      />
                    )}
                  />
                  {fields.length > 1 ? (
                    <button
                      aria-label={`Remove milestone ${String(i + 1)}`}
                      className="cursor-pointer justify-self-start text-[12.5px] text-adm-muted transition-colors hover:text-console-red @min-[520px]:justify-self-auto"
                      onClick={() => {
                        remove(i);
                      }}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {errors.milestones?.message ? (
              <p className="mt-2 text-[12px] font-medium text-console-red">
                {errors.milestones.message}
              </p>
            ) : null}

            <button
              className={cn(adminLinkClass, "mt-2.5 cursor-pointer text-[12.5px] font-semibold")}
              onClick={() => {
                append({ label: "", percent: "", trigger: "ON_DELIVERY" });
              }}
              type="button"
            >
              + Add milestone
            </button>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-adm-body">
            <input
              className="size-4 cursor-pointer accent-[#1E3D2B]"
              type="checkbox"
              {...register("isDefault")}
            />
            Make this the default
            <HelpTip
              label="What does default mean?"
              text="The terms used when a trip and its driver have none of their own."
            />
          </label>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} type="submit">
              {isLoading ? "Creating…" : "Create policy"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function PolicyCard({ policy }: { policy: IDriverPaymentPolicy }) {
  const { isSuperAdmin } = useAuthRole();
  const { confirm, confirmationDialog } = useConfirm();
  const [update] = useUpdateDriverPaymentPolicyMutation();
  const [deletePolicy, deleteState] = useDeleteDriverPaymentPolicyMutation();

  const patch = async (
    body: Parameters<typeof update>[0]["body"],
    ok: string,
  ) => {
    try {
      await update({ body, id: policy.id }).unwrap();
      notify.success(ok);
    } catch (err) {
      notify.error("Couldn't update the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    const confirmed = await confirm({
      confirmText: "Delete",
      description:
        "Only possible while no driver or trip references this policy. If it has been used, deactivate it instead - priced trips keep their snapshot either way.",
      isDestructive: true,
      title: `Delete ${policy.name}?`,
    });
    if (!confirmed) return;
    try {
      await deletePolicy(policy.id).unwrap();
      notify.success("Policy deleted");
    } catch (err) {
      // The backend refuses with a referenced-by message; surface it verbatim.
      notify.error("Couldn't delete the policy", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    // h-full + flex-col is what lines a row of these up: the grid stretches
    // every card to the tallest in its row, and the column layout lets the
    // actions take mt-auto and sit on the bottom edge of all of them.
    <AdminCard
      className={cn(
        "flex h-full flex-col p-5",
        !policy.isActive && "opacity-65",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* No clamp and no truncation: the name is the thing you are looking
            for, and half of it is no use. Two lines are reserved so most cards
            start their bar at the same height. */}
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

      {/* Each segment's width IS its percentage, so the bar is the data rather
          than a decoration of it. aria-hidden because every figure in it is
          spelled out underneath. */}
      <div
        aria-hidden="true"
        className="mt-3 flex h-2 overflow-hidden rounded-full bg-adm-hairline"
      >
        {policy.milestones.map((m, i) => (
          <div
            className={SEGMENT_TONES[i % SEGMENT_TONES.length]}
            key={`bar-${m.label}-${String(i)}`}
            style={{ width: `${String(m.percent)}%` }}
          />
        ))}
      </div>

      <ul className="mt-3.5 flex flex-col gap-2">
        {policy.milestones.map((m, i) => (
          <li
            className="flex gap-3 text-[13px] leading-[1.4]"
            key={`${m.label}-${String(i)}`}
          >
            <span className="font-adminmono w-9 flex-none tabular-nums text-adm-ink">
              {m.percent}%
            </span>
            <span className="min-w-0 flex-1 text-adm-body [overflow-wrap:anywhere]">
              {m.label}
              <span className="text-adm-muted">
                {" "}
                · {driverTriggerLabel(m.trigger)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-[12.5px]">
        {!policy.isDefault && policy.isActive ? (
          <button
            className="cursor-pointer text-adm-muted transition-colors hover:text-console"
            onClick={() => void patch({ isDefault: true }, "Now the default")}
            type="button"
          >
            Make default
          </button>
        ) : null}
        {!policy.isDefault ? (
          <button
            className="cursor-pointer text-adm-muted transition-colors hover:text-console"
            onClick={() =>
              void patch(
                { isActive: !policy.isActive },
                policy.isActive ? "Deactivated" : "Activated",
              )
            }
            type="button"
          >
            {policy.isActive ? "Deactivate" : "Activate"}
          </button>
        ) : null}
        {isSuperAdmin ? (
          <button
            className="cursor-pointer text-adm-muted transition-colors hover:text-console-red disabled:opacity-50"
            disabled={deleteState.isLoading}
            onClick={() => void onDelete()}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>
      {confirmationDialog}
    </AdminCard>
  );
}

export function DriverPoliciesScreen() {
  const { data, isLoading, isError, error, refetch } =
    useGetDriverPaymentPoliciesQuery({ limit: 100 });
  const [createOpen, setCreateOpen] = useState(false);
  const policies = data?.data ?? [];

  return (
    <div>
      <AdminPageHeader
        actions={
          <AdminButton onClick={() => setCreateOpen(true)}>
            + New policy
          </AdminButton>
        }
        hint="When a driver gets paid for a trip: the advance and balance split."
        sub="The haulage terms trips resolve against (trip > driver > default)"
        title="Driver Payment Policies"
      />

      <p className="mb-4 max-w-[62ch] text-[12.5px] leading-[1.5] text-adm-muted">
        A policy can&apos;t be edited once created. Trips freeze their terms
        when the fee is agreed, so create a new policy when the terms change.
      </p>

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
          noun="driver payment policies"
          title="No driver payment policies"
          description="Create the first policy trips will resolve their driver terms against."
          actionLabel="New policy"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        // Container queries, not viewport ones: the console shell's sidebar
        // eats ~225px, so xl: would fire while the content area still had room
        // for two columns and squeeze three into the width of two.
        <div className="grid gap-4 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {policies.map((p) => (
            <PolicyCard key={p.id} policy={p} />
          ))}
        </div>
      )}

      {createOpen ? (
        <CreatePolicyDialog
          onClose={() => {
            setCreateOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
