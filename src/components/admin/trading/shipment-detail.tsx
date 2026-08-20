"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailRow,
  DetailShell,
  Mono,
  SectionHeading,
  adminLinkClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import {
  AttachmentEmpty,
  AttachmentList,
  AttachmentTile,
} from "@/components/admin/attachments";
import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { DriverSettlementCard } from "@/components/admin/drivers/driver-settlement-card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { FilePicker } from "@/components/ui/FilePicker";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { Input } from "@/components/ui/input";
import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  shipmentDocumentUrl,
  shipmentWaybillPdfUrl,
  useAddShipmentDocumentMutation,
  useCloseShipmentMutation,
  useDispatchShipmentMutation,
  useGetShipmentQuery,
  useRemoveShipmentDocumentMutation,
  useRemoveShipmentSaleMutation,
} from "@/redux/shipments/shipments-api";
import type {
  IShipmentExpense,
  IShipmentSale,
} from "@/types/admin-shipment.types";
import { LoadMeter } from "./load-meter";
import { Money, SaleStatusBadge } from "./sale-bits";
import { hasSettledTotal, saleSettlementDeltaGhs } from "./sale-payable";
import { ArrivalDialog } from "./shipment-arrival-dialog";
import { CostBasisBadge, ShipmentStatusBadge } from "./shipment-bits";
import { ShipmentSignatures } from "./shipment-signatures";
import {
  AddSalesDialog,
  CancelDialog,
  ExpenseDialog,
  SalesUnpaidDialog,
  VoidExpenseDialog,
  plannedWeightOf,
} from "./shipment-detail-dialogs";

const LIST = "/admin/shipments";

/** Spare room below this share of capacity is a rounding gap, not a half-empty
 * truck worth nagging about. */
const UNDER_FILL_SHARE = 0.05;

const Absent = () => <span className="text-adm-faint">Not provided</span>;

/**
 * What this sale was agreed at, what it settled at when the load was weighed
 * in, and the gap. Renders nothing until there is a settled figure: the agreed
 * price on its own is not a comparison, and an empty "settled" cell would read
 * as a load that arrived weighing nothing.
 *
 * The agreed figure is never replaced. The owner has to be able to see the
 * original handshake beside what was finally collected - that is the whole
 * argument for keeping two columns.
 */
