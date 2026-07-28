import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateTransferInput,
  ITransferListQuery,
  ITransferListResponse,
  ITransferResponse,
} from "@/types/ops.types";

/**
 * Warehouse transfers, mirroring `/admin/stock/transfers`. A transfer posts
 * immediately (super-admin only) as a paired TRANSFER_OUT / TRANSFER_IN, so
 * creating one moves real stock - balances and the movements ledger refresh.
 */
export const transfersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTransfers: builder.query<
      ITransferListResponse,
      ITransferListQuery | void
    >({
      query: (params) => `admin/stock/transfers${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Transfers", id: "LIST" }],
    }),

    createTransfer: builder.mutation<ITransferResponse, ICreateTransferInput>({
      query: (body) => ({
        url: "admin/stock/transfers",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "Transfers", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "StockMovements", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetTransfersQuery, useCreateTransferMutation } = transfersApi;
