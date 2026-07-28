"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreatePlotMutation,
  useUpdatePlotMutation,
} from "@/redux/land/land-plots-api";
import type { ILandPlot } from "@/types/land.types";
import { plotSchema, type PlotValues } from "@/validations/land-schema";

const LIST = "/admin/plots";

/** The record's values, shaped for the form. */
const toFormValues = (plot: ILandPlot): PlotValues => ({
  askingPriceGhs: String(plot.askingPriceGhs ?? ""),
  description: plot.description ?? "",
  locationText: plot.locationText,
  purchaseCostGhs: String(plot.purchaseCostGhs ?? ""),
  reference: plot.reference,
  showPriceOnWebsite: plot.showPriceOnWebsite,
  sizeAcres: plot.sizeAcres ? String(plot.sizeAcres) : "",
  sizeText: plot.sizeText,
  use: plot.use ?? "",
});

export function PlotForm({ plot }: { plot?: ILandPlot }) {
  const router = useRouter();
  const [createPlot, createState] = useCreatePlotMutation();
  const [updatePlot, updateState] = useUpdatePlotMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit opens READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(plot === undefined);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlotValues>({
    resolver: zodResolver(plotSchema),
    defaultValues: plot ? toFormValues(plot) : { showPriceOnWebsite: false },
  });

  // A background refetch can bump the record. Track the fresh values while
  // reading, but never clobber an in-progress edit.
  useEffect(() => {
    if (plot && !isEditing) reset(toFormValues(plot));
  }, [plot, isEditing, reset]);

  const onSubmit = async (values: PlotValues) => {
    const body = {
      askingPriceGhs: Number(values.askingPriceGhs),
      locationText: values.locationText,
      showPriceOnWebsite: values.showPriceOnWebsite,
      sizeText: values.sizeText,
      ...(values.use?.trim() ? { use: values.use.trim() } : {}),
      ...(values.sizeAcres?.trim()
        ? { sizeAcres: Number(values.sizeAcres) }
        : {}),
      ...(values.purchaseCostGhs?.trim()
        ? { purchaseCostGhs: Number(values.purchaseCostGhs) }
        : {}),
      ...(values.description?.trim()
        ? { description: values.description.trim() }
        : {}),
    };
    try {
      if (plot) {
        // `reference` is deliberately absent from the update body. The backend's
        // update schema has no such key, so Zod strips it silently: sending an
        // edited reference told staff "Plot updated" while the register code
        // stayed exactly as it was. The field is locked on edit to match.
        await updatePlot({ id: plot.id, body }).unwrap();
        notify.success("Plot updated");
        router.push(`${LIST}/${plot.id}`);
      } else {
        const res = await createPlot({ ...body, reference: values.reference }).unwrap();
        notify.success("Plot created");
        router.push(`${LIST}/${res.data.plot.id}`);
      }
    } catch (err) {
      notify.error("Couldn't save the plot", {
        description: extractApiError(err).message,
      });
    }
  };

  const field = (
    key: keyof PlotValues,
    label: string,
    opts?: {
      optional?: boolean;
      placeholder?: string;
      mode?: "decimal";
      /** Set at creation and never editable afterwards. */
      locked?: boolean;
      hint?: string;
    },
  ) => {
    const disabled = readOnly || opts?.locked === true;
    return (
      <AdminField
        label={label}
        optional={opts?.optional}
        hint={opts?.hint}
        error={(errors[key] as { message?: string } | undefined)?.message}
      >
        <Input
          inputMode={opts?.mode}
          placeholder={opts?.placeholder}
          disabled={disabled}
          className={cn(
            adminInputClass,
            disabled && "disabled:cursor-default disabled:opacity-100",
            errors[key] && "border-error",
          )}
          {...register(key)}
        />
      </AdminField>
    );
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All plots" className="mb-2" />
      <AdminPageHeader title={plot ? "Edit plot" : "Add plot"} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          {field("reference", "Reference", {
            placeholder: "TML-014",
            locked: plot !== undefined,
            hint: plot
              ? "Fixed once assigned - the register code stays with the plot."
              : undefined,
          })}
          {field("locationText", "Location / title", {
            placeholder: "Kumbungu Road, Plot 14",
          })}
          {field("sizeText", "Size", { placeholder: "100 x 100 ft" })}
          {field("use", "Use", { optional: true, placeholder: "residential" })}
          {field("askingPriceGhs", "Asking price (GHS)", { mode: "decimal" })}
          {field("purchaseCostGhs", "Purchase cost (GHS)", {
            optional: true,
            mode: "decimal",
          })}
          {field("sizeAcres", "Acres", { optional: true, mode: "decimal" })}
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          {field("description", "Description", { optional: true })}
          <label
            className={cn(
              "flex items-center gap-2 text-[13px] text-ink",
              readOnly && "cursor-default",
            )}
          >
            <input
              type="checkbox"
              disabled={readOnly}
              className={roCls}
              {...register("showPriceOnWebsite")}
            />
            Show the asking price on the public listing
          </label>
        </AdminCard>

        <div className="flex justify-end gap-2">
          {!plot ? (
            <>
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => router.push(LIST)}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} className="h-10 px-5">
                {saving ? "Saving…" : "Create plot"}
              </AdminButton>
            </>
          ) : isEditing ? (
            <>
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} className="h-10 px-5">
                {saving ? "Saving…" : "Save changes"}
              </AdminButton>
            </>
          ) : (
            <AdminButton
              type="button"
              variant="gold"
              className="h-10 px-5"
              onClick={() => setIsEditing(true)}
            >
              Edit plot
            </AdminButton>
          )}
        </div>
      </form>
    </div>
  );
}
