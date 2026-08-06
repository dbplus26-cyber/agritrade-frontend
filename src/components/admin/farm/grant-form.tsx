"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
import { FilePicker } from "@/components/ui/FilePicker";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetFarmersQuery } from "@/redux/farm/farmers-api";
import { useCreateGrantMutation } from "@/redux/farm/grants-api";
import { useGetInputItemsQuery } from "@/redux/farm/input-items-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { grantSchema, type GrantValues } from "@/validations/farm-schema";

const LIST = "/admin/grants";
const AGREEMENT_MISSING = "Upload the signed grant agreement";

/** Record an input grant. `farmerId` may be pre-filled from a farmer's page. */
export function GrantForm({ farmerId }: { farmerId?: string }) {
  const router = useRouter();
  const [createGrant, { isLoading: saving }] = useCreateGrantMutation();
  const farmerSearch = useRemoteSearch();
  const farmers = useGetFarmersQuery({
    isActive: true,
    limit: 20,
    search: farmerSearch.query,
  });
  const seasons = useGetSeasonsQuery({ isActive: true, limit: 100 });
  const items = useGetInputItemsQuery({ isActive: true, limit: 100 });

  // The signed agreement rides outside the Zod schema: it is a multipart file
  // part, staged here until the form's own submit carries it.
  const [agreement, setAgreement] = useState<File | null>(null);
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState("");

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      agreedTerms: "",
      dueDate: "",
      farmerId: farmerId ?? "",
      itemId: "",
      notes: "",
      quantity: "",
      seasonId: "",
      valueGhs: "",
    },
  });

  const onSubmit = async (values: GrantValues) => {
    if (!agreement) {
      setAgreementError(AGREEMENT_MISSING);
      return;
    }
    try {
      await createGrant({
        body: {
          farmerId: values.farmerId,
          itemId: values.itemId,
          quantity: Number(values.quantity),
          seasonId: values.seasonId,
          valueGhs: Number(values.valueGhs),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
          ...(values.agreedTerms?.trim()
            ? { agreedTerms: values.agreedTerms.trim() }
            : {}),
          ...(values.dueDate ? { dueDate: values.dueDate } : {}),
          ...(documentName.trim() ? { documentName: documentName.trim() } : {}),
        },
        agreement,
      }).unwrap();
      notify.success("Grant recorded");
      router.push(LIST);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "farmerId",
          "seasonId",
          "itemId",
          "quantity",
          "valueGhs",
          "notes",
          "agreedTerms",
          "dueDate",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't record the grant", { description: message });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All grants" className="mb-2" />
      <AdminPageHeader
        title="New input grant"
        hint="Advance seed, fertiliser or tools to a farmer against this season."
        sub="Inputs handed to a farmer, valued in cedis and owed back at harvest"
      />

      <form
        noValidate
        // Surface the missing file alongside RHF's own errors: on an invalid
        // submit RHF never calls onSubmit, so the file check runs here too.
        onSubmit={handleSubmit(onSubmit, () => {
          if (!agreement) setAgreementError(AGREEMENT_MISSING);
        })}
        className="flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Farmer" error={errors.farmerId?.message}>
            <Controller
              control={control}
              name="farmerId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(farmers.data?.data ?? []).map((f) => ({
                    value: f.id,
                    label: f.name,
                    ...(f.community ? { hint: f.community } : {}),
                  }))}
                  placeholder="Choose the farmer"
                  onSearchChange={farmerSearch.onSearchChange}
                  loading={farmers.isFetching}
                  className={cn(errors.farmerId && "border-console-red")}
                />
              )}
            />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Season" error={errors.seasonId?.message}>
              <Controller
                control={control}
                name="seasonId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={(seasons.data?.data ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="Choose the season"
                    className={cn(errors.seasonId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
            <AdminField label="Input item" error={errors.itemId?.message}>
              <Controller
                control={control}
                name="itemId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={(items.data?.data ?? []).map((i) => ({
                      value: i.id,
                      label: i.name,
                      hint: i.unitLabel,
                    }))}
                    placeholder="Choose the item"
                    className={cn(errors.itemId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
            <AdminField label="Quantity" error={errors.quantity?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.quantity && "border-console-red")}
                {...register("quantity")}
              />
            </AdminField>
            <AdminField label="Value (GHS)" error={errors.valueGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.valueGhs && "border-console-red")}
                {...register("valueGhs")}
              />
            </AdminField>
          </div>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Signed agreement
            </div>
            <p className="mt-1 text-[12px] text-adm-muted">
              The agreement the farmer signed becomes the binding record behind
              this grant - what was taken, and what was agreed in return.
            </p>
          </div>
          <AdminField
            label="Agreed repayment terms"
            optional
            error={errors.agreedTerms?.message}
          >
            <textarea
              rows={4}
              placeholder="e.g. 50 bags of maize at harvest, or cash by 30 Nov"
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.agreedTerms && "border-console-red",
              )}
              {...register("agreedTerms")}
            />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Due date" optional error={errors.dueDate?.message}>
              <Input
                type="date"
                className={cn(adminInputClass, errors.dueDate && "border-console-red")}
                {...register("dueDate")}
              />
            </AdminField>
            <AdminField label="Document name" optional>
              <Input
                placeholder="Grant agreement"
                className={adminInputClass}
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </AdminField>
          </div>
          {/* Not an AdminField: wrapping the picker's buttons in a <label>
              would misroute label clicks. Same stencil-label + error markup. */}
          <div>
            <span className="mb-[7px] block text-[11px] uppercase tracking-[0.14em] text-adm-muted">
              Agreement file
            </span>
            <FilePicker
              accept="image/*,application/pdf,.doc,.docx"
              hint="PDF, Word or a photo of the signed agreement"
              onConfirm={(file) => {
                setAgreement(file);
                if (file) setAgreementError(null);
              }}
              optimize={false}
              stage
              triggerLabel="Choose agreement"
            />
            {agreementError ? (
              <span
                role="alert"
                className="mt-1 block text-[12px] font-medium text-console-red"
              >
                {agreementError}
              </span>
            ) : null}
          </div>
        </AdminCard>

        <p className="text-[12px] text-adm-muted">
          A grant at or above the owner-set threshold records immediately but is
          flagged for approval.
        </p>

        <div className="flex justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} className="h-10 px-5">
            {saving ? "Saving…" : "Record grant"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
