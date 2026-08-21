"use client";

import Link from "next/link";
import { AdminButton, AdminCard, DetailHeader } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { useGetShipmentQuery } from "@/redux/shipments/shipments-api";
import { ShipmentForm } from "./shipment-form";

const LIST = "/admin/shipments";

/**
 * Loads the shipment, then hands it to the form in edit mode. Only a plan
 * that has not left (PLANNED / LOADING) is editable - the same guard the
 * backend enforces with SHIPMENT_LOCKED.
 */
export function ShipmentEdit({ id }: { id: string }) {
  const { data, isLoading, isError } = useGetShipmentQuery(id);
  const shipment = data?.data.shipment;

  if (isLoading) {
    return (
      <div className="max-w-[640px]">
        <AdminCard className="px-5 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-adm-sunken" />
          <div className="mt-3 h-24 animate-pulse rounded bg-adm-sunken" />
        </AdminCard>
      </div>
    );
  }

  if (isError || !shipment) {
    return (
      <div className="max-w-[640px]">
        <DetailNav
          crumbs={[DASHBOARD_CRUMB, { label: "Shipments", href: LIST }]}
          current="Edit shipment plan"
        />
        <AdminCard className="px-5 py-4 text-[13px] text-console-red">
          Couldn&apos;t load this shipment. Reload and try again.
        </AdminCard>
      </div>
    );
  }

  if (shipment.status !== "PLANNED" && shipment.status !== "LOADING") {
    return (
      <div className="max-w-[640px]">
        <DetailNav
          crumbs={[
            DASHBOARD_CRUMB,
            { label: "Shipments", href: LIST },
            { label: shipment.transactionNo, href: `${LIST}/${shipment.id}` },
          ]}
          current="This plan is locked"
          backLabel="Back to shipment"
        />
        <DetailHeader
          title="This plan is locked"
          sub={`${shipment.transactionNo} has already dispatched - the plan can no longer be edited.`}
        />
        <AdminButton asChild>
          <Link href={`${LIST}/${shipment.id}`}>View the shipment</Link>
        </AdminButton>
      </div>
    );
  }

  return <ShipmentForm shipment={shipment} />;
}
