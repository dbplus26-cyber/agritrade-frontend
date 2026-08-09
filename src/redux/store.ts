import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { apiSlice } from "./api-slice";
import authReducer from "./auth/auth-slice";

/**
 * Builds a fresh store. The App Router runs Server Components per request, so
 * a module-singleton store would leak state across concurrent SSR requests -
 * the StoreProvider calls this once per request instead. Letting
 * `configureStore` infer its own type keeps `RootState`/`useSelector`
 * properly typed instead of collapsing to `any`.
 */
export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
  // refetchOnFocus/refetchOnReconnect behaviours for RTK Query.
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
