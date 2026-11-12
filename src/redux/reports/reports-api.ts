import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ForecastDays,
  ICashflowForecastResponse,
} from "@/types/ops.types";
import type {
  IActivityResponse,
  IAgentPerformanceResponse,
  IBookExportRequest,
  IBookExportResponse,
  ICashflowResponse,
  IDashboardResponse,
  IDataExportListResponse,
  IDebtorsQuery,
  IDebtorsResponse,
  IExpenseSummaryResponse,
  IPeriodSummaryResponse,
  IProfitReportResponse,
  IPurchaseBookResponse,
  IReportWindow,
  ITrendsResponse,
  IVolumeResponse,
} from "@/types/report.types";

/** Pages of a book run 1..totalPages; the next is asked for on scroll. */
const bookPages = {
  getNextPageParam: (last: IPurchaseBookResponse) =>
    last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  initialPageParam: 1,
  refetchCachedPages: false,
};

/**
 * The reporting reads, mirroring `/admin/reports`. Everything is derived on the
 * backend from the live ledgers, so the tag is invalidated by nothing in
 * particular - reports refetch on mount and when their window changes.
 */
export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<IDashboardResponse, void>({
      query: () => "admin/reports/dashboard",
      providesTags: [
        { type: "Reports", id: "DASHBOARD" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getProfitReport: builder.query<IProfitReportResponse, IReportWindow | void>(
      {
        query: (w) => `admin/reports/profit${toQueryString(w ?? {})}`,
        providesTags: [
          { type: "Reports", id: "PROFIT" },
          { type: "Reports", id: "LIST" },
        ],
      },
    ),
    getExpenseSummary: builder.query<
      IExpenseSummaryResponse,
      IReportWindow | void
    >({
      query: (w) => `admin/reports/expenses${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "EXPENSES" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getAgentPerformance: builder.query<
      IAgentPerformanceResponse,
      IReportWindow | void
    >({
      query: (w) => `admin/reports/agents${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "AGENTS" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getTrends: builder.query<ITrendsResponse, { months?: number } | void>({
      query: (p) => `admin/reports/trends${toQueryString(p ?? {})}`,
      providesTags: [
        { type: "Reports", id: "TRENDS" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getPeriodSummary: builder.query<
      IPeriodSummaryResponse,
      IReportWindow | void
    >({
      query: (w) => `admin/reports/period-summary${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "PERIOD_SUMMARY" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getCashflow: builder.query<ICashflowResponse, IReportWindow | void>({
      query: (w) => `admin/reports/cashflow${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "CASHFLOW" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getVolume: builder.query<IVolumeResponse, IReportWindow | void>({
      query: (w) => `admin/reports/volume${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "VOLUME" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getActivity: builder.query<IActivityResponse, { limit?: number } | void>({
      query: (p) => `admin/reports/activity${toQueryString(p ?? {})}`,
      providesTags: [
        { type: "Reports", id: "ACTIVITY" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    getDebtors: builder.query<IDebtorsResponse, IDebtorsQuery | void>({
      query: (p) => `admin/reports/debtors${toQueryString(p ?? {})}`,
      providesTags: [
        { type: "Reports", id: "DEBTORS" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    /**
     * The book arrives a page at a time as the sheet is scrolled. A refetch
     * (new data, a returning tab) reloads the top page only: a reader who had
     * scrolled 40 pages down is not made to wait for 40 requests.
     */
    getPurchaseBook: builder.infiniteQuery<
      IPurchaseBookResponse,
      { commodityId: string; supplierId?: string; year: number },
      number
    >({
      infiniteQueryOptions: bookPages,
      query: ({ pageParam, queryArg }) =>
        `admin/reports/purchase-book${toQueryString({ ...queryArg, page: pageParam })}`,
      providesTags: [
        { type: "Reports", id: "PURCHASE_BOOK" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    /** The same sheet from the selling side, for one buyer or all of them. */
    getSalesBook: builder.infiniteQuery<
      IPurchaseBookResponse,
      { buyerId?: string; commodityId: string; year: number },
      number
    >({
      infiniteQueryOptions: bookPages,
      query: ({ pageParam, queryArg }) =>
        `admin/reports/sales-book${toQueryString({ ...queryArg, page: pageParam })}`,
      providesTags: [
        { type: "Reports", id: "PURCHASE_BOOK" },
        { type: "Reports", id: "LIST" },
      ],
    }),
    /**
     * Asks for a book as a file. The server answers whether to download it
     * now or that it is being prepared; either way the Exports list may have
     * changed.
     */
    requestBookExport: builder.mutation<
      IBookExportResponse,
      IBookExportRequest
    >({
      query: (body) => ({
        url: "admin/reports/book-exports",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Reports", id: "EXPORTS" }],
    }),
    getBookExports: builder.query<IDataExportListResponse, { page: number }>({
      query: (p) => `admin/reports/book-exports${toQueryString(p)}`,
      providesTags: [{ type: "Reports", id: "EXPORTS" }],
    }),
    getCashflowForecast: builder.query<
      ICashflowForecastResponse,
      { days: ForecastDays }
    >({
      query: (p) => `admin/reports/cashflow-forecast${toQueryString(p)}`,
      providesTags: [
        { type: "Reports", id: "CASHFLOW_FORECAST" },
        { type: "Reports", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetActivityQuery,
  useGetAgentPerformanceQuery,
  useGetBookExportsQuery,
  useGetCashflowForecastQuery,
  useGetCashflowQuery,
  useGetDashboardQuery,
  useGetDebtorsQuery,
  useGetExpenseSummaryQuery,
  useGetPeriodSummaryQuery,
  useGetProfitReportQuery,
  useGetPurchaseBookInfiniteQuery,
  useGetSalesBookInfiniteQuery,
  useGetTrendsQuery,
  useGetVolumeQuery,
  useRequestBookExportMutation,
} = reportsApi;
