"use client";

import { SectionHeading } from "@/components/admin/ui";

/** Stable fallbacks so a transient undefined watch can't churn memo deps. */
export const NO_SALES: string[] = [];
export const NO_SHEDS: string[] = [];

/**
 * A card's heading: a numbered step, a title, one quiet line of guidance.
 * Planning really is a sequence - what goes, from where, on what truck,
 * with whom - so the numbering carries information, and every per-field
 * hint the number replaces is one less line crowding the controls.
 */
export function StepHead({
  hint,
  step,
  title,
}: {
  hint?: string;
  step: number;
  title: string;
}) {
  return (
    <div className="border-b border-adm-hairline pb-3">
      <SectionHeading className="mb-0">
        <span className="flex items-center gap-2.5">
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#155744] text-[11px] font-bold text-white">
            {step}
          </span>
          <span className="min-w-0">{title}</span>
        </span>
      </SectionHeading>
      {hint ? (
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-adm-muted">
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
