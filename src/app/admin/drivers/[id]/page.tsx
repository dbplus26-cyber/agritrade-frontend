import type { Metadata } from "next";
import { DriverPaymentsCard } from "@/components/admin/drivers/driver-payments-card";
import { DriverEdit } from "@/components/admin/logistics/driver-screens";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-w-0 space-y-4">
      <DriverEdit id={id} />
      {/* The driver's money, under the driver's record. A payment receipt is
          emailed on recording only when the directory holds an address, and a
          driver without one has no other copy - so this is where they are read
          back, whichever kind of driver walks in. */}
      <DriverPaymentsCard driverId={id} />
    </div>
  );
}
