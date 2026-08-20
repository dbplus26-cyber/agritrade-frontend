import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAdjustDriverFeeInput,
  ICreateDriverPaymentPolicyInput,
  IDriverPaymentPolicyListResponse,
  IDriverPaymentPolicyResponse,
  IDriverSettlementResponse,
  IExpensePaymentLedgerResponse,
  IRecordDriverPaymentInput,
  ISetDriverFeeInput,
  IUnpaidExpenseListResponse,
  IUnsettledTripListResponse,
  IUpdateDriverPaymentPolicyInput,
} from "@/types/driver-settlement.types";

/**
 * Driver settlement and the two payable ledgers.
 *
 * Invalidation is the thing worth reading here. Every write below moves money,
 * and the figures it moves are DERIVED - a trip's outstanding balance is its
 * fee minus the sum of its ledger, an expense's is its amount minus the sum of
 * its own. So a write has to invalidate every surface that shows a derived
 * figure, not just the one the user was looking at: the trip, the shipment it
 * belongs to, and the unsettled/unpaid feeds the send-money picker reads.
 * Missing one of those is how a console starts showing two different answers
 * to the same question on two different screens.
 */
export const driverSettlementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ── Policies (owner config) ─────────────────────────────────
    getDriverPaymentPolicies: builder.query<
      IDriverPaymentPolicyListResponse,
      | { page?: number; limit?: number; isActive?: boolean; search?: string }
      | void
    >({
      query: (params) =>
        `admin/driver-payment-policies${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "DriverPaymentPolicies" as const, id: "LIST" },
              ...result.data.map((p) => ({
                type: "DriverPaymentPolicies" as const,
                id: p.id,
              })),
            ]
          : [{ type: "DriverPaymentPolicies" as const, id: "LIST" }],
    }),

    createDriverPaymentPolicy: builder.mutation<
      IDriverPaymentPolicyResponse,
      ICreateDriverPaymentPolicyInput
    >({
      query: (body) => ({
        url: "admin/driver-payment-policies",
        method: "POST",
        body,
      }),
      // A new default demotes the old one, so refresh the whole list.
      invalidatesTags: [{ type: "DriverPaymentPolicies", id: "LIST" }],
    }),

    updateDriverPaymentPolicy: builder.mutation<
      IDriverPaymentPolicyResponse,
      { id: string; body: IUpdateDriverPaymentPolicyInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/driver-payment-policies/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "DriverPaymentPolicies", id: "LIST" }],
    }),

    deleteDriverPaymentPolicy: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `admin/driver-payment-policies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DriverPaymentPolicies", id: "LIST" }],
    }),

    // ── Trip settlement ─────────────────────────────────────────
    getDriverSettlement: builder.query<IDriverSettlementResponse, string>({
      query: (shipmentId) => `admin/shipments/${shipmentId}/driver-settlement`,
      providesTags: (_r, _e, id) => [{ type: "DriverSettlement", id }],
    }),

    setDriverFee: builder.mutation<
      { message: string },
      { shipmentId: string; body: ISetDriverFeeInput }
    >({
      query: ({ shipmentId, body }) => ({
        url: `admin/shipments/${shipmentId}/driver-fee`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { shipmentId }) => [
        { type: "DriverSettlement", id: shipmentId },
        { type: "Shipments", id: shipmentId },
        // Pricing a trip is what puts it ON the unsettled list.
        { type: "DriverSettlement", id: "UNSETTLED" },
      ],
    }),

    /**
     * Changes what a DISPATCHED trip owes, without touching what was agreed.
     * Separate endpoint from setDriverFee on purpose: that one edits a figure,
     * this one appends to a history a driver can be walked through.
     */
    adjustDriverFee: builder.mutation<
      { message: string },
      { body: IAdjustDriverFeeInput; shipmentId: string }
    >({
      query: ({ body, shipmentId }) => ({
        body,
        method: "POST",
        url: `admin/shipments/${shipmentId}/driver-fee-adjustments`,
      }),
      // No cash-book tags here: an adjustment changes what is OWED, not what
      // was paid - it appends to the fee history and posts no movement.
      invalidatesTags: (_r, _e, { shipmentId }) => [
        { type: "DriverSettlement", id: shipmentId },
        { type: "Shipments", id: shipmentId },
        { type: "DriverSettlement", id: "UNSETTLED" },
      ],
    }),

    recordDriverPayment: builder.mutation<
      { message: string },
      { shipmentId: string; body: IRecordDriverPaymentInput }
    >({
      query: ({ shipmentId, body }) => ({
        url: `admin/shipments/${shipmentId}/driver-payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { shipmentId }) => [
        { type: "DriverSettlement", id: shipmentId },
        { type: "Shipments", id: shipmentId },
        { type: "DriverSettlement", id: "UNSETTLED" },
        // Money left (or came back to) a company account: the account's
        // history and every cash-book view moved with it. The sale and land
        // books already invalidated both; this book silently did not.
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    reverseDriverPayment: builder.mutation<
      { message: string },
      { shipmentId: string; paymentId: string; reason: string }
    >({
      query: ({ shipmentId, paymentId, reason }) => ({
        url: `admin/shipments/${shipmentId}/driver-payments/${paymentId}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { shipmentId }) => [
        { type: "DriverSettlement", id: shipmentId },
        { type: "Shipments", id: shipmentId },
        { type: "DriverSettlement", id: "UNSETTLED" },
        // Money left (or came back to) a company account: the account's
        // history and every cash-book view moved with it. The sale and land
        // books already invalidated both; this book silently did not.
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    /** Trips that still owe a driver - the send-money picker feed. */
    getUnsettledTrips: builder.query<
      IUnsettledTripListResponse,
      { page?: number; limit?: number; search?: string } | void
    >({
      query: (params) =>
        `admin/shipments/unsettled${toQueryString(params ?? {})}`,
      providesTags: [{ type: "DriverSettlement", id: "UNSETTLED" }],
    }),

    // ── Expense settlement ──────────────────────────────────────
    getExpensePayments: builder.query<IExpensePaymentLedgerResponse, string>({
      query: (expenseId) => `admin/expenses/${expenseId}/payments`,
      providesTags: (_r, _e, id) => [{ type: "ExpensePayments", id }],
    }),

    recordExpensePayment: builder.mutation<
      { message: string },
      { expenseId: string; body: IRecordDriverPaymentInput }
    >({
      query: ({ expenseId, body }) => ({
        url: `admin/expenses/${expenseId}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { expenseId }) => [
        { type: "ExpensePayments", id: expenseId },
        { type: "Expenses", id: expenseId },
        { type: "ExpensePayments", id: "UNPAID" },
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    reverseExpensePayment: builder.mutation<
      { message: string },
      { expenseId: string; paymentId: string; reason: string }
    >({
      query: ({ expenseId, paymentId, reason }) => ({
        url: `admin/expenses/${expenseId}/payments/${paymentId}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { expenseId }) => [
        { type: "ExpensePayments", id: expenseId },
        { type: "Expenses", id: expenseId },
        { type: "ExpensePayments", id: "UNPAID" },
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    /** Costs that still owe money - the send-money picker feed. */
    getUnpaidExpenses: builder.query<
      IUnpaidExpenseListResponse,
      { page?: number; limit?: number; search?: string; from?: string; to?: string } | void
    >({
      query: (params) => `admin/expenses/unpaid${toQueryString(params ?? {})}`,
      providesTags: [{ type: "ExpensePayments", id: "UNPAID" }],
    }),
  }),
});

export const {
  useAdjustDriverFeeMutation,
  useCreateDriverPaymentPolicyMutation,
  useDeleteDriverPaymentPolicyMutation,
  useGetDriverPaymentPoliciesQuery,
  useGetDriverSettlementQuery,
  useGetExpensePaymentsQuery,
  useGetUnpaidExpensesQuery,
  useGetUnsettledTripsQuery,
  useRecordDriverPaymentMutation,
  useRecordExpensePaymentMutation,
  useReverseDriverPaymentMutation,
  useReverseExpensePaymentMutation,
  useSetDriverFeeMutation,
  useUpdateDriverPaymentPolicyMutation,
} = driverSettlementApi;
