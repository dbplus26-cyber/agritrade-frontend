// test/component/ConfirmEmailChange.test.tsx
//
// The email-change confirmation page's working half. The backend has emailed
// `${FRONTEND_URL}/confirm-email-change?token=...` all along; the route only
// now exists, so this pins the two properties that make it safe to exist:
//
//   * the single-use token is spent by a BUTTON PRESS, never on render - mail
//     scanners follow every link in a message before the person sees it, and a
//     confirm-on-mount would let the scanner burn the link;
//   * a server refusal is shown in place, because the person arrived from an
//     email and has no other context on this page.
//
// Mocked at the RTK hook boundary, same rig as the other component tests.
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmEmailChange } from "@/components/auth/confirm-email-change";

const { confirmMock, replaceMock, successToast } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  replaceMock: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/redux/auth/auth-api", () => ({
  useConfirmEmailChangeMutation: () => [confirmMock, { isLoading: false }],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: successToast },
}));

const user = userEventBase.setup();

beforeEach(() => {
  confirmMock.mockReset();
  replaceMock.mockReset();
  successToast.mockReset();
});

describe("ConfirmEmailChange", () => {
  it("does not spend the token on render - only the button press posts it", async () => {
    confirmMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<ConfirmEmailChange token="tok-abcdefghijklmnopqrstuvwxyz-123456" />);

    // Rendering (what a scanner's GET triggers) must post nothing.
    expect(confirmMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /confirm new email/i }));
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock).toHaveBeenCalledWith({
      token: "tok-abcdefghijklmnopqrstuvwxyz-123456",
    });
    expect(replaceMock).toHaveBeenCalledWith("/login");
    expect(successToast).toHaveBeenCalled();
  });

  it("shows a server refusal in place, with the retry path named", async () => {
    confirmMock.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: { message: "Invalid or expired confirmation link." },
        }),
    });
    render(<ConfirmEmailChange token="tok-expired-abcdefghijklmnopqrstu" />);

    await user.click(screen.getByRole("button", { name: /confirm new email/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Invalid or expired");
    expect(alert.textContent).toContain("request the change again");
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
