"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import {
  useCreateShipmentMutation,
  useGetEligibleSalesQuery,
} from "@/redux/shipments/shipments-api";
import { useGetDriversQuery } from "@/redux/drivers/drivers-api";
import { useGetDeliveryAddressesQuery } from "@/redux/delivery-addresses/delivery-addresses-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IDeliveryAddress, IDriver } from "@/types/logistics.types";
import {
  shipmentSchema,
  type ShipmentValues,
} from "@/validations/shipment-schema";
import { LoadMeter } from "./load-meter";

const LIST = "/admin/shipments";
/** Stable fallback so a transient undefined watch can't churn memo deps. */
const NO_SALES: string[] = [];

/** A trimmed value, or nothing - empty optional fields are omitted entirely. */
const opt = <K extends string>(key: K, value: string | undefined) =>
  value?.trim() ? ({ [key]: value.trim() } as Record<K, string>) : {};

/** RHF field names the backend can return field errors for. */
const FIELD_NAMES = [
  "saleIds",
  "originWarehouseId",
  "deliveryAddressId",
  "destination",
  "truckReg",
  "driverId",
  "driverName",
  "driverPhone",
  "driverEmail",
  "driverCompany",
  "driverCity",
  "driverLicenseNo",
  "driverIdNumber",
  "truckCapacityKg",
  "expectedArrivalAt",
  "notes",
] as const;

