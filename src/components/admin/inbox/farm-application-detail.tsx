"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailGrid,
  DetailHeader,
  DetailItem,
  DetailShell,
  Mono,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { SimpleSelect } from "@/components/ui/simple-select";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Absent } from "@/components/admin/registry/registry-bits";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useConvertFarmApplicationMutation,
  useDeleteFarmApplicationMutation,
  useGetFarmApplicationQuery,
  useUpdateFarmApplicationMutation,
} from "@/redux/farm-applications/farm-applications-api";
import {
  FARM_APPLICATION_STATUSES,
  type FarmApplicationStatus,
  type IAdminFarmApplication,
} from "@/types/inbox.types";
import {
  FARM_APPLICATION_STATUS_META,
  FarmApplicationStatusBadge,
} from "./inbox-bits";

const LIST = "/admin/farm-applications";

/** A grouped facts card: section title over a DetailGrid. */
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="px-5 py-4">
      <SectionHeading className="mb-1.5">{title}</SectionHeading>
      {/* auto-fit with a real floor, not a fixed 3 columns. A rigid
          three-column grid gave every field the same narrow slot, so a long
          free-text answer - previous experience, items needed - became a
          400px-tall ribbon of text with two empty columns sitting beside it.
          Short facts now share a row; prose takes the whole width. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-x-8">
        {children}
      </div>
    </AdminCard>
  );
}

const orAbsent = (value: null | string) =>
  value ? value : <Absent />;

function FarmApplicationDetailBody({
  application,
}: {
  application: IAdminFarmApplication;
}) {
  const router = useRouter();
  const { confirm, confirmationDialog } = useConfirm();
  const [updateApplication, { isLoading: saving }] =
    useUpdateFarmApplicationMutation();
  const [convertApplication, { isLoading: converting }] =
    useConvertFarmApplicationMutation();
  const [deleteApplication, { isLoading: deleting }] =
    useDeleteFarmApplicationMutation();

  const [status, setStatus] = useState<FarmApplicationStatus>(
    application.status,
  );
  const [notes, setNotes] = useState(application.adminNotes ?? "");
  const statusDirty = status !== application.status;
  const notesDirty = notes.trim() !== (application.adminNotes ?? "");
  const dirty = statusDirty || notesDirty;

  const isConverted = application.status === "CONVERTED";

  const onSave = async () => {
    try {
      await updateApplication({
        id: application.id,
        body: {
          ...(statusDirty ? { status } : {}),
          ...(notesDirty ? { adminNotes: notes.trim() || null } : {}),
        },
      }).unwrap();
      notify.success("Application updated");
    } catch (err) {
      notify.error("Couldn't update the application", {
        description: extractApiError(err).message,
      });
    }
  };

  const onConvert = async () => {
    const confirmed = await confirm({
      title: `Convert ${application.name} to a farmer?`,
      description:
        "This creates a farmer record on the register from the application details and marks the application converted.",
      confirmText: "Convert to farmer",
    });
    if (!confirmed) return;
    try {
      const res = await convertApplication(application.id).unwrap();
      notify.success("Application converted", {
        description: `${res.data.farmer.name} is now on the farmer register.`,
      });
    } catch (err) {
      notify.error("Couldn't convert the application", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    const confirmed = await confirm({
      title: "Delete this application?",
      description: `${application.reference} from ${application.name} will be removed permanently. This cannot be undone.`,
      confirmText: "Delete application",
      isDestructive: true,
    });
    if (!confirmed) return;
    try {
      await deleteApplication(application.id).unwrap();
      notify.success("Application deleted");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't delete the application", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div>
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Applications", href: LIST }]}
        current="Application details"
      />
      <DetailHeader
        title="Application details"
        hint="One farmer applying to join the outgrower scheme."
        sub={
          <>
            <span>Application {application.reference}</span>
            <span>Received {formatDateTime(application.createdAt)}</span>
          </>
        }
        badges={<FarmApplicationStatusBadge status={application.status} />}
      />

      <DetailShell
        main={
          <div className="flex flex-col gap-5">
            <SectionCard title="Identity & contact">
              <DetailItem label="Name" strong>
                {application.name}
              </DetailItem>
              <DetailItem label="Phone" mono>
                <a
                  href={`tel:${application.phone}`}
                  className={adminLinkClass}
                >
                  {application.phone}
                </a>
              </DetailItem>
              <DetailItem full label="Email">
                {application.email ? (
                  <a
                    href={`mailto:${application.email}`}
                    className={adminLinkClass}
                  >
                    {application.email}
                  </a>
                ) : (
                  <Absent />
                )}
              </DetailItem>
              <DetailItem label="Community">
                {orAbsent(application.community)}
              </DetailItem>
              <DetailItem full label="Address">
                {orAbsent(application.address)}
              </DetailItem>
            </SectionCard>

            <SectionCard title="Farm">
              <DetailItem label="Location">
                {orAbsent(application.farmLocation)}
              </DetailItem>
              <DetailItem label="Size" mono>
                {application.farmSizeAcres !== null ? (
                  `${application.farmSizeAcres} acres`
                ) : (
                  <Absent />
                )}
              </DetailItem>
              <DetailItem full label="Crops">
                {orAbsent(application.crops)}
              </DetailItem>
              <DetailItem full label="Previous experience">
                {orAbsent(application.previousExperience)}
              </DetailItem>
            </SectionCard>

            <SectionCard title="Request">
              <DetailItem full label="Items needed">
                {orAbsent(application.itemsNeeded)}
              </DetailItem>
              <DetailItem label="Expected yield" mono>
                {application.expectedYieldKg !== null ? (
                  `${application.expectedYieldKg.toLocaleString()} kg`
                ) : (
                  <Absent />
                )}
              </DetailItem>
            </SectionCard>

            <SectionCard title="Guarantor">
              <DetailItem label="Name">
                {orAbsent(application.guarantorName)}
              </DetailItem>
              <DetailItem label="Phone" mono>
                {application.guarantorPhone ? (
                  <a
                    href={`tel:${application.guarantorPhone}`}
                    className={adminLinkClass}
                  >
                    {application.guarantorPhone}
                  </a>
                ) : (
                  <Absent />
                )}
              </DetailItem>
            </SectionCard>

            <AdminCard className="px-5 py-4">
              <SectionHeading>Message</SectionHeading>
              {application.message ? (
                <p className="text-[13.5px] leading-[1.75] whitespace-pre-wrap text-adm-ink [overflow-wrap:anywhere]">
                  {application.message}
                </p>
              ) : (
                <p className="text-[13px] text-adm-faint">
                  No message included with the application.
                </p>
              )}
            </AdminCard>
          </div>
        }
        aside={
          <div className="flex flex-col gap-5">
            <AdminCard className="px-5 py-[18px]">
              <div className="flex flex-col gap-[13px]">
                <AdminField
                  label="Status"
                  hint={
                    isConverted
                      ? "Converted applications keep their status."
                      : undefined
                  }
                >
                  <SimpleSelect
                    value={status}
                    disabled={isConverted}
                    onChange={(v) => {
                      setStatus(v as FarmApplicationStatus);
                    }}
                    className={cn(
                      adminSelectClass,
                      "w-full",
                      isConverted &&
                        "disabled:cursor-default disabled:opacity-100",
                    )}
                    placeholder="Choose a status"
                    options={FARM_APPLICATION_STATUSES.map((s) => ({
                      value: s,
                      label: FARM_APPLICATION_STATUS_META[s].label,
                    }))}
                  />
                </AdminField>
                <AdminField
                  label="Internal notes"
                  optional
                  hint="For the office only - the applicant never sees these."
                >
                  <textarea
                    rows={4}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                    }}
                    placeholder="Site visit findings, guarantor checks…"
                    className={cn(
                      adminInputClass,
                      "h-auto min-h-[112px] w-full resize-y py-2",
                    )}
                  />
                </AdminField>
                <AdminButton
                  type="button"
                  disabled={!dirty || saving}
                  loading={saving}
                  onClick={() => void onSave()}
                  size="lg"
                >
                  {saving ? "Saving…" : "Save changes"}
                </AdminButton>
              </div>
            </AdminCard>

            <AdminCard className="px-5 py-4">
              {isConverted && application.convertedFarmerId ? (
                <>
                  <p className="text-[12.5px] text-adm-muted">
                    This application became a farmer record.
                  </p>
                  <AdminButton
                    asChild
                    variant="gold"
                    className="mt-2.5"
                  >
                    <Link
                      href={`/admin/farmers/${application.convertedFarmerId}`}
                    >
                      View farmer record
                    </Link>
                  </AdminButton>
                </>
              ) : (
                <>
                  <p className="text-[12.5px] text-adm-muted">
                    Converting creates a farmer record on the register from
                    these details.
                  </p>
                  <AdminButton
                    type="button"
                    disabled={converting}
                    onClick={() => void onConvert()}
                    className="mt-2.5"
                  >
                    {converting ? "Converting…" : "Convert to farmer"}
                  </AdminButton>
                </>
              )}
            </AdminCard>

            <AdminCard className="px-5 py-3">
              <DetailGrid columns={2}>
                <DetailItem label="Reference" mono>
                  {application.reference}
                </DetailItem>
                <DetailItem label="Received">
                  {formatDateTime(application.createdAt)}
                </DetailItem>
                <DetailItem label="Last reviewed">
                  {application.reviewedAt ? (
                    formatDateTime(application.reviewedAt)
                  ) : (
                    <Absent />
                  )}
                </DetailItem>
                <DetailItem label="Submitted from">
                  {application.ip ? <Mono>{application.ip}</Mono> : <Absent />}
                </DetailItem>
              </DetailGrid>
            </AdminCard>

            <AdminCard className="px-5 py-4">
              <p className="text-[12.5px] text-adm-muted">
                Deleting removes the application permanently.
              </p>
              <AdminButton
                type="button"
                variant="danger"
                disabled={deleting}
                loading={deleting}
                onClick={() => void onDelete()}
                className="mt-2.5"
              >
                {deleting ? "Deleting…" : "Delete application"}
              </AdminButton>
            </AdminCard>
          </div>
        }
      />
      {confirmationDialog}
    </div>
  );
}

/** /admin/farm-applications/[id] - one application under review. */
export function FarmApplicationDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetFarmApplicationQuery(id);

  if (isLoading) return <DetailSkeleton facts={8} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const application = data.data.application;
  // Keyed on updatedAt so a successful PATCH/convert reseeds the working copy.
  return (
    <FarmApplicationDetailBody
      key={application.updatedAt}
      application={application}
    />
  );
}
