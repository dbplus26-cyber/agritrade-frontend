"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  Mono,
  adminInputClass,
  adminLinkClass,
} from "@/components/admin/ui";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis, formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetSaleQuery } from "@/redux/sales/admin-sales-api";
import { useArriveShipmentMutation } from "@/redux/shipments/shipments-api";
import type { IShipment, IShipmentSale } from "@/types/admin-shipment.types";
import {
  arriveShipmentSchema,
  type ArriveShipmentValues,
} from "@/validations/shipment-schema";
import { Money } from "./sale-bits";

/** One commodity that physically went on this truck for one sale. */
interface LoadedLine {
  commodityId: string;
  commodityName: string;
  loadedKg: number;
}

/** A sale on the trip, with what was loaded for it. */
interface LoadedSale {
  sale: IShipmentSale;
  lines: LoadedLine[];
}

/**
 * What was loaded, read from the ALLOCATIONS rather than the sale lines.
 *
 * The allocation is what physically went on the truck, and it is what the
 * backend reconciles the received weight against - a commodity with no
 * allocation here is refused with COMMODITY_NOT_LOADED. Building the form off
 * the sale's own lines would therefore offer inputs for goods the API will not
 * accept a figure for.
 */
const loadedSalesOf = (shipment: IShipment): LoadedSale[] =>
  shipment.sales
    .map((sale) => {
      const byCommodity = new Map<string, LoadedLine>();
      for (const a of shipment.allocations) {
        if (a.sale.id !== sale.id) continue;
        const existing = byCommodity.get(a.commodity.id);
        if (existing) existing.loadedKg += a.weightKg;
        else
          byCommodity.set(a.commodity.id, {
            commodityId: a.commodity.id,
            commodityName: a.commodity.name,
            loadedKg: a.weightKg,
          });
      }
      return { lines: [...byCommodity.values()], sale };
    })
    .filter((s) => s.lines.length > 0);

/**
 * The arrival figures for ONE sale: what was loaded, what came off, and what
 * the buyer will actually pay for it.
 *
 * Its own component so it can hold its own `useGetSaleQuery` - the agreed unit
 * price per commodity lives on the sale, not on the shipment, and it is what
 * turns a received weight into a suggested payment. One query per sale rather
 * than one shared fetch: a trip carries a handful of sales, and hooks cannot
 * be called in a loop.
 */
