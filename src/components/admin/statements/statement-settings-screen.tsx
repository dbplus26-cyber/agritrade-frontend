"use client";

// The books' own settings: everything that names the business on the
// generated statements - cover name, logo, proprietor, activity, bankers,
// accountants. Kept apart from the general system settings on purpose: these
// words appear on a signed document, and the person editing them is thinking
// about the book, not about approval thresholds.
import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePicker } from "@/components/ui/FilePicker";
import { Input } from "@/components/ui/input";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  AdminPageHeader,
  CommitRow,
  SectionHeading,
} from "@/components/admin/ui";
import { FormSkeleton } from "@/components/admin/skeletons";
import { RecordFacts } from "@/components/admin/record-facts";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/redux/settings/settings-api";
import {
  useRemoveStatementLogoMutation,
  useUploadStatementLogoMutation,
} from "@/redux/statements/statements-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type {
  ISystemSettings,
  IUpdateSettingsInput,
  SettingKey,
} from "@/types/settings.types";
import {
  statementSettingsSchema,
  type StatementSettingsValues,
} from "@/validations/statement-schema";

const toFormValues = (s: ISystemSettings): StatementSettingsValues => ({
  statementAccountantsBlock: s.statementAccountantsBlock,
  statementBankersBlock: s.statementBankersBlock,
  statementBusinessName: s.statementBusinessName,
  statementPrincipalActivity: s.statementPrincipalActivity,
  statementProprietorAddress: s.statementProprietorAddress,
  statementProprietorName: s.statementProprietorName,
});

/**
 * The cover logo, managed by UPLOAD (the console's pick-preview-confirm
 * picker, then Cloudinary) rather than a typed URL - and a fallback switch:
 * with no logo uploaded, the book can print the website's own logo instead
 * of leaving the cover bare.
 */
