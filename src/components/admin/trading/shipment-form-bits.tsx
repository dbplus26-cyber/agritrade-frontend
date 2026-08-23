"use client";

import { SectionHeading } from "@/components/admin/ui";

/** Stable fallbacks so a transient undefined watch can't churn memo deps. */
export const NO_SALES: string[] = [];
export const NO_SHEDS: string[] = [];

/**
 * A card's heading: a title and one quiet line of guidance.
 *
 * The rule under it is what separates one part of the form from the next.
 * A numbered badge said the same thing louder, and a form laid out in
 * sequence already reads in sequence without being counted at.
 */
export function StepHead({
  hint,
  title,
}: {
  hint?: string;
  title: string;
}) {
  return (
    <div className="border-b border-adm-hairline pb-3">
      <SectionHeading className="mb-0">{title}</SectionHeading>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-[1.55] text-adm-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The picked directory records, held as the fields the form actually shows.
 * In edit mode they are rebuilt from the shipment's snapshot (the original
 * directory rows may be off whatever page a search last loaded), so the
 * types name only what both sources carry - `IDriver`/`IDeliveryAddress`
 * satisfy them structurally.
 */
export interface PickedDriver {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  city: string | null;
}
export interface PickedAddress {
  id: string;
  label: string;
  city: string;
  area: string | null;
  shopName: string | null;
  digitalAddress: string | null;
  landmark: string | null;
  contactName: string | null;
  contactPhone: string | null;
}

/** A trimmed value, or nothing - empty optional fields are omitted entirely. */
export const opt = <K extends string>(key: K, value: string | undefined) =>
  value?.trim() ? ({ [key]: value.trim() } as Record<K, string>) : {};

/** RHF field names the backend can return field errors for. */
export const FIELD_NAMES = [
  "saleIds",
  "originWarehouseId",
  "loadingWarehouseIds",
  "pickupSupplierIds",
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
