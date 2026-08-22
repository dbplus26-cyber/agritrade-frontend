// test/component/RequireAuth.test.tsx
//
// The console's gate. Four states matter:
//
//   * a validated session renders the console;
//   * a persisted user renders optimistically while /me revalidates - but a
//     SETTLED failure clears the session and bounces to /login?from=...;
//   * the bounce must wait for the failure to SETTLE: acting on a cached 401
//     while the refetch is in flight revokes a brand-new session right after
//     login;
//   * first load with no persisted user shows only the loading screen -
//     nothing of the console leaks before the check answers.
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RequireAuth } from "@/components/auth/require-auth";

const { logoutMock, meState, replaceMock, userState } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  meState: {
    value: { data: undefined, isError: false, isFetching: false } as {
      data?: unknown;
      isError: boolean;
      isFetching: boolean;
    },
  },
  replaceMock: vi.fn(),
  userState: { value: null as null | { id: string } },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/cash-book",
  useRouter: () => ({ replace: replaceMock }),
}));
vi.mock("@/redux/auth/auth-api", () => ({
  useGetMeQuery: () => meState.value,
  useLogoutMutation: () => [logoutMock],
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => userState.value,
}));
vi.mock("@/hooks/use-hydrated", () => ({ useHydrated: () => true }));
vi.mock("@/components/ui/LoadingScreen", () => ({
  LoadingScreen: () => <div data-testid="loading" />,
}));

beforeEach(() => {
  replaceMock.mockReset();
  logoutMock.mockReset();
  logoutMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  userState.value = null;
  meState.value = { data: undefined, isError: false, isFetching: false };
});

describe("RequireAuth", () => {
  it("renders the console for a validated session", () => {
    meState.value = { data: { user: { id: "u1" } }, isError: false, isFetching: false };
    render(<RequireAuth><div data-testid="console" /></RequireAuth>);
    expect(screen.getByTestId("console")).toBeTruthy();
  });

  it("renders optimistically from a persisted user while /me revalidates", () => {
    userState.value = { id: "u1" };
    meState.value = { data: undefined, isError: false, isFetching: true };
    render(<RequireAuth><div data-testid="console" /></RequireAuth>);
    expect(screen.getByTestId("console")).toBeTruthy();
  });

  it("clears the session and bounces to login when the check SETTLES as failed", async () => {
    meState.value = { data: undefined, isError: true, isFetching: false };
    render(<RequireAuth><div data-testid="console" /></RequireAuth>);

    // Nothing of the console shows while the redirect fires.
    expect(screen.queryByTestId("console")).toBeNull();
    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith(
        "/login?from=%2Fadmin%2Fcash-book",
      );
    });
  });

  it("does NOT act on a cached failure while the refetch is in flight", () => {
    // After logout -> login the cache still holds the logout's 401 while /me
    // revalidates. Treating that as a verdict revokes the brand-new session,
    // so isError && isFetching must do nothing.
    meState.value = { data: undefined, isError: true, isFetching: true };
    render(<RequireAuth><div data-testid="console" /></RequireAuth>);
    expect(logoutMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("loading")).toBeTruthy();
  });

  it("shows only the loading screen on first load with no persisted user", () => {
    meState.value = { data: undefined, isError: false, isFetching: true };
    render(<RequireAuth><div data-testid="console" /></RequireAuth>);
    expect(screen.queryByTestId("console")).toBeNull();
    expect(screen.getByTestId("loading")).toBeTruthy();
  });
});