function SaleSettlement({ sale }: { sale: IShipmentSale }) {
  if (!hasSettledTotal(sale)) return null;
  const delta = saleSettlementDeltaGhs(sale);
  return (
    <div className="mt-2 border-t border-dotted border-adm-line pt-2">
      <div className="text-[10px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        <HelpWrap text="What was agreed when the sale was struck, and what the buyer will pay now the load has been weighed in.">
          Weighed in
        </HelpWrap>
      </div>
      <dl className="mt-1 flex flex-col gap-0.5 text-[12px]">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-adm-muted">Agreed</dt>
          <dd className="flex-none">
            <Mono className="text-adm-ink">
              <Money value={sale.agreedTotalGhs} />
            </Mono>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-adm-muted">Settled</dt>
          <dd className="flex-none">
            <Mono className="font-semibold text-adm-ink">
              <Money value={sale.settledTotalGhs} />
            </Mono>
          </dd>
        </div>
        {delta !== null && delta !== 0 ? (
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-adm-muted">
              {delta < 0 ? "Short by" : "Over by"}
            </dt>
            <dd className="flex-none">
              <Mono
                className={cn(
                  "font-semibold",
                  delta < 0 ? "text-console-red" : "text-console",
                )}
              >
                <Money value={Math.abs(delta)} />
              </Mono>
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function ShipmentDetail({ id }: { id: string }) {
  const { has } = usePermissions();
  const { data, isLoading, isError, error, refetch } = useGetShipmentQuery(id);
  const [dispatchShipment, dispatchState] = useDispatchShipmentMutation();
  const [close, closeState] = useCloseShipmentMutation();
  const [addDocument, addDocState] = useAddShipmentDocumentMutation();
  const [removeDocument] = useRemoveShipmentDocumentMutation();
  const [removeSale] = useRemoveShipmentSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { isSuperAdmin } = useAuthRole();
  const [addSalesOpen, setAddSalesOpen] = useState(false);
  const [arriveOpen, setArriveOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  /** The server's SALES_UNPAID words, while the refusal is on screen. */
  const [closeBlocked, setCloseBlocked] = useState<string | null>(null);
  /** The expense the void dialog is open for, if any. */
  const [voidingExpense, setVoidingExpense] = useState<IShipmentExpense | null>(
    null,
  );
  const [docName, setDocName] = useState("Signed waybill");
  const [signing, setSigning] = useState(false);

  if (isLoading) return <DetailSkeleton facts={8} cards={3} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.shipment;
  const beforeDispatch = s.status === "PLANNED" || s.status === "LOADING";
  const canManage = has("SHIPMENTS_MANAGE");
  const anyDriverExtra = Boolean(
    s.driverEmail ?? s.driverCity ?? s.driverLicenseNo ?? s.driverIdNumber,
  );
  // The half-empty-truck warning the owner asked for: a stated capacity the
  // planned sales don't come close to filling means another order should ride
  // along. It warns, never blocks - the admin may know the truck is going
  // regardless.
  const plannedKg = plannedWeightOf(s);
  const roomLeftKg =
    s.truckCapacityKg !== null ? s.truckCapacityKg - plannedKg : 0;
  const underFilled =
    beforeDispatch &&
    s.truckCapacityKg !== null &&
    // Never nag off a missing figure: without plannedWeightKg the room left
    // computes as the whole truck and every shipment would look half empty.
    s.plannedWeightKg !== null &&
    roomLeftKg > s.truckCapacityKg * UNDER_FILL_SHARE;

  // Every shed this truck takes a load from, origin first. A trip that calls
  // at two sheds moves stock out of both, and a dialog naming only the origin
  // would be describing half the movement.
  const loadingFrom =
    s.loadingWarehouses.length > 0
      ? s.loadingWarehouses.map((w) => w.name).join(" and ")
      : s.originWarehouse.name;

  const onDispatch = async () => {
    const ok = await confirm({
      title: "Dispatch this shipment?",
      description: `${formatKg(s.totalWeightKg)} comes off stock at ${loadingFrom} now, and what these goods cost is frozen for this trip - a later purchase at a different price will not move this trip's profit. It cannot be undone. The server refuses this if the load is under a payment milestone the owner has not approved.`,
      confirmText: "Dispatch",
    });
    if (!ok) return;
    try {
      await dispatchShipment({ id: s.id }).unwrap();
      notify.success("Shipment dispatched - stock has left the warehouse");
    } catch (err) {
      const apiError = extractApiError(err);
      if (apiError.code !== "WAYBILL_REQUIRED") {
        // The milestone gate returns a clear message here.
        notify.error("Couldn't dispatch", { description: apiError.message });
        return;
      }
      // The signed-waybill gate: offer an explicit, logged override.
      const proceed = await confirm({
        title: "The driver has not signed",
        description:
          "Take the driver's signature on this trip before it leaves, or upload a signed sheet if the depot has one on paper. You can dispatch without either, but the trip will go out with nothing showing the driver accepted the load.",
        confirmText: "Dispatch anyway",
        isDestructive: true,
      });
      if (!proceed) return;
      try {
        await dispatchShipment({
          id: s.id,
          overrideMissingWaybill: true,
        }).unwrap();
        notify.success("Shipment dispatched - stock has left the warehouse");
      } catch (retryErr) {
        notify.error("Couldn't dispatch", {
          description: extractApiError(retryErr).message,
        });
      }
    }
  };

  const onClose = async () => {
    // Closing is the end of the trip's paperwork: nothing more can be added to
    // it and its profit stops moving. The server refuses it while a buyer on
    // this truck still owes, so the dialog says what that check means rather
    // than repeating it - a close that goes through is a trip fully collected.
    const ok = await confirm({
      title: "Close this trip?",
      description: `${s.transactionNo} is finished with: no further costs can be put on it and its profit is settled. The server refuses this while a buyer on this truck still owes money, so if it goes through the trip has been collected in full.`,
      confirmText: "Close the trip",
    });
    if (!ok) return;

    try {
      await close(s.id).unwrap();
      notify.success("Shipment closed");
    } catch (err) {
      const apiError = extractApiError(err);
      // A buyer on this trip still owes money. That refusal is not a transport
      // failure to be flashed and forgotten - it is a list of sales somebody
      // has to go and collect on, so it gets a screen rather than a toast.
      if (apiError.code === "SALES_UNPAID") {
        setCloseBlocked(apiError.message);
        return;
      }
      notify.error("Couldn't close", { description: apiError.message });
    }
  };

  const onUploadDocument = async (file: File | null) => {
    if (!file) return;
    try {
      await addDocument({
        file,
        id: s.id,
        name: docName.trim() || "Signed waybill",
      }).unwrap();
      notify.success("Document uploaded");
      setDocName("Signed waybill");
    } catch (err) {
      notify.error("Couldn't upload the document", {
        description: extractApiError(err).message,
      });
      throw err; // Keeps the FilePicker preview for a retry.
    }
  };

  const onRemoveSale = async (saleId: string, transactionNo: string) => {
    const ok = await confirm({
      title: `Take ${transactionNo} off this truck?`,
      description:
        "The sale returns to the shippable pool and can be planned onto another truck. Nothing about the sale itself changes.",
      confirmText: "Remove",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await removeSale({ id: s.id, saleId }).unwrap();
      notify.success(`${transactionNo} removed from this truck`);
    } catch (err) {
      notify.error("Couldn't remove the sale", {
        description: extractApiError(err).message,
      });
    }
  };

  const onRemoveDocument = async (documentId: string, name: string) => {
    const ok = await confirm({
      title: "Remove this document?",
      description: `"${name}" will be deleted from the shipment's file. Removal is only possible before dispatch. Type the document's name to confirm.`,
      confirmText: "Remove",
      isDestructive: true,
      requireExactMatch: name,
    });
    if (!ok) return;
    try {
      await removeDocument({ documentId, id: s.id }).unwrap();
      notify.success("Document removed");
    } catch (err) {
      notify.error("Couldn't remove the document", {
        description: extractApiError(err).message,
      });
    }
  };

  /* Every action here says on hover what it DOES and what it commits you to.
     These buttons move stock and money, and the label alone ("Close", "Mark
     arrived") cannot carry that. HelpWrap rather than a HelpTip icon: the
     button label is already on screen, and half of these render as links -
     a HelpTip's own <button> inside an <a> is invalid HTML.
     The wrapper is `inline-flex` and the buttons keep `xl:w-full` so the
     rail's column layout still gives every pill the same width; without it
     the wrapping span would stretch and the pill inside it would not. */
  const actions = (
    <div className="flex flex-wrap gap-2 xl:flex-col">
      {beforeDispatch && canManage ? (
        <>
          {/* Exactly ONE primary action per state. Allocating and dispatching
              were both filled amber, so the rail offered two equally loud
              answers to "what do I do next" - and dispatch is the one that
              moves stock, which makes it the one that should look decisive.
              A page, not a dialog, for allocation: the lot list is long, and a
              dialog's inner scroll inside the scrolling page was unusable on a
              phone. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Pick which stock lots fill each sale, so the trip is costed on the goods you actually load."
          >
            <AdminButton
              className="xl:w-full"
              variant="secondary"
              asChild
            >
              <Link href={`${LIST}/${s.id}/allocate`}>Allocate lots</Link>
            </AdminButton>
          </HelpWrap>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Change the truck, driver, destination or the warehouses this trip loads at - possible until it dispatches."
          >
            <AdminButton className="xl:w-full" variant="secondary" asChild>
              <Link href={`${LIST}/${s.id}/edit`}>Edit plan</Link>
            </AdminButton>
          </HelpWrap>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Sends the truck: stock comes out of the warehouse on the record, and dispatch cannot be undone."
          >
            <AdminButton
              className="xl:w-full"
              disabled={dispatchState.isLoading}
              onClick={() => void onDispatch()}
            >
              {dispatchState.isLoading ? "Dispatching…" : "Dispatch"}
            </AdminButton>
          </HelpWrap>
          {/* Cancel ends the trip. It read as just another quiet bordered
              pill beside Allocate lots, which is the wrong promise for the
              one button here that throws the shipment away. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Calls this trip off with a reason on file. The sales go back to the pool and can ride another truck."
          >
            <AdminButton
              variant="danger"
              className="xl:w-full"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </AdminButton>
          </HelpWrap>
        </>
      ) : null}
      {s.status === "DISPATCHED" && canManage ? (
        <HelpWrap
          className="inline-flex flex-none xl:w-full"
          text="Records what actually came off the truck and what each buyer will pay for it. You can mark it arrived and weigh it later."
        >
          <AdminButton className="xl:w-full" onClick={() => setArriveOpen(true)}>
            Mark arrived
          </AdminButton>
        </HelpWrap>
      ) : null}
      {s.status === "ARRIVED" && canManage ? (
        <HelpWrap
          className="inline-flex flex-none xl:w-full"
          text="Marks the trip finished now that it is delivered and settled, leaving its profit as the final figure."
        >
          <AdminButton
            className="xl:w-full"
            disabled={closeState.isLoading}
            onClick={() => void onClose()}
          >
            {closeState.isLoading ? "Closing…" : "Close shipment"}
          </AdminButton>
        </HelpWrap>
      ) : null}
      {/* The waybill leads the paper trail: print it FIRST, the driver and an
          admin sign it, the signed copy is uploaded, THEN dispatch - so the
          buttons live on every non-cancelled shipment, not just loaded ones. */}
      {s.status !== "CANCELLED" ? (
        <>
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Opens the waybill for this truck to print, for the driver and an admin to sign before it leaves."
          >
            <AdminButton
              variant="secondary"
              className="xl:w-full"
              asChild
            >
              <Link href={`${LIST}/${s.id}/waybill`}>Waybill</Link>
            </AdminButton>
          </HelpWrap>
          {/* The same document in another wrapper, so it is the quietest
              thing in the rail rather than a second Waybill button. */}
          <HelpWrap
            className="inline-flex flex-none xl:w-full"
            text="Opens that same waybill as a PDF in a new tab, ready to print or send to the driver."
          >
            <AdminButton variant="ghost" className="xl:w-full" asChild>
              <a
                href={shipmentWaybillPdfUrl(s.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                PDF
              </a>
            </AdminButton>
          </HelpWrap>
        </>
      ) : null}
    </div>
  );

  const main = (
    <div className="flex flex-col gap-4">
      {/* HOW FULL THE TRUCK IS, first and on its own.
          This lived inside the sales card and only rendered before dispatch,
          which is backwards: it is the one thing about a shipment that reads
          at a glance, and it is just as worth seeing after the truck has gone
          as before. No card around it - it is a figure, not a section, and a
          sixth bordered sheet was part of what made this page hard to scan. */}
      {s.truckCapacityKg !== null || plannedKg > 0 ? (
        <div>
          <LoadMeter
            loadedKg={plannedKg}
            capacityKg={s.truckCapacityKg}
            loadedLabel={beforeDispatch ? "Planned" : "Loaded"}
          />
          {beforeDispatch && underFilled ? (
            <p className="mt-1.5 text-[12.5px] text-adm-muted">
              This truck has {formatKg(roomLeftKg)} of room left. Add another
              sale before it rolls, or send it part-loaded if that is the plan.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Sales on this trip. Payment terms are settled BEFORE a sale can
          board a truck, so there is nothing to pay here - the sale page owns
          later payments. Each sale is its own bordered sub-card so a
          multi-sale trip reads as distinct orders, not one run-on list. */}
      <AdminCard className="p-5">
        <SectionHeading
          actions={
            <span className="flex items-center gap-2">
              <Mono className="text-[11px] text-adm-faint">
                {s.salesCount} {s.salesCount === 1 ? "sale" : "sales"}
              </Mono>
              {beforeDispatch ? (
                <HelpWrap
                  className="inline-flex"
                  text="Puts another paid, unshipped sale on this truck so it does not travel half empty."
                >
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddSalesOpen(true)}
                  >
                    + Add sales
                  </AdminButton>
                </HelpWrap>
              ) : null}
            </span>
          }
          hint="The orders this truck is carrying, and the weight each of them puts on it."
        >
          Sales on this trip
        </SectionHeading>
        <div className="grid gap-2.5 pb-2 @3xl/main:grid-cols-2">
          {s.sales.map((sale) => {
            // Removal only where nothing would be silently thrown away: a sale
            // carrying allocated lots has costing decisions on it, so those get
            // cleared deliberately in Allocate lots first (the backend refuses
            // it either way).
            const hasAllocations = s.allocations.some(
              (a) => a.sale.id === sale.id,
            );
            const removable =
              beforeDispatch && s.sales.length > 1 && !hasAllocations;
            // WHAT THIS SALE WEIGHS, AND WHAT IS ON THE TRUCK SO FAR. Money
            // has no business on this card - the sale page owns payments;
            // this screen is loading. `agreedKg` is the order's own weight
            // (across trucks, should one ever be split); `allocatedKg` is
            // what has been keyed onto THIS truck.
            const saleNeedsKg = sale.lines.reduce(
              (sum, l) => sum + l.agreedKg,
              0,
            );
            const saleLoadedKg = sale.lines.reduce(
              (sum, l) => sum + l.allocatedKg,
              0,
            );
            return (
              <div
                key={sale.id}
                className="flex h-full flex-col rounded-none border border-adm-line bg-adm-card p-3.5"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className={cn(
                      adminLinkClass,
                      "font-adminmono min-w-0 text-[12.5px] font-semibold tabular-nums",
                    )}
                  >
                    {sale.transactionNo}
                  </Link>
                  <span className="flex flex-none items-center gap-2">
                    <SaleStatusBadge status={sale.status} />
                    {removable ? (
                      <HelpWrap
                        className="inline-flex"
                        text="Takes this sale off the truck and back into the shippable pool. The sale itself is unchanged."
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void onRemoveSale(sale.id, sale.transactionNo)
                          }
                          className="cursor-pointer text-[12px] text-console-red hover:underline"
                          aria-label={`Remove ${sale.transactionNo} from this shipment`}
                        >
                          ✕
                        </button>
                      </HelpWrap>
                    ) : null}
                  </span>
                </div>

                <Link
                  className={cn(
                    adminLinkClass,
                    "mt-2 block min-w-0 text-[14px] leading-[1.35] font-semibold [overflow-wrap:anywhere]",
                  )}
                  href={`/admin/buyers/${sale.buyer.id}`}
                >
                  {sale.buyer.name}
                </Link>
                {sale.buyer.phone ? (
                  <Mono className="mt-0.5 block text-[12px] text-adm-muted">
                    {sale.buyer.phone}
                  </Mono>
                ) : null}

                {/* The loading picture leads the foot of the card: what the
                    order needs on the truck, and what has been put on so
                    far. It never depends on financial visibility - weight is
                    not money, and a loader who cannot see prices still has
                    to know what is going on the truck. */}
                <div className="mt-auto border-t border-dotted border-adm-line pt-3">
                  <dl className="grid grid-cols-2 gap-x-3">
                    <div className="min-w-0">
                      <dt className="min-w-0 text-[10px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                        <HelpWrap text="The weight this whole order is due to move - what decides whether it fits on the truck.">
                          Load needed
                        </HelpWrap>
                      </dt>
                      <dd className="mt-0.5">
                        <Mono className="text-[17px] leading-none font-semibold tabular-nums text-adm-ink">
                          {formatKg(saleNeedsKg)}
                        </Mono>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="min-w-0 text-[10px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                        <HelpWrap text="What has been allocated onto this truck for the order so far. Green once the order is fully covered.">
                          Loaded now
                        </HelpWrap>
                      </dt>
                      <dd className="mt-0.5">
                        <Mono
                          className={cn(
                            "text-[17px] leading-none font-semibold tabular-nums",
                            saleLoadedKg >= saleNeedsKg && saleNeedsKg > 0
                              ? "text-console"
                              : "text-adm-ink",
                          )}
                        >
                          {formatKg(saleLoadedKg)}
                        </Mono>
                      </dd>
                    </div>
                  </dl>
                  {/* What the load actually IS: one aligned row per
                      commodity, loaded over needed, so a mixed order reads
                      as a checklist rather than a run-on sentence. Only on a
                      mixed order - on a single-commodity sale it would
                      restate the totals above it. */}
                  {/* WHAT THE TRIP SETTLED AT, once the load has been weighed
                      in. The one money block that belongs on this screen: it
                      was decided HERE, on arrival, and the owner has to be able
                      to read the original agreement next to what was finally
                      collected. Absent until there is a second figure - the
                      agreed price alone is not a comparison. */}
                  <SaleSettlement sale={sale} />
                  {sale.lines.length > 1 ? (
                    <ul className="mt-2 flex flex-col gap-1 border-t border-dotted border-adm-line pt-2">
                      {sale.lines.map((l) => {
                        const covered = l.allocatedKg >= l.agreedKg;
                        return (
                          <li
                            key={l.commodityId}
                            className="flex items-baseline justify-between gap-2 text-[11.5px]"
                          >
                            <span className="min-w-0 text-adm-muted [overflow-wrap:anywhere]">
                              {l.commodityName}
                            </span>
                            <Mono
                              className={cn(
                                "flex-none tabular-nums",
                                covered ? "text-console" : "text-adm-ink",
                              )}
                            >
                              {formatKg(l.allocatedKg)} / {formatKg(l.agreedKg)}
                            </Mono>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </AdminCard>

      {/* Logistics */}
      {/* ONE card for the trip and the person driving it, not two.
          Logistics and Driver were separate sheets of four short facts each,
          which put two headings and two borders around what a reader treats
          as a single question: what is this truck, and who has it. They keep
          their own labels inside, so the grouping survives without the second
          frame.

          The truck and the route live here now. They were dropped when the
          page header carried them; the header says what KIND of page this is,
          so the record has to say which shipment. */}
      <AdminCard className="p-5">
        <SectionHeading hint="Which truck this is, where it is going and when it moved.">
          Trip
        </SectionHeading>
        <DetailGrid>
          <DetailItem label="Waybill no" mono>
            {s.transactionNo}
          </DetailItem>
          <DetailItem label="Truck" strong>
            {s.truckReg}
          </DetailItem>
          <DetailItem full label="Route">
            {/* Every shed the truck calls at, in loading order, then the
                drop. One stop is the common case and reads as before. */}
            {s.loadingWarehouses.map((w, i) => (
              <span key={w.id}>
                {i > 0 ? " → " : ""}
                <Link
                  className={adminLinkClass}
                  href={`/admin/warehouses/${w.id}`}
                >
                  {w.name}
                </Link>
              </span>
            ))}{" "}
            → {s.destination}
          </DetailItem>
          <DetailItem label="Total weight" mono>
            {formatKg(s.totalWeightKg)}
          </DetailItem>
          {s.truckCapacityKg !== null ? (
            <DetailItem label="Truck capacity" mono>
              {formatKg(s.truckCapacityKg)}
            </DetailItem>
          ) : null}
          {/* Expected arrival is planned on a date picker - there is no time
              to show. Departure and arrival are stamped by the system at the
              moment they happen, and on a trip that runs overnight the hour
              is the whole point, so those stack date over time. */}
          {s.expectedArrivalAt ? (
            <DetailItem label="Expected arrival">
              <DateOnlyCell value={s.expectedArrivalAt} />
            </DetailItem>
          ) : null}
          {s.departedAt ? (
            <DetailItem label="Departed">
              <DateTimeCell value={s.departedAt} />
            </DetailItem>
          ) : null}
          {s.arrivedAt ? (
            <DetailItem label="Arrived">
              <DateTimeCell value={s.arrivedAt} />
            </DetailItem>
          ) : null}
          {s.notes ? (
            <DetailItem full label="Notes">
              {s.notes}
            </DetailItem>
          ) : null}
        </DetailGrid>

        {/* The rule that split the trip from the driver sat ON the old
            eyebrow. SectionHeading owns its bottom margin, so the divider
            moves out to this wrapper to keep the two blocks apart. */}
        <div className="mt-4 border-t border-adm-hairline pt-4">
          <SectionHeading hint="Who has the truck, as recorded when this trip was booked.">
            Driver
          </SectionHeading>
          <DetailGrid>
            {/* The driver block is a SNAPSHOT taken when the trip was booked -
                name, phone, licence and the rest are copied onto the shipment
                and editable here without touching the directory. Linking the
                name would promise the reader that the record they land on says
                what this page says, and on an old trip it will not. */}
            <DetailItem label="Name">{s.driverName}</DetailItem>
            {s.driverPhone ? (
              <DetailItem label="Phone" mono>
                {s.driverPhone}
              </DetailItem>
            ) : null}
            <DetailItem label="Company">
              {s.driverCompany ?? (anyDriverExtra ? "Solo operator" : <Absent />)}
            </DetailItem>
            {s.driverCity ? (
              <DetailItem label="City">{s.driverCity}</DetailItem>
            ) : null}
            {s.driverLicenseNo ? (
              <DetailItem label="Licence no" mono>
                {s.driverLicenseNo}
              </DetailItem>
            ) : null}
            {s.driverIdNumber ? (
              <DetailItem label="ID number" mono>
                {s.driverIdNumber}
              </DetailItem>
            ) : null}
            {s.driverEmail ? (
              <DetailItem full label="Email">
                {s.driverEmail}
              </DetailItem>
            ) : null}
          </DetailGrid>
        </div>
      </AdminCard>

      {/* What the driver is owed.
          Its own card rather than another block inside Trip: this is money,
          it has its own actions, and it is the one thing on this page an
          owner comes back to after the truck has gone. A cancelled trip owes
          nobody, so the card refuses to price or pay against one. */}
      <DriverSettlementCard
        canManage={s.status !== "CANCELLED"}
        shipmentId={s.id}
      />

      {/* Allocations */}
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-2"
          hint="The exact stock this truck carries, lot by lot, and what that stock cost you."
        >
          Loaded lots
        </SectionHeading>
        {s.allocations.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">
            No lots allocated yet. Dispatching without allocations auto-fills
            from the oldest stock (flagged estimated).
          </p>
        ) : (
          s.allocations.map((a) => (
            <div
              key={a.id}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <Link
                  className={cn(adminLinkClass, "font-medium")}
                  href={`/admin/commodities/${a.commodity.id}`}
                >
                  {a.commodity.name}
                </Link>
                <Mono className="ml-2 text-[12px] text-adm-muted">
                  {formatKg(a.weightKg)} @{" "}
                  <Money value={a.unitCostSnapshotGhs} />
                </Mono>
                <Link
                  className={cn(
                    adminLinkClass,
                    "font-adminmono ml-2 text-[11.5px] tabular-nums",
                  )}
                  href={`/admin/sales/${a.sale.id}`}
                >
                  {a.sale.transactionNo}
                </Link>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
                <Money value={a.lineCostGhs} />
              </Mono>
            </div>
          ))
        )}
      </AdminCard>

      {/* Signatures come BEFORE the documents drawer, because they are now the
          normal way a waybill gets signed and the drawer is the fallback for a
          sheet somebody photographed. Putting the fallback first taught the
          depot to print. */}
      <ShipmentSignatures shipment={s} />

      {/* Retargeted, not removed. The instruction here used to be "download the
          waybill, sign it with the driver, upload the signed copy" - a loop the
          signature slots above have replaced, and one that kept teaching the
          depot to print something it no longer needs to. What the drawer is
          actually for is the paperwork a trip picks up on the road, which has
          nowhere else to live. */}
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-1.5"
          hint="Paperwork filed against this trip alone, for staff only - a buyer never sees what is kept here."
        >
          Other paperwork (private)
        </SectionHeading>
        <p className="mb-2 text-[12px] text-adm-muted">
          Weighbridge tickets, checkpoint and toll receipts, a buyer&rsquo;s
          signed delivery note - anything this trip collected that is not a
          signature. The driver and owner sign above; nothing here needs
          printing. Downloads are logged.
        </p>
        {s.documents.length === 0 ? (
          <AttachmentEmpty text="No documents on file." />
        ) : (
          <AttachmentList>
            {s.documents.map((doc) => (
              <AttachmentTile
                key={doc.id}
                createdAt={doc.createdAt}
                href={shipmentDocumentUrl(s.id, doc.id)}
                name={doc.name}
                onRemove={
                  beforeDispatch
                    ? () => void onRemoveDocument(doc.id, doc.name)
                    : undefined
                }
              />
            ))}
          </AttachmentList>
        )}
        {s.status !== "CANCELLED" && s.status !== "CLOSED" ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="Document name"
                aria-label="Document name"
                className="h-8 min-w-[160px] flex-1 rounded-none border border-adm-line bg-adm-card px-2.5 text-[13px] outline-none transition-colors placeholder:text-adm-faint focus:border-console"
              />
              <FilePicker
                accept="image/*,application/pdf"
                busy={addDocState.isLoading}
                confirmLabel="Upload"
                hint="PDF or a photo of the ticket, receipt or note"
                onConfirm={onUploadDocument}
                optimize={false}
                triggerLabel="Choose document"
              />
              {/* An icon rather than HelpWrap here: the picker renders a block
                  of its own, and a tooltip trigger cannot wrap it without
                  putting a <div> inside a <span>. */}
              <HelpTip
                label="About adding a document"
                text="Files a copy of this paperwork against the trip - you see the file before anything is uploaded."
              />
            </div>
            <div className="mt-3 border-t border-adm-hairline pt-3">
              <HelpWrap
                className="inline-flex"
                text="Opens a pad so the driver can sign on this phone, and files that signature as a document here."
              >
                <button
                  type="button"
                  onClick={() => setSigning((v) => !v)}
                  className={cn(adminLinkClass, "cursor-pointer text-[12.5px] font-semibold")}
                  aria-expanded={signing}
                >
                  {signing ? "Hide signature pad" : "Or sign on this screen"}
                </button>
              </HelpWrap>
              {signing ? (
                <div className="mt-2">
                  <SignaturePad
                    fileName={`${(docName.trim() || "signature")
                      .toLowerCase()
                      .replace(/\s+/g, "-")}.png`}
                    onCapture={(file) => {
                      setSigning(false);
                      void onUploadDocument(file).catch(() => undefined);
                    }}
                  />
                  <p className="mt-1 text-[11.5px] text-adm-faint">
                    Saves as &quot;{docName.trim() || "Signed waybill"}&quot; -
                    hand the phone to the driver to sign right here.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </AdminCard>

      {/* Expenses */}
      <AdminCard className="p-5">
        <SectionHeading
          className="mb-2"
          actions={
            <HelpWrap
              className="inline-flex"
              text="Records a cost for this trip, such as transport or loading, and takes it off the trip's profit."
            >
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => setExpenseOpen(true)}
              >
                + Add
              </AdminButton>
            </HelpWrap>
          }
          hint="What this trip cost to run, on top of the stock itself - it comes straight off the profit."
        >
          Expenses
        </SectionHeading>
        {s.expenses.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">No expenses recorded.</p>
        ) : (
          s.expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              {/* The category leads; its note follows on a quieter second
                  line, clamped to two. Run inline and unclamped, a full-length
                  voucher note turned every row into a six-line paragraph and
                  buried the amounts the list exists to show. The full text
                  stays one hover away. */}
              <div className="min-w-0">
                <Link
                  className={cn(adminLinkClass, "block truncate")}
                  href={`/admin/expense-categories/${e.category.id}`}
                >
                  {e.category.name}
                </Link>
                {e.description ? (
                  <span
                    className="mt-0.5 line-clamp-2 text-[12px] text-adm-muted"
                    title={e.description}
                  >
                    {e.description}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
                  <Money value={e.amountGhs} />
                </Mono>
                {/* Voiding is owner-only (like the general expense void):
                    striking out a cost moves the trip's profit. */}
                {isSuperAdmin ? (
                  <HelpWrap
                    className="inline-flex flex-none"
                    text="Strikes this cost off the trip's profit with a reason. The voucher stays on record, never erased."
                  >
                    <AdminButton
                      type="button"
                      variant="danger"
                      size="sm"
                      className="flex-none"
                      onClick={() => setVoidingExpense(e)}
                    >
                      Void
                    </AdminButton>
                  </HelpWrap>
                ) : null}
              </div>
            </div>
          ))
        )}
      </AdminCard>
    </div>
  );

  // The ANSWER first, its workings under it. This was a 2x2 grid where profit
  // sat in the fourth cell carrying the same weight as the three figures it is
  // derived from - so the one number the owner opened the page for had to be
  // found among its own inputs. Profit leads at display size now; revenue,
  // cost and expenses follow as the quiet lines that explain it.
  const aside = (
    <AdminCard className="p-5">
      <div className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        Profit <CostBasisBadge basis={s.profit.costBasis} />
      </div>
      <Mono className="mt-1 block text-[26px] leading-[1.15] font-semibold tabular-nums text-adm-ink">
        <Money value={s.profit.profitGhs} />
      </Mono>
      <div className="mt-3 border-t border-adm-hairline pt-1">
        <DetailRow label="Revenue" mono>
          <Money value={s.profit.revenueGhs} />
        </DetailRow>
        <DetailRow label="Lot cost" mono>
          <Money value={s.profit.costGhs} />
        </DetailRow>
        <DetailRow label="Expenses" mono>
          <Money value={s.profit.expensesGhs} />
        </DetailRow>
      </div>
      <div className="mt-3 border-t border-adm-hairline pt-3.5">{actions}</div>
    </AdminCard>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All shipments" className="mb-2" />
      <AdminPageHeader
        title="Shipment details"
        hint="One truck: its load, its trip, its costs and what the driver is owed."
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <ShipmentStatusBadge status={s.status} />
            <CostBasisBadge basis={s.costBasis} />
          </span>
        }
      />

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-console-red/40 bg-console-red/[0.04] px-4 py-3 text-[13px] text-adm-ink">
          Cancelled: {s.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell main={main} aside={aside} />

      {addSalesOpen ? (
        <AddSalesDialog shipment={s} onClose={() => setAddSalesOpen(false)} />
      ) : null}
      {arriveOpen ? (
        <ArrivalDialog
          shipment={s}
          // Arrival is when the buyer signs for the goods - steer the admin
          // straight into filing that evidence.
          onArrived={() => setDocName("Signed delivery note")}
          onClose={() => setArriveOpen(false)}
        />
      ) : null}
      {closeBlocked !== null ? (
        <SalesUnpaidDialog
          message={closeBlocked}
          shipment={s}
          onClose={() => setCloseBlocked(null)}
        />
      ) : null}
      {expenseOpen ? (
        <ExpenseDialog shipment={s} onClose={() => setExpenseOpen(false)} />
      ) : null}
      {cancelOpen ? (
        <CancelDialog shipment={s} onClose={() => setCancelOpen(false)} />
      ) : null}
      {voidingExpense ? (
        <VoidExpenseDialog
          shipment={s}
          expense={voidingExpense}
          onClose={() => setVoidingExpense(null)}
        />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
