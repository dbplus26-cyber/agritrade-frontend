import type { Metadata } from "next";
import { ApprovalDetail } from "@/components/admin/approvals/approval-detail";

export const metadata: Metadata = {
  title: "Approval",
  description: "One approval's full record - who asked, who decided, when.",
};

export default async function ApprovalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApprovalDetail id={id} />;
}
