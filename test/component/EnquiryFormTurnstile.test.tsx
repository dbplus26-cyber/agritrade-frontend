import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnquiryForm } from "@/components/contact/enquiry-form";

/**
 * The Turnstile-gated submit path. A site key is mocked in so
 * TURNSTILE_ENABLED is true, and `window.turnstile` is faked (the widget
 * checks for it at mount instead of waiting on the Cloudflare script), which
 * hands the test the widget's `callback` to "solve" the challenge on demand.
 */
const { sendTrigger } = vi.hoisted(() => ({ sendTrigger: vi.fn() }));

vi.mock("@/redux/enquiries/enquiries-api", () => ({
  useCreateEnquiryMutation: () => [sendTrigger, { isLoading: false }],
}));

vi.mock("@/lib/env", () => ({
  env: {
    SERVER_URI: "",
    BASE_URL: "http://localhost:3000",
    TURNSTILE_SITE_KEY: "test-site-key",
  },
}));

interface RenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

let widgetOptions: RenderOptions | null = null;

beforeEach(() => {
  sendTrigger.mockReset();
  sendTrigger.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        message: "Enquiry received",
        data: { reference: "EN-4F2A" },
      }),
  });
  widgetOptions = null;
  window.turnstile = {
    render: vi.fn((_el: HTMLElement, opts: RenderOptions) => {
      widgetOptions = opts;
      return "widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  } as unknown as typeof window.turnstile;
});

const fillValidEnquiry = async () => {
  await userEvent.type(screen.getByLabelText(/FULL NAME/), "Kwame Mensah");
  await userEvent.type(screen.getByLabelText(/PHONE/), "024 123 4567");
  await userEvent.type(screen.getByLabelText(/MESSAGE/), "30 tonnes of maize.");
};

describe("EnquiryForm with Turnstile enforced", () => {
  it("blocks submission until the challenge is solved", async () => {
    render(<EnquiryForm />);
    await fillValidEnquiry();

    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(
      await screen.findByText(
        "Please complete the verification to send your enquiry.",
      ),
    ).toBeInTheDocument();
    expect(sendTrigger).not.toHaveBeenCalled();
  });

  it("submits with the solved token and clears the verification error", async () => {
    render(<EnquiryForm />);
    await fillValidEnquiry();

    // First attempt without a token surfaces the gate…
    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));
    await screen.findByText(
      "Please complete the verification to send your enquiry.",
    );

    // …then the visitor solves the challenge.
    expect(widgetOptions).not.toBeNull();
    act(() => widgetOptions?.callback("solved-token-123"));
    expect(
      screen.queryByText(
        "Please complete the verification to send your enquiry.",
      ),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

    expect(
      await screen.findByText("Enquiry on file. Thank you."),
    ).toBeInTheDocument();
    expect(sendTrigger).toHaveBeenCalledTimes(1);
    expect(sendTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: "solved-token-123" }),
    );
  });
});
