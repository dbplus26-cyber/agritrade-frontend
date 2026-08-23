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

/** One labelled fact on a picked card. Absent values are never rendered. */
export interface PickedFact {
  label: string;
  value: React.ReactNode;
}

/**
 * What the form picked out of a register, shown back as a record rather than
 * as a paragraph.
 *
 * A destination carries a shop, a digital address, a landmark and whoever
 * receives the truck; run together into dot-joined sentences none of them is
 * findable, and on a desktop the whole card sits in the left third of the row
 * with the rest of the width empty. Labelled facts in a grid put each one
 * where the eye can go straight to it and spend the width on columns.
 */
export function PickedCard({
  action,
  facts,
  heading,
  title,
}: {
  /** Anything that changes the pick - an Edit button, usually. */
  action?: React.ReactNode;
  facts: PickedFact[];
  heading: React.ReactNode;
  title: string;
}) {
  const shown = facts.filter((f) => f.value);
  return (
    <div className="@container rounded-none border border-[#155744]/45 bg-[#F1F6EE]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="mb-0.5 text-[10.5px] font-bold tracking-[0.09em] text-console uppercase">
            {title}
          </p>
          <p className="min-w-0 text-[12px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
            {heading}
          </p>
        </div>
        {action}
      </div>
      {shown.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 border-t border-[#155744]/20 px-3.5 py-2.5 @md:grid-cols-3 @2xl:grid-cols-4">
          {shown.map((f) => (
            <div className="min-w-0" key={f.label}>
              <dt className="text-[10px] font-bold tracking-[0.1em] text-console/70 uppercase">
                {f.label}
              </dt>
              <dd className="mt-0.5 min-w-0 text-[11.5px] text-adm-ink [overflow-wrap:anywhere]">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
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
