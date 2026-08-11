/**
 * The authenticated console user, mirroring the backend's `toPublicUser`
 * mapper (agritrade-backend `src/utils/mappers/user.mapper.ts`) - the safe,
 * client-facing subset (never the password hash or `tokenVersion`).
 */
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  STAFF = "STAFF",
  AGENT = "AGENT",
}

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** A requested new sign-in email awaiting confirmation from that mailbox. */
  pendingEmail: string | null;
  phone: string | null;
  profilePicture: string | null;
  role: UserRole;
  /** Owner-delegable approval right (decides pending ApprovalRequests). */
  canApprove: boolean;
  /** When false, money columns are stripped from API responses for this user. */
  financialVisibility: boolean;
  isActive: boolean;
  twoFactorEnabled: boolean;
  /** Hard-blocked after repeated failed logins; null when not blocked. */
  blockedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * The caller's effective permission keys (role baseline plus personal
   * grants). Present on `/auth/me` only - the admin user list does not carry
   * it, so treat absence as "unknown", not "none".
   */
  permissions?: string[];
}

/**
 * Standard success envelope carrying a single user. Mirrors the backend
 * `sendSuccess({ user })` shape exactly: `{ message, data: { user } }`
 * (login, 2FA verify/confirm/disable, refresh-token, and `/auth/me` all use it).
 */
export interface IUserResponse {
  message: string;
  data: { user: IUser };
}

/** Paginated user list (`GET /admin/users`). */
export interface IUserListResponse {
  message: string;
  data: IUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface IUserListQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  blocked?: boolean;
  search?: string;
}

/** Mirrors the backend `createUserSchema` (POST /admin/users). */
export interface ICreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
}

/** Mirrors the backend `updateUserSchema` (PATCH /admin/users/:id). */
export interface IUpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  /** Clears the existing photo (the backend deletes the Cloudinary asset). */
  removeProfilePicture?: boolean;
}
