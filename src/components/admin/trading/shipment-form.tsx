"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { useGetSalesQuery } from "@/redux/sales/admin-sales-api";
import { useCreateShipmentMutation } from "@/redux/shipments/shipments-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { shipmentSchema, type ShipmentValues } from "@/validations/shipment-schema";

const LIST = "/admin/shipments";

/** Plan a shipment. `saleId` may be pre-filled from a sale's "Ship" action. */
export function ShipmentForm({ saleId }: { saleId?: string }) {
  const router = useRouter();
  const [createShipment, { isLoading: saving }] = useCreateShipmentMutation();

  // Only confirmed sales can be shipped.
  const sales = useGetSalesQuery({ status: "CONFIRMED", limit: 100 });
  const warehouses = useGetWarehousesQuery({ limit: 100, isActive: true });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShipmentValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      destination: "",
      driverName: "",
      driverPhone: "",
      expectedArrivalAt: "",
      notes: "",
      originWarehouseId: "",
      saleId: saleId ?? "",
      truckCapacityKg: "",
      truckReg: "",
    },
  });

  const onSubmit = async (values: ShipmentValues) => {
    try {
      const res = await createShipment({
        destination: values.destination,
        driverName: values.driverName,
        originWarehouseId: values.originWarehouseId,
        saleId: values.saleId,
        truckReg: values.truckReg,
        ...(values.driverPhone?.trim()
          ? { driverPhone: values.driverPhone.trim() }
          : {}),
        ...(values.truckCapacityKg?.trim()
          ? { truckCapacityKg: Number(values.truckCapacityKg) }
          : {}),
        ...(values.expectedArrivalAt
          ? { expectedArrivalAt: values.expectedArrivalAt }
          : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Shipment planned");
      router.push(`${LIST}/${res.data.shipment.id}`);
    } catch (err) {
      notify.error("Couldn't plan the shipment", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader title="Plan shipment" />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Sale" error={errors.saleId?.message}>
            <select
              className={cn(
                adminSelectClass,
                "w-full",
                errors.saleId && "border-error",
              )}
              {...register("saleId")}
            >
              <option value="">Choose a confirmed sale</option>
              {(sales.data?.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.buyer.name} · {s.transactionNo}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField
            label="Origin warehouse"
            error={errors.originWarehouseId?.message}
          >
            <select
              className={cn(
                adminSelectClass,
                "w-full",
                errors.originWarehouseId && "border-error",
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Destination" error={errors.destination?.message}>
              <Input
                className={cn(adminInputClass, errors.destination && "border-error")}
                placeholder="Accra / Kumasi / address"
                {...register("destination")}
              />
            </AdminField>
            <AdminField
              label="Truck registration"
              error={errors.truckReg?.message}
            >
              <Input
                className={cn(adminInputClass, errors.truckReg && "border-error")}
                placeholder="GT-1234-24"
                {...register("truckReg")}
              />
            </AdminField>
            <AdminField label="Driver name" error={errors.driverName?.message}>
              <Input
                className={cn(adminInputClass, errors.driverName && "border-error")}
                {...register("driverName")}
              />
            </AdminField>
            <AdminField label="Driver phone" optional>
              <Input className={adminInputClass} {...register("driverPhone")} />
            </AdminField>
            <AdminField label="Truck capacity (kg)" optional>
              <Input
                inputMode="decimal"
                className={adminInputClass}
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
          </div>
          <AdminField label="Notes" optional>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
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
          <AdminButton type="submit" disabled={saving} className="h-10 px-5">
            {saving ? "Planning…" : "Plan shipment"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
