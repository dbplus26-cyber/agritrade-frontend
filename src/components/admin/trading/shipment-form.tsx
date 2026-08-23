"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  adminSelectClass,
  CommitRow,
  DetailHeader,
  Mono,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  useCreateShipmentMutation,
  useGetEligibleSalesQuery,
  useUpdateShipmentMutation,
} from "@/redux/shipments/shipments-api";
import { useGetDriversQuery } from "@/redux/drivers/drivers-api";
import { useGetDeliveryAddressesQuery } from "@/redux/delivery-addresses/delivery-addresses-api";
import {
  useGetStockBalancesQuery,
  useGetSupplierHoldingsQuery,
} from "@/redux/stock/stock-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IShipment } from "@/types/admin-shipment.types";
import {
  shipmentSchema,
  type ShipmentValues,
} from "@/validations/shipment-schema";
import { LoadMeter } from "./load-meter";
import {
  FIELD_NAMES,
  NO_SALES,
  NO_SHEDS,
  PickedCard,
  StepHead,
  opt,
} from "./shipment-form-bits";
import type {
  PickedAddress,
  PickedDriver,
} from "./shipment-form-bits";

const LIST = "/admin/shipments";

/**
 * Plan a shipment, or edit a plan that has not dispatched. `saleId` may be
 * pre-filled from a sale's "Ship" action; passing `shipment` switches to
 * edit mode, where the sales themselves are managed on the shipment page.
 */
