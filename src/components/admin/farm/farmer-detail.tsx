"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  DetailGrid,
  DetailHeader,
  DetailItem,
  DetailShell,
  Mono,
  SectionHeading,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { cn } from "@/lib/utils";
import {
  AttachmentEmpty,
  AttachmentList,
  AttachmentTile,
} from "@/components/admin/attachments";
import { Absent } from "@/components/admin/registry/registry-bits";
import { ViewablePhoto } from "@/components/admin/photo-view";
import { Money } from "@/components/admin/trading/sale-bits";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { ListPagination } from "@/components/ui/ListPagination";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
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
import type { IFarmerGuarantor } from "@/types/farm.types";
import {
  ActiveBadge,
  GrantApprovalBadge,
  formatFarmDate,
} from "./farm-bits";
import { GuarantorDialog } from "./guarantor-dialog";

const LIST = "/admin/farmers";

/** Rows per page in the grants and repayments rails. */
const RAIL_PAGE_SIZE = 8;

/** "idType · idNumber"-style pair, or the shared absent placeholder. */
function pairOrAbsent(...parts: (string | null)[]) {
  const joined = parts.filter(Boolean).join(" · ");
  return joined ? joined : <Absent />;
}

/** One labelled fact inside a guarantor's row: micro-cap label over a plain
 * value, the same grammar DetailItem uses, one size down for a nested list. */
