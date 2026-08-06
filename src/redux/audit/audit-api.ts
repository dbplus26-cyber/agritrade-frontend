import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAuditListQuery,
  IAuditListResponse,
} from "@/types/audit.types";

/**
 * The audit-log register (super-admin), mirroring GET /admin/audit-logs.
 * Read-only - a single tagged list query; audited mutations elsewhere don't
 * need to invalidate it eagerly (the trail is append-only and refetches on
 * revisit), so no invalidation wiring here.
 */
export const auditApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<IAuditListResponse, IAuditListQuery | void>({
      query: (params) => `admin/audit-logs${toQueryString(params ?? {})}`,
      providesTags: [{ type: "AuditLogs", id: "LIST" }],
    }),
  }),
});

export const { useGetAuditLogsQuery } = auditApi;