export function ShipmentForm({
  saleId,
  shipment,
}: {
  saleId?: string;
  shipment?: IShipment;
}) {
  const router = useRouter();
  const editing = Boolean(shipment);
  const [createShipment, { isLoading: creating }] = useCreateShipmentMutation();
  const [updateShipment, { isLoading: updating }] = useUpdateShipmentMutation();
  const saving = creating || updating;
  const [saleSearch, setSaleSearch] = useState("");

  // Only sales the backend deems shippable appear: CONFIRMED, payment terms
  // met, unshipped weight left, and not already on an active truck. (In edit
  // mode the trip's sales are fixed here, so the pool isn't fetched.)
  const eligible = useGetEligibleSalesQuery(undefined, { skip: editing });
  const warehouses = useGetWarehousesQuery({ limit: 100, isActive: true });
  // Live shed balances feed the per-warehouse figures on the shed list and
  // the "is there enough at the chosen stops" advisory below it.
  const stock = useGetStockBalancesQuery();
  // What sellers are holding for us: goods bought at the farm gate that never
  // entered a shed. They are in no warehouse balance, so a trip planned to
  // collect them has to read them from here or the cover check would call a
  // perfectly loadable plan short.
  const supplierHoldings = useGetSupplierHoldingsQuery();
  // Both directories are open registers: a haulier keeps adding drivers and
  // depots and never removes the old ones. Fetching a page and filtering it
  // in the browser leaves everything past the limit invisible AND
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
    defaultValues: shipment
      ? {
          deliveryAddressId: shipment.deliveryAddress?.id ?? "",
          destination: shipment.deliveryAddress ? "" : shipment.destination,
          driverCity: shipment.driverCity ?? "",
          driverCompany: shipment.driverCompany ?? "",
          driverEmail: shipment.driverEmail ?? "",
          driverId: shipment.driverId ?? "",
          driverIdNumber: shipment.driverIdNumber ?? "",
          driverLicenseNo: shipment.driverLicenseNo ?? "",
          driverName: shipment.driverName,
          driverPhone: shipment.driverPhone ?? "",
          expectedArrivalAt: shipment.expectedArrivalAt?.slice(0, 10) ?? "",
          loadingWarehouseIds: shipment.loadingWarehouses
            .filter((w) => w.id !== shipment.originWarehouse?.id)
            .map((w) => w.id),
          notes: shipment.notes ?? "",
          originWarehouseId: shipment.originWarehouse?.id ?? "",
          pickupSupplierIds: shipment.pickupSuppliers.map((p) => p.id),
          saleIds: shipment.sales.map((s) => s.id),
          truckCapacityKg:
            shipment.truckCapacityKg != null
              ? String(shipment.truckCapacityKg)
              : "",
          truckReg: shipment.truckReg,
        }
      : {
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
          loadingWarehouseIds: [],
          notes: "",
          originWarehouseId: "",
          pickupSupplierIds: [],
          saleIds: saleId ? [saleId] : [],
          truckCapacityKg: "",
          truckReg: "",
        },
  });

  const selected = useWatch({ control, name: "saleIds" }) ?? NO_SALES;
  const originWarehouseId =
    useWatch({ control, name: "originWarehouseId" }) ?? "";
  const extraShedIds =
    useWatch({ control, name: "loadingWarehouseIds" }) ?? NO_SHEDS;
  const pickupIds = useWatch({ control, name: "pickupSupplierIds" }) ?? NO_SHEDS;
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
  const [pickedDriver, setPickedDriver] = useState<PickedDriver | null>(() =>
    shipment?.driverId
      ? {
          city: shipment.driverCity,
          company: shipment.driverCompany,
          id: shipment.driverId,
          name: shipment.driverName,
          phone: shipment.driverPhone ?? "",
        }
      : null,
  );
  const [pickedAddress, setPickedAddress] = useState<PickedAddress | null>(
    shipment?.deliveryAddress ?? null,
  );

  const toggleSale = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setValue("saleIds", next, { shouldValidate: true });
  };

  const toggleShed = (id: string) => {
    const next = extraShedIds.includes(id)
      ? extraShedIds.filter((s) => s !== id)
      : [...extraShedIds, id];
    setValue("loadingWarehouseIds", next, { shouldValidate: false });
    clearErrors(["loadingWarehouseIds", "originWarehouseId"]);
  };

  const togglePickup = (id: string) => {
    const next = pickupIds.includes(id)
      ? pickupIds.filter((s) => s !== id)
      : [...pickupIds, id];
    setValue("pickupSupplierIds", next, { shouldValidate: false });
    clearErrors(["pickupSupplierIds", "originWarehouseId"]);
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

  // What this trip must load, per commodity. In edit mode the shipment's own
  // sale lines carry the figures; when planning it is the selected eligible
  // sales' unshipped remainders.
  const needed = useMemo(() => {
    const m = new Map<string, { name: string; kg: number }>();
    const add = (id: string, name: string, kg: number) => {
      const row = m.get(id) ?? { kg: 0, name };
      row.kg += kg;
      m.set(id, row);
    };
    if (shipment) {
      for (const s of shipment.sales)
        for (const l of s.lines)
          add(l.commodityId, l.commodityName, l.outstandingKg);
    } else {
      for (const s of allSales)
        if (selected.includes(s.id))
          for (const l of s.lines) add(l.commodityId, l.commodityName, l.remainingKg);
    }
    return m;
  }, [shipment, allSales, selected]);

  // The live load meter: the trip's remaining weight vs the capacity.
  const selectedKg = useMemo(
    () => [...needed.values()].reduce((sum, r) => sum + r.kg, 0),
    [needed],
  );

  // Every shed the truck calls at: the origin plus the ticked extras.
  const shedIds = useMemo(
    () => [...new Set([originWarehouseId, ...extraShedIds].filter(Boolean))],
    [originWarehouseId, extraShedIds],
  );
  const balances = useMemo(() => stock.data?.data ?? [], [stock.data]);
  const holdings = useMemo(
    () => supplierHoldings.data?.data ?? [],
    [supplierHoldings.data],
  );

  /** kg of the commodities this load needs that a shed holds - its row figure. */
  const relevantStockIn = (warehouseId: string) =>
    balances
      .filter((b) => b.warehouseId === warehouseId && needed.has(b.commodityId))
      .reduce((sum, b) => sum + b.balanceKg, 0);

  /** The same figure for a seller still holding goods for us. */
  const relevantHeldBy = (supplierId: string) =>
    holdings
      .filter((h) => h.supplierId === supplierId && needed.has(h.commodityId))
      .reduce((sum, h) => sum + h.remainingKg, 0);

  // Needed vs available across every stop the truck makes - the sheds it
  // calls at and the sellers it collects from. Advisory only: the backend
  // re-checks against actual lot remainders and refuses with
  // INSUFFICIENT_WAREHOUSE_STOCK if the ledger disagrees.
  const stopsChosen = shedIds.length > 0 || pickupIds.length > 0;
  const coverReady = Boolean(stock.data) && Boolean(supplierHoldings.data);
  const shortfalls = useMemo(() => {
    if (needed.size === 0 || !stopsChosen || !coverReady) return [];
    const rows: { availableKg: number; name: string; neededKg: number }[] = [];
    for (const [commodityId, row] of needed) {
      if (row.kg <= 0) continue;
      const inSheds = balances
        .filter(
          (b) =>
            b.commodityId === commodityId && shedIds.includes(b.warehouseId),
        )
        .reduce((sum, b) => sum + b.balanceKg, 0);
      const atGates = holdings
        .filter(
          (h) =>
            h.commodityId === commodityId && pickupIds.includes(h.supplierId),
        )
        .reduce((sum, h) => sum + h.remainingKg, 0);
      const availableKg = inSheds + atGates;
      if (availableKg < row.kg)
        rows.push({ availableKg, name: row.name, neededKg: row.kg });
    }
    return rows;
  }, [needed, shedIds, pickupIds, coverReady, balances, holdings, stopsChosen]);

  const capacityKg = Number(capacityRaw);
  const hasCapacity = capacityRaw.trim() !== "" && capacityKg > 0;
  const overCapacity = hasCapacity && selectedKg > capacityKg;

  const driverList = drivers.data?.data ?? [];
  const addressList = addresses.data?.data ?? [];
  // The sheds offered as extra stops - every active warehouse but the origin.
  const otherWarehouses = useMemo(
    () =>
      (warehouses.data?.data ?? []).filter((w) => w.id !== originWarehouseId),
    [warehouses.data, originWarehouseId],
  );

  // Only sellers actually holding goods are offered. The whole supplier
  // directory here would be a list of hundreds of places with nothing to
  // collect, and ticking one of them buys the plan no cover at all.
  const pickupOptions = useMemo(() => {
    const bySupplier = new Map<string, { id: string; name: string; kg: number }>();
    for (const h of holdings) {
      const entry = bySupplier.get(h.supplierId) ?? {
        id: h.supplierId,
        kg: 0,
        name: h.supplierName,
      };
      // The row figure counts only what THIS load needs, exactly as the shed
      // rows do; the seller still appears when they hold something else, so a
      // planner can see the trip would collect nothing useful there.
      if (needed.has(h.commodityId)) entry.kg += h.remainingKg;
      bySupplier.set(h.supplierId, entry);
    }
    return [...bySupplier.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [holdings, needed]);

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
    // The ticked extras, minus the origin should a stale tick linger after
    // the origin select was changed to the same shed.
    const extraSheds = (values.loadingWarehouseIds ?? []).filter(
      (id) => id !== values.originWarehouseId,
    );
    try {
      if (editing && shipment) {
        await updateShipment({
          id: shipment.id,
          loadingWarehouseIds: extraSheds,
          pickupSupplierIds: values.pickupSupplierIds ?? [],
          truckReg: values.truckReg,
          // A saved address carries the destination; free text otherwise
          // (null detaches an address picked earlier).
          ...(values.deliveryAddressId
            ? { deliveryAddressId: values.deliveryAddressId }
            : {
                deliveryAddressId: null,
                ...opt("destination", values.destination),
              }),
          // Re-point (or detach) the directory driver; typed overrides win.
          driverId: values.driverId || null,
          ...opt("driverName", values.driverName),
          ...opt("driverPhone", values.driverPhone),
          ...opt("driverEmail", values.driverEmail),
          ...opt("driverCompany", values.driverCompany),
          ...opt("driverCity", values.driverCity),
          ...opt("driverLicenseNo", values.driverLicenseNo),
          ...opt("driverIdNumber", values.driverIdNumber),
          truckCapacityKg: values.truckCapacityKg?.trim()
            ? Number(values.truckCapacityKg)
            : null,
          expectedArrivalAt: values.expectedArrivalAt || null,
          notes: values.notes?.trim() || null,
        }).unwrap();
        notify.success("Shipment plan updated");
        router.push(`${LIST}/${shipment.id}`);
        return;
      }
      const res = await createShipment({
        ...(values.originWarehouseId
          ? { originWarehouseId: values.originWarehouseId }
          : {}),
        saleIds: values.saleIds,
        truckReg: values.truckReg,
        ...(extraSheds.length ? { loadingWarehouseIds: extraSheds } : {}),
        ...(values.pickupSupplierIds?.length
          ? { pickupSupplierIds: values.pickupSupplierIds }
          : {}),
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
      } else if (code === "INSUFFICIENT_WAREHOUSE_STOCK") {
        setError("loadingWarehouseIds", { message });
      } else if (
        code === "SALE_BELOW_MILESTONE" ||
        code === "SALE_ALREADY_PLANNED" ||
        code === "SALE_FULLY_SHIPPED"
      ) {
        setError("saleIds", { message });
      }
      notify.error(
        editing ? "Couldn't update the plan" : "Couldn't plan the shipment",
        { description: message },
      );
    }
  };

  return (
    <div className="max-w-[760px]">
      <DetailNav
        crumbs={
          editing && shipment
            ? [
                DASHBOARD_CRUMB,
                { label: "Shipments", href: LIST },
                { label: shipment.transactionNo, href: `${LIST}/${shipment.id}` },
              ]
            : [DASHBOARD_CRUMB, { label: "Shipments", href: LIST }]
        }
        current={editing ? "Edit shipment plan" : "Plan shipment"}
        backLabel={editing ? "Back to shipment" : undefined}
      />
      <DetailHeader
        title={editing ? "Edit shipment plan" : "Plan shipment"}
        hint={
          editing
            ? "Change the truck, driver, destination or the warehouses it loads at - until it dispatches."
            : "Set up a truck: who drives, what it carries and where it is going."
        }
        sub={
          editing && shipment
            ? `${shipment.transactionNo} · nothing moves until you dispatch`
            : "Book a truck and driver against confirmed sales - nothing leaves the warehouse until you dispatch"
        }
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 p-5">
          <section className="flex flex-col gap-5">
            <StepHead
              title="Sales on this trip"
              hint={
                editing
                  ? "The orders this truck carries. Add or remove them on the shipment page."
                  : "One truck can serve several orders. Each shows the weight still to ship."
              }
            />
            {/* Not an AdminField: its Label wrapper would nest the row labels
                (invalid HTML) and steal clicks for the first control. */}
            {editing && shipment ? (
              <div>
                <div className="rounded-none border border-adm-line bg-[#FBFCF7]">
                  {shipment.sales.map((s) => (
                    <div
                      key={s.id}
                      className="border-b border-adm-hairline px-3 py-2 last:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <Mono className="text-[11px] text-console">
                          {s.transactionNo}
                        </Mono>
                        <Mono className="flex-none text-[11px] font-bold text-adm-ink">
                          {formatKg(
                            s.lines.reduce((kg, l) => kg + l.outstandingKg, 0),
                          )}
                        </Mono>
                      </div>
                      <p className="min-w-0 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]">
                        {s.buyer.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div>
              <div
                className={cn(
                  "rounded-none border border-adm-line bg-[#FBFCF7]",
                  errors.saleIds && "border-console-red",
                )}
              >
                <div className="border-b border-adm-hairline p-2">
                  <Input
                    aria-label="Search sales by number or buyer"
                    value={saleSearch}
                    onChange={(e) => setSaleSearch(e.target.value)}
                    placeholder="Search sale no. or buyer…"
                    className={cn(adminInputClass, "h-9")}
                  />
                </div>
                {eligible.isLoading ? (
                  <p className="px-3 py-3 text-[11.5px] text-adm-muted">
                    Loading shippable sales…
                  </p>
                ) : eligible.isError ? (
                  <p className="px-3 py-3 text-[11.5px] text-console-red">
                    Couldn&apos;t load the shippable sales. Reload and try again.
                  </p>
                ) : visibleSales.length === 0 ? (
                  <p className="px-3 py-3 text-[11.5px] text-adm-muted">
                    {allSales.length === 0
                      ? "No sales are ready to ship - a sale appears here once it is confirmed, its payment terms are met and it isn't already on a truck."
                      : "No sales match this search."}
                  </p>
                ) : (
                  <div className="max-h-[280px] overflow-y-auto">
                    {visibleSales.map((s) => (
                      <label
                        key={s.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 border-b border-adm-hairline border-l-2 border-l-transparent px-3 py-2 last:border-b-0 hover:bg-adm-sunken",
                          // A ticked sale reads as picked from across the room:
                          // green rail, tinted row, not just a 16px checkbox.
                          selected.includes(s.id) &&
                            "border-l-[#155744] bg-[#F1F6EE] hover:bg-[#EBF2E7]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(s.id)}
                          onChange={() => toggleSale(s.id)}
                          className="mt-1 h-4 w-4 flex-none accent-[#155744]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <Mono
                              className={cn(
                                "block text-[11px] text-console",
                                selected.includes(s.id) && "font-bold",
                              )}
                            >
                              {s.transactionNo}
                            </Mono>
                            <Mono className="flex-none text-[11px] font-bold text-adm-ink">
                              {formatKg(s.totalRemainingKg)}
                            </Mono>
                          </span>
                          {/* The buyer and what they are taking on one line.
                              A single-commodity sale gets its name only: the
                              weight is already on the right of the row above,
                              and printing it twice bought a third line on
                              every sale in the list. A sale carrying more
                              than one commodity keeps the split, which the
                              total on the right cannot say. */}
                          <span className="block min-w-0 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]">
                            {s.buyer.name}
                            <span className="text-adm-muted">
                              {" · "}
                              {s.lines.length === 1
                                ? s.lines[0].commodityName
                                : s.lines
                                    .map(
                                      (l) =>
                                        `${l.commodityName} ${formatKg(l.remainingKg)}`,
                                    )
                                    .join(" · ")}
                            </span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="border-t border-adm-hairline px-3 py-1.5 text-[11px] text-adm-muted">
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
                  className="mt-1 block text-[11px] font-medium text-console-red"
                >
                  {errors.saleIds.message}
                </span>
              ) : null}
            </div>
            )}
          </section>

          <section className="flex flex-col gap-5 pt-3 sm:pt-6">
            <StepHead
              title="Where the truck loads"
              hint="Start at the shed it sets off from, tick any other shed it calls at, and add the sellers it collects from on the way."
            />
            {editing && shipment ? (
              <AdminField
                label="Origin warehouse"
                hint="Fixed once planned - tick more stops below instead."
              >
                <p className="rounded-none border border-adm-line bg-adm-sunken px-3 py-2 text-[11.5px] font-medium text-adm-ink">
                  {shipment.originWarehouse?.name ??
                    "None - this truck collects from suppliers"}
                </p>
              </AdminField>
            ) : (
              <AdminField
                label="Origin warehouse"
                hint="Leave blank when the goods are collected straight from the supplier and never enter a shed."
                error={errors.originWarehouseId?.message}
              >
                <Controller
                  control={control}
                  name="originWarehouseId"
                  render={({ field }) => (
                    <SimpleSelect
                      className={cn(
                        adminSelectClass,
                        "w-full",
                        errors.originWarehouseId && "border-console-red",
                      )}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                        clearErrors("originWarehouseId");
                      }}
                      placeholder="No warehouse - collecting from suppliers"
                      options={(warehouses.data?.data ?? []).map((w) => ({
                        value: w.id,
                        label: w.name,
                      }))}
                    />
                  )}
                />
              </AdminField>
            )}
            {/* The other sheds the truck also calls at. Each row carries how
                much of THIS load's commodities the shed holds, so picking the
                next stop is a glance, not a stock-report expedition. */}
            <div>
              <span className="mb-[7px] block text-[10.5px] uppercase tracking-[0.14em] text-adm-muted">
                Also loads at{" "}
                <span className="normal-case tracking-normal">(optional)</span>
              </span>
              {otherWarehouses.length === 0 ? (
                <p className="text-[11px] text-adm-muted">
                  There are no other active warehouses to take loads from.
                </p>
              ) : (
                <div
                  className={cn(
                    "rounded-none border border-adm-line bg-[#FBFCF7]",
                    errors.loadingWarehouseIds && "border-console-red",
                  )}
                >
                  {otherWarehouses.map((w) => {
                    const ticked = extraShedIds.includes(w.id);
                    const heldKg = relevantStockIn(w.id);
                    return (
                      <label
                        key={w.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 border-b border-adm-hairline border-l-2 border-l-transparent px-3 py-2 last:border-b-0 hover:bg-adm-sunken",
                          ticked &&
                            "border-l-[#155744] bg-[#F1F6EE] hover:bg-[#EBF2E7]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={ticked}
                          onChange={() => toggleShed(w.id)}
                          className="h-4 w-4 flex-none accent-[#155744]"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]",
                            ticked && "font-medium",
                          )}
                        >
                          {w.name}
                        </span>
                        {needed.size > 0 && stock.data ? (
                          <Mono className="flex-none text-[11px] text-adm-muted">
                            {formatKg(heldKg)} of this load&apos;s goods
                          </Mono>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.loadingWarehouseIds ? (
                <span
                  role="alert"
                  className="mt-1 block text-[11px] font-medium text-console-red"
                >
                  {errors.loadingWarehouseIds.message}
                </span>
              ) : null}
            </div>

            {/* The sellers this truck collects from. Goods bought at the farm
                gate for a straight run to the buyer never enter a shed, so
                they are picked up here rather than found in a warehouse. Only
                sellers actually holding something appear. */}
            <div>
              <span className="mb-[7px] block text-[10.5px] uppercase tracking-[0.14em] text-adm-muted">
                Collects from{" "}
                <span className="normal-case tracking-normal">(optional)</span>
              </span>
              {pickupOptions.length === 0 ? (
                <p className="text-[11px] text-adm-muted">
                  No supplier is holding goods for collection. Goods appear here
                  when a purchase is received straight onto a truck instead of
                  into a warehouse.
                </p>
              ) : (
                <div
                  className={cn(
                    "rounded-none border border-adm-line bg-[#FBFCF7]",
                    errors.pickupSupplierIds && "border-console-red",
                  )}
                >
                  {pickupOptions.map((sup) => {
                    const ticked = pickupIds.includes(sup.id);
                    return (
                      <label
                        key={sup.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 border-b border-adm-hairline border-l-2 border-l-transparent px-3 py-2 last:border-b-0 hover:bg-adm-sunken",
                          ticked &&
                            "border-l-[#155744] bg-[#F1F6EE] hover:bg-[#EBF2E7]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={ticked}
                          onChange={() => togglePickup(sup.id)}
                          className="h-4 w-4 flex-none accent-[#155744]"
                        />
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]",
                            ticked && "font-medium",
                          )}
                        >
                          {sup.name}
                        </span>
                        {needed.size > 0 && supplierHoldings.data ? (
                          <Mono className="flex-none text-[11px] text-adm-muted">
                            {formatKg(relevantHeldBy(sup.id))} of this
                            load&apos;s goods
                          </Mono>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.pickupSupplierIds ? (
                <span
                  role="alert"
                  className="mt-1 block text-[11px] font-medium text-console-red"
                >
                  {errors.pickupSupplierIds.message}
                </span>
              ) : null}
            </div>
            {/* Live sufficiency check: needed vs on hand across every selected
                shed. The backend re-checks against actual lot remainders. */}
            {needed.size > 0 && stopsChosen && coverReady ? (
              shortfalls.length > 0 ? (
                <div
                  role="alert"
                  className="rounded-none border border-[#B45309]/40 bg-[#FFFBEB] px-3 py-2.5 text-[11px] text-[#92400E]"
                >
                  <p className="font-semibold">
                    There aren&apos;t enough goods at this trip&apos;s loading
                    points to load these sales.
                  </p>
                  <ul className="mt-1 flex flex-col gap-0.5">
                    {shortfalls.map((s) => (
                      <li key={s.name}>
                        {s.name}: needs <Mono>{formatKg(s.neededKg)}</Mono>, on
                        hand <Mono>{formatKg(s.availableKg)}</Mono>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">
                    Add another warehouse or supplier to collect from, or plan a
                    smaller load.
                  </p>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-console">
                  <Check className="h-3.5 w-3.5 flex-none" />
                  This trip&apos;s loading points hold enough of every commodity
                  for the load.
                </p>
              )
            ) : null}
          </section>

          <section className="flex flex-col gap-5 pt-3 sm:pt-6">
            <StepHead
              title="Truck & destination"
              hint="What carries the goods and where they are going."
            />
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
                <p className="text-[11px] text-adm-muted">
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
              <PickedCard
                title="Delivering to"
                heading={`${pickedAddress.label} · ${pickedAddress.city}${
                  pickedAddress.area ? `, ${pickedAddress.area}` : ""
                }`}
                facts={[
                  { label: "Shop", value: pickedAddress.shopName },
                  {
                    label: "Digital address",
                    value: pickedAddress.digitalAddress ? (
                      <Mono>{pickedAddress.digitalAddress}</Mono>
                    ) : null,
                  },
                  { label: "Landmark", value: pickedAddress.landmark },
                  {
                    label: "Receives",
                    value:
                      pickedAddress.contactName || pickedAddress.contactPhone ? (
                        <>
                          {pickedAddress.contactName}
                          {pickedAddress.contactName && pickedAddress.contactPhone
                            ? " · "
                            : ""}
                          {pickedAddress.contactPhone ? (
                            <Mono>{pickedAddress.contactPhone}</Mono>
                          ) : null}
                        </>
                      ) : null,
                  },
                ]}
              />
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                hint="The load meter warns you past this."
                error={errors.truckCapacityKg?.message}
              >
                <Input
                  inputMode="decimal"
                  className={cn(
                    adminInputClass,
                    errors.truckCapacityKg && "border-console-red",
                  )}
                  placeholder="e.g. 30000"
                  {...register("truckCapacityKg")}
                />
              </AdminField>
              <AdminField label="Expected arrival" optional>
                <DateInput
                  className={adminInputClass}
                  placeholder="Pick the arrival date"
                  {...register("expectedArrivalAt")}
                />
              </AdminField>
              <AdminField label="Notes" optional>
                <Input
                  className={adminInputClass}
                  placeholder="Anything the driver or office should know"
                  {...register("notes")}
                />
              </AdminField>
            </div>
            {selected.length > 0 && (hasCapacity || selectedKg > 0) ? (
              <LoadMeter loadedKg={selectedKg} capacityKg={hasCapacity ? capacityKg : null} />
            ) : null}
          </section>

          <section className="flex flex-col gap-5 pt-3 sm:pt-6">
            <StepHead
              title="Driver"
              hint="Who has the truck. Pick from the directory or enter the trip's driver by hand."
            />
            {/* Same rule as the destination: the directory stays visible even
                when it is empty, so its existence is discoverable. */}
            <AdminField
              label="Driver"
              hint={driverBookEmpty ? undefined : "Type to search the directory."}
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
                <p className="text-[11px] text-adm-muted">
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
              <PickedCard
                title="Driving this trip"
                heading={ovName || pickedDriver.name}
                action={
                  <AdminButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-none"
                    onClick={() => setShowDriverOverrides(true)}
                  >
                    Edit details
                  </AdminButton>
                }
                facts={[
                  {
                    label: "Phone",
                    value: <Mono>{ovPhone || pickedDriver.phone}</Mono>,
                  },
                  { label: "Company", value: ovCompany || pickedDriver.company },
                  { label: "City", value: ovCity || pickedDriver.city },
                ]}
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <AdminField label="Name" error={errors.driverName?.message}>
                  <Input
                    className={cn(
                      adminInputClass,
                      errors.driverName && "border-console-red",
                    )}
                    placeholder="e.g. Abukari Yakubu"
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
                    placeholder="e.g. 024 000 0000"
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
                    placeholder="e.g. yakubu@example.com"
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
                    placeholder="e.g. Northern Haulage Ltd"
                    {...register("driverCompany")}
                  />
                </AdminField>
                <AdminField label="City" optional>
                  <Input
                    className={adminInputClass}
                    placeholder="e.g. Tamale"
                    {...register("driverCity")}
                  />
                </AdminField>
                <AdminField label="Licence no" optional>
                  <Input
                    className={adminInputClass}
                    placeholder="e.g. DL-0000000"
                    {...register("driverLicenseNo")}
                  />
                </AdminField>
                <AdminField label="ID number" optional>
                  <Input
                    className={adminInputClass}
                    placeholder="e.g. GHA-000000000-0"
                    {...register("driverIdNumber")}
                  />
                </AdminField>
              </div>
            )}
          </section>
        </AdminCard>

        <CommitRow>
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() =>
              router.push(editing && shipment ? `${LIST}/${shipment.id}` : LIST)
            }
          >
            Cancel
          </AdminButton>
          <AdminButton
            type="submit"
            disabled={saving || overCapacity}
            loading={saving}
            size="lg"
          >
            {editing
              ? saving
                ? "Saving…"
                : "Save changes"
              : saving
                ? "Planning…"
                : "Plan shipment"}
          </AdminButton>
        </CommitRow>
      </form>
    </div>
  );
}
