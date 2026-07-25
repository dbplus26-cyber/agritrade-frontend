import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IFarmerPlanResponse,
  IFarmerStatementResponse,
  ISeasonSummaryResponse,
  IUpsertPlanInput,
} from "@/types/farm.types";

/**
 * The farm "books": season plans (one per farmer-season, upserted) and the
 * derived reporting reads (season dashboard, farmer statement). Balances are
 * fully derived server-side, so these are read-heavy and tagged FarmStats.
 */
export const farmBooksApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFarmerPlan: builder.query<
      IFarmerPlanResponse,
      { farmerId: string; seasonId: string }
    >({
      query: (params) => `admin/farm/plans${toQueryString(params)}`,
      providesTags: (_r, _e, { farmerId, seasonId }) => [
        { type: "FarmPlans", id: `${farmerId}:${seasonId}` },
      ],
    }),

    upsertPlan: builder.mutation<IFarmerPlanResponse, IUpsertPlanInput>({
      query: (body) => ({ url: "admin/farm/plans", method: "PUT", body }),
      invalidatesTags: (_r, _e, { farmerId, seasonId }) => [
        { type: "FarmPlans", id: `${farmerId}:${seasonId}` },
      ],
    }),

    getSeasonSummary: builder.query<ISeasonSummaryResponse, string>({
      query: (seasonId) => `admin/farm/seasons/${seasonId}/summary`,
      providesTags: [{ type: "FarmStats", id: "LIST" }],
    }),

    getFarmerStatement: builder.query<
      IFarmerStatementResponse,
      { farmerId: string; seasonId?: string }
    >({
      query: ({ farmerId, seasonId }) =>
        `admin/farm/farmers/${farmerId}/statement${toQueryString(
          seasonId ? { seasonId } : {},
        )}`,
      providesTags: [{ type: "FarmStats", id: "LIST" }],
    }),
  }),
});

export const {
  useGetFarmerPlanQuery,
  useUpsertPlanMutation,
  useGetSeasonSummaryQuery,
  useGetFarmerStatementQuery,
} = farmBooksApi;
