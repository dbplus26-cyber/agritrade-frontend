// test/component/ShipmentSignatures.test.tsx
//
// The two waybill signature slots on the shipment screen. A driver signs at
// the depot on whoever's phone is to hand; the owner countersigns from the
// console, usually with the signature already saved in Settings.
//
// What is pinned here is what neither the API types nor the server can say
// from this side:
//
//   * the slots are SEPARATE controls - the driver's pad must never be the
//     thing that applies the owner's mark, and the owner's slot is not
//     offered at all to a user who would be refused by the router;
//   * a filled slot shows who signed, when, and WHO HELD THE DEVICE, and
//     stops offering the pad - the console must not invite a staff member to
//     sign over a driver's mark and collect a 409 for it;
//   * "use my saved signature" posts NO file, which is the whole point of
//     saving one, while drawing posts the drawn PNG;
//   * a load that moved after somebody signed is called out on the slot, not
//     buried in a tooltip - it is the fact a haulier dispute turns on;
//   * once the truck has left, neither slot offers anything.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { ShipmentSignatures } from "@/components/admin/trading/shipment-signatures";
import type {
  IShipment,
  IShipmentSignature,
} from "@/types/admin-shipment.types";

const { isSuperAdmin, revokeTrigger, signDriverTrigger, signOwnerTrigger } =
  vi.hoisted(() => ({
    isSuperAdmin: { value: true },
    revokeTrigger: vi.fn(),
    signDriverTrigger: vi.fn(),
    signOwnerTrigger: vi.fn(),
  }));

vi.mock("@/redux/shipments/shipments-api", () => ({
  useRevokeShipmentSignatureMutation: () => [revokeTrigger, { isLoading: false }],
  useSignShipmentDriverMutation: () => [signDriverTrigger, { isLoading: false }],
  useSignShipmentOwnerMutation: () => [signOwnerTrigger, { isLoading: false }],
}));

