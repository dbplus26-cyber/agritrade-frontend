"use client";

import { useState } from "react";
import { ActionRow, AdminButton, AdminCard, adminLinkClass, SectionHeading } from "@/components/admin/ui";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { FilePicker } from "@/components/ui/FilePicker";
import { useAuthRole } from "@/hooks/use-auth-role";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useRevokeShipmentSignatureMutation,
  useSignShipmentDriverMutation,
  useSignShipmentOwnerMutation,
} from "@/redux/shipments/shipments-api";
import type {
  IShipment,
  IShipmentSignature,
} from "@/types/admin-shipment.types";
import { formatShipmentDate } from "./shipment-bits";

/**
 * The two signature slots a waybill carries.
 *
 * This is a depot control before it is a console one. The driver signs on
 * whichever phone is to hand, standing beside a loaded truck, often on a
 * connection that will not carry a photograph - so the primary path is DRAW,
 * not upload, the pad is one tap away, and the driver's name is pre-filled
 * from the trip rather than typed on a phone keyboard in the sun.
 *
 * The slots are deliberately two separate controls rather than one pad with a
 * "who is signing?" picker. The owner's mark is not the driver's, the server
 * refuses staff on the owner's slot outright, and a single control that could
 * apply either would make the boundary a matter of which option was selected.
 *
 * Nothing here can overwrite a mark. A filled slot shows what was signed and
 * stops offering the pad; correcting one is a withdrawal with a reason, and
 * the owner is the only person offered it.
 */

const SLOT_HELP: Record<"driver" | "owner", string> = {
  driver:
    "Hand the phone to the driver at the depot. His mark, his name and yours are filed against this trip.",
  owner: "The business's countersignature on this trip.",
};

/** How the mark was made, in the words a reader needs rather than an enum. */
const SOURCE_LABEL: Record<IShipmentSignature["source"], string> = {
  DRAWN: "Drawn on a device",
  SAVED: "Applied from the saved signature",
  UPLOADED: "Uploaded image",
};

/** A filled slot: the mark, and everything that makes it mean something. */
function CapturedSignature({
  signature,
  slot,
}: {
  signature: IShipmentSignature;
  slot: "driver" | "owner";
}) {
  return (
    <div>
      <div className="flex h-[56px] items-end justify-center border-b border-adm-strong bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary asset, no loader wanted */}
        <img
          src={signature.imageUrl}
          alt={`${slot === "driver" ? "Driver" : "Owner"}'s signature`}
          className="max-h-[52px] max-w-full object-contain"
        />
      </div>
      <dl className="mt-2 space-y-0.5 text-[11px] text-adm-muted">
        <div className="[overflow-wrap:anywhere]">
          <dt className="sr-only">Signed by</dt>
          <dd className="font-semibold text-adm-ink">{signature.signedName}</dd>
        </div>
        <div>
          <dt className="sr-only">Signed at</dt>
          <dd>{formatShipmentDate(signature.signedAt)}</dd>
        </div>
        {/* Who held the device. A driver has no login, so this line is the
            difference between "the driver signed" and "somebody drew a
            squiggle" - it belongs on the face of the slot, not in a tooltip
            and not only in the audit log. */}
        <div className="[overflow-wrap:anywhere]">
          <dt className="sr-only">Taken by</dt>
          <dd>
            {SOURCE_LABEL[signature.source]} · taken by{" "}
            {signature.capturedByName}
          </dd>
        </div>
      </dl>
      {signature.manifestChanged ? (
        <p className="mt-2 border-l-2 border-console-red/60 bg-console-red/5 px-2 py-1.5 text-[10.5px] text-adm-ink">
          The load has changed since this was signed. The mark still stands for
          what it was given for, not for what is on the truck now.
        </p>
      ) : null}
    </div>
  );
}

/** An empty slot: nothing signed, and the sheet still works in ink. */
function EmptySlot({ children }: { children?: React.ReactNode }) {
  return (
    <div>
      <div className="flex h-[56px] items-center justify-center border-b border-dashed border-adm-strong/60">
        <span className="text-[10.5px] text-adm-faint">Not signed</span>
      </div>
      {children}
    </div>
  );
}

