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
  ToneBadge,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
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
import { Money } from "@/components/admin/trading/sale-bits";
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

  if (isLoading) return <DetailSkeleton main="media" cards={2} />;
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

  // An ownership document is the paper behind the plot, so removing one is
  // gated on typing its name. The X sits beside a download link and used to
  // delete the file on a single click with nothing asked.
  const onRemoveDocument = async (doc: { id: string; name: string }) => {
    const ok = await confirm({
      title: "Remove this document?",
      description: `"${doc.name}" will no longer be downloadable from this plot's file. Type the document's name to confirm.`,
      confirmText: "Remove",
      isDestructive: true,
      requireExactMatch: doc.name,
    });
    if (!ok) return;
    await run(
      () => removeDoc({ documentId: doc.id, id: p.id }).unwrap(),
      "Document removed",
    );
  };

  // A photo is replaceable and has no name to type, so it asks rather than
  // demands - but it still asks.
  const onRemovePhoto = async (photoId: string) => {
    const ok = await confirm({
      title: "Remove this photograph?",
      description: "It comes off the plot's page on the public site as well.",
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    await run(
      () => removePhoto({ id: p.id, photoId }).unwrap(),
      "Photo removed",
    );
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

  // Cover-or-thumb photo tile. No lightbox exists in the console, so each
  // photo is a plain anchor to the full-size Cloudinary image.
  const photoTile = (
    ph: (typeof p.photos)[number],
    hero: boolean,
  ) => (
    <div key={ph.id} className={cn("group relative", !hero && "h-20 w-28")}>
      <a href={ph.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary */}
        <img
          src={ph.url}
          alt={ph.alt ?? ""}
          className={cn(
            "w-full rounded object-cover",
            hero ? "aspect-video" : "h-20",
          )}
        />
        {hero ? (
          <span
            aria-hidden="true"
            className="photo-treatment pointer-events-none absolute inset-0 rounded"
          />
        ) : null}
      </a>
      <button
        type="button"
        aria-label="Remove photo"
        onClick={() => void onRemovePhoto(ph.id)}
        className="absolute right-1 top-1 cursor-pointer rounded bg-black/60 px-1.5 text-[11px] text-white hover:bg-black/80"
      >
        ✕
      </button>
    </div>
  );

  const aside = (
    <AdminCard className="px-5 py-3">
      <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        Pricing & status
      </p>
      <DetailGrid columns={2}>
        <DetailItem label="Asking price" mono strong>
          <Money value={p.askingPriceGhs} />
        </DetailItem>
        <DetailItem label="Purchase cost" mono>
          <Money value={p.purchaseCostGhs} />
        </DetailItem>
        <DetailItem label="Margin" mono>
          <Money value={p.marginGhs} />
        </DetailItem>
        {p.use ? <DetailItem label="Use">{p.use}</DetailItem> : null}
        <DetailItem label="Price on site">
          {p.showPriceOnWebsite ? "Shown" : "Hidden"}
        </DetailItem>
      </DetailGrid>
      <div className="mt-3 border-t border-adm-hairline pt-3.5">
        <div className="flex flex-wrap gap-2 xl:flex-col">
          {p.status === "AVAILABLE" ? (
            <AdminButton className="h-9 px-4" asChild>
              <Link href={`/admin/land-sales/new?plotId=${p.id}`}>
                Sell plot
              </Link>
            </AdminButton>
          ) : null}
          {canPublish ? (
            <AdminButton
              className="h-9 px-4"
              disabled={publishState.isLoading}
              onClick={() => void onPublish()}
            >
              {publishState.isLoading ? "Requesting…" : "Publish to website"}
            </AdminButton>
          ) : null}
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <Link href={`${LIST}/${p.id}/edit`}>Edit</Link>
          </AdminButton>
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
        </div>
      </div>
    </AdminCard>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All plots" className="mb-2" />
      <AdminPageHeader
        title="Plot details"
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            {p.publishToWebsite ? <ToneBadge tone="sky">Live</ToneBadge> : null}
            <PlotStatusBadge status={p.status} />
          </span>
        }
      />

      <DetailShell
        aside={aside}
        main={
          <div className="flex flex-col gap-4">
            {p.description ? (
              <AdminCard className="px-5 py-3 text-[13.5px] text-adm-ink [overflow-wrap:anywhere]">
                <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                  Description
                </div>
                {p.description}
              </AdminCard>
            ) : null}

            {/* Photos: first photo as the cover, the rest as thumbs. The
                backend caps a plot at 3 photos (PHOTO_LIMIT), so the picker
                hides at the cap; `run` surfaces the API message if a 4th
                slips through anyway. */}
            <AdminCard className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                  Photos (public)
                </span>
                {p.photos.length >= 3 ? (
                  <span className="text-[11.5px] text-adm-faint">
                    3 of 3 photos
                  </span>
                ) : (
                  <FilePicker
                    accept="image/*"
                    busy={addPhotoState.isLoading}
                    confirmLabel="Add photo"
                    hint="Shown on the public listing (up to 3)"
                    onConfirm={onPhotoConfirm}
                    triggerLabel="+ Add photo"
                  />
                )}
              </div>
              {p.photos.length === 0 ? (
                <p className="text-[13px] text-adm-muted">No photos yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {photoTile(p.photos[0], true)}
                  {p.photos.length > 1 ? (
                    <div className="flex flex-wrap gap-2">
                      {p.photos.slice(1).map((ph) => photoTile(ph, false))}
                    </div>
                  ) : null}
                </div>
              )}
            </AdminCard>

            {/* Private documents */}
            <AdminCard className="px-5 py-4">
              <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Ownership documents (private)
              </div>
              <p className="mb-2 text-[12px] text-adm-muted">
                Never shown on the website. Downloads are logged.
              </p>
              {p.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between border-b border-adm-hairline py-2 text-[13px] last:border-b-0"
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
                    {/* An upload stamp: when the title document reached the
                        office is the fact being recorded, hour included. */}
                    <Mono className="text-right text-[12px] text-adm-muted">
                      <DateTimeCell value={doc.createdAt} muted />
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
                  placeholder="Document name (e.g. Indenture)"
                  className={cn(
                    "h-8 flex-1 rounded border border-adm-line bg-adm-card px-2.5 text-[13px]",
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
          </div>
        }
      />

      {confirmationDialog}
    </div>
  );
}
