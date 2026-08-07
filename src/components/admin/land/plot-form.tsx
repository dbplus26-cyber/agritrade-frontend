"use client";

import { Fragment, } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  SectionHeading,
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

  // Always editable. The plot has a detail page of its own, so opening the
  // form locked on top of a read-only copy of what the reader just came from
  // asked for a second click to do the one thing this route is for.

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PlotValues>({
    resolver: zodResolver(plotSchema),
    defaultValues: plot ? toFormValues(plot) : { showPriceOnWebsite: false },
  });

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
    const disabled = opts?.locked === true;
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
            errors[key] && "border-console-red",
          )}
          {...register(key)}
        />
      </AdminField>
    );
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All plots" className="mb-2" />
      <AdminPageHeader
        title={plot ? "Edit plot" : "Add plot"}
        sub={
          plot
            ? "Location, size and pricing - photos and title documents live on the plot record"
            : "Put a plot on the register so it can be priced, published and sold"
        }
      />

      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-3">
            <SectionHeading
              className="mb-0"
              hint="What this plot is called on the register, where it is, and how big."
            >
              The plot itself
            </SectionHeading>
            <div className="grid grid-cols-1 gap-3 @min-[440px]:grid-cols-2">
              {field("reference", "Reference", {
                placeholder: "e.g. TML-014",
                locked: plot !== undefined,
                hint: plot
                  ? "Fixed once assigned - the register code stays with the plot."
                  : undefined,
              })}
              {field("locationText", "Location / title", {
                placeholder: "e.g. Kumbungu Road, Plot 14",
              })}
              {field("sizeText", "Size", { placeholder: "e.g. 100 x 100 ft" })}
              {field("sizeAcres", "Acres", {
                optional: true,
                mode: "decimal",
                placeholder: "e.g. 0.25",
                hint: "The same size as a plain number, so plots can be compared and priced per acre.",
              })}
              {field("use", "Use", { optional: true, placeholder: "e.g. residential" })}
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-adm-hairline pt-5">
            <SectionHeading
              className="mb-0"
              hint="What the plot is listed at and what it cost you. The difference is what you make on a sale."
            >
              Pricing
            </SectionHeading>
            <div className="grid grid-cols-1 gap-3 @min-[440px]:grid-cols-2">
              {field("askingPriceGhs", "Asking price (GHS)", {
                mode: "decimal",
                placeholder: "e.g. 60000",
                hint: "What you are listing the plot at, which is the price a buyer is quoted.",
              })}
              {field("purchaseCostGhs", "Purchase cost (GHS)", {
                optional: true,
                mode: "decimal",
                placeholder: "e.g. 45000",
                hint: "What the plot cost you to get hold of, used to work out what you make on a sale.",
              })}
            </div>
            <label className="flex items-center gap-2 text-[13px] text-adm-ink">
              <input type="checkbox" {...register("showPriceOnWebsite")} />
              Show the asking price on the public listing
            </label>
          </section>

          <section className="flex flex-col gap-3 border-t border-adm-hairline pt-5">
            <SectionHeading className="mb-0">On the website</SectionHeading>
            {field("description", "Description", {
              optional: true,
              placeholder: "e.g. Corner plot, fenced on two sides, borehole on site",
            })}
          </section>
        </AdminCard>

        {/* This row keeps its own markup rather than EditableFormActions
            because it is right-aligned and puts Cancel before the primary
            button. The key on every branch is still load-bearing: an unkeyed
            branch lets React reuse the same <button> DOM node across the
            swap, so clicking "Edit plot" would flip that very element to
            type="submit" before the browser ran the click's default action
            and the form would PATCH itself while still locked. */}
        <div className="flex flex-wrap justify-end gap-2">
          {!plot ? (
            <Fragment key="create">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push(LIST)}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} size="lg">
                {saving ? "Saving…" : "Create plot"}
              </AdminButton>
            </Fragment>
          ) : (
            <Fragment key="editing">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => router.push(plot ? `${LIST}/${plot.id}` : LIST)}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} size="lg">
                {saving ? "Saving…" : "Save changes"}
              </AdminButton>
            </Fragment>
          )}
        </div>
      </form>
    </div>
  );
}
