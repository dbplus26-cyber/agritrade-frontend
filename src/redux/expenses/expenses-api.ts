import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateExpenseInput,
  ICreateExpenseResponse,
  IExpenseListQuery,
  IExpenseListResponse,
  IExpenseResponse,
  IUpdateExpenseInput,
} from "@/types/expense.types";

/**
 * Operating costs, mirroring the backend `/admin/expenses`. Mutations also
 * invalidate Reports: an expense moves the net-profit figure, so a stale P&L
 * after recording one would be actively misleading.
 */
export const expensesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<IExpenseListResponse, IExpenseListQuery | void>({
      query: (params) => `admin/expenses${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Expenses" as const, id: "LIST" },
              ...result.data.map((e) => ({
                type: "Expenses" as const,
                id: e.id,
              })),
            ]
          : [{ type: "Expenses" as const, id: "LIST" }],
    }),

    getExpense: builder.query<IExpenseResponse, string>({
      query: (id) => `admin/expenses/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Expenses", id }],
    }),

    /**
     * Records a cost, and settles it in the same act when the form says it was
     * paid.
     *
     * The key is not optional here the way it is in the contract: this
     * endpoint moves money now, so a double-tapped form or a retry after a
     * timeout would pay a supplier twice. Same shape as a float top-up - the
     * key rides in the BODY, which is where `createExpenseSchema` reads it.
     */
    createExpense: builder.mutation<
      ICreateExpenseResponse,
      { body: ICreateExpenseInput; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: "admin/expenses",
        method: "POST",
        body: { ...body, idempotencyKey },
      }),
      // A paid cost is one fewer row in the unpaid feed the send-money picker
      // reads, so that feed goes stale the moment this lands.
      invalidatesTags: [
        { type: "Expenses", id: "LIST" },
        { type: "ExpensePayments", id: "UNPAID" },
        { type: "Reports", id: "LIST" },
        // The optional pay-on-record posts a movement onto a named account.
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    updateExpense: builder.mutation<
      IExpenseResponse,
      { id: string; body: IUpdateExpenseInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/expenses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Expenses", id },
        { type: "Expenses", id: "LIST" },
        { type: "Reports", id: "LIST" },
      ],
    }),

  }),
});

export const {
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} = expensesApi;
