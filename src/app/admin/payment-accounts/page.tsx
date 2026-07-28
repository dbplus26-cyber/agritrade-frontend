import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentAccountTable } from "@/components/admin/settings/payment-account-screens";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";

export const metadata: Metadata = { title: "Payment accounts" };

/** Where customers are told to send money, and what invoices print. */
export default function PaymentAccountsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <PaymentAccountTable />
    </Suspense>
  );
}