function LogoCard({ settings }: { settings: ISystemSettings }) {
  const [uploadLogo, uploadState] = useUploadStatementLogoMutation();
  const [removeLogo, removeState] = useRemoveStatementLogoMutation();
  const [updateSettings, toggleState] = useUpdateSettingsMutation();

  const onUpload = async (file: null | File) => {
    if (!file) return;
    try {
      await uploadLogo(file).unwrap();
      notify.success("Statement logo updated");
    } catch (err) {
      notify.error("Couldn't upload the logo", {
        description: extractApiError(err).message,
      });
      throw err; // keep the picker's preview for a retry
    }
  };

  const onRemove = async () => {
    try {
      await removeLogo().unwrap();
      notify.success("Statement logo removed");
    } catch (err) {
      notify.error("Couldn't remove the logo", {
        description: extractApiError(err).message,
      });
    }
  };

  const onToggleFallback = async (next: boolean) => {
    try {
      await updateSettings({ statementLogoFallbackToSite: next }).unwrap();
      notify.success(
        next
          ? "The book will fall back to the website logo"
          : "The book will print no logo when none is uploaded",
      );
    } catch (err) {
      notify.error("Couldn't change the fallback", {
        description: extractApiError(err).message,
      });
    }
  };

  const hasLogo = settings.statementLogoUrl !== "";
  return (
    <AdminCard className="px-5 py-[18px]">
      <SectionHeading hint="Printed on the book's cover, centred between the business name and the report title. PNG or JPEG.">
        Cover logo
      </SectionHeading>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary preview
            <img
              src={settings.statementLogoUrl}
              alt="Current statement logo"
              className="h-16 w-16 flex-none rounded-none border border-adm-line object-contain"
            />
          ) : (
            <div className="flex h-16 w-16 flex-none items-center justify-center rounded-none border border-dashed border-adm-strong/60 text-[9px] font-bold tracking-[0.08em] text-adm-faint uppercase">
              No logo
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-[1.5] text-adm-muted">
              {hasLogo
                ? "This logo prints on the cover of every generated book."
                : settings.statementLogoFallbackToSite
                  ? "No logo uploaded - the website's own logo will print on the cover."
                  : "No logo uploaded - the cover will print without one."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilePicker
            accept="image/png,image/jpeg"
            busy={uploadState.isLoading}
            confirmLabel="Upload logo"
            hint="PNG or JPEG, up to 2MB"
            onConfirm={onUpload}
            triggerLabel={hasLogo ? "Replace logo" : "Choose logo"}
          />
          {hasLogo ? (
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={removeState.isLoading}
              loading={removeState.isLoading}
              onClick={() => void onRemove()}
            >
              {removeState.isLoading ? "Removing…" : "Remove logo"}
            </AdminButton>
          ) : null}
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 pt-3 text-[11.5px] text-adm-body">
          <input
            type="checkbox"
            checked={settings.statementLogoFallbackToSite}
            disabled={toggleState.isLoading}
            onChange={(e) => void onToggleFallback(e.target.checked)}
            className="mt-0.5 size-4 flex-none cursor-pointer accent-[#1e3d2b]"
          />
          <span className="min-w-0">
            Fall back to the website logo
            <span className="block text-[11px] text-adm-muted">
              When no logo is uploaded here, print the site&rsquo;s own logo on
              the cover instead of leaving it bare.
            </span>
          </span>
        </label>
      </div>
    </AdminCard>
  );
}

const textareaClass = cn(adminInputClass, "h-auto min-h-[74px] w-full resize-y py-2");

function StatementSettingsForm({
  settings,
  descriptions,
}: {
  settings: ISystemSettings;
  descriptions: Record<SettingKey, string>;
}) {
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StatementSettingsValues>({
    resolver: zodResolver(statementSettingsSchema),
    defaultValues: toFormValues(settings),
  });

  const onSubmit = async (values: StatementSettingsValues) => {
    const next: StatementSettingsValues = {
      statementAccountantsBlock: values.statementAccountantsBlock.trim(),
      statementBankersBlock: values.statementBankersBlock.trim(),
      statementBusinessName: values.statementBusinessName.trim(),
      statementPrincipalActivity: values.statementPrincipalActivity.trim(),
      statementProprietorAddress: values.statementProprietorAddress.trim(),
      statementProprietorName: values.statementProprietorName.trim(),
    };
    const patch: IUpdateSettingsInput = {};
    for (const key of Object.keys(next) as (keyof StatementSettingsValues)[]) {
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
      notify.success("Statement settings updated");
      setIsEditing(false);
    } catch (err) {
      notify.error("Couldn't save the settings", {
        description: extractApiError(err).message,
      });
    }
  };

  /** A block of the cover, named. Three unlabelled boxes said nothing about
   * which of them carried what. */
  const section = (
    title: string,
    note: string,
    body: React.ReactNode,
  ) => (
    <AdminCard className="px-5 py-[18px]">
      <SectionHeading className="mb-0.5">{title}</SectionHeading>
      <p className="mb-4 text-[11px] leading-[1.5] text-adm-muted">{note}</p>
      {body}
    </AdminCard>
  );

  /** A saved block as it will print, or an honest gap. */
  const printed = (value: string) =>
    value.trim() ? (
      <span className="whitespace-pre-line">{value}</span>
    ) : null;

  // At rest the settings READ. A disabled copy of the form seals each value
  // into a box the width of the input, greys the whole page to one tone, and
  // gives a reader no way to see a long address in full - which is the same
  // reason every record page in the console opens as facts and unlocks on
  // Edit.
  if (!isEditing) {
    return (
      <div className="flex flex-col gap-4">
        {section(
          "The business",
          "The name and activity printed on the cover and the certificate.",
          <RecordFacts
            facts={[
              {
                label: "Business name",
                value: printed(settings.statementBusinessName),
              },
              {
                full: true,
                label: "Principal business activity",
                value: printed(settings.statementPrincipalActivity),
              },
            ]}
          />,
        )}
        {section(
          "The proprietor",
          "Who the books belong to, as they sign them.",
          <RecordFacts
            facts={[
              {
                label: "Proprietor's name",
                value: printed(settings.statementProprietorName),
              },
              {
                full: true,
                label: "Proprietor's address",
                value: printed(settings.statementProprietorAddress),
              },
            ]}
          />,
        )}
        {section(
          "Bankers and accountants",
          "The blocks on the cover and the certificate's signature lines. Both optional.",
          <RecordFacts
            facts={[
              {
                full: true,
                label: "Bankers",
                value: printed(settings.statementBankersBlock),
              },
              {
                full: true,
                label: "Accountants",
                value: printed(settings.statementAccountantsBlock),
              },
            ]}
          />,
        )}
        <CommitRow>
          <AdminButton
            key="locked"
            type="button"
            variant="gold"
            size="lg"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Edit statement settings
          </AdminButton>
        </CommitRow>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {section(
        "The business",
        "The name and activity printed on the cover and the certificate.",
        <div className="flex flex-col gap-5">
          <AdminField
            label="Business name"
            hint={descriptions.statementBusinessName}
            error={errors.statementBusinessName?.message}
          >
            <Input
              placeholder="e.g. DB Plus Business"
              className={cn(
                adminInputClass,
                errors.statementBusinessName && "border-console-red",
              )}
              {...register("statementBusinessName")}
            />
          </AdminField>
          <AdminField
            label="Principal business activity"
            hint={descriptions.statementPrincipalActivity}
            error={errors.statementPrincipalActivity?.message}
          >
            <textarea
              rows={3}
              placeholder="e.g. Farming, agribusiness, general merchant…"
              className={cn(
                textareaClass,
                errors.statementPrincipalActivity && "border-console-red",
              )}
              {...register("statementPrincipalActivity")}
            />
          </AdminField>
        </div>,
      )}

      {section(
        "The proprietor",
        "Who the books belong to, as they sign them.",
        <div className="flex flex-col gap-5">
          <AdminField
            label="Proprietor's name"
            hint={descriptions.statementProprietorName}
            error={errors.statementProprietorName?.message}
          >
            <Input
              placeholder="e.g. Hassan Issah"
              className={cn(
                adminInputClass,
                errors.statementProprietorName && "border-console-red",
              )}
              {...register("statementProprietorName")}
            />
          </AdminField>
          <AdminField
            label="Proprietor's address"
            hint="One line per row, as it should print."
            error={errors.statementProprietorAddress?.message}
          >
            <textarea
              rows={3}
              placeholder={"H/No. …\nTown - Region"}
              className={cn(
                textareaClass,
                errors.statementProprietorAddress && "border-console-red",
              )}
              {...register("statementProprietorAddress")}
            />
          </AdminField>
        </div>,
      )}

      {section(
        "Bankers and accountants",
        "The blocks on the cover and the certificate's signature lines. Both optional.",
        <div className="grid gap-5 @2xl:grid-cols-2">
          <AdminField
            label="Bankers"
            optional
            hint={descriptions.statementBankersBlock}
            error={errors.statementBankersBlock?.message}
          >
            <textarea
              rows={4}
              placeholder={"Bank name\nBranch\nTown - Region"}
              className={cn(
                textareaClass,
                errors.statementBankersBlock && "border-console-red",
              )}
              {...register("statementBankersBlock")}
            />
          </AdminField>
          <AdminField
            label="Accountants"
            optional
            hint="Shown on the cover and the certificate's second signature block. Leave blank if no external accountants are engaged."
            error={errors.statementAccountantsBlock?.message}
          >
            <textarea
              rows={4}
              placeholder={"Firm name\n(Chartered Accountants)\nP. O. Box …\nCity - Country"}
              className={cn(
                textareaClass,
                errors.statementAccountantsBlock && "border-console-red",
              )}
              {...register("statementAccountantsBlock")}
            />
          </AdminField>
        </div>,
      )}

      {/* Same keyed-branch discipline as the system settings form: an unkeyed
          swap would let the Edit button's DOM node become the submit. */}
      <CommitRow>
        {isEditing ? (
          <Fragment key="editing">
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
            <AdminButton type="submit" disabled={saving || !isDirty} loading={saving} size="lg">
              {saving ? "Saving…" : "Save statement settings"}
            </AdminButton>
          </Fragment>
        ) : (
          <AdminButton
            key="locked"
            type="button"
            variant="gold"
            size="lg"
            onClick={() => {
              setIsEditing(true);
            }}
          >
            Edit statement settings
          </AdminButton>
        )}
      </CommitRow>
    </form>
  );
}

/** The books' identity settings, wired to the same audited GET/PATCH
 * /admin/settings surface as the system settings screen. */
export function StatementSettingsScreen() {
  const { data, isLoading, isError, error, refetch } = useGetSettingsQuery();

  return (
    <div>
      <AdminPageHeader
        title="Statement Settings"
        hint="The names, logo and blocks printed on the generated statement books - edit them here once and every future book carries them."
        sub="Who the books say you are: cover name, logo, proprietor, bankers, accountants"
      />
      {isLoading ? (
        <FormSkeleton fields={8} className="max-w-none" />
      ) : isError || !data ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : (
        // @container so the bankers/accountants pair measures against this
        // column and not the window: the rail-less page is wider than the
        // form wants to be, and the pair only fits past 42rem of it.
        <div className="@container flex max-w-[860px] flex-col gap-4">
          <LogoCard settings={data.data.settings} />
          <StatementSettingsForm
            settings={data.data.settings}
            descriptions={data.data.descriptions}
          />
        </div>
      )}
    </div>
  );
}
