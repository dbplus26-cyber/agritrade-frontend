import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnquiryForm } from "@/components/contact/enquiry-form";

// Mock the data layer so the form is tested in isolation — no store/network.
const { sendTrigger } = vi.hoisted(() => ({ sendTrigger: vi.fn() }));

vi.mock("@/redux/enquiries/enquiries-api", () => ({
  useCreateEnquiryMutation: () => [sendTrigger, { isLoading: false }],
}));

beforeEach(() => {
  sendTrigger.mockReset();
  sendTrigger.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        message: "Enquiry received",
        data: { reference: "EN-4F2A" },
      }),
  });
});

describe("EnquiryForm", () => {
  it("shows per-field validation and never submits an empty form", async () => {
    render(<EnquiryForm />);
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    expect(await screen.findByText("Please enter your name.")).toBeInTheDocument();
    expect(
      screen.getByText("We need a phone number to reach you."),
    ).toBeInTheDocument();
    expect(sendTrigger).not.toHaveBeenCalled();
  });

  it("files the enquiry and shows the RECEIVED state with the reference", async () => {
    render(<EnquiryForm />);
    await userEvent.type(screen.getByLabelText(/FULL NAME/), "Kwame Mensah");
    await userEvent.type(screen.getByLabelText(/PHONE/), "024 123 4567");
    await userEvent.type(
      screen.getByLabelText(/MESSAGE/),
      "We need 30 tonnes of white maize delivered to Tema.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(await screen.findByText("Enquiry on file. Thank you.")).toBeInTheDocument();
    expect(screen.getByText(/EN-4F2A/)).toBeInTheDocument();
    expect(sendTrigger).toHaveBeenCalledTimes(1);
    expect(sendTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Kwame Mensah",
        subject: "General enquiry",
        email: undefined,
        // Bot-protection fields ride along: empty honeypot, and no Turnstile
        // token while no site key is configured (see EnquiryFormTurnstile.test).
        website: "",
        turnstileToken: undefined,
      }),
    );
  });

  it("renders the honeypot hidden from people and assistive tech", () => {
    const { container } = render(<EnquiryForm />);
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute("aria-hidden", "true");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
  });

  it("prefills the subject and message from a service-page deep link", async () => {
    render(
      <EnquiryForm
        defaultSubject="Land / plots"
        defaultAbout="Plot TML-014 — Kumbungu Road, Plot 14"
      />,
    );
    expect(screen.getByLabelText(/SUBJECT/)).toHaveTextContent("Land / plots");
    // The plot reference is passed through verbatim, whatever it contains;
    // only the separator the form itself writes is ours, and it is a hyphen.
    expect(screen.getByLabelText(/MESSAGE/)).toHaveValue(
      "Regarding Plot TML-014 — Kumbungu Road, Plot 14 - ",
    );
  });

  it("lets the sender file another enquiry from the success state", async () => {
    render(<EnquiryForm />);
    await userEvent.type(screen.getByLabelText(/FULL NAME/), "Adjoa");
    await userEvent.type(screen.getByLabelText(/PHONE/), "024 000 1111");
    await userEvent.type(screen.getByLabelText(/MESSAGE/), "Groundnuts?");
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    await screen.findByText("Enquiry on file. Thank you.");

    await userEvent.click(
      screen.getByRole("button", { name: "Send another enquiry" }),
    );
    expect(screen.getByLabelText(/FULL NAME/)).toHaveValue("");
  });
});
