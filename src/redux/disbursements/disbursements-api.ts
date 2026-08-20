import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateDisbursementInput,
  IDisbursement,
  IDisbursementListQuery,
  IDisbursementListResponse,
  IDisbursementResponse,
  IResolveDisbursementInput,
  IRecipientNameResponse,
  ISupportedBanksResponse,
} from "@/types/disbursement.types";

/**
 * Money OUT through Hubtel (`/admin/disbursements`, `/agent/disbursements`).
 *
 * Two surfaces, deliberately separate endpoints rather than one with a flag:
 * the owner's REGISTER sees every send in the business, while `mine` is
 * scoped server-side to the caller's own allocation and structurally cannot
 * return anybody else's. Collapsing them into one call would put that
 * distinction in a query parameter, which is the wrong place for it.
 *
 * A send is real money leaving, so every create carries an Idempotency-Key -
 * mandatory for the holder surfaces (a field retry on a bad connection must
 * always be safe advice) and supplied here for the owner's too.
 */
export const disbursementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /** The whole register, owner-only. */
    getDisbursements: builder.query<
      IDisbursementListResponse,
      IDisbursementListQuery | void
    >({
      query: (params) => `admin/disbursements${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Disbursements" as const, id: "LIST" },
              ...result.data.map((d) => ({
                type: "Disbursements" as const,
                id: d.id,
              })),
            ]
          : [{ type: "Disbursements" as const, id: "LIST" }],
    }),

    getDisbursement: builder.query<IDisbursementResponse, string>({
      query: (id) => `admin/disbursements/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Disbursements", id }],
    }),

    /** The GhIPSS bank vocabulary behind the send-to-bank picker. */
    getSupportedBanks: builder.query<ISupportedBanksResponse, void>({
      query: () => "admin/disbursements/banks",
      // Static for the lifetime of a deployment; there is nothing to
      // invalidate it, so it is fetched once and kept.
      keepUnusedDataFor: 3600,
    }),

    /** The verified-name hint under the MoMo number field: whose name Hubtel
     * has for this number on this network. Cached per number+network pair, so
     * flicking between fields never re-asks. */
    getRecipientName: builder.query<
      IRecipientNameResponse,
      { channel: string; msisdn: string; surface: "admin" | "agent" }
    >({
      query: ({ channel, msisdn, surface }) =>
        `${surface === "agent" ? "agent" : "admin/disbursements"}/recipient-name` +
        `?msisdn=${encodeURIComponent(msisdn)}&channel=${encodeURIComponent(channel)}`,
      keepUnusedDataFor: 600,
    }),

    createDisbursement: builder.mutation<
      IDisbursementResponse,
      { body: ICreateDisbursementInput; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: "admin/disbursements",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      // A send moves the company balance and may hold a float, so the
      // treasury and the holder list are stale the moment this returns.
      invalidatesTags: [
        { type: "Disbursements", id: "LIST" },
        { type: "Treasury", id: "OVERVIEW" },
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        // The hold debits the payout wallet the moment the send is asked for.
        "CashBook",
      ],
    }),

    /**
     * Ask Hubtel where a still-unsettled send actually got to. The background
     * sweep does this too; this is the owner not wanting to wait for it.
     */
    checkDisbursementStatus: builder.mutation<IDisbursementResponse, string>({
      query: (id) => ({
        url: `admin/disbursements/${id}/check-status`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Disbursements", id },
        { type: "Disbursements", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        // A settlement can post the charge or the failed-send refund.
        "CashBook",
      ],
    }),

    /**
     * The escape hatch when Hubtel will not answer at all: the owner attests
     * what really happened and the ledger follows. The reason is mandatory
     * because this is the one place a human overrides the rail.
     */
    resolveDisbursement: builder.mutation<
      IDisbursementResponse,
      { id: string } & IResolveDisbursementInput
    >({
      query: ({ id, ...body }) => ({
        url: `admin/disbursements/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Disbursements", id },
        { type: "Disbursements", id: "LIST" },
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        "CashBook",
      ],
    }),

    // ── The caller's own sends ────────────────────────────────────────

    /**
     * Scoped server-side to the caller. `surface` picks the namespace: staff
     * live in the console, field agents in the /agent app, and the two paths
     * are otherwise identical.
     */
    getMyDisbursements: builder.query<
      IDisbursementListResponse,
      { surface: "agent" | "staff" } & IDisbursementListQuery
    >({
      query: ({ surface, ...params }) =>
        `${surface === "agent" ? "agent/disbursements" : "admin/disbursements/mine"}${toQueryString(params)}`,
      providesTags: [{ type: "Disbursements", id: "MINE" }],
    }),

    createMyDisbursement: builder.mutation<
      IDisbursementResponse,
      {
        body: ICreateDisbursementInput;
        idempotencyKey: string;
        surface: "agent" | "staff";
      }
    >({
      query: ({ body, idempotencyKey, surface }) => ({
        url:
          surface === "agent"
            ? "agent/disbursements"
            : "admin/disbursements/mine",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: [
        { type: "Disbursements", id: "MINE" },
        { type: "Disbursements", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        // The agent surface's own money views provide MINE, not the dead
        // {Agents, ME} this used to name - the "what you can still send"
        // figure sat stale on the very screen the send happened from.
        { type: "FloatLedger", id: "MINE" },
        "CashBook",
      ],
    }),
  }),
});

export const {
  useCheckDisbursementStatusMutation,
  useCreateDisbursementMutation,
  useCreateMyDisbursementMutation,
  useGetDisbursementQuery,
  useGetDisbursementsQuery,
  useGetMyDisbursementsQuery,
  useGetSupportedBanksQuery,
  useGetRecipientNameQuery,
  useResolveDisbursementMutation,
} = disbursementsApi;

/** Shared by the register and the detail page so the two never disagree. */
export const disbursementIsSettled = (d: IDisbursement): boolean =>
  d.status === "SUCCESS" || d.status === "FAILED";
