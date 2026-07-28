import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IApprovalListQuery,
  IApprovalListResponse,
  IApprovalResponse,
  IDecideApprovalInput,
  IPendingCountResponse,
} from "@/types/approval.types";

/**
 * A decision can apply a stock adjustment, acknowledge a flagged purchase,
 * or publish a commodity - so deciding refreshes every surface an approved
 * payload can touch.
 */
const DECISION_INVALIDATES = [
  { type: "Approvals" as const, id: "LIST" },
  { type: "ApprovalsCount" as const, id: "COUNT" },
  { type: "Stock" as const, id: "LIST" },
  { type: "StockMovements" as const, id: "LIST" },
  { type: "Purchases" as const, id: "LIST" },
  { type: "Commodities" as const, id: "LIST" },
];

/** The approvals inbox, mirroring the backend `/admin/approvals` surface. */
export const approvalsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getApprovals: builder.query<
      IApprovalListResponse,
      IApprovalListQuery | void
    >({
      query: (params) => `admin/approvals${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Approvals" as const, id: "LIST" },
              ...result.data.map((a) => ({
                type: "Approvals" as const,
                id: a.id,
              })),
            ]
          : [{ type: "Approvals" as const, id: "LIST" }],
    }),

    getApproval: builder.query<IApprovalResponse, string>({
      query: (id) => `admin/approvals/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Approvals", id }],
    }),

    getPendingApprovalsCount: builder.query<IPendingCountResponse, void>({
      query: () => "admin/approvals/pending-count",
      providesTags: [{ type: "ApprovalsCount", id: "COUNT" }],
    }),

    approveApproval: builder.mutation<IApprovalResponse, IDecideApprovalInput>({
      query: ({ id, note }) => ({
        url: `admin/approvals/${id}/approve`,
        method: "PATCH",
        // A body-less approve is legitimate; only send a note when given.
        ...(note ? { body: { note } } : {}),
      }),
      invalidatesTags: DECISION_INVALIDATES,
    }),

    rejectApproval: builder.mutation<IApprovalResponse, IDecideApprovalInput>({
      query: ({ id, note }) => ({
        url: `admin/approvals/${id}/reject`,
        method: "PATCH",
        body: { note },
      }),
      invalidatesTags: DECISION_INVALIDATES,
    }),
  }),
});

export const {
  useGetApprovalsQuery,
  useGetApprovalQuery,
  useGetPendingApprovalsCountQuery,
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} = approvalsApi;