function SaleArrival({
  belowPaid,
  control,
  index,
  loaded,
  register,
  setValue,
}: {
  /** Set when this sale would settle below what the buyer already paid. */
  belowPaid: boolean;
  control: Control<ArriveShipmentValues>;
  index: number;
  loaded: LoadedSale;
  register: UseFormRegister<ArriveShipmentValues>;
  setValue: UseFormSetValue<ArriveShipmentValues>;
}) {
  const { lines, sale } = loaded;
  const detail = useGetSaleQuery(sale.id);
  // Once the admin types their own figure the suggestion stops driving the
  // field. The two sides often settle on a round number after arguing about a
  // wet load, so an overwrite must survive the next keystroke in a weight box.
  const [overridden, setOverridden] = useState(false);

  const received = useWatch({ control, name: `sales.${index}.lines` });

  /** Agreed price per kg, by commodity. Null anywhere money is redacted. */
  const unitPrices = useMemo(() => {
    const map = new Map<string, null | number>();
    for (const l of detail.data?.data.sale.lines ?? []) {
      map.set(l.commodity.id, l.unitPriceGhs);
    }
    return map;
  }, [detail.data]);

  /**
   * Received x agreed unit price. Null when a price is redacted or a weight is
   * not a figure yet - a suggestion nobody can check is worse than none.
   */
  const suggestedGhs = useMemo(() => {
    let total = 0;
    for (const [i, line] of lines.entries()) {
      const price = unitPrices.get(line.commodityId);
      if (price === null || price === undefined) return null;
      const raw = received?.[i]?.receivedKg ?? "";
      if (raw.trim() === "" || !Number.isFinite(Number(raw))) return null;
      total += Number(raw) * price;
    }
    return Math.round(total * 100) / 100;
  }, [lines, received, unitPrices]);

  // The suggestion is a starting point, not a computed field: it fills the box
  // until somebody types over it, and then leaves it alone.
  useEffect(() => {
    if (overridden || suggestedGhs === null) return;
    setValue(`sales.${index}.settledTotalGhs`, suggestedGhs.toFixed(2));
  }, [index, overridden, setValue, suggestedGhs]);

  const settledInput = register(`sales.${index}.settledTotalGhs`);

  return (
    <section className="rounded-none border border-adm-line bg-adm-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <Link
          href={`/admin/sales/${sale.id}`}
          className={cn(adminLinkClass, "font-adminmono text-[12.5px] font-semibold tabular-nums")}
        >
          {sale.transactionNo}
        </Link>
        <span className="min-w-0 text-[13px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
          {sale.buyer.name}
        </span>
      </div>

      {/* One row per commodity: what went on the truck, and the box for what
          came off it. The weight box is full width under its own label rather
          than beside it - at 360px a label, a loaded figure and an input on one
          line leaves the input about eight characters wide. */}
      <div className="mt-2.5 flex flex-col gap-3">
        {lines.map((line, i) => (
          <div key={line.commodityId} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <label
                className="min-w-0 text-[13px] font-medium text-adm-ink [overflow-wrap:anywhere]"
                htmlFor={`received-${sale.id}-${line.commodityId}`}
              >
                {line.commodityName}
              </label>
              <Mono className="flex-none text-[11.5px] text-adm-muted">
                loaded {formatKg(line.loadedKg)}
              </Mono>
            </div>
            <div className="relative">
              <Input
                id={`received-${sale.id}-${line.commodityId}`}
                // A weight is keyed on a phone at a weighbridge: the decimal
                // keypad, not the full keyboard.
                inputMode="decimal"
                aria-label={`Received ${line.commodityName} for ${sale.transactionNo}`}
                className={cn(
                  adminInputClass,
                  "font-adminmono pr-10 text-[15px] tabular-nums",
                )}
                {...register(`sales.${index}.lines.${i}.receivedKg`)}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] font-semibold text-adm-faint"
              >
                kg
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* The money. Agreed first because it is the thing that must never be
          overwritten, the suggestion under it as an offer, and the box the
          admin actually commits to last. */}
      <div className="mt-3 border-t border-dotted border-adm-line pt-2.5">
        <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
          <span className="text-adm-muted">Agreed total</span>
          <Mono className="flex-none text-adm-ink">
            <Money value={sale.agreedTotalGhs} />
          </Mono>
        </div>
        {suggestedGhs !== null ? (
          <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[12.5px]">
            <span className="text-adm-muted">Suggested</span>
            <span className="flex flex-none items-baseline gap-2">
              <Mono className="text-adm-ink">{formatCedis(suggestedGhs)}</Mono>
              {overridden ? (
                <button
                  type="button"
                  onClick={() => {
                    setOverridden(false);
                    setValue(
                      `sales.${index}.settledTotalGhs`,
                      suggestedGhs.toFixed(2),
                      { shouldValidate: true },
                    );
                  }}
                  className={cn(adminLinkClass, "cursor-pointer text-[12px] font-semibold")}
                >
                  Use
                </button>
              ) : null}
            </span>
          </div>
        ) : null}

        <label
          className="mt-2 block text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase"
          htmlFor={`settled-${sale.id}`}
        >
          Payment to expect
        </label>
        <div className="relative mt-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] font-semibold text-adm-faint"
          >
            GH₵
          </span>
          <Input
            id={`settled-${sale.id}`}
            inputMode="decimal"
            aria-label={`Payment to expect for ${sale.transactionNo}`}
            className={cn(
              adminInputClass,
              "font-adminmono h-[46px] pl-[46px] text-[17px] font-bold tabular-nums",
            )}
            {...settledInput}
            onChange={(e) => {
              setOverridden(true);
              void settledInput.onChange(e);
            }}
          />
        </div>
        {belowPaid ? (
          <p
            role="alert"
            className="mt-1.5 text-[12px] font-medium text-console-red"
          >
            {sale.buyer.name} has already paid{" "}
            <Mono>{formatCedis(sale.paidGhs)}</Mono> on this sale. Reverse a
            payment on {sale.transactionNo} first, then record the arrival.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * What actually came off the truck.
 *
 * Grain is weighed at the origin and weighed again on arrival, and the two
 * figures differ: moisture leaves in the heat, some spills, and occasionally
 * the origin scale was simply generous. The buyer pays for what they received,
 * so this is where that second weighing is recorded - per commodity, because a
 * short delivery has to say WHICH crop was short.
 *
 * The figures are optional on the transition itself. A truck can be marked
 * arrived before anybody has weighed it: the load is on the ground either way,
 * and refusing to record that would leave the register saying it is still on
 * the road.
 */
export function ArrivalDialog({
  shipment,
  onArrived,
  onClose,
}: {
  shipment: IShipment;
  /** Fired only when the trip actually reached ARRIVED, never on a cancel. */
  onArrived?: () => void;
  onClose: () => void;
}) {
  const [arrive, { isLoading }] = useArriveShipmentMutation();
  const [serverError, setServerError] = useState<null | string>(null);
  /** Sales the admin is settling below what the buyer has already handed over. */
  const [belowPaid, setBelowPaid] = useState<string[]>([]);

  const loaded = useMemo(() => loadedSalesOf(shipment), [shipment]);

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<ArriveShipmentValues>({
    resolver: zodResolver(arriveShipmentSchema),
    defaultValues: {
      sales: loaded.map((l) => ({
        // Pre-filled with what was loaded: on a good trip nothing was lost, and
        // the admin confirms rather than copies figures off a waybill.
        lines: l.lines.map((line) => ({
          commodityId: line.commodityId,
          receivedKg: String(line.loadedKg),
        })),
        saleId: l.sale.id,
        settledTotalGhs: "",
      })),
    },
  });

  const finish = () => {
    // Arrival is when the buyer signs for the goods - the caller steers the
    // admin into filing that evidence.
    notify.success("Marked arrived", {
      description:
        "Upload the buyer-signed delivery note under Documents so the delivery is on the record.",
    });
    onArrived?.();
    onClose();
  };

  /** The "weigh it later" path the backend explicitly allows. */
  const onArriveWithoutFigures = async () => {
    setServerError(null);
    try {
      await arrive({ id: shipment.id }).unwrap();
      finish();
    } catch (err) {
      setServerError(extractApiError(err).message);
    }
  };

  const onSubmit = async (values: ArriveShipmentValues) => {
    setServerError(null);
    // The API refuses a settlement below what the buyer has already paid: the
    // payment ledger is append-only, so the honest correction is to reverse a
    // payment first. Caught here as well so the refusal names the sale - the
    // server's 409 does not, and a trip can carry several.
    const offending = (values.sales ?? [])
      .filter((s) => {
        const paid = loaded.find((l) => l.sale.id === s.saleId)?.sale.paidGhs;
        return paid !== null && paid !== undefined && Number(s.settledTotalGhs) < paid;
      })
      .map((s) => s.saleId);
    setBelowPaid(offending);
    if (offending.length > 0) return;

    try {
      await arrive({
        id: shipment.id,
        sales: (values.sales ?? []).map((s) => ({
          lines: s.lines.map((l) => ({
            commodityId: l.commodityId,
            receivedKg: Number(l.receivedKg),
          })),
          saleId: s.saleId,
          settledTotalGhs: Number(s.settledTotalGhs),
        })),
      }).unwrap();
      finish();
    } catch (err) {
      // SETTLED_BELOW_PAID, SALE_NOT_ON_SHIPMENT and COMMODITY_NOT_LOADED all
      // arrive with the server's own words, and all of them need the figures
      // kept on screen to be corrected - so they show here, not in a toast
      // over a closed dialog.
      setServerError(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Arrival - {shipment.transactionNo}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            What came off the truck, and what each buyer will pay for it. The
            agreed price stays on the record either way.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loaded.length === 0 ? (
          <p className="text-[13px] text-adm-muted">
            No lots were allocated on this trip, so there is nothing to weigh
            in. Mark it arrived and record the figures once the goods are
            allocated.
          </p>
        ) : (
          <form
            noValidate
            id="arrival-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-3"
          >
            {loaded.map((l, index) => (
              <SaleArrival
                key={l.sale.id}
                belowPaid={belowPaid.includes(l.sale.id)}
                control={control}
                index={index}
                loaded={l}
                register={register}
                setValue={setValue}
              />
            ))}

            {/* Zod's messages sit on nested paths the sub-cards do not render
                individually - a blank weight is one message, and it belongs
                where the eye lands after the last box. */}
            {errors.sales ? (
              <p role="alert" className="text-[12.5px] font-medium text-console-red">
                Every weight and every payment needs a figure. Enter 0 where
                nothing arrived.
              </p>
            ) : null}
          </form>
        )}

        {serverError ? (
          <p
            role="alert"
            className="rounded-none border border-console-red/50 bg-console-red/[0.06] px-3 py-2 text-[12.5px] font-medium text-console-red"
          >
            {serverError}
          </p>
        ) : null}

        {/* Stacked on a phone and never side by side: "Record arrival" writes
            money onto every sale on the trip, and it must not sit a thumb's
            width from the button that skips the figures entirely. */}
        <ResponsiveDialogFooter className="gap-2">
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            disabled={isLoading}
            onClick={() => void onArriveWithoutFigures()}
          >
            Weigh it later
          </AdminButton>
          {loaded.length > 0 ? (
            <AdminButton
              type="submit"
              form="arrival-form"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Recording…" : "Record arrival"}
            </AdminButton>
          ) : null}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
