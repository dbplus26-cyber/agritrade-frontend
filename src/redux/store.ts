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
  // Wires the browser events RTK Query's refetch behaviours listen to. The
  // slice opts into refetchOnReconnect only (see api-slice.ts for why focus
  // refetch is deliberately left off); without this call that setting would
  // never fire.
  setupListeners(store.dispatch);
  return store;
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
