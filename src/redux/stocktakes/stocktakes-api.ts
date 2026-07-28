import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateStocktakeInput,
  IStocktakeListQuery,
  IStocktakeListResponse,
  IStocktakeResponse,
  IUpdateStocktakeInput,
} from "@/types/ops.types";

/**
 * Stocktakes, mirroring `/admin/stock/stocktakes`. A sheet is counted as a
 * DRAFT, submitted (which snapshots the book balance per line), and then
 * approved (super-admin - posts a stock ADJUSTMENT for every difference) or
 * cancelled. Only the approval moves stock, so only it touches the stock tags.
 */
export const stocktakesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStocktakes: builder.query<
      IStocktakeListResponse,
      IStocktakeListQuery | void
    >({
      query: (params) => `admin/stock/stocktakes${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Stocktakes" as const, id: "LIST" },
              ...result.data.map((s) => ({
                type: "Stocktakes" as const,
                id: s.id,
              })),
            ]
          : [{ type: "Stocktakes" as const, id: "LIST" }],
    }),

    getStocktake: builder.query<IStocktakeResponse, string>({
      query: (id) => `admin/stock/stocktakes/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Stocktakes", id }],
    }),

    createStocktake: builder.mutation<IStocktakeResponse, ICreateStocktakeInput>(
      {
        query: (body) => ({
          url: "admin/stock/stocktakes",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Stocktakes", id: "LIST" }],
      },
    ),

    updateStocktake: builder.mutation<
      IStocktakeResponse,
      { id: string; body: IUpdateStocktakeInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/stock/stocktakes/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Stocktakes", id },
        { type: "Stocktakes", id: "LIST" },
      ],
    }),

    submitStocktake: builder.mutation<IStocktakeResponse, string>({
      query: (id) => ({
        url: `admin/stock/stocktakes/${id}/submit`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Stocktakes", id },
        { type: "Stocktakes", id: "LIST" },
      ],
    }),

    approveStocktake: builder.mutation<IStocktakeResponse, string>({
      query: (id) => ({
        url: `admin/stock/stocktakes/${id}/approve`,
        method: "PATCH",
      }),
      // Approval posts a stock ADJUSTMENT per difference - real stock moves.
      invalidatesTags: (_r, _e, id) => [
        { type: "Stocktakes", id },
        { type: "Stocktakes", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "StockMovements", id: "LIST" },
      ],
    }),

    cancelStocktake: builder.mutation<IStocktakeResponse, string>({
      query: (id) => ({
        url: `admin/stock/stocktakes/${id}/cancel`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Stocktakes", id },
        { type: "Stocktakes", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetStocktakesQuery,
  useGetStocktakeQuery,
  useCreateStocktakeMutation,
  useUpdateStocktakeMutation,
  useSubmitStocktakeMutation,
  useApproveStocktakeMutation,
  useCancelStocktakeMutation,
} = stocktakesApi;
