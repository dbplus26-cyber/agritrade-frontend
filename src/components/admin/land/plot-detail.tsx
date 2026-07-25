"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailRow,
  Mono,
  ToneBadge,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  plotDocumentUrl,
  useAddPlotDocumentMutation,
  useAddPlotPhotoMutation,
  useGetPlotQuery,
  useRemovePlotDocumentMutation,
  useRemovePlotPhotoMutation,
  useRequestPlotPublishMutation,
  useSetPlotArchivedMutation,
  useUnpublishPlotMutation,
} from "@/redux/land/land-plots-api";
import { Money, formatSaleDate } from "@/components/admin/trading/sale-bits";
import { PlotStatusBadge } from "./land-bits";

const LIST = "/admin/plots";

export function PlotDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetPlotQuery(id);
  const [requestPublish, publishState] = useRequestPlotPublishMutation();
  const [unpublish] = useUnpublishPlotMutation();
  const [setArchived] = useSetPlotArchivedMutation();
  const [addPhoto, addPhotoState] = useAddPlotPhotoMutation();
  const [removePhoto] = useRemovePlotPhotoMutation();
  const [addDoc, addDocState] = useAddPlotDocumentMutation();
  const [removeDoc] = useRemovePlotDocumentMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [docName, setDocName] = useState("");

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const p = data.data.plot;

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

  const onPublish = async () => {
    try {
      await requestPublish(p.id).unwrap();
      notify.success("Publish request sent for owner approval");
    } catch (err) {
      notify.error("Couldn't request publishing", {
        description: extractApiError(err).message,
      });
    }
  };

  const onArchive = async () => {
    const archiving = p.status !== "ARCHIVED";
    const ok = await confirm({
      title: archiving ? "Archive this plot?" : "Restore this plot?",
      description: archiving
        ? "It leaves the register and the website. You can restore it later."
        : "It returns to the register as available.",
      confirmText: archiving ? "Archive" : "Restore",
      isDestructive: archiving,
    });
    if (!ok) return;
    await run(
      () => setArchived({ archived: archiving, id: p.id }).unwrap(),
      archiving ? "Plot archived" : "Plot restored",
    );
  };

  // FilePicker has already downscaled the image and shown it to the user;
  // these run only after they confirmed what they were looking at.
  const onPhotoConfirm = async (file: null | File) => {
    if (!file) return;
    await run(() => addPhoto({ file, id: p.id }).unwrap(), "Photo added");
  };

  const onDocConfirm = async (file: null | File) => {
    if (!file) return;
    if (!docName.trim()) {
      notify.error("Name the document first");
      throw new Error("Document name required");
    }
    await run(
      () => addDoc({ file, id: p.id, name: docName.trim() }).unwrap(),
      "Document added",
    );
    setDocName("");
  };

  const canPublish =
    !p.publishToWebsite && (p.status === "AVAILABLE" || p.status === "RESERVED");

  return (
    <div className="max-w-[760px]">
      <BackButton href={LIST} label="All plots" className="mb-2" />
      <AdminPageHeader
        title={p.locationText}
        sub={`Plot ${p.reference} · ${p.sizeText}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            {p.publishToWebsite ? <ToneBadge tone="sky">Live</ToneBadge> : null}
            <PlotStatusBadge status={p.status} />
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <AdminButton variant="outline" className="h-9 px-4" asChild>
          <Link href={`${LIST}/${p.id}/edit`}>Edit</Link>
        </AdminButton>
        {canPublish ? (
          <AdminButton
            className="h-9 px-4"
            disabled={publishState.isLoading}
            onClick={() => void onPublish()}
          >
            {publishState.isLoading ? "Requesting…" : "Publish to website"}
          </AdminButton>
        ) : null}
        {p.publishToWebsite ? (
          <AdminButton
            variant="outline"
            className="h-9 px-4"
            onClick={() =>
              void run(() => unpublish(p.id).unwrap(), "Removed from website")
            }
          >
            Unpublish
          </AdminButton>
        ) : null}
        {p.status === "AVAILABLE" || p.status === "ARCHIVED" ? (
          <AdminButton
            variant="outline"
            className="h-9 px-4"
            onClick={() => void onArchive()}
          >
            {p.status === "ARCHIVED" ? "Restore" : "Archive"}
          </AdminButton>
        ) : null}
        {p.status === "AVAILABLE" ? (
          <AdminButton className="h-9 px-4" asChild>
            <Link href={`/admin/land-sales/new?plotId=${p.id}`}>Sell plot</Link>
          </AdminButton>
        ) : null}
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <AdminCard className="px-5 py-3">
          <DetailRow label="Asking price">
            <Money value={p.askingPriceGhs} />
          </DetailRow>
          <div className="border-t border-soil/12">
            <DetailRow label="Purchase cost">
              <Money value={p.purchaseCostGhs} />
            </DetailRow>
          </div>
          <div className="border-t border-soil/12">
            <DetailRow label="Margin">
              <Money value={p.marginGhs} />
            </DetailRow>
          </div>
          {p.use ? (
            <div className="border-t border-soil/12">
              <DetailRow label="Use">{p.use}</DetailRow>
            </div>
          ) : null}
          <div className="border-t border-soil/12">
            <DetailRow label="Price on site">
              {p.showPriceOnWebsite ? "Shown" : "Hidden"}
            </DetailRow>
          </div>
        </AdminCard>

        {p.description ? (
          <AdminCard className="px-5 py-3 text-[13.5px] text-ink">
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Description
            </div>
            {p.description}
          </AdminCard>
        ) : null}
      </div>

      {/* Photos */}
      <AdminCard className="mb-4 px-5 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Photos (public)
          </span>
          <FilePicker
            accept="image/*"
            busy={addPhotoState.isLoading}
            confirmLabel="Add photo"
            hint="Shown on the public listing"
            onConfirm={onPhotoConfirm}
            triggerLabel="+ Add photo"
          />
        </div>
        {p.photos.length === 0 ? (
          <p className="text-[13px] text-soil">No photos yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {p.photos.map((ph) => (
              <div key={ph.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary */}
                <img
                  src={ph.url}
                  alt={ph.alt ?? ""}
                  className="h-24 w-full rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      () => removePhoto({ id: p.id, photoId: ph.id }).unwrap(),
                      "Photo removed",
                    )
                  }
                  className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-[11px] text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      {/* Private documents */}
      <AdminCard className="px-5 py-4">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Ownership documents (private)
        </div>
        <p className="mb-2 text-[12px] text-soil">
          Never shown on the website. Downloads are logged.
        </p>
        {p.documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between border-b border-soil/10 py-2 text-[13px] last:border-b-0"
          >
            <a
              href={plotDocumentUrl(p.id, doc.id)}
              target="_blank"
              rel="noreferrer"
              className="text-console hover:underline"
            >
              {doc.name}
            </a>
            <div className="flex items-center gap-3">
              <Mono className="text-[12px] text-soil">
                {formatSaleDate(doc.createdAt)}
              </Mono>
              <button
                type="button"
                onClick={() =>
                  void run(
                    () => removeDoc({ documentId: doc.id, id: p.id }).unwrap(),
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
            placeholder="Document name (e.g. Indenture)"
            className={cn(
              "h-8 flex-1 rounded border border-soil/25 bg-paper px-2.5 text-[13px]",
            )}
          />
          <FilePicker
            accept="image/*,application/pdf,.doc,.docx"
            busy={addDocState.isLoading}
            confirmLabel="Upload"
            hint="PDF, Word or a photo of the document"
            onConfirm={onDocConfirm}
            optimize={false}
            triggerLabel="Choose document"
          />
        </div>
      </AdminCard>

      {confirmationDialog}
    </div>
  );
}