function GuarantorFact({
  children,
  full = false,
  label,
}: {
  children: React.ReactNode;
  /** Prose (address, notes) takes the whole row of the fact grid. */
  full?: boolean;
  label: string;
}) {
  return (
    <div className={cn("min-w-0", full && "col-span-full")}>
      <dt className="text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 text-[13px] text-adm-ink [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

/**
 * The foot of a rail card whose list is a page of a larger set.
 *
 * A farmer accrues grants and repayments for as long as they farm, so these
 * cards can never render "all of them" - they hold one small page and this
 * says how big the whole set is. Without the count a capped list looks like
 * a complete one, which is the quiet way a detail page starts lying as the
 * data grows.
 */
function RailPager({
  noun,
  onPageChange,
  page,
  pageSize,
  total,
}: {
  /** Plural noun for the count line ("grants"). */
  noun: string;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <div className="border-t border-adm-hairline px-5 py-2.5">
      <p className="text-center text-[11.5px] text-adm-faint">
        {first}-{last} of {total} {noun}
      </p>
      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="mt-1"
      />
    </div>
  );
}

export function FarmerDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetFarmerQuery(id);
  // Both rails page against the server. They were capped at 50 and rendered
  // whole, which silently became "the last 50" the moment a farmer passed
  // that - and nothing on screen said so.
  const [grantPage, setGrantPage] = useState(1);
  const [repaymentPage, setRepaymentPage] = useState(1);
  const grants = useGetGrantsQuery({
    farmerId: id,
    limit: RAIL_PAGE_SIZE,
    page: grantPage,
  });
  const repayments = useGetRepaymentsQuery({
    farmerId: id,
    limit: RAIL_PAGE_SIZE,
    page: repaymentPage,
  });
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
        <ViewablePhoto name={f.name} size={96} src={f.photoUrl} />
      </div>
      {/* One button per row at every width. Three buttons wrapping inside a
          340px rail broke into a ragged two-then-one, and each one's label was
          fighting the padding for the room to stay on one line. Full width
          also gives them a single left edge to read down. */}
      <div className="mt-5 flex flex-col gap-2 border-t border-adm-hairline pt-4 [&>*]:w-full">
        <AdminButton asChild>
          <Link href={`${LIST}/${f.id}/statement`}>Statement</Link>
        </AdminButton>
        <AdminButton variant="outline" asChild>
          <Link href={`${LIST}/${f.id}/edit`}>Edit</Link>
        </AdminButton>
        <AdminButton
          variant="outline"
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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Farmers", href: LIST }]}
        current="Farmer details"
      />
      <DetailHeader
        title="Farmer details"
        hint="One outgrower: what they were advanced and what they have brought back."
        badges={<ActiveBadge active={f.isActive} />}
      />

      <DetailShell
        aside={aside}
        main={
          <div className="flex flex-col gap-4">
            {/* Profile */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">Profile</SectionHeading>
              {/* The identifying facts lead, because the page heading no
                  longer carries them: it says WHICH KIND of record this is,
                  and the record itself says which one. The short, comparable
                  values follow; the two free-text fields take whole rows at
                  the end, where a paragraph cannot strand a one-line value
                  beside it. */}
              <DetailGrid>
                <DetailItem label="Name" strong>
                  {f.name}
                </DetailItem>
                <DetailItem label="Phone">
                  {f.phone ? <Mono>{f.phone}</Mono> : <Absent />}
                </DetailItem>
                <DetailItem label="Community">
                  {f.community ? f.community : <Absent />}
                </DetailItem>
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
                {/* mb-0: the header band's own py-3 is the gap under the
                    title, so the heading must not add a second one. */}
                <SectionHeading
                  className="mb-0"
                  actions={
                    <button
                      type="button"
                      onClick={() => setGuarantorDialog("new")}
                      className={cn(
                        adminLinkClass,
                        "cursor-pointer text-[12.5px] font-semibold whitespace-nowrap",
                      )}
                    >
                      + Add guarantor
                    </button>
                  }
                >
                  Guarantors
                </SectionHeading>
                <p className="mt-0.5 text-[12px] text-adm-muted">
                  Who vouches for this farmer before grants are released.
                </p>
              </div>
              {f.guarantors.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-adm-muted">No guarantors yet.</p>
              ) : (
                <ul className="divide-y divide-adm-hairline">
                  {f.guarantors.map((g) => (
                    <li key={g.id} className="px-5 py-4">
                      {/* Name row first, actions on the same line only from sm
                          - free text and controls never compete for width on a
                          phone. The details go into a LABELLED grid rather
                          than a stack of look-alike grey lines: five kinds of
                          fact (phone, ID, address, occupation, notes) used to
                          render in the same 12px muted grey, so nothing said
                          which line was which. */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
                            {g.name}
                          </p>
                          {g.relationship || g.occupation ? (
                            <p className="mt-0.5 text-[12.5px] text-adm-muted [overflow-wrap:anywhere]">
                              {[g.relationship, g.occupation]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-none items-center gap-3 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setGuarantorDialog(g)}
                            className={cn(adminLinkClass, "cursor-pointer text-[12.5px] font-semibold")}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void onRemoveGuarantor(g)}
                            className="cursor-pointer rounded-[2px] text-[12.5px] font-semibold text-console-red underline-offset-2 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {g.phone || g.idType || g.idNumber || g.address || g.notes ? (
                        <dl className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,170px),1fr))] gap-x-6 gap-y-2">
                          {g.phone ? (
                            <GuarantorFact label="Phone">
                              <Mono>{g.phone}</Mono>
                            </GuarantorFact>
                          ) : null}
                          {g.idType || g.idNumber ? (
                            <GuarantorFact label="ID">
                              {[g.idType, g.idNumber].filter(Boolean).join(" · ")}
                            </GuarantorFact>
                          ) : null}
                          {g.address ? (
                            <GuarantorFact full label="Address">
                              {g.address}
                            </GuarantorFact>
                          ) : null}
                          {g.notes ? (
                            <GuarantorFact full label="Notes">
                              {g.notes}
                            </GuarantorFact>
                          ) : null}
                        </dl>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            {/* Private documents */}
            <AdminCard className="px-5 py-4">
              <SectionHeading className="mb-1">
                Agreement documents (private)
              </SectionHeading>
              <p className="mb-2 text-[12px] text-adm-muted">
                Never shown publicly. Downloads are logged.
              </p>
              {f.documents.length === 0 ? (
                <AttachmentEmpty text="No documents filed yet." />
              ) : (
                <AttachmentList>
                  {f.documents.map((doc) => (
                    <AttachmentTile
                      key={doc.id}
                      createdAt={doc.createdAt}
                      href={farmerDocumentUrl(f.id, doc.id)}
                      name={doc.name}
                      onRemove={() => void onRemoveDocument(doc)}
                    />
                  ))}
                </AttachmentList>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Document name (e.g. Grant agreement)"
                  className="h-8 min-w-0 flex-1 rounded-none border border-adm-line bg-adm-card px-2.5 text-[13px] outline-none transition-colors placeholder:text-adm-faint focus:border-console"
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
                <div className="border-b border-adm-hairline px-5 py-3">
                  <SectionHeading
                    className="mb-0"
                    actions={
                      <Link
                        href={`/admin/grants/new?farmerId=${f.id}`}
                        className={cn(adminLinkClass, "text-[12.5px]")}
                      >
                        + New
                      </Link>
                    }
                  >
                    Grants
                  </SectionHeading>
                </div>
                {(grants.data?.data ?? []).length === 0 ? (
                  <p className="px-5 py-4 text-[13px] text-adm-muted">No grants yet.</p>
                ) : (
                  <ul className="divide-y divide-adm-hairline">
                    {(grants.data?.data ?? []).map((g) => (
                      <li key={g.id} className="px-5 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          {/* The input item stays plain: the register has no
                              read page, only an edit form, and a fact on a
                              farmer's card should not open something you can
                              type into. */}
                          <span className="font-semibold text-adm-ink">{g.item.name}</span>
                          <Mono className="text-adm-ink">
                            <Money value={g.valueGhs} />
                          </Mono>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between text-[12px] text-adm-muted">
                          <span>
                            <Link
                              className={adminLinkClass}
                              href={`/admin/seasons/${g.season.id}`}
                            >
                              {g.season.name}
                            </Link>{" "}
                            · {formatFarmDate(g.grantedAt)}
                          </span>
                          <GrantApprovalBadge status={g.approval?.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <RailPager
                  noun="grants"
                  page={grantPage}
                  pageSize={RAIL_PAGE_SIZE}
                  total={grants.data?.meta.total ?? 0}
                  onPageChange={setGrantPage}
                />
              </AdminCard>

              <AdminCard className="overflow-hidden">
                <div className="border-b border-adm-hairline px-5 py-3">
                  <SectionHeading
                    className="mb-0"
                    actions={
                      <Link
                        href={`/admin/repayments/new?farmerId=${f.id}`}
                        className={cn(adminLinkClass, "text-[12.5px]")}
                      >
                        + New
                      </Link>
                    }
                  >
                    Repayments
                  </SectionHeading>
                </div>
                {(repayments.data?.data ?? []).length === 0 ? (
                  <p className="px-5 py-4 text-[13px] text-adm-muted">No repayments yet.</p>
                ) : (
                  <ul className="divide-y divide-adm-hairline">
                    {(repayments.data?.data ?? []).map((r) => (
                      <li key={r.id} className="px-5 py-2.5 text-[13px]">
                        <div className="flex items-center justify-between gap-2">
                          {/* A cash repayment names no crop and carries no
                              weight. Printing them anyway would put "0 kg" on
                              a farmer who paid in full, and link a commodity
                              that was never involved. */}
                          {r.commodity ? (
                            <Link
                              className={cn(
                                adminLinkClass,
                                "min-w-0 truncate font-semibold",
                              )}
                              href={`/admin/commodities/${r.commodity.id}`}
                            >
                              {r.commodity.name}
                            </Link>
                          ) : (
                            <span className="min-w-0 truncate font-semibold text-adm-ink">
                              Cash
                            </span>
                          )}
                          <Mono className="flex-none text-console">
                            <Money value={r.valueGhs} />
                          </Mono>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-adm-muted">
                          <span className="min-w-0 truncate">
                            {r.kind === "CASH"
                              ? (r.paymentAccount?.label ?? "Paid in cash")
                              : r.weightKg === null
                                ? "Produce"
                                : formatKg(r.weightKg)}{" "}
                            · {formatFarmDate(r.receivedAt)}
                          </span>
                          {r.intoStock ? (
                            <span className="flex-none text-console">
                              Into stock
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <RailPager
                  noun="repayments"
                  page={repaymentPage}
                  pageSize={RAIL_PAGE_SIZE}
                  total={repayments.data?.meta.total ?? 0}
                  onPageChange={setRepaymentPage}
                />
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
