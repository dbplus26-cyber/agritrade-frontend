"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  CommitRow,
  DetailHeader,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateSeasonMutation,
  useUpdateSeasonMutation,
} from "@/redux/farm/seasons-api";
import type { ISeason } from "@/types/farm.types";
import { seasonSchema, type SeasonValues } from "@/validations/farm-schema";

const LIST = "/admin/seasons";

/** A YYYY-MM-DD slice for a date input from an ISO string. */
const dateInput = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : "";

/** The record's values, shaped for the form. */
const toFormValues = (season?: ISeason): SeasonValues =>
  season
    ? {
        description: season.description ?? "",
        endsOn: dateInput(season.endsOn),
        name: season.name,
        startsOn: dateInput(season.startsOn),
      }
    : { description: "", endsOn: "", name: "", startsOn: "" };

export function SeasonForm({ season }: { season?: ISeason }) {
  const router = useRouter();
  const [createSeason, createState] = useCreateSeasonMutation();
  const [updateSeason, updateState] = useUpdateSeasonMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Always editable. This route is reached from the season's own detail page,
  // which is where the record is READ - so opening the form locked, on top of
  // a read-only copy of facts the reader has just come from, would ask for a
  // second click to do the one thing the page is for.

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SeasonValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues: toFormValues(season),
  });

  const onSubmit = async (values: SeasonValues) => {
    const description = values.description?.trim() ?? "";
    const body = {
      name: values.name,
      startsOn: values.startsOn,
      ...(values.endsOn?.trim() ? { endsOn: values.endsOn } : {}),
    };
    try {
      if (season) {
        // null clears the column on an edit; a create simply omits it.
        await updateSeason({
          id: season.id,
          body: { ...body, description: description || null },
        }).unwrap();
        notify.success("Season updated");
        router.push(`${LIST}/${season.id}`);
      } else {
        const res = await createSeason({
          ...body,
          ...(description ? { description } : {}),
        }).unwrap();
        notify.success("Season created");
        router.push(`${LIST}/${res.data.season.id}`);
      }
    } catch (err) {
      notify.error("Couldn't save the season", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[640px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Seasons", href: LIST }]}
        current={season ? "Edit season" : "New season"}
      >
        <DetailHeader
          title={season ? "Edit season" : "New season"}
          sub="The planting season that grants and repayments are booked against"
        />
      </DetailNav>

      {/* The date pair measures against this form, not the viewport: the
          console shell keeps a ~225px rail beside it, so `sm:` would pair the
          two dates up while the column is still too narrow for both. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-5">
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                placeholder="e.g. 2026 Wet Season"
                className={cn(adminInputClass, errors.name && "border-console-red")}
                {...register("name")}
              />
            </AdminField>
            {/* What the season covers - crops and window - for when the name
                alone ("2026 Major") does not say enough to a field officer. */}
            <AdminField
              label="Description"
              optional
              hint="What this season covers, for when the name alone does not say enough."
              error={errors.description?.message}
            >
              <textarea
                rows={4}
                placeholder="e.g. Major season maize and soya, planting from April"
                className={cn(
                  adminInputClass,
                  "h-auto min-h-[62px] w-full resize-y py-2",
                  errors.description && "border-console-red",
                )}
                {...register("description")}
              />
            </AdminField>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField label="Starts on" error={errors.startsOn?.message}>
                <DateInput
                  placeholder="Pick the start date"
                  className={cn(
                    adminInputClass,
                    errors.startsOn && "border-console-red",
                  )}
                  {...register("startsOn")}
                />
              </AdminField>
              <AdminField label="Ends on" optional error={errors.endsOn?.message}>
                <DateInput
                  placeholder="Pick the end date"
                  className={cn(
                    adminInputClass,
                    errors.endsOn && "border-console-red",
                  )}
                  {...register("endsOn")}
                />
              </AdminField>
            </div>
          </section>
        </AdminCard>

        {/* Cancel returns to where the record is read rather than locking
            the form back down: this route has no locked state. */}
        <CommitRow>
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(season ? `${LIST}/${season.id}` : LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} loading={saving} size="lg">
            {saving ? "Saving…" : season ? "Save changes" : "Create season"}
          </AdminButton>
        </CommitRow>
      </form>
    </div>
  );
}
