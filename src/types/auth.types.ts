import type { IUser } from "./user.types";

export interface IUserLoginInput {
  email: string;
  password: string;
}

/**
 * A 2FA challenge - login returns this *instead of* a user when the account
 * has two-factor enabled. The backend also sets a short-lived
 * `twoFactorPending` httpOnly cookie (10 min) that bridges the login step to
 * the verify step, so the verify call carries no user identifier in its body.
 *
 * Mirrors the backend `login` controller's challenge branch exactly:
 * `data: { requiresTwoFactor: true, email }` where `email` is masked.
 */
export interface ITwoFactorChallenge {
  requiresTwoFactor: true;
  /** Masked destination the code was sent to, for display (e.g. k***@mail.com). */
  email: string;
}

/** Login `data` is either a wrapped session user or a 2FA challenge. */
export type LoginData = { user: IUser } | ITwoFactorChallenge;

export interface ILoginResponse {
  message: string;
  data: LoginData;
}

/** Narrows a login payload to the 2FA-challenge branch. */
export function isTwoFactorChallenge(
  data: LoginData,
): data is ITwoFactorChallenge {
  return (data as ITwoFactorChallenge).requiresTwoFactor === true;
}

export interface ITwoFactorVerifyInput {
  code: string;
}

/**
 * Confirming 2FA setup returns the user PLUS the one-time plaintext recovery
 * codes - the only moment they ever exist client-side. Mirrors the backend's
 * `confirmEnableTwoFactor` controller.
 */
export interface ITwoFactorEnabledResponse {
  message: string;
  data: { user: IUser; recoveryCodes: string[] };
}

export interface IRecoveryCodesResponse {
  message: string;
  data: { recoveryCodes: string[] };
}

export interface IForgotPasswordInput {
  email: string;
}

export interface IResetPasswordInput {
  token: string;
  password: string;
}

/** Bare success envelope with no data payload (`{ message }`). */
export interface IMessageResponse {
  message: string;
}
