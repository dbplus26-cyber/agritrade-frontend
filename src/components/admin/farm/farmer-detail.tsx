"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
} from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import {
  farmerDocumentUrl,
  useAddFarmerDocumentMutation,
  useGetFarmerQuery,
  useRemoveFarmerDocumentMutation,
  useSetFarmerActiveMutation,
} from "@/redux/farm/farmers-api";
import { useGetGrantsQuery } from "@/redux/farm/grants-api";
import { useGetRepaymentsQuery } from "@/redux/farm/repayments-api";
import { avatarOf } from "@/static-data/admin/registers";
import {
  ActiveBadge,
  GrantApprovalBadge,
  formatFarmDate,
} from "./farm-bits";

const LIST = "/admin/farmers";

export function FarmerDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetFarmerQuery(id);
  const grants = useGetGrantsQuery({ farmerId: id, limit: 50 });
  const repayments = useGetRepaymentsQuery({ farmerId: id, limit: 50 });
  const [setActive] = useSetFarmerActiveMutation();
  const [addDoc, addDocState] = useAddFarmerDocumentMutation();
  const [removeDoc] = useRemoveFarmerDocumentMutation();
  const [docName, setDocName] = useState("");

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const f = data.data.farmer;
  const a = avatarOf(f.name);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify.success(ok);
    } catch (err) {
      notify.error("Something went wrong", {
        description: extractApiError(err).message,
      });
    }
  };

  // Runs only after the user has seen the file and confirmed it.
  const onDocConfirm = async (file: null | File) => {
    if (!file) return;
    if (!docName.trim()) {
      notify.error("Name the document first");
      throw new Error("Document name required");
    }
    await run(
      () => addDoc({ file, id: f.id, name: docName.trim() }).unwrap(),
      "Document added",
    );
    setDocName("");
  };

  return (
    <div className="max-w-[860px]">
      <BackButton href={LIST} label="All farmers" className="mb-2" />
      <AdminPageHeader
        title={f.name}
        sub={[f.community, f.phone].filter(Boolean).join(" · ") || undefined}
        actions={<ActiveBadge active={f.isActive} />}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <AdminButton variant="outline" className="h-9 px-4" asChild>
          <Link href={`${LIST}/${f.id}/edit`}>Edit</Link>
        </AdminButton>
        <AdminButton className="h-9 px-4" asChild>
          <Link href={`${LIST}/${f.id}/statement`}>Statement</Link>
        </AdminButton>
        <AdminButton
          variant="outline"
          className="h-9 px-4"
          onClick={() =>
            void run(
              () => setActive({ active: !f.isActive, id: f.id }).unwrap(),
              f.isActive ? "Farmer deactivated" : "Farmer activated",
            )
          }
        >
          {f.isActive ? "Deactivate" : "Activate"}
        </AdminButton>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-[220px_1fr]">
        <AdminCard className="flex flex-col items-center px-5 py-5 text-center">
          {f.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
            <img
              src={f.photoUrl}
              alt={f.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex h-24 w-24 items-center justify-center rounded-full text-[28px] font-bold"
              style={{ background: a.bg, color: a.fg }}
            >
              {a.init}
            </span>
          )}
          <div className="mt-3 text-[15px] font-semibold text-ink">{f.name}</div>
          {f.phone ? (
            <div className="text-[12.5px] text-soil">{f.phone}</div>
          ) : null}
        </AdminCard>

        <AdminCard className="px-5 py-4 text-[13.5px] text-ink">
          <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Notes
          </div>
          {f.notes ? f.notes : <span className="text-soil">No notes.</span>}
        </AdminCard>
      </div>

      {/* Private documents */}
      <AdminCard className="mb-4 px-5 py-4">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Agreement documents (private)
        </div>
        <p className="mb-2 text-[12px] text-soil">
          Never shown publicly. Downloads are logged.
        </p>
        {f.documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between border-b border-soil/10 py-2 text-[13px] last:border-b-0"
          >
            <a
              href={farmerDocumentUrl(f.id, doc.id)}
              target="_blank"
              rel="noreferrer"
              className="text-console hover:underline"
            >
              {doc.name}
            </a>
            <div className="flex items-center gap-3">
              <Mono className="text-[12px] text-soil">
                {formatFarmDate(doc.createdAt)}
              </Mono>
              <button
                type="button"
                onClick={() =>
                  void run(
                    () => removeDoc({ documentId: doc.id, id: f.id }).unwrap(),
                    "Document removed",
                  )
                }
                className="text-[12px] text-console-red"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Document name (e.g. Grant agreement)"
            className="h-8 flex-1 rounded border border-soil/25 bg-paper px-2.5 text-[13px]"
          />
          <FilePicker
            accept="image/*,application/pdf,.doc,.docx"
            busy={addDocState.isLoading}
            confirmLabel="Upload"
            hint="PDF, Word or a photo of the agreement"
            onConfirm={onDocConfirm}
            optimize={false}
            triggerLabel="Choose document"
          />
        </div>
      </AdminCard>

      {/* Grants + repayments */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-soil/15 px-5 py-3">
            <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Grants
            </span>
            <Link
              href={`/admin/grants/new?farmerId=${f.id}`}
              className="text-[12.5px] text-console hover:underline"
            >
              + New
            </Link>
          </div>
          {(grants.data?.data ?? []).length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-soil">No grants yet.</p>
          ) : (
            <ul className="divide-y divide-soil/10">
              {(grants.data?.data ?? []).map((g) => (
                <li key={g.id} className="px-5 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{g.item.name}</span>
                    <Mono className="text-ink">
                      <Money value={g.valueGhs} />
                    </Mono>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[12px] text-soil">
                    <span>
                      {g.season.name} · {formatFarmDate(g.grantedAt)}
                    </span>
                    <GrantApprovalBadge status={g.approval?.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-soil/15 px-5 py-3">
            <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Repayments
            </span>
            <Link
              href={`/admin/repayments/new?farmerId=${f.id}`}
              className="text-[12.5px] text-console hover:underline"
            >
              + New
            </Link>
          </div>
          {(repayments.data?.data ?? []).length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-soil">No repayments yet.</p>
          ) : (
            <ul className="divide-y divide-soil/10">
              {(repayments.data?.data ?? []).map((r) => (
                <li key={r.id} className="px-5 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">
                      {r.commodity.name}
                    </span>
                    <Mono className="text-leaf">
                      <Money value={r.valueGhs} />
                    </Mono>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[12px] text-soil">
                    <span>
                      {r.weightKg} kg · {formatFarmDate(r.receivedAt)}
                    </span>
                    {r.intoStock ? (
                      <span className="text-console">Into stock</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