export function ShipmentSignatures({ shipment }: { shipment: IShipment }) {
  const { isSuperAdmin } = useAuthRole();
  const [signDriver, driverState] = useSignShipmentDriverMutation();
  const [signOwner, ownerState] = useSignShipmentOwnerMutation();
  const [revoke, revokeState] = useRevokeShipmentSignatureMutation();
  /** Which slot's pad is open, if any. */
  const [padOpen, setPadOpen] = useState<"driver" | "owner" | null>(null);
  /** Which slot is being withdrawn, and the reason typed so far. */
  const [withdrawing, setWithdrawing] = useState<"driver" | "owner" | null>(
    null,
  );
  const [reason, setReason] = useState("");

  const { driver, owner } = shipment.signatures;
  // The server locks both slots at dispatch: what left the shed cannot be
  // signed for afterwards, and what was signed cannot be withdrawn.
  const open = shipment.status === "PLANNED" || shipment.status === "LOADING";

  const submitDriver = async (file: File) => {
    setPadOpen(null);
    try {
      await signDriver({
        file,
        id: shipment.id,
        signedName: shipment.driverName,
      }).unwrap();
      notify.success("The driver's signature is on this waybill");
    } catch (err) {
      notify.error("Couldn't save the signature", {
        description: extractApiError(err).message,
      });
    }
  };

  const submitOwner = async (file?: File) => {
    setPadOpen(null);
    try {
      await signOwner({ file, id: shipment.id }).unwrap();
      notify.success("Signed");
    } catch (err) {
      const apiError = extractApiError(err);
      notify.error("Couldn't sign", {
        description:
          apiError.code === "SIGNATURE_REQUIRED"
            ? "There is no saved signature yet - sign on the pad, or save one in Settings."
            : apiError.message,
      });
    }
  };

  const submitWithdrawal = async (slot: "driver" | "owner") => {
    try {
      await revoke({ id: shipment.id, reason: reason.trim(), role: slot }).unwrap();
      setWithdrawing(null);
      setReason("");
      notify.success("Signature withdrawn - the reason is on the record");
    } catch (err) {
      notify.error("Couldn't withdraw the signature", {
        description: extractApiError(err).message,
      });
    }
  };

  const busy = driverState.isLoading || ownerState.isLoading;

  /** One slot, top to bottom: title, mark or empty rule, then its actions. */
  const slot = (which: "driver" | "owner") => {
    const signature = which === "driver" ? driver : owner;
    // The owner's slot is shown to everyone - staff need to see whether a trip
    // has been countersigned - but only the owner is offered anything on it.
    // A button that earns a 403 is a lie about who may do what.
    const mayAct = open && (which === "driver" || isSuperAdmin);

    return (
      <div className="min-w-0 border border-adm-line bg-adm-sunken/40 p-3">
        <h3 className="text-[11px] font-bold tracking-[0.06em] text-adm-muted uppercase">
          {which === "driver" ? "Driver's signature" : "Owner's signature"}
        </h3>
        <p className="mt-0.5 mb-2 text-[10.5px] text-adm-muted">
          {SLOT_HELP[which]}
        </p>

        {signature ? (
          <CapturedSignature signature={signature} slot={which} />
        ) : (
          <EmptySlot>
            {mayAct ? (
              <div className="mt-2 flex flex-col gap-2">
                {/* Drawing is the primary path and gets the primary button:
                    at a depot on 2G, a drawn PNG is a few kilobytes and a
                    photograph of a printed sheet is several megabytes. */}
                <AdminButton
                  className="w-full"
                  disabled={busy}
                  onClick={() =>
                    setPadOpen((v) => (v === which ? null : which))
                  }
                  aria-expanded={padOpen === which}
                >
                  {padOpen === which
                    ? "Hide the pad"
                    : which === "driver"
                      ? "Driver signs here"
                      : "Sign here"}
                </AdminButton>
                {which === "owner" ? (
                  <AdminButton
                    className="w-full"
                    disabled={busy}
                    loading={ownerState.isLoading}
                    onClick={() => void submitOwner()}
                    variant="secondary"
                  >
                    Use my saved signature
                  </AdminButton>
                ) : null}
                {padOpen === which ? (
                  <div className="mt-1">
                    <SignaturePad
                      fileName={`${which}-signature.png`}
                      onCapture={(file) => {
                        void (which === "driver"
                          ? submitDriver(file)
                          : submitOwner(file));
                      }}
                    />
                    {/* The scanned/photographed route stays available for the
                        wet signature somebody already has on paper. */}
                    <div className="mt-2">
                      <FilePicker
                        accept="image/*"
                        busy={busy}
                        confirmLabel="Use this image"
                        hint="A photo of a signature, up to 10MB"
                        onConfirm={(file) => {
                          if (!file) return Promise.resolve();
                          return which === "driver"
                            ? submitDriver(file)
                            : submitOwner(file);
                        }}
                        triggerLabel="Or upload an image"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </EmptySlot>
        )}

        {/* Withdrawal is the owner's alone: it is the one action that takes a
            party's mark off a trip's evidence. Typing the reason IS the
            friction, and the reason stays on the record. */}
        {signature && open && isSuperAdmin ? (
          <div className="mt-3 border-t border-adm-hairline pt-2">
            {withdrawing === which ? (
              <div className="flex flex-col gap-2">
                <label
                  className="text-[10.5px] font-semibold text-adm-ink"
                  htmlFor={`withdraw-reason-${which}`}
                >
                  Why is this being withdrawn?
                </label>
                <textarea
                  id={`withdraw-reason-${which}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="w-full rounded-none border border-adm-line bg-adm-card px-2.5 py-1.5 text-[11.5px] outline-none transition-colors placeholder:text-adm-faint focus:border-console"
                  placeholder="Signed by the wrong driver at the gate"
                />
                <ActionRow>
                  <AdminButton
                    disabled={reason.trim().length < 3 || revokeState.isLoading}
                    loading={revokeState.isLoading}
                    onClick={() => void submitWithdrawal(which)}
                    size="sm"
                    variant="danger"
                  >
                    Withdraw signature
                  </AdminButton>
                  <AdminButton
                    onClick={() => {
                      setWithdrawing(null);
                      setReason("");
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Keep it
                  </AdminButton>
                </ActionRow>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setWithdrawing(which);
                  setReason("");
                }}
                className={cn(
                  adminLinkClass,
                  "cursor-pointer text-[11px] font-semibold",
                )}
              >
                Withdraw this signature
              </button>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <AdminCard className="p-5">
      <SectionHeading
        className="mb-1.5"
        hint="Who has signed this trip's waybill. Both marks print on the waybill itself; an unsigned slot prints an empty line to sign by hand."
      >
        Signatures
      </SectionHeading>
      <p className="mb-3 text-[11px] text-adm-muted">
        {open
          ? "Signed before the truck leaves. A signature can't be replaced once it is on - it is withdrawn, with a reason."
          : "The truck has left. What was signed is part of this trip's record now."}
      </p>
      {/* One column on a phone - a signature slot beside another is unreadable
          at 360px - and two from the point the card has the room for them. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slot("driver")}
        {slot("owner")}
      </div>
    </AdminCard>
  );
}