/** Plan a shipment. `saleId` may be pre-filled from a sale's "Ship" action. */
export function ShipmentForm({ saleId }: { saleId?: string }) {
  const router = useRouter();
  const [createShipment, { isLoading: saving }] = useCreateShipmentMutation();
  const [saleSearch, setSaleSearch] = useState("");

  // Only sales the backend deems shippable appear: CONFIRMED, payment terms
  // met, unshipped weight left, and not already on an active truck.
  const eligible = useGetEligibleSalesQuery();
  const warehouses = useGetWarehousesQuery({ limit: 100, isActive: true });
  // Both directories are open registers: a haulier keeps adding drivers and
  // depots and never removes the old ones. Fetching a page and filtering it
  // in the browser meant everything past the limit was invisible AND
  // unselectable, with the picker reporting "no matches" for records that
  // exist. So the typed text goes to the server. See useRemoteSearch.
  const driverSearch = useRemoteSearch();
  const drivers = useGetDriversQuery({
    isActive: true,
    limit: 20,
    search: driverSearch.query,
  });
  const addressSearch = useRemoteSearch();
  const addresses = useGetDeliveryAddressesQuery({
    isActive: true,
    limit: 20,
    search: addressSearch.query,
  });

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<ShipmentValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      deliveryAddressId: "",
      destination: "",
      driverCity: "",
      driverCompany: "",
      driverEmail: "",
      driverId: "",
      driverIdNumber: "",
      driverLicenseNo: "",
      driverName: "",
      driverPhone: "",
      expectedArrivalAt: "",
      notes: "",
      originWarehouseId: "",
      saleIds: saleId ? [saleId] : [],
      truckCapacityKg: "",
      truckReg: "",
    },
  });

  const selected = useWatch({ control, name: "saleIds" }) ?? NO_SALES;
  const driverId = useWatch({ control, name: "driverId" }) ?? "";
  const deliveryAddressId =
    useWatch({ control, name: "deliveryAddressId" }) ?? "";
  const capacityRaw = useWatch({ control, name: "truckCapacityKg" }) ?? "";
  // The driver snapshot fields, watched for the collapsed summary card.
  const [ovName, ovPhone, ovCompany, ovCity] = useWatch({
    control,
    name: ["driverName", "driverPhone", "driverCompany", "driverCity"],
  });

  // A picked directory driver collapses the manual fields behind a summary;
  // "Edit details" reopens them as overrides sent alongside driverId.
  const [showDriverOverrides, setShowDriverOverrides] = useState(false);

  // The picked records are HELD, not looked up in whatever page is loaded.
  // Once the user types a fresh search that page is replaced, and a lookup
  // would then find nothing: the driver summary would vanish, and the
  // address summary vanishing would silently swap the form back to a
  // free-text destination while deliveryAddressId was still set.
  const [pickedDriver, setPickedDriver] = useState<IDriver | null>(null);
  const [pickedAddress, setPickedAddress] = useState<IDeliveryAddress | null>(
    null,
  );

  const toggleSale = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setValue("saleIds", next, { shouldValidate: true });
  };

  const allSales = useMemo(() => eligible.data?.data.sales ?? [], [eligible.data]);
  const visibleSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return allSales;
    return allSales.filter(
      (s) =>
        s.transactionNo.toLowerCase().includes(q) ||
        s.buyer.name.toLowerCase().includes(q),
    );
  }, [allSales, saleSearch]);

  // The live load meter: selected sales' remaining weight vs the capacity.
  const selectedKg = useMemo(
    () =>
      allSales
        .filter((s) => selected.includes(s.id))
        .reduce((sum, s) => sum + s.totalRemainingKg, 0),
    [allSales, selected],
  );
  const capacityKg = Number(capacityRaw);
  const hasCapacity = capacityRaw.trim() !== "" && capacityKg > 0;
  const overCapacity = hasCapacity && selectedKg > capacityKg;

  const driverList = drivers.data?.data ?? [];
  const addressList = addresses.data?.data ?? [];

  // "The register is empty" and "this search found nothing" are different
  // answers. Only the unfiltered first page can say the book is empty, so a
  // search in flight or a search term typed keeps the picker on screen -
  // otherwise a typo would replace it with "add one to the address book" and
  // leave no way back to clear the search.
  const addressBookEmpty =
    !addressSearch.query && !addresses.isFetching && addressList.length === 0;
  const driverBookEmpty =
    !driverSearch.query && !drivers.isFetching && driverList.length === 0;

  const pickDriver = (id: string) => {
    setValue("driverId", id, { shouldValidate: false });
    const d = driverList.find((x) => x.id === id);
    setPickedDriver(d ?? null);
    if (d) {
      // Fill the snapshot fields from the directory; they stay editable as
      // overrides but start folded away.
      setValue("driverName", d.name);
      setValue("driverPhone", d.phone);
      setValue("driverEmail", d.email ?? "");
      setValue("driverCompany", d.company ?? "");
      setValue("driverCity", d.city ?? "");
      setValue("driverLicenseNo", d.licenseNo ?? "");
      setValue("driverIdNumber", d.idNumber ?? "");
      setShowDriverOverrides(false);
      clearErrors(["driverName", "driverPhone"]);
    } else {
      setShowDriverOverrides(false);
    }
  };

  const pickAddress = (id: string) => {
    setValue("deliveryAddressId", id, { shouldValidate: false });
    setPickedAddress(addressList.find((a) => a.id === id) ?? null);
    if (id) clearErrors("destination");
  };

  const onSubmit = async (values: ShipmentValues) => {
    // Mirror the backend's OVER_CAPACITY refusal before it happens.
    if (overCapacity) {
      notify.error("The load exceeds the truck capacity", {
        description: `The selected sales still need ${formatKg(selectedKg)} but the truck takes ${formatKg(capacityKg)}.`,
      });
      return;
    }
    try {
      const res = await createShipment({
        originWarehouseId: values.originWarehouseId,
        saleIds: values.saleIds,
        truckReg: values.truckReg,
        // A saved address carries the destination; free text otherwise.
        ...(values.deliveryAddressId
          ? { deliveryAddressId: values.deliveryAddressId }
          : opt("destination", values.destination)),
        // Directory driver (with any overrides typed in) or manual details.
        ...(values.driverId ? { driverId: values.driverId } : {}),
        ...opt("driverName", values.driverName),
        ...opt("driverPhone", values.driverPhone),
        ...opt("driverEmail", values.driverEmail),
        ...opt("driverCompany", values.driverCompany),
        ...opt("driverCity", values.driverCity),
        ...opt("driverLicenseNo", values.driverLicenseNo),
        ...opt("driverIdNumber", values.driverIdNumber),
        ...(values.truckCapacityKg?.trim()
          ? { truckCapacityKg: Number(values.truckCapacityKg) }
          : {}),
        ...(values.expectedArrivalAt
          ? { expectedArrivalAt: values.expectedArrivalAt }
          : {}),
        ...opt("notes", values.notes),
      }).unwrap();
      notify.success("Shipment planned");
      router.push(`${LIST}/${res.data.shipment.id}`);
    } catch (err) {
      const { message, code, fieldErrors, hasFieldErrors } =
        extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of FIELD_NAMES) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      // Business refusals land on the field that can fix them.
      if (code === "OVER_CAPACITY") {
        setError("truckCapacityKg", { message });
      } else if (
        code === "SALE_BELOW_MILESTONE" ||
        code === "SALE_ALREADY_PLANNED" ||
        code === "SALE_FULLY_SHIPPED"
      ) {
        setError("saleIds", { message });
      }
      notify.error("Couldn't plan the shipment", { description: message });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader
        title="Plan shipment"
        hint="Set up a truck: who drives, what it carries and where it is going."
        sub="Book a truck and driver against confirmed sales - nothing leaves the warehouse until you dispatch"
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          {/* Not an AdminField: its Label wrapper would nest the row labels
              (invalid HTML) and steal clicks for the first control. */}
          <div>
            <span className="mb-[7px] block text-[11px] uppercase tracking-[0.14em] text-adm-muted">
              Sales on this trip
            </span>
            <div
              className={cn(
                "rounded-[6px] border border-adm-line bg-[#FBFCF7]",
                errors.saleIds && "border-console-red",
              )}
            >
              <div className="border-b border-adm-hairline p-2">
                <Input
                  value={saleSearch}
                  onChange={(e) => setSaleSearch(e.target.value)}
                  placeholder="Search sale no. or buyer…"
                  className={cn(adminInputClass, "h-9")}
                />
              </div>
              {eligible.isLoading ? (
                <p className="px-3 py-3 text-[13px] text-adm-muted">
                  Loading shippable sales…
                </p>
              ) : eligible.isError ? (
                <p className="px-3 py-3 text-[13px] text-console-red">
                  Couldn&apos;t load the shippable sales. Reload and try again.
                </p>
              ) : visibleSales.length === 0 ? (
                <p className="px-3 py-3 text-[13px] text-adm-muted">
                  {allSales.length === 0
                    ? "No sales are ready to ship - a sale appears here once it is confirmed, its payment terms are met and it isn't already on a truck."
                    : "No sales match this search."}
                </p>
              ) : (
                <div className="max-h-[280px] overflow-y-auto">
                  {visibleSales.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-start gap-2.5 border-b border-adm-hairline px-3 py-2 last:border-b-0 hover:bg-adm-sunken"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(s.id)}
                        onChange={() => toggleSale(s.id)}
                        className="mt-1 h-4 w-4 flex-none accent-[#155744]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <Mono className="block text-[12.5px] text-console">
                            {s.transactionNo}
                          </Mono>
                          <Mono className="flex-none text-[12.5px] font-bold text-adm-ink">
                            {formatKg(s.totalRemainingKg)}
                          </Mono>
                        </span>
                        <span className="block min-w-0 text-[13px] text-adm-ink [overflow-wrap:anywhere]">
                          {s.buyer.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-adm-muted">
                          {s.lines.map((l) => (
                            <span
                              key={l.commodityId}
                              className="mr-2 inline-block whitespace-nowrap"
                            >
                              {l.commodityName}{" "}
                              <Mono>{formatKg(l.remainingKg)}</Mono>
                            </span>
                          ))}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <div className="border-t border-adm-hairline px-3 py-1.5 text-[12px] text-adm-muted">
                {selected.length} sale{selected.length === 1 ? "" : "s"} selected
                {selectedKg > 0 ? (
                  <>
                    {" "}
                    · <Mono>{formatKg(selectedKg)}</Mono> to load
                  </>
                ) : null}
              </div>
            </div>
            {errors.saleIds ? (
              <span
                role="alert"
                className="mt-1 block text-[12px] font-medium text-console-red"
              >
                {errors.saleIds.message}
              </span>
            ) : (
              <span className="mt-1 block text-[12.5px] text-adm-muted">
                One truck can serve several sales. Each shows the weight still
                to ship.
              </span>
            )}
          </div>
          <AdminField
            label="Origin warehouse"
            hint="The store the goods are loaded out of; its stock is what this truck can be filled from."
            error={errors.originWarehouseId?.message}
          >
            <select
              className={cn(
                adminSelectClass,
                "w-full",
                errors.originWarehouseId && "border-console-red",
              )}
              {...register("originWarehouseId")}
            >
              <option value="">Choose the warehouse</option>
              {(warehouses.data?.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </AdminField>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Truck &amp; destination
          </div>
          {/* Always rendered, even with an empty book. Hiding the picker when
              nothing is saved yet makes the directory look like it does not
              exist, so staff retype the same depot onto every waybill. */}
          <AdminField
            label="Deliver to"
            hint={
              addressBookEmpty
                ? undefined
                : "Type to search the address book, or enter this one by hand."
            }
            error={errors.deliveryAddressId?.message}
          >
            {!addressBookEmpty ? (
              <SearchableSelect
                value={deliveryAddressId}
                onChange={pickAddress}
                options={[
                  { value: "", label: "Enter destination manually" },
                  ...addressList.map((a) => ({
                    value: a.id,
                    label: a.label,
                    hint: a.city,
                  })),
                ]}
                placeholder="Enter destination manually"
                onSearchChange={addressSearch.onSearchChange}
                loading={addresses.isFetching}
                // The picked address is usually off the page a search left
                // loaded; without this the trigger would read as empty on a
                // field that is set.
                selectedLabel={
                  pickedAddress
                    ? `${pickedAddress.label} · ${pickedAddress.city}`
                    : undefined
                }
                emptyText="No saved destination matches that."
              />
            ) : (
              <p className="text-[12.5px] text-adm-muted">
                No saved destinations yet - enter this one below, or{" "}
                <Link
                  href="/admin/delivery-addresses/new"
                  className="font-medium text-console underline underline-offset-2"
                >
                  add it to the address book
                </Link>{" "}
                to reuse it.
              </p>
            )}
          </AdminField>
          {pickedAddress ? (
            <div className="rounded-[6px] border border-adm-line bg-adm-sunken px-3 py-2 text-[12.5px] text-adm-muted">
              <p className="min-w-0 font-medium text-adm-ink [overflow-wrap:anywhere]">
                {pickedAddress.label} · {pickedAddress.city}
                {pickedAddress.area ? `, ${pickedAddress.area}` : ""}
              </p>
              {pickedAddress.shopName ? (
                <p className="min-w-0 [overflow-wrap:anywhere]">
                  {pickedAddress.shopName}
                </p>
              ) : null}
              {pickedAddress.digitalAddress || pickedAddress.landmark ? (
                <p className="min-w-0 [overflow-wrap:anywhere]">
                  {pickedAddress.digitalAddress ? (
                    <Mono>{pickedAddress.digitalAddress}</Mono>
                  ) : null}
                  {pickedAddress.digitalAddress && pickedAddress.landmark
                    ? " · "
                    : ""}
                  {pickedAddress.landmark ?? ""}
                </p>
              ) : null}
              {pickedAddress.contactName || pickedAddress.contactPhone ? (
                <p className="min-w-0 [overflow-wrap:anywhere]">
                  Receives: {pickedAddress.contactName ?? ""}
                  {pickedAddress.contactName && pickedAddress.contactPhone
                    ? " · "
                    : ""}
                  {pickedAddress.contactPhone ? (
                    <Mono>{pickedAddress.contactPhone}</Mono>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : (
            <AdminField label="Destination" error={errors.destination?.message}>
              <Input
                className={cn(
                  adminInputClass,
                  errors.destination && "border-console-red",
                )}
                placeholder="Accra / Kumasi / address"
                {...register("destination")}
              />
            </AdminField>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField
              label="Truck registration"
              error={errors.truckReg?.message}
            >
              <Input
                className={cn(adminInputClass, errors.truckReg && "border-console-red")}
                placeholder="GT-1234-24"
                {...register("truckReg")}
              />
            </AdminField>
            <AdminField
              label="Truck capacity (kg)"
              optional
              hint="The most this truck may carry; fill it in and the load meter warns you when you go over."
              error={errors.truckCapacityKg?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(
                  adminInputClass,
                  errors.truckCapacityKg && "border-console-red",
                )}
                {...register("truckCapacityKg")}
              />
            </AdminField>
            <AdminField label="Expected arrival" optional>
              <Input
                type="date"
                className={adminInputClass}
                {...register("expectedArrivalAt")}
              />
            </AdminField>
            <AdminField label="Notes" optional>
              <Input className={adminInputClass} {...register("notes")} />
            </AdminField>
          </div>
          {selected.length > 0 && (hasCapacity || selectedKg > 0) ? (
            <LoadMeter loadedKg={selectedKg} capacityKg={hasCapacity ? capacityKg : null} />
          ) : null}
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Driver
          </div>
          {/* Same rule as the destination: the directory stays visible even
              when it is empty, so its existence is discoverable. */}
          <AdminField
            label="Driver"
            hint={
              driverBookEmpty
                ? undefined
                : "Type to search the directory, or enter the trip's driver by hand."
            }
            error={errors.driverId?.message}
          >
            {!driverBookEmpty ? (
              <SearchableSelect
                value={driverId}
                onChange={pickDriver}
                options={[
                  { value: "", label: "Enter details manually" },
                  ...driverList.map((d) => ({
                    value: d.id,
                    label: d.name,
                    hint: d.phone,
                  })),
                ]}
                placeholder="Enter details manually"
                onSearchChange={driverSearch.onSearchChange}
                loading={drivers.isFetching}
                // Same reason as the address picker: the chosen driver is
                // often not among the rows a later search loaded.
                selectedLabel={
                  pickedDriver
                    ? `${pickedDriver.name} · ${pickedDriver.phone}`
                    : undefined
                }
                emptyText="No driver matches that."
              />
            ) : (
              <p className="text-[12.5px] text-adm-muted">
                No drivers saved yet - enter this trip&apos;s driver below, or{" "}
                <Link
                  href="/admin/drivers/new"
                  className="font-medium text-console underline underline-offset-2"
                >
                  add them to the register
                </Link>{" "}
                to reuse them.
              </p>
            )}
          </AdminField>
          {pickedDriver && !showDriverOverrides ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-adm-line bg-adm-sunken px-3 py-2">
              <div className="min-w-0 text-[12.5px] text-adm-muted">
                <p className="min-w-0 font-medium text-adm-ink [overflow-wrap:anywhere]">
                  {ovName || pickedDriver.name}
                </p>
                <p className="min-w-0 [overflow-wrap:anywhere]">
                  <Mono>{ovPhone || pickedDriver.phone}</Mono>
                  {ovCompany ? ` · ${ovCompany}` : ""}
                  {ovCity ? ` · ${ovCity}` : ""}
                </p>
              </div>
              <AdminButton
                type="button"
                variant="outline"
                className="h-[30px] flex-none px-2.5 text-[12px]"
                onClick={() => setShowDriverOverrides(true)}
              >
                Edit details
              </AdminButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminField label="Name" error={errors.driverName?.message}>
                <Input
                  className={cn(
                    adminInputClass,
                    errors.driverName && "border-console-red",
                  )}
                  {...register("driverName")}
                />
              </AdminField>
              <AdminField label="Phone" error={errors.driverPhone?.message}>
                <Input
                  type="tel"
                  className={cn(
                    adminInputClass,
                    errors.driverPhone && "border-console-red",
                  )}
                  {...register("driverPhone")}
                />
              </AdminField>
              <AdminField
                label="Email"
                optional
                error={errors.driverEmail?.message}
              >
                <Input
                  type="email"
                  className={cn(
                    adminInputClass,
                    errors.driverEmail && "border-console-red",
                  )}
                  {...register("driverEmail")}
                />
              </AdminField>
              <AdminField
                label="Company"
                optional
                hint="Haulage company or leave blank for solo"
              >
                <Input
                  className={adminInputClass}
                  {...register("driverCompany")}
                />
              </AdminField>
              <AdminField label="City" optional>
                <Input className={adminInputClass} {...register("driverCity")} />
              </AdminField>
              <AdminField label="Licence no" optional>
                <Input
                  className={adminInputClass}
                  {...register("driverLicenseNo")}
                />
              </AdminField>
              <AdminField label="ID number" optional>
                <Input
                  className={adminInputClass}
                  {...register("driverIdNumber")}
                />
              </AdminField>
            </div>
          )}
        </AdminCard>

        <div className="flex justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="submit"
            disabled={saving || overCapacity}
            className="h-10 px-5"
          >
            {saving ? "Planning…" : "Plan shipment"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
