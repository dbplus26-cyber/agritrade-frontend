import type { Metadata } from "next";
import { AccountLedgerScreen } from "@/components/admin/cashbook/account-ledger-screen";

export const metadata: Metadata = { title: "Account ledger" };

export default async function AccountLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountLedgerScreen accountId={id} />;
}
