import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { IMessageResponse } from "@/types/auth.types";
import type {
  ICreateExpenseInput,
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

    createExpense: builder.mutation<IExpenseResponse, ICreateExpenseInput>({
      query: (body) => ({ url: "admin/expenses", method: "POST", body }),
      invalidatesTags: [
        { type: "Expenses", id: "LIST" },
        { type: "Reports", id: "LIST" },
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

    deleteExpense: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/expenses/${id}`, method: "DELETE" }),
      invalidatesTags: [
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
  useDeleteExpenseMutation,
} = expensesApi;
