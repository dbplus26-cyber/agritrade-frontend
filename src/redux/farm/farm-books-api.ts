import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IFarmerPlanResponse,
  ISeasonSummaryResponse,
  IUpsertPlanInput,
} from "@/types/farm.types";

/**
 * The farm "books": season plans (one per farmer-season, upserted) and the
 * season dashboard. Balances are fully derived server-side, so these are
 * read-heavy and tagged FarmStats. The farmer's statement is a document, and
 * documents are fetched whole from `/admin/receipts`.
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
  }),
});

export const {
  useGetFarmerPlanQuery,
  useUpsertPlanMutation,
  useGetSeasonSummaryQuery,
} = farmBooksApi;
