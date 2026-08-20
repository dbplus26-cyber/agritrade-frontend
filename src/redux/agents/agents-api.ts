import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { IAccountTransferResponse } from "@/types/cashbook.types";
import type {
  IAgentDetailResponse,
  IAgentListQuery,
  IAgentListResponse,
  ICreateReconciliationInput,
  IFloatLedgerQuery,
  IAgentMoneySummaryResponse,
  IFloatLedgerResponse,
  IReconciliationListResponse,
  IReconciliationPreviewResponse,
  IReconciliationResponse,
  ITopUpInput,
} from "@/types/agent.types";

/** Field agents, their float ledgers and reconciliations
 * (`/admin/agents`). */
export const agentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAgents: builder.query<IAgentListResponse, IAgentListQuery | void>({
      query: (params) => `admin/agents${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Agents", id: "LIST" }],
    }),

    getAgent: builder.query<IAgentDetailResponse, string>({
      query: (agentUserId) => `admin/agents/${agentUserId}`,
      providesTags: (_r, _e, id) => [{ type: "Agents", id }],
    }),

    getAgentFloat: builder.query<
      IFloatLedgerResponse,
      { agentUserId: string; params?: IFloatLedgerQuery }
    >({
      query: ({ agentUserId, params }) =>
        `admin/agents/${agentUserId}/float${toQueryString(params ?? {})}`,
      providesTags: (_r, _e, { agentUserId }) => [
        { type: "FloatLedger", id: "LIST" },
        { type: "FloatLedger", id: agentUserId },
      ],
    }),

    /**
     * Both pots at once: what this person is HOLDING and what they have SENT of
     * the company's money. The float ledger beside it walks held accounts only,
     * and a send on authority never touches one - so on its own it showed a
     * person who had moved thousands as having spent nothing.
     *
     * Tagged with FloatLedger so a top-up or a reconciliation refreshes the
     * summary in the same beat as the ledger under it; a card that disagrees
     * with the rows below it is worse than no card.
     */
    getAgentMoneySummary: builder.query<
      IAgentMoneySummaryResponse,
      { agentUserId: string; params?: IFloatLedgerQuery }
    >({
      query: ({ agentUserId, params }) =>
        `admin/agents/${agentUserId}/money${toQueryString(params ?? {})}`,
      providesTags: (_r, _e, { agentUserId }) => [
        { type: "FloatLedger", id: "LIST" },
        { type: "FloatLedger", id: agentUserId },
      ],
    }),

    topUpAgent: builder.mutation<
      IAccountTransferResponse,
      { agentUserId: string; body: ITopUpInput }
    >({
      query: ({ agentUserId, body }) => ({
        url: `admin/agents/${agentUserId}/top-up`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { agentUserId }) => [
        { type: "Agents", id: "LIST" },
        { type: "Agents", id: agentUserId },
        { type: "FloatLedger", id: agentUserId },
        { type: "Reconciliations", id: agentUserId },
      ],
    }),

    getAgentReconciliations: builder.query<
      IReconciliationListResponse,
      { agentUserId: string; page?: number; limit?: number }
    >({
      query: ({ agentUserId, ...params }) =>
        `admin/agents/${agentUserId}/reconciliations${toQueryString(params)}`,
      providesTags: (_r, _e, { agentUserId }) => [
        { type: "Reconciliations", id: agentUserId },
      ],
    }),

    getReconciliationPreview: builder.query<
      IReconciliationPreviewResponse,
      string
    >({
      query: (agentUserId) =>
        `admin/agents/${agentUserId}/reconciliations/preview`,
      // The preview is a live computation - never serve a stale one.
      providesTags: (_r, _e, agentUserId) => [
        { type: "Reconciliations", id: `preview-${agentUserId}` },
        { type: "FloatLedger", id: agentUserId },
      ],
    }),

    createReconciliation: builder.mutation<
      IReconciliationResponse,
      { agentUserId: string; body: ICreateReconciliationInput }
    >({
      query: ({ agentUserId, body }) => ({
        url: `admin/agents/${agentUserId}/reconciliations`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { agentUserId }) => [
        { type: "Agents", id: "LIST" },
        { type: "Agents", id: agentUserId },
        { type: "FloatLedger", id: agentUserId },
        { type: "Reconciliations", id: agentUserId },
        { type: "Reconciliations", id: `preview-${agentUserId}` },
      ],
    }),
  }),
});

export const {
  useGetAgentsQuery,
  useGetAgentQuery,
  useGetAgentMoneySummaryQuery,
  useGetAgentFloatQuery,
  useTopUpAgentMutation,
  useGetAgentReconciliationsQuery,
  useGetReconciliationPreviewQuery,
  useCreateReconciliationMutation,
} = agentsApi;
