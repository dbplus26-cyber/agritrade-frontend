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
  SectionHeading,
  adminInputClass,
} from "@/components/admin/ui";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { SignaturePad } from "@/components/ui/SignaturePad";
import {
  useGetSettingsQuery,
  useRemoveDocumentSignatureMutation,
  useUpdateSettingsMutation,
  useUploadDocumentSignatureMutation,
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
    // Send only the keys whose value actually changed. (This screen owns the
    // system settings; the statement-settings screen owns the statement*
    // keys, so `next` is deliberately a subset of ISystemSettings.)
    const next: IUpdateSettingsInput = {
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
      className="flex max-w-[640px] flex-col gap-4"
    >
      <AdminCard className="px-5 py-[18px]">
        <SectionHeading hint="The figures the console checks a purchase or a float against before it asks anyone to approve it.">
          Money thresholds
        </SectionHeading>
        <div className="flex flex-col gap-[13px]">
          <AdminField
            label="Purchase approval threshold"
            hint={descriptions.purchaseApprovalThresholdGhs}
            error={errors.purchaseApprovalThresholdGhs?.message}
          >
            <GhsInput
              placeholder="e.g. 10,000"
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
              placeholder="e.g. 1,000"
              disabled={readOnly}
              error={!!errors.lowFloatThresholdGhs}
              {...register("lowFloatThresholdGhs")}
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard className="px-5 py-[18px]">
        <SectionHeading hint="What the public site and outgoing documents show as the way to reach the business.">
          Company contact
        </SectionHeading>
        <div className="flex flex-col gap-[13px]">
          <AdminField
            label="Phone (calls)"
            hint={descriptions.companyContactPhone}
            error={errors.companyContactPhone?.message}
          >
            <Input
              type="tel"
              placeholder="e.g. 024 000 0000"
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
              placeholder="e.g. 024 000 0000"
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
              placeholder="e.g. info@dbplus.com"
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
              placeholder="e.g. Tamale, Northern Region"
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
              size="lg"
            >
              {saving ? "Saving…" : "Save settings"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
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
            size="lg"
            onClick={() => setIsEditing(true)}
          >
            Edit settings
          </AdminButton>
        )}
      </div>
    </form>
  );
}

/**
 * The owner's signature: uploaded as an image or drawn on the pad, kept
 * once, and stamped by the server on every receipt, waybill and statement
 * certificate - so documents leave the system already signed instead of
 * waiting for the same hand on every page.
 */
function SignatureCard({ settings }: { settings: ISystemSettings }) {
  const [uploadSignature, uploadState] = useUploadDocumentSignatureMutation();
  const [removeSignature, removeState] = useRemoveDocumentSignatureMutation();
  const [padOpen, setPadOpen] = useState(false);
  // What was just drawn or picked, shown IMMEDIATELY: the Cloudinary
  // round-trip plus the settings refetch takes seconds, and a preview that
  // sits unchanged that long reads as "it did not work". The local copy is
  // pixel-identical to what the server stores, so it simply stays until the
  // fresh URL arrives with the next settings payload.
  const [pendingUrl, setPendingUrl] = useState<null | string>(null);

  const onUpload = async (file: null | File) => {
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPendingUrl(localUrl);
    try {
      await uploadSignature(file).unwrap();
      notify.success("Signature saved", {
        description:
          "It now prints on every receipt, waybill and statement certificate.",
      });
      setPadOpen(false);
    } catch (err) {
      // Not saved - the stand-in must not keep claiming it was.
      URL.revokeObjectURL(localUrl);
      setPendingUrl(null);
      notify.error("Couldn't save the signature", {
        description: extractApiError(err).message,
      });
      throw err; // keep the picker's preview for a retry
    }
  };

  const onRemove = async () => {
    try {
      await removeSignature().unwrap();
      setPendingUrl(null);
      notify.success("Signature removed", {
        description: "Documents now print an empty line for ink.",
      });
    } catch (err) {
      notify.error("Couldn't remove the signature", {
        description: extractApiError(err).message,
      });
    }
  };

  const shownUrl = pendingUrl ?? (settings.documentSignatureUrl || null);
  const hasSignature = shownUrl !== null;
  return (
    <AdminCard className="px-5 py-[18px]">
      <SectionHeading hint="Stamped over the authorised-signature line on receipts, waybills and the statement book's certificate - signed once, printed everywhere.">
        Owner&apos;s signature
      </SectionHeading>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary preview
            <img
              src={shownUrl}
              alt="Saved signature"
              className="h-16 w-40 flex-none rounded-[6px] border border-adm-line bg-white object-contain px-2"
            />
          ) : (
            <div className="flex h-16 w-40 flex-none items-center justify-center rounded-[6px] border border-dashed border-adm-strong/60 text-[9px] font-bold tracking-[0.08em] text-adm-faint uppercase">
              No signature
            </div>
          )}
          <p className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-adm-muted">
            {uploadState.isLoading
              ? "Saving the signature…"
              : hasSignature
                ? "This signature prints on every document that needs one."
                : "No signature saved - documents print an empty line to sign by hand."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            type="button"
            variant="secondary"
            aria-expanded={padOpen}
            onClick={() => setPadOpen((v) => !v)}
          >
            {padOpen ? "Hide signature pad" : "Sign digitally"}
          </AdminButton>
          <FilePicker
            accept="image/png,image/jpeg"
            busy={uploadState.isLoading}
            confirmLabel="Save signature"
            hint="PNG or JPEG, up to 2MB - a dark signature on a plain background prints best"
            onConfirm={onUpload}
            triggerLabel={hasSignature ? "Replace with image" : "Upload image"}
          />
          {hasSignature ? (
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={removeState.isLoading}
              onClick={() => void onRemove()}
            >
              {removeState.isLoading ? "Removing…" : "Remove"}
            </AdminButton>
          ) : null}
        </div>
      </div>
      {padOpen ? (
        // The same inline pad the shipment page uses for the driver's
        // signature - drawn in normal document flow, where canvas sizing
        // just works. "Use signature" feeds the drawn PNG straight into the
        // same upload path a scanned image takes.
        <div className="mt-3">
          <SignaturePad
            onCapture={(file) => {
              // The pad closes from onUpload's SUCCESS, not here - closing
              // instantly left seconds of silence while the upload ran.
              void onUpload(file).catch(() => undefined);
            }}
          />
        </div>
      ) : null}
    </AdminCard>
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
        hint="System-wide rules: approval limits, company details and notifications."
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
        <div className="flex max-w-[640px] flex-col gap-4">
          <SettingsForm
            key={JSON.stringify(data.data.settings)}
            settings={data.data.settings}
            descriptions={data.data.descriptions}
          />
          <SignatureCard settings={data.data.settings} />
        </div>
      )}
    </div>
  );
}
