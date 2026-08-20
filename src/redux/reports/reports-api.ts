import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ForecastDays,
  ICashflowForecastResponse,
} from "@/types/ops.types";
import type {
  IActivityResponse,
  IAgentPerformanceResponse,
  ICashflowResponse,
  IDashboardResponse,
  IDebtorsQuery,
  IDebtorsResponse,
  IExpenseSummaryResponse,
  IPeriodSummaryResponse,
  IProfitReportResponse,
  IReportWindow,
  ITrendsResponse,
  IVolumeResponse,
} from "@/types/report.types";

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
    getProfitReport: builder.query<IProfitReportResponse, IReportWindow | void>({
      query: (w) => `admin/reports/profit${toQueryString(w ?? {})}`,
      providesTags: [
        { type: "Reports", id: "PROFIT" },
        { type: "Reports", id: "LIST" },
      ],
    }),
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
    getPeriodSummary: builder.query<IPeriodSummaryResponse, IReportWindow | void>(
      {
        query: (w) => `admin/reports/period-summary${toQueryString(w ?? {})}`,
        providesTags: [
        { type: "Reports", id: "PERIOD_SUMMARY" },
        { type: "Reports", id: "LIST" },
      ],
      },
    ),
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
  useGetCashflowForecastQuery,
  useGetCashflowQuery,
  useGetDashboardQuery,
  useGetDebtorsQuery,
  useGetExpenseSummaryQuery,
  useGetPeriodSummaryQuery,
  useGetProfitReportQuery,
  useGetTrendsQuery,
  useGetVolumeQuery,
} = reportsApi;
