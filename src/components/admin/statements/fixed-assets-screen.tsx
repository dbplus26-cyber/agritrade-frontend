"use client";

// The fixed-asset register: the assets the statements depreciate, with their
// classes (depreciation + capital-allowance vocabulary). An asset is entered
// once and flows into every later book until disposed of.
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TitleCell } from "@/components/admin/table-cells";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateAssetClassMutation,
  useCreateFixedAssetMutation,
  useDeleteFixedAssetMutation,
  useDisposeFixedAssetMutation,
  useGetAssetClassesQuery,
  useGetFixedAssetsQuery,
} from "@/redux/statements/statements-api";
import type { IFixedAsset } from "@/types/statement.types";
import {
  assetClassSchema,
  type AssetClassValues,
  disposeAssetSchema,
  type DisposeAssetValues,
  fixedAssetSchema,
  type FixedAssetValues,
} from "@/validations/statement-schema";

/** Add an asset (and, from inside the same dialog, a class if none fit). */
function AddAssetDialog({ onClose }: { onClose: () => void }) {
  const classes = useGetAssetClassesQuery();
  const [createAsset, createState] = useCreateFixedAssetMutation();
  const [createClass, createClassState] = useCreateAssetClassMutation();
  const [addingClass, setAddingClass] = useState(false);

  const assetForm = useForm<FixedAssetValues>({
    resolver: zodResolver(fixedAssetSchema),
    defaultValues: { acquiredAt: "", classId: "", costGhs: "", name: "", notes: "" },
  });
  const classForm = useForm<AssetClassValues>({
    resolver: zodResolver(assetClassSchema),
    defaultValues: {
      capitalAllowancePool: "Pool 2",
      capitalAllowanceRatePct: "30",
      depreciationRatePct: "10",
      name: "",
    },
  });

  const onCreateClass = async (values: AssetClassValues) => {
    try {
      const res = await createClass({
        capitalAllowancePool: values.capitalAllowancePool,
        capitalAllowanceRatePct: Number(values.capitalAllowanceRatePct),
        depreciationRatePct: Number(values.depreciationRatePct),
        name: values.name,
      }).unwrap();
      notify.success("Asset class created");
      assetForm.setValue("classId", res.data.assetClass.id);
      classForm.reset();
      setAddingClass(false);
    } catch (err) {
      notify.error("Couldn't create the class", {
        description: extractApiError(err).message,
      });
    }
  };

  const onCreateAsset = async (values: FixedAssetValues) => {
    try {
      await createAsset({
        acquiredAt: values.acquiredAt,
        classId: values.classId,
        costGhs: Number(values.costGhs),
        name: values.name,
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Asset recorded");
      onClose();
    } catch (err) {
      notify.error("Couldn't record the asset", {
        description: extractApiError(err).message,
      });
    }
  };

  const errors = assetForm.formState.errors;
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record an asset</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Enter it once - the depreciation schedule, PPE note and capital
            allowances follow it automatically every year.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {!addingClass ? (
          <form
            noValidate
            onSubmit={assetForm.handleSubmit(onCreateAsset)}
            className="flex flex-col gap-5"
          >
            <AdminField label="Asset" error={errors.name?.message}>
              <Input
                autoFocus
                placeholder="e.g. Two Haojue motorbikes"
                className={cn(adminInputClass, errors.name && "border-console-red")}
                {...assetForm.register("name")}
              />
            </AdminField>
            <AdminField
              label="Class"
              hint="Sets the depreciation rate and the capital-allowance pool."
              error={errors.classId?.message}
            >
              <Controller
                control={assetForm.control}
                name="classId"
                render={({ field }) => (
                  <SimpleSelect
                    className={cn(adminSelectClass, errors.classId && "border-console-red")}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose a class"
                    options={(classes.data?.data.assetClasses ?? [])
                      .filter((c) => c.isActive)
                      .map((c) => ({ value: c.id, label: c.name }))}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setAddingClass(true);
                }}
                className="mt-1.5 cursor-pointer text-[12px] font-semibold text-console underline-offset-2 hover:underline"
              >
                + New class
              </button>
            </AdminField>
            <div className="grid gap-5 sm:grid-cols-2">
              <AdminField label="Cost (GHS)" error={errors.costGhs?.message}>
                <Input
                  inputMode="decimal"
                  className={cn(adminInputClass, errors.costGhs && "border-console-red")}
                  {...assetForm.register("costGhs")}
                />
              </AdminField>
              <AdminField label="Acquired on" error={errors.acquiredAt?.message}>
                <DateInput
                  className={cn(adminInputClass, errors.acquiredAt && "border-console-red")}
                  {...assetForm.register("acquiredAt")}
                />
              </AdminField>
            </div>
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input className={adminInputClass} {...assetForm.register("notes")} />
            </AdminField>
            <ResponsiveDialogFooter className="gap-2">
              <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
                Cancel
              </AdminButton>
              <AdminButton type="submit" size="lg" disabled={createState.isLoading}>
                {createState.isLoading ? "Saving…" : "Record asset"}
              </AdminButton>
            </ResponsiveDialogFooter>
          </form>
        ) : (
          <form
            noValidate
            onSubmit={classForm.handleSubmit(onCreateClass)}
            className="flex flex-col gap-5"
          >
            <AdminField
              label="Class name"
              error={classForm.formState.errors.name?.message}
            >
              <Input
                autoFocus
                placeholder="e.g. Motorcycles"
                className={adminInputClass}
                {...classForm.register("name")}
              />
            </AdminField>
            <div className="grid gap-5 sm:grid-cols-2">
              <AdminField
                label="Depreciation rate (%/yr)"
                hint="Straight line, e.g. 10 writes the asset off over ten years."
                error={classForm.formState.errors.depreciationRatePct?.message}
              >
                <Input
                  inputMode="decimal"
                  className={adminInputClass}
                  {...classForm.register("depreciationRatePct")}
                />
              </AdminField>
              <AdminField
                label="CA rate (%/yr)"
                hint="GRA reducing-balance rate for the pool (30 for Pool 2, 10 for Pool 4)."
                error={classForm.formState.errors.capitalAllowanceRatePct?.message}
              >
                <Input
                  inputMode="decimal"
                  className={adminInputClass}
                  {...classForm.register("capitalAllowanceRatePct")}
                />
              </AdminField>
            </div>
            <AdminField
              label="Capital-allowance pool"
              error={classForm.formState.errors.capitalAllowancePool?.message}
            >
              <Input
                placeholder="e.g. Pool 2"
                className={adminInputClass}
                {...classForm.register("capitalAllowancePool")}
              />
            </AdminField>
            <ResponsiveDialogFooter className="gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setAddingClass(false);
                }}
              >
                Back
              </AdminButton>
              <AdminButton type="submit" size="lg" disabled={createClassState.isLoading}>
                {createClassState.isLoading ? "Saving…" : "Create class"}
              </AdminButton>
            </ResponsiveDialogFooter>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** Close an asset's record: date sold/scrapped and what it fetched. */
function DisposeDialog({
  asset,
  onClose,
}: {
  asset: IFixedAsset;
  onClose: () => void;
}) {
  const [dispose, disposeState] = useDisposeFixedAssetMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DisposeAssetValues>({
    resolver: zodResolver(disposeAssetSchema),
    defaultValues: { disposalProceedsGhs: "", disposedAt: "" },
  });

  const onSubmit = async (values: DisposeAssetValues) => {
    try {
      await dispose({
        assetId: asset.id,
        body: {
          disposalProceedsGhs: Number(values.disposalProceedsGhs),
          disposedAt: values.disposedAt,
        },
      }).unwrap();
      notify.success("Asset disposed of");
      onClose();
    } catch (err) {
      notify.error("Couldn't dispose of the asset", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Dispose of this asset</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {asset.name} leaves the schedule; any difference between the
            proceeds and its book value lands on the income statement.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminField label="Disposed on" error={errors.disposedAt?.message}>
              <DateInput
                className={cn(adminInputClass, errors.disposedAt && "border-console-red")}
                {...register("disposedAt")}
              />
            </AdminField>
            <AdminField
              label="Proceeds (GHS)"
              error={errors.disposalProceedsGhs?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(
                  adminInputClass,
                  errors.disposalProceedsGhs && "border-console-red",
                )}
                {...register("disposalProceedsGhs")}
              />
            </AdminField>
          </div>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="gold" size="lg" disabled={disposeState.isLoading}>
              {disposeState.isLoading ? "Saving…" : "Dispose of asset"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function FixedAssetsScreen() {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetFixedAssetsQuery();
  const classes = useGetAssetClassesQuery();
  const [removeAsset] = useDeleteFixedAssetMutation();
  const [adding, setAdding] = useState(false);
  const [disposing, setDisposing] = useState<IFixedAsset | null>(null);
  const { confirm, confirmationDialog } = useConfirm();

  const assets = data?.data.assets ?? [];

  const onRemove = async (asset: IFixedAsset) => {
    const ok = await confirm({
      title: "Remove this asset?",
      description: `"${asset.name}" comes off the register entirely - use Dispose for an asset that was sold or scrapped. Removal is for entry mistakes.`,
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await removeAsset(asset.id).unwrap();
      notify.success("Asset removed");
    } catch (err) {
      notify.error("Couldn't remove the asset", {
        description: extractApiError(err).message,
      });
    }
  };

  const columns = useMemo<ColumnDef<IFixedAsset, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (a) => a.name,
        header: "Asset",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <TitleCell
            title={row.original.name}
            meta={row.original.notes ?? undefined}
            stretch
          />
        ),
      },
      {
        id: "class",
        accessorFn: (a) => a.className,
        header: "Class",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => row.original.className,
      },
      {
        id: "cost",
        accessorFn: (a) => a.costGhs,
        header: "Cost",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="tabular-nums">{formatCedis(row.original.costGhs)}</Mono>
        ),
      },
      {
        id: "acquired",
        accessorFn: (a) => a.acquiredAt,
        header: "Acquired",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateOnlyCell value={row.original.acquiredAt} />,
      },
      {
        id: "status",
        accessorFn: (a) => (a.disposedAt ? "disposed" : "held"),
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.disposedAt ? (
            <ToneBadge tone="slate">Disposed</ToneBadge>
          ) : (
            <ToneBadge tone="leaf">On the books</ToneBadge>
          ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.disposedAt ? null : (
            <span className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDisposing(row.original);
                }}
                className="cursor-pointer text-[12.5px] font-semibold text-console underline-offset-2 hover:underline"
              >
                Dispose
              </button>
              <button
                type="button"
                onClick={() => void onRemove(row.original)}
                className="cursor-pointer text-[12.5px] font-semibold text-console-red underline-offset-2 hover:underline"
              >
                Remove
              </button>
            </span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable handlers
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Fixed Assets"
        hint="The equipment, vehicles and buildings the statements depreciate. Enter an asset once; every later book carries it."
        sub="The register behind the PPE note, depreciation and capital allowances"
        actions={
          <AdminButton onClick={() => { setAdding(true); }}>+ Record asset</AdminButton>
        }
      />

      {isLoading ? (
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : assets.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No assets on the register"
            description="Record the machines, vehicles and buildings the business owns - the statements depreciate them automatically."
            actionLabel="Record the first asset"
            onAction={() => { setAdding(true); }}
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IFixedAsset>
            columns={columns}
            data={assets}
            itemNoun="assets"
            isFetching={isFetching}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}

      {/* The class vocabulary, as a quiet reference under the register. */}
      {classes.data && classes.data.data.assetClasses.length > 0 ? (
        <AdminCard className="mt-4 px-5 py-4">
          <SectionHeading
            className="mb-2"
            hint="Each class carries its straight-line depreciation rate and its GRA capital-allowance pool."
          >
            Asset classes
          </SectionHeading>
          <ul className="divide-y divide-adm-hairline">
            {classes.data.data.assetClasses.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-[13px]"
              >
                <span className="min-w-0 font-semibold text-adm-ink [overflow-wrap:anywhere]">
                  {c.name}
                </span>
                <span className="flex-none text-[12.5px] text-adm-muted">
                  {c.depreciationRatePct}% straight line · {c.capitalAllowancePool}{" "}
                  @ {c.capitalAllowanceRatePct}%
                </span>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {adding ? <AddAssetDialog onClose={() => { setAdding(false); }} /> : null}
      {disposing ? (
        <DisposeDialog asset={disposing} onClose={() => { setDisposing(null); }} />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
