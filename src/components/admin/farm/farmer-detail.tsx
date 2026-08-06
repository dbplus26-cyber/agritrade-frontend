"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
} from "@/components/admin/ui";
import { Absent } from "@/components/admin/registry/registry-bits";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import {
  farmerDocumentUrl,
  useAddFarmerDocumentMutation,
  useGetFarmerQuery,
  useRemoveFarmerDocumentMutation,
  useRemoveFarmerGuarantorMutation,
  useSetFarmerActiveMutation,
} from "@/redux/farm/farmers-api";
import { useGetGrantsQuery } from "@/redux/farm/grants-api";
import { useGetRepaymentsQuery } from "@/redux/farm/repayments-api";
import { avatarOf } from "@/lib/avatar";
import type { IFarmerGuarantor } from "@/types/farm.types";
import {
  ActiveBadge,
  GrantApprovalBadge,
  formatFarmDate,
} from "./farm-bits";
import { GuarantorDialog } from "./guarantor-dialog";

const LIST = "/admin/farmers";

/** "idType · idNumber"-style pair, or the shared absent placeholder. */
function pairOrAbsent(...parts: (string | null)[]) {
  const joined = parts.filter(Boolean).join(" · ");
  return joined ? joined : <Absent />;
}

export function FarmerDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetFarmerQuery(id);
  const grants = useGetGrantsQuery({ farmerId: id, limit: 50 });
  const repayments = useGetRepaymentsQuery({ farmerId: id, limit: 50 });
  const [setActive] = useSetFarmerActiveMutation();
  const [addDoc, addDocState] = useAddFarmerDocumentMutation();
  const [removeDoc] = useRemoveFarmerDocumentMutation();
  const [removeGuarantor] = useRemoveFarmerGuarantorMutation();
  const [docName, setDocName] = useState("");
  const [guarantorDialog, setGuarantorDialog] = useState<
    IFarmerGuarantor | "new" | null
  >(null);
  const { confirm, confirmationDialog } = useConfirm();

  if (isLoading) return <DetailSkeleton facts={8} table />;
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

  // An agreement document is evidence, so removing one is gated on typing its
  // name - the X sits inches from a download link, and a mis-click used to
  // delete the file outright with nothing asked.
  const onRemoveDocument = async (doc: { id: string; name: string }) => {
    const ok = await confirm({
      title: "Remove this document?",
      description: `"${doc.name}" will no longer be downloadable from this farmer's record. Type the document's name to confirm.`,
      confirmText: "Remove",
      isDestructive: true,
      requireExactMatch: doc.name,
    });
    if (!ok) return;
    await run(
      () => removeDoc({ documentId: doc.id, id: f.id }).unwrap(),
      "Document removed",
    );
  };

  const onRemoveGuarantor = async (g: IFarmerGuarantor) => {
    const ok = await confirm({
      title: "Remove this guarantor?",
      description: `${g.name} will no longer vouch for ${f.name}.`,
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    await run(
      () => removeGuarantor({ guarantorId: g.id, id: f.id }).unwrap(),
      "Guarantor removed",
    );
  };

  // The rail carries the portrait and the three things you can DO. It used to
  // repeat the name under the photo and the phone under that, both of which
  // the page header already says one column to the left - so the reader met
  // the same two facts twice before reaching anything new.
  const aside = (
    <AdminCard className="px-5 py-5">
      <div className="flex flex-col items-center text-center">
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
      </div>
      {/* One button per row at every width. Three buttons wrapping inside a
          340px rail broke into a ragged two-then-one, and each one's label was
          fighting the padding for the room to stay on one line. Full width
          also gives them a single left edge to read down. */}
      <div className="mt-5 flex flex-col gap-2 border-t border-adm-hairline pt-4 [&>*]:w-full">
        <AdminButton className="h-9 px-4" asChild>
          <Link href={`${LIST}/${f.id}/statement`}>Statement</Link>
        </AdminButton>
        <AdminButton variant="outline" className="h-9 px-4" asChild>
          <Link href={`${LIST}/${f.id}/edit`}>Edit</Link>
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
    </AdminCard>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All farmers" className="mb-2" />
      <AdminPageHeader
        title={f.name}
        sub={[f.community, f.phone].filter(Boolean).join(" · ") || undefined}
        actions={<ActiveBadge active={f.isActive} />}
      />

      <DetailShell
        aside={aside}
        main={
          <div className="flex flex-col gap-4">
            {/* Profile */}
            <AdminCard className="px-5 py-4">
              <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Profile
              </div>
              {/* Phone and community are NOT repeated here - the page header
                  carries both, and a fact stated twice on one screen makes the
                  reader check whether they are the same fact. The short,
                  comparable values run first; the two free-text fields take
                  whole rows at the end, where a paragraph cannot strand a
                  one-line value beside it. */}
              <DetailGrid>
                <DetailItem label="Date of birth">
                  {f.dateOfBirth ? formatDateOnly(f.dateOfBirth) : <Absent />}
                </DetailItem>
                <DetailItem label="ID">
                  {pairOrAbsent(f.idType, f.idNumber)}
                </DetailItem>
                <DetailItem label="MoMo number">
                  {f.momoNumber ? <Mono>{f.momoNumber}</Mono> : <Absent />}
                </DetailItem>
                <DetailItem label="Farm size">
                  {f.farmSizeAcres != null ? `${f.farmSizeAcres} acres` : <Absent />}
                </DetailItem>
                <DetailItem label="Farm location">
                  {f.farmLocation ? f.farmLocation : <Absent />}
                </DetailItem>
                <DetailItem label="Next of kin">
                  {pairOrAbsent(f.nextOfKinName, f.nextOfKinPhone)}
                </DetailItem>
                <DetailItem full label="Address">
                  {f.address ? f.address : <Absent />}
                </DetailItem>
                <DetailItem full label="Notes">
                  {f.notes ? f.notes : <span className="text-adm-muted">No notes.</span>}
                </DetailItem>
              </DetailGrid>
            </AdminCard>

            {/* Guarantors */}
            <AdminCard className="overflow-hidden">
              <div className="border-b border-adm-hairline px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                    Guarantors
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuarantorDialog("new")}
                    className="text-[12.5px] whitespace-nowrap text-console hover:underline"
                  >
                    + Add guarantor
                  </button>
                </div>
                <p className="mt-0.5 text-[12px] text-adm-muted">
                  Who vouches for this farmer before grants are released.
                </p>
              </div>
              {f.guarantors.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-adm-muted">No guarantors yet.</p>
              ) : (
                <ul className="divide-y divide-adm-hairline">
                  {f.guarantors.map((g) => (
                    <li key={g.id} className="px-5 py-3 text-[13px]">
                      {/* Stacked below sm. A guarantor's details are free text
                          - name, relationship, address, notes - and sharing a
                          row with two action links squeezed them into a
                          sliver on a phone. The actions drop to their own row
                          instead of competing for the width. */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-adm-ink [overflow-wrap:anywhere]">
                            {g.name}
                          </div>
                          {g.relationship || g.occupation ? (
                            <div className="text-[12px] text-adm-muted [overflow-wrap:anywhere]">
                              {[g.relationship, g.occupation]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          ) : null}
                          {g.phone ? (
                            <Mono className="block text-[12px] text-adm-ink">
                              {g.phone}
                            </Mono>
                          ) : null}
                          {g.address ? (
                            <div className="text-[12px] text-adm-muted [overflow-wrap:anywhere]">
                              {g.address}
                            </div>
                          ) : null}
                          {g.idType || g.idNumber ? (
                            <div className="text-[12px] text-adm-muted [overflow-wrap:anywhere]">
                              {[g.idType, g.idNumber].filter(Boolean).join(" · ")}
                            </div>
                          ) : null}
                          {g.notes ? (
                            <div className="text-[12px] text-adm-muted italic [overflow-wrap:anywhere]">
                              {g.notes}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-none items-center gap-3 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setGuarantorDialog(g)}
                            className="text-[12px] text-console hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void onRemoveGuarantor(g)}
                            className="text-[12px] text-console-red hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            {/* Private documents */}
            <AdminCard className="px-5 py-4">
              <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Agreement documents (private)
              </div>
              <p className="mb-2 text-[12px] text-adm-muted">
                Never shown publicly. Downloads are logged.
              </p>
              {f.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between border-b border-adm-hairline py-2 text-[13px] last:border-b-0"
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
                    <Mono className="text-[12px] text-adm-muted">
                      {formatFarmDate(doc.createdAt)}
                    </Mono>
                    <button
                      type="button"
                      aria-label={`Remove ${doc.name}`}
                      onClick={() => void onRemoveDocument(doc)}
                      className="cursor-pointer text-[12px] text-console-red hover:underline"
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
                  className="h-8 flex-1 rounded border border-adm-line bg-adm-card px-2.5 text-[13px]"
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
                <div className="flex items-center justify-between border-b border-adm-hairline px-5 py-3">
                  <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
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
                  <p className="px-5 py-4 text-[13px] text-adm-muted">No grants yet.</p>
                ) : (
                  <ul className="divide-y divide-adm-hairline">
                    {(grants.data?.data ?? []).map((g) => (
                      <li key={g.id} className="px-5 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-adm-ink">{g.item.name}</span>
                          <Mono className="text-adm-ink">
                            <Money value={g.valueGhs} />
                          </Mono>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[12px] text-adm-muted">
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
                <div className="flex items-center justify-between border-b border-adm-hairline px-5 py-3">
                  <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
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
                  <p className="px-5 py-4 text-[13px] text-adm-muted">No repayments yet.</p>
                ) : (
                  <ul className="divide-y divide-adm-hairline">
                    {(repayments.data?.data ?? []).map((r) => (
                      <li key={r.id} className="px-5 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-adm-ink">
                            {r.commodity.name}
                          </span>
                          <Mono className="text-console">
                            <Money value={r.valueGhs} />
                          </Mono>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[12px] text-adm-muted">
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
        }
      />

      {confirmationDialog}
      {guarantorDialog !== null ? (
        <GuarantorDialog
          farmerId={f.id}
          guarantor={guarantorDialog === "new" ? undefined : guarantorDialog}
          onClose={() => setGuarantorDialog(null)}
        />
      ) : null}
    </div>
  );
}
