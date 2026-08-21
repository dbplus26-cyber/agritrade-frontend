"use client";

// The fixed-asset register: the assets the statements depreciate, with their
// classes (depreciation + capital-allowance vocabulary). An asset is entered
// once and flows into every later book until disposed of.
//
// Every asset now names the account that paid for it, or says why none did,
// and a disposal names where its proceeds landed. Until it did, a truck cost
// GHS 80,000 and left every account exactly where it was while the investing
// line of the cash-flow statement subtracted the lot.
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { ConsoleFilterBar } from "@/components/admin/filter-bar";
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
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  CashSourceField,
  CashSourceNote,
  cashSourceBody,
} from "@/components/admin/statements/cash-source";
import { HelpWrap } from "@/components/admin/help-tip";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatTableDate } from "@/lib/format-date";
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
  useUpdateFixedAssetMutation,
} from "@/redux/statements/statements-api";
import type {
  IFixedAsset,
  IFixedAssetEditBody,
} from "@/types/statement.types";
import {
  assetClassSchema,
  type AssetClassValues,
  assetEditSchema,
  type AssetEditValues,
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
    defaultValues: {
      acquiredAt: "",
      cashSource: "ACCOUNT",
      classId: "",
      costGhs: "",
      name: "",
      noCashReason: "",
      notes: "",
      paymentAccountId: "",
    },
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

  /**
   * Switching answer clears the one not given, so a mode change cannot leave
   * a stale value - or a stale error - behind the field it belongs to.
   */
  const onModeChange = (mode: FixedAssetValues["cashSource"]) => {
    assetForm.setValue("cashSource", mode);
    assetForm.setValue(
      mode === "ACCOUNT" ? "noCashReason" : "paymentAccountId",
      "",
    );
    assetForm.clearErrors(["noCashReason", "paymentAccountId"]);
  };

  const onCreateAsset = async (values: FixedAssetValues) => {
    try {
      await createAsset({
        acquiredAt: values.acquiredAt,
        classId: values.classId,
        costGhs: Number(values.costGhs),
        name: values.name,
        ...cashSourceBody(values),
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
                  placeholder="0.00"
                  className={cn(adminInputClass, errors.costGhs && "border-console-red")}
                  {...assetForm.register("costGhs")}
                />
              </AdminField>
              <AdminField label="Acquired on" error={errors.acquiredAt?.message}>
                <DateInput
                  placeholder="Pick the purchase date"
                  className={cn(adminInputClass, errors.acquiredAt && "border-console-red")}
                  {...assetForm.register("acquiredAt")}
                />
              </AdminField>
            </div>
            {/* The question the register never asked. A truck costs GHS
                80,000 and that money left an account - or the business already
                owned the truck when the books started, in which case its money
                left before day one and posting it now would spend it twice. */}
            <CashSourceField
              accountError={errors.paymentAccountId?.message}
              accountId={assetForm.watch("paymentAccountId") ?? ""}
              kind="asset"
              mode={assetForm.watch("cashSource")}
              onAccountChange={(value) => {
                assetForm.setValue("paymentAccountId", value, {
                  shouldValidate: true,
                });
              }}
              onModeChange={onModeChange}
              onReasonChange={(value) => {
                assetForm.setValue("noCashReason", value);
              }}
              reason={assetForm.watch("noCashReason") ?? ""}
              reasonError={errors.noCashReason?.message}
            />
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input
                placeholder="e.g. Chassis number, who it is assigned to"
                className={adminInputClass}
                {...assetForm.register("notes")}
              />
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
                  placeholder="e.g. 10"
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
                  placeholder="e.g. 30"
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<DisposeAssetValues>({
    resolver: zodResolver(disposeAssetSchema),
    defaultValues: {
      disposalAccountId: "",
      disposalProceedsGhs: "",
      disposedAt: "",
    },
  });

  // Whether anything came in decides whether there is an account to name at
  // all. An asset scrapped or given away brings in nothing and names nowhere
  // (DISPOSAL_ACCOUNT_UNUSED); money that came in and named nowhere is another
  // figure the statement adds to cash while no account rises by it.
  const proceeds = Number(watch("disposalProceedsGhs"));
  const raisedMoney = Number.isFinite(proceeds) && proceeds > 0;

  const onSubmit = async (values: DisposeAssetValues) => {
    try {
      await dispose({
        assetId: asset.id,
        body: {
          disposalProceedsGhs: Number(values.disposalProceedsGhs),
          disposedAt: values.disposedAt,
          // Never sent for a nil disposal, whatever the form once held: the
          // API refuses an account beside zero proceeds, because an account
          // stored there reads as money that landed.
          ...(raisedMoney && values.disposalAccountId
            ? { disposalAccountId: values.disposalAccountId }
            : {}),
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
                placeholder="Pick the disposal date"
                className={cn(adminInputClass, errors.disposedAt && "border-console-red")}
                {...register("disposedAt")}
              />
            </AdminField>
            <AdminField
              label="Proceeds (GHS)"
              hint="Zero for an asset scrapped or given away - nothing came in."
              error={errors.disposalProceedsGhs?.message}
            >
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className={cn(
                  adminInputClass,
                  errors.disposalProceedsGhs && "border-console-red",
                )}
                {...register("disposalProceedsGhs")}
              />
            </AdminField>
          </div>
          {/* Only where there are proceeds. The field appears the moment a
              figure is typed and disappears again at zero, so the form can
              never hold both a nil disposal and an account for it. */}
          {raisedMoney ? (
            <PaymentAccountField
              direction="in"
              error={errors.disposalAccountId?.message}
              label="Proceeds paid into which account?"
              onChange={(value) => {
                setValue("disposalAccountId", value, { shouldValidate: true });
              }}
              value={watch("disposalAccountId") ?? ""}
            />
          ) : (
            <p className="text-[12.5px] leading-[1.5] text-adm-muted">
              Nothing came in, so no account is named. Type what the sale
              fetched above if it did raise money.
            </p>
          )}
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

/**
 * Correct what an asset IS: its name, its class, the notes on it.
 *
 * Once the acquisition has posted, the cost and the acquisition date are
 * frozen, and the dialog does not offer them rather than offering an edit the
 * API will refuse (COST_LOCKED, ACQUISITION_DATE_LOCKED). The cash book is
 * append-only, so the movement those two produced cannot follow them: a
 * rewritten cost would leave the register saying GHS 60,000 while the account
 * shows GHS 80,000 gone, and a moved date would file the asset in one year's
 * investing line while its cash left in another. The remedy is to remove the
 * wrong record - which gives its money back - and record the right one, and
 * the dialog says so where the fields would have been.
 *
 * An asset that posted nothing has no movement to contradict, so it stays
 * fully editable.
 */
function EditAssetDialog({
  asset,
  onClose,
}: {
  asset: IFixedAsset;
  onClose: () => void;
}) {
  const classes = useGetAssetClassesQuery();
  const [update, updateState] = useUpdateFixedAssetMutation();
  // The payment account IS the posting: an acquisition posts exactly when one
  // was named, so the DTO needs no separate "did it post" flag.
  const posted = asset.paymentAccount !== null;
  const acquiredOn = asset.acquiredAt.slice(0, 10);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AssetEditValues>({
    resolver: zodResolver(assetEditSchema),
    defaultValues: {
      acquiredAt: acquiredOn,
      classId: asset.classId,
      costGhs: String(asset.costGhs),
      name: asset.name,
      notes: asset.notes ?? "",
    },
  });

  const onSubmit = async (values: AssetEditValues) => {
    // Only what changed. The API compares the cost and the date rather than
    // merely checking presence, but a PATCH that re-sends every field puts the
    // frozen pair on the wire on every save, and one rounding difference
    // between the register's number and the form's string would then refuse a
    // rename nobody connected to it.
    const notes = values.notes?.trim() ?? "";
    const body: IFixedAssetEditBody = {
      ...(values.name !== asset.name && { name: values.name }),
      ...(values.classId !== asset.classId && { classId: values.classId }),
      ...(notes !== (asset.notes ?? "") && { notes: notes || null }),
      ...(!posted && Number(values.costGhs) !== asset.costGhs
        ? { costGhs: Number(values.costGhs) }
        : {}),
      ...(!posted && values.acquiredAt !== acquiredOn
        ? { acquiredAt: values.acquiredAt }
        : {}),
    };
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    try {
      await update({ assetId: asset.id, body }).unwrap();
      notify.success("Asset updated");
      onClose();
    } catch (err) {
      notify.error("Couldn't update the asset", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit this asset</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            What the asset is called and how it depreciates. What it cost and
            when it was bought are the money side, and that is settled once it
            has been paid for.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <AdminField label="Asset" error={errors.name?.message}>
            <Input
              autoFocus
              placeholder="e.g. Two Haojue motorbikes"
              className={cn(adminInputClass, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <AdminField
            label="Class"
            hint="Sets the depreciation rate and the capital-allowance pool."
            error={errors.classId?.message}
          >
            <Controller
              control={control}
              name="classId"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(
                    adminSelectClass,
                    errors.classId && "border-console-red",
                  )}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose a class"
                  options={(classes.data?.data.assetClasses ?? [])
                    .filter((c) => c.isActive || c.id === asset.classId)
                    .map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
            />
          </AdminField>
          {posted ? (
            // Shown, not hidden: they are still the two facts a reader came to
            // check, and a form that silently drops them reads as a form that
            // lost them.
            <div className="rounded-[3px] border border-adm-line bg-adm-sunken px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-[13px] text-adm-body">
                  Cost{" "}
                  <Mono className="font-semibold tabular-nums text-adm-ink">
                    {formatCedis(asset.costGhs)}
                  </Mono>
                </span>
                <span className="text-[13px] text-adm-body">
                  Acquired{" "}
                  <span className="font-semibold text-adm-ink">
                    {formatTableDate(asset.acquiredAt)}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-[1.5] text-adm-muted [overflow-wrap:anywhere]">
                {asset.paymentAccount?.label} already paid for this, so neither
                figure can move: the cash book is append-only, and a movement
                cannot follow a cost that changes or a date that shifts the year
                its money left. To correct either, remove this record - what it
                cost comes back to the account - and record the asset again.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <AdminField label="Cost (GHS)" error={errors.costGhs?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="0.00"
                  className={cn(
                    adminInputClass,
                    errors.costGhs && "border-console-red",
                  )}
                  {...register("costGhs")}
                />
              </AdminField>
              <AdminField label="Acquired on" error={errors.acquiredAt?.message}>
                <DateInput
                  placeholder="Pick the purchase date"
                  className={cn(
                    adminInputClass,
                    errors.acquiredAt && "border-console-red",
                  )}
                  {...register("acquiredAt")}
                />
              </AdminField>
            </div>
          )}
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input
              placeholder="e.g. Chassis number, who it is assigned to"
              className={adminInputClass}
              {...register("notes")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="lg" disabled={updateState.isLoading}>
              {updateState.isLoading ? "Saving…" : "Save changes"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * A disposal recorded before the register named an account has proceeds and
 * nowhere to give them back to, so the API refuses to remove it
 * (DISPOSAL_ACCOUNT_UNKNOWN). Better said here than discovered in a toast.
 */
const removalLocked = (asset: IFixedAsset): boolean =>
  (asset.disposalProceedsGhs ?? 0) > 0 && asset.disposalAccount === null;

export function FixedAssetsScreen() {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetFixedAssetsQuery();
  const classes = useGetAssetClassesQuery();
  const [removeAsset] = useDeleteFixedAssetMutation();
  const [adding, setAdding] = useState(false);
  const [disposing, setDisposing] = useState<IFixedAsset | null>(null);
  const [editing, setEditing] = useState<IFixedAsset | null>(null);
  const { confirm, confirmationDialog } = useConfirm();

  const assets = data?.data.assets ?? [];

  const onRemove = async (asset: IFixedAsset) => {
    // Says which accounts move, because they do: removal writes a compensating
    // entry for each leg the asset posted, dated where the original was.
    const givenBack = [
      asset.paymentAccount
        ? `${formatCedis(asset.costGhs)} goes back into ${asset.paymentAccount.label}`
        : null,
      asset.disposalAccount
        ? `${formatCedis(asset.disposalProceedsGhs ?? 0)} comes back out of ${asset.disposalAccount.label}`
        : null,
    ].filter(Boolean);
    const ok = await confirm({
      title: "Remove this asset?",
      description: `"${asset.name}" comes off the register entirely.${
        asset.disposedAt
          ? ""
          : " Use Dispose for an asset that was sold or scrapped; removal is for entry mistakes."
      }${givenBack.length > 0 ? ` ${givenBack.join(", and ")}.` : ""}`,
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
        id: "source",
        accessorFn: (a) => a.paymentAccount?.label ?? a.noCashReason ?? "",
        header: "Paid from",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <CashSourceNote
            account={row.original.paymentAccount}
            reason={row.original.noCashReason}
          />
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
        cell: ({ row }) => {
          const asset = row.original;
          if (!asset.disposedAt) {
            return <ToneBadge tone="leaf">On the books</ToneBadge>;
          }
          const proceeds = asset.disposalProceedsGhs ?? 0;
          return (
            <span className="block min-w-0">
              <ToneBadge tone="slate">Disposed</ToneBadge>
              {/* What the sale brought in and where it landed - the other half
                  of the same question the acquisition answers. */}
              <span className="mt-1 block text-[12.5px] text-adm-muted [overflow-wrap:anywhere] @2xl/table:truncate">
                {proceeds > 0
                  ? `${formatCedis(proceeds)} into ${asset.disposalAccount?.label ?? "an account never recorded"}`
                  : "Raised nothing"}
              </span>
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const asset = row.original;
          return (
            <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              {asset.disposedAt ? null : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(asset);
                    }}
                    className="cursor-pointer text-[12.5px] font-semibold text-console underline-offset-2 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisposing(asset);
                    }}
                    className="cursor-pointer text-[12.5px] font-semibold text-console underline-offset-2 hover:underline"
                  >
                    Dispose
                  </button>
                </>
              )}
              {removalLocked(asset) ? (
                // Said plainly rather than offered and then refused: there is
                // no account to give the proceeds back to, so this record has
                // to stay on the books.
                <HelpWrap text="This disposal was recorded before the register named the account its proceeds landed in, so removing it would leave that money unaccounted for.">
                  <span className="text-[12.5px] font-semibold text-adm-faint">
                    Can&apos;t be removed
                  </span>
                </HelpWrap>
              ) : (
                <button
                  type="button"
                  onClick={() => void onRemove(asset)}
                  className="cursor-pointer text-[12.5px] font-semibold text-console-red underline-offset-2 hover:underline"
                >
                  Remove
                </button>
              )}
            </span>
          );
        },
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
      />

      {/* The empty state carries its own create action, so the toolbar
          only shows once there is a register to count. */}
      {!isLoading && !isError && assets.length === 0 ? null : (
        <ConsoleFilterBar
          hideSearch
          totalCount={assets.length}
          noun="assets"
          action={
            <AdminButton
              aria-label="Record asset"
              onClick={() => { setAdding(true); }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Record asset</span>
            </AdminButton>
          }
        />
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
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
      {editing ? (
        <EditAssetDialog asset={editing} onClose={() => { setEditing(null); }} />
      ) : null}
      {disposing ? (
        <DisposeDialog asset={disposing} onClose={() => { setDisposing(null); }} />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