vi.mock("@/hooks/use-auth-role", () => ({
  useAuthRole: () => ({
    hasRole: () => isSuperAdmin.value,
    isAgent: false,
    isStaff: !isSuperAdmin.value,
    isSuperAdmin: isSuperAdmin.value,
    role: isSuperAdmin.value ? "SUPER_ADMIN" : "STAFF",
  }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

// The pad draws on a canvas, which jsdom has no 2D context for. What this
// component owes the pad is a single thing - hand it a File - so it is stood
// in for by a button that does exactly that.
vi.mock("@/components/ui/SignaturePad", () => ({
  SignaturePad: ({ onCapture }: { onCapture: (file: File) => void }) => (
    <button
      type="button"
      onClick={() => {
        onCapture(new File(["ink"], "signature.png", { type: "image/png" }));
      }}
    >
      capture-drawn-signature
    </button>
  ),
}));

const userEvent = userEventBase.setup({ delay: null });

const signature = (
  overrides: Partial<IShipmentSignature> = {},
): IShipmentSignature => ({
  capturedByName: "Ama Mensah",
  id: "sig-1",
  imageUrl: "https://res.cloudinary.com/test/image/upload/v1/sig.png",
  manifestChanged: false,
  role: "DRIVER",
  signedAt: "2026-08-16T09:30:00.000Z",
  signedName: "Kwame Mensah",
  source: "DRAWN",
  ...overrides,
});

const shipment = (over: Partial<IShipment> = {}): IShipment =>
  ({
    driverName: "Kwame Mensah",
    id: "shp-1",
    signatures: { driver: null, owner: null },
    status: "PLANNED",
    transactionNo: "SHP-2026-00061",
    ...over,
  }) as IShipment;

beforeEach(() => {
  vi.clearAllMocks();
  isSuperAdmin.value = true;
  signDriverTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  signOwnerTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  revokeTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("the driver's slot", () => {
  it("sends the drawn mark, and the driver's name with it", async () => {
    render(<ShipmentSignatures shipment={shipment()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /driver.*sign|sign.*driver/i }),
    );
    await userEvent.click(
      screen.getAllByRole("button", { name: "capture-drawn-signature" })[0]!,
    );

    expect(signDriverTrigger).toHaveBeenCalledTimes(1);
    const arg = signDriverTrigger.mock.calls[0]![0] as {
      file: File;
      id: string;
      signedName: string;
    };
    expect(arg.id).toBe("shp-1");
    // Pre-filled from the trip, so the depot taps once rather than typing a
    // name on a phone keyboard in the sun.
    expect(arg.signedName).toBe("Kwame Mensah");
    expect(arg.file.type).toBe("image/png");
  });

  it("shows a captured mark with who signed and who held the phone", () => {
    render(
      <ShipmentSignatures
        shipment={shipment({
          signatures: { driver: signature(), owner: null },
        })}
      />,
    );

    expect(screen.getByAltText(/driver/i)).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/test/image/upload/v1/sig.png",
    );
    expect(screen.getByText(/Kwame Mensah/)).toBeInTheDocument();
    expect(screen.getByText(/Ama Mensah/)).toBeInTheDocument();
    // No second pad: signing over a live mark is a 409, and offering it is
    // inviting the user to earn one.
    expect(
      screen.queryByRole("button", { name: /driver.*sign|sign.*driver/i }),
    ).not.toBeInTheDocument();
  });

  it("calls out a load that moved after the driver signed", () => {
    render(
      <ShipmentSignatures
        shipment={shipment({
          signatures: {
            driver: signature({ manifestChanged: true }),
            owner: null,
          },
        })}
      />,
    );
    expect(screen.getByText(/changed since/i)).toBeInTheDocument();
  });
});

describe("the owner's slot", () => {
  it("applies the saved signature with no file attached", async () => {
    render(<ShipmentSignatures shipment={shipment()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /use.*saved signature/i }),
    );

    expect(signOwnerTrigger).toHaveBeenCalledTimes(1);
    const arg = signOwnerTrigger.mock.calls[0]![0] as {
      file?: File;
      id: string;
    };
    expect(arg.id).toBe("shp-1");
    // The whole point of a saved signature: the owner does not redraw it.
    expect(arg.file).toBeUndefined();
  });

  it("is not offered to office staff", () => {
    isSuperAdmin.value = false;
    render(<ShipmentSignatures shipment={shipment()} />);

    // The slot is still SHOWN - staff need to see whether the trip has been
    // countersigned - but nothing on it is actionable, because the router
    // would refuse them and a button that 403s is a lie.
    expect(screen.getByText(/owner/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /use.*saved signature/i }),
    ).not.toBeInTheDocument();
    // The driver's slot stays theirs to fill: that is the job.
    expect(
      screen.getByRole("button", { name: /driver.*sign|sign.*driver/i }),
    ).toBeInTheDocument();
  });
});

describe("withdrawing a mark", () => {
  it("cannot be done without saying why", async () => {
    render(
      <ShipmentSignatures
        shipment={shipment({
          signatures: { driver: signature(), owner: null },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /withdraw/i }));

    // Typing the reason IS the friction. Taking a party's mark off a trip's
    // evidence should not be one tap, and the reason stays on the record.
    const submit = screen.getByRole("button", { name: /withdraw signature/i });
    expect(submit).toBeDisabled();
    expect(revokeTrigger).not.toHaveBeenCalled();

    await userEvent.type(
      screen.getByLabelText(/why/i),
      "Signed by the wrong driver",
    );
    await userEvent.click(submit);

    expect(revokeTrigger).toHaveBeenCalledWith({
      id: "shp-1",
      reason: "Signed by the wrong driver",
      role: "driver",
    });
  });

  it("is not offered to office staff", () => {
    isSuperAdmin.value = false;
    render(
      <ShipmentSignatures
        shipment={shipment({
          signatures: { driver: signature(), owner: null },
        })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /withdraw/i }),
    ).not.toBeInTheDocument();
  });
});

describe("once the truck has left", () => {
  it("offers nothing on either slot", () => {
    render(
      <ShipmentSignatures
        shipment={shipment({
          signatures: { driver: signature(), owner: null },
          status: "DISPATCHED",
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /use.*saved signature/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /withdraw/i }),
    ).not.toBeInTheDocument();
    // What was signed is still on the record, and still readable.
    expect(screen.getByText(/Kwame Mensah/)).toBeInTheDocument();
  });
});
