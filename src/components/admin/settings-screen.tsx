"use client";

import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/redux/settings/settings-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type {
  ISystemSettings,
  IUpdateSettingsInput,
  SettingKey,
} from "@/types/settings.types";
import {
  settingsSchema,
  type SettingsValues,
} from "@/validations/settings-schema";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3.5 text-[10.5px] font-bold tracking-[0.1em] text-adm-faint uppercase">
      {children}
    </div>
  );
}

/** Bordered number input with a GH₵ prefix addon (console money idiom). */
function GhsInput({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[42px] items-center overflow-hidden rounded-[6px] border bg-[#FBFCF7] transition-[border-color,box-shadow] focus-within:border-console focus-within:shadow-[0_0_0_3px_rgb(62_125_98/0.16)]",
        error ? "border-console-red" : "border-adm-line",
      )}
    >
      <span className="flex h-full items-center border-r border-adm-line bg-adm-sunken px-2.5 text-[13px] text-adm-muted">
        GH₵
      </span>
      <Input
        inputMode="decimal"
        className="font-adminmono h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2.5 py-0 text-right text-[14px] tabular-nums text-adm-ink outline-none placeholder:text-adm-faint focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
        {...props}
      />
    </div>
  );
}

const toFormValues = (s: ISystemSettings): SettingsValues => ({
  purchaseApprovalThresholdGhs: String(s.purchaseApprovalThresholdGhs),
  lowFloatThresholdGhs: String(s.lowFloatThresholdGhs),
  companyContactPhone: s.companyContactPhone,
  companyContactWhatsapp: s.companyContactWhatsapp,
  companyContactEmail: s.companyContactEmail,
  companyContactAddress: s.companyContactAddress,
});

function SettingsForm({
  settings,
  descriptions,
}: {
  settings: ISystemSettings;
  descriptions: Record<SettingKey, string>;
}) {
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();

  // The page opens READ-ONLY; the Edit button unlocks the inputs.
  const [isEditing, setIsEditing] = useState(false);
  const readOnly = !isEditing;
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(settings),
  });

  const onSubmit = async (values: SettingsValues) => {
    // Send only the keys whose value actually changed.
    const next: ISystemSettings = {
      purchaseApprovalThresholdGhs: Number(values.purchaseApprovalThresholdGhs),
      lowFloatThresholdGhs: Number(values.lowFloatThresholdGhs),
      companyContactPhone: values.companyContactPhone.trim(),
      companyContactWhatsapp: values.companyContactWhatsapp.trim(),
      companyContactEmail: values.companyContactEmail.trim(),
      companyContactAddress: values.companyContactAddress.trim(),
    };
    const patch: IUpdateSettingsInput = {};
    for (const key of Object.keys(next) as SettingKey[]) {
      if (next[key] !== settings[key]) {
        Object.assign(patch, { [key]: next[key] });
      }
    }
    if (Object.keys(patch).length === 0) {
      notify.success("Nothing to save", {
        description: "No setting was changed.",
      });
      return;
    }
    try {
      await updateSettings(patch).unwrap();
      notify.success("Settings updated");
      setIsEditing(false);
    } catch (err) {
      notify.error("Couldn't save the settings", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-[560px] flex-col gap-4"
    >
      <AdminCard className="px-5 py-[18px]">
        <SectionLabel>Money thresholds</SectionLabel>
        <div className="flex flex-col gap-[13px]">
          <AdminField
            label="Purchase approval threshold"
            hint={descriptions.purchaseApprovalThresholdGhs}
            error={errors.purchaseApprovalThresholdGhs?.message}
          >
            <GhsInput
              placeholder="10,000"
              disabled={readOnly}
              error={!!errors.purchaseApprovalThresholdGhs}
              {...register("purchaseApprovalThresholdGhs")}
            />
          </AdminField>
          <AdminField
            label="Low float alert threshold"
            hint={descriptions.lowFloatThresholdGhs}
            error={errors.lowFloatThresholdGhs?.message}
          >
            <GhsInput
              placeholder="1,000"
              disabled={readOnly}
              error={!!errors.lowFloatThresholdGhs}
              {...register("lowFloatThresholdGhs")}
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="px-5 py-[18px]">
        <SectionLabel>Company contact</SectionLabel>
        <div className="flex flex-col gap-[13px]">
          <AdminField
            label="Phone (calls)"
            hint={descriptions.companyContactPhone}
            error={errors.companyContactPhone?.message}
          >
            <Input
              type="tel"
              placeholder="024 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.companyContactPhone && "border-console-red",
              )}
              {...register("companyContactPhone")}
            />
          </AdminField>
          <AdminField
            label="WhatsApp number"
            hint={descriptions.companyContactWhatsapp}
            error={errors.companyContactWhatsapp?.message}
          >
            <Input
              type="tel"
              placeholder="024 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.companyContactWhatsapp && "border-console-red",
              )}
              {...register("companyContactWhatsapp")}
            />
          </AdminField>
          <AdminField
            label="Email"
            hint={descriptions.companyContactEmail}
            error={errors.companyContactEmail?.message}
          >
            <Input
              type="email"
              placeholder="info@dbplus.com"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.companyContactEmail && "border-console-red",
              )}
              {...register("companyContactEmail")}
            />
          </AdminField>
          <AdminField
            label="Address"
            hint={descriptions.companyContactAddress}
            error={errors.companyContactAddress?.message}
          >
            <Input
              placeholder="Tamale, Northern Region"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.companyContactAddress && "border-console-red",
              )}
              {...register("companyContactAddress")}
            />
          </AdminField>
        </div>
      </AdminCard>

      {/* This row keeps its own markup rather than EditableFormActions
          because there is no create mode and Save is additionally gated on
          isDirty. The key on every branch is load-bearing: an unkeyed branch
          lets React reuse the same <button> DOM node across the swap, so
          clicking "Edit settings" flipped that very element to type="submit"
          before the browser ran the click's default action and the form
          PATCHed itself while still locked. */}
      <div className="flex gap-2">
        {isEditing ? (
          <Fragment key="editing">
            <AdminButton
              type="submit"
              disabled={saving || !isDirty}
              className="h-[38px] px-[18px]"
            >
              {saving ? "Saving…" : "Save settings"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="outline"
              className="h-[38px] px-3.5"
              onClick={() => {
                reset(toFormValues(settings));
                setIsEditing(false);
              }}
            >
              Cancel
            </AdminButton>
          </Fragment>
        ) : (
          <AdminButton
            key="locked"
            type="button"
            variant="gold"
            className="h-[38px] px-[18px]"
            onClick={() => setIsEditing(true)}
          >
            Edit settings
          </AdminButton>
        )}
      </div>
    </form>
  );
}

/** Owner-editable system configuration, wired to GET/PATCH /admin/settings.
 * Values resolve from the backend's typed registry (missing rows fall back
 * to its defaults) and every change is audited server-side with its
 * before/after. */
export function SettingsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetSettingsQuery();

  return (
    <div>
      <AdminPageHeader
        title="Settings"
        sub="Thresholds, switches and company details the whole system reads"
      />
      {isLoading ? (
        <FormSkeleton fields={10} className="max-w-none" />
      ) : isError || !data ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : (
        <SettingsForm
          key={JSON.stringify(data.data.settings)}
          settings={data.data.settings}
          descriptions={data.data.descriptions}
        />
      )}
    </div>
  );
}
