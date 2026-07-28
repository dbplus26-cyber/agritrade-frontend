"use client";

import { Fragment, useEffect, useState } from "react";
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
        endsOn: dateInput(season.endsOn),
        name: season.name,
        startsOn: dateInput(season.startsOn),
      }
    : { endsOn: "", name: "", startsOn: "" };

export function SeasonForm({ season }: { season?: ISeason }) {
  const router = useRouter();
  const [createSeason, createState] = useCreateSeasonMutation();
  const [updateSeason, updateState] = useUpdateSeasonMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit opens READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(season === undefined);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SeasonValues>({
    resolver: zodResolver(seasonSchema),
    defaultValues: toFormValues(season),
  });

  // A background refetch can bump the record. Track the fresh values while
  // reading, but never clobber an in-progress edit.
  useEffect(() => {
    if (season && !isEditing) reset(toFormValues(season));
  }, [season, isEditing, reset]);

  const onSubmit = async (values: SeasonValues) => {
    const body = {
      name: values.name,
      startsOn: values.startsOn,
      ...(values.endsOn?.trim() ? { endsOn: values.endsOn } : {}),
    };
    try {
      if (season) {
        await updateSeason({ id: season.id, body }).unwrap();
        notify.success("Season updated");
        router.push(`${LIST}/${season.id}`);
      } else {
        const res = await createSeason(body).unwrap();
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
    <div className="max-w-[520px]">
      <BackButton href={LIST} label="All seasons" className="mb-2" />
      <AdminPageHeader title={season ? "Edit season" : "New season"} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="2026 Wet Season"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-error")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Starts on" error={errors.startsOn?.message}>
              <Input
                type="date"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.startsOn && "border-error",
                )}
                {...register("startsOn")}
              />
            </AdminField>
            <AdminField label="Ends on" optional error={errors.endsOn?.message}>
              <Input
                type="date"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.endsOn && "border-error",
                )}
                {...register("endsOn")}
              />
            </AdminField>
          </div>
        </AdminCard>

        {/* This row keeps its own markup rather than EditableFormActions
            because it is right-aligned and puts Cancel before the primary
            button. The key on every branch is still load-bearing: an unkeyed
            branch lets React reuse the same <button> DOM node across the
            swap, so clicking "Edit season" would flip that very element to
            type="submit" before the browser ran the click's default action
            and the form would PATCH itself while still locked. */}
        <div className="flex justify-end gap-2">
          {!season ? (
            <Fragment key="create">
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => router.push(LIST)}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} className="h-10 px-5">
                {saving ? "Saving…" : "Create season"}
              </AdminButton>
            </Fragment>
          ) : isEditing ? (
            <Fragment key="editing">
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
            </Fragment>
          ) : (
            <AdminButton
              key="locked"
              type="button"
              variant="gold"
              className="h-10 px-5"
              onClick={() => setIsEditing(true)}
            >
              Edit season
            </AdminButton>
          )}
        </div>
      </form>
    </div>
  );
}
