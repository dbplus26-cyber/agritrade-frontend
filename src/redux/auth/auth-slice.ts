import { clearAllDrafts } from "@/components/agent/draft-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { IUser } from "@/types/user.types";

interface AuthState {
  user: IUser | null;
}

const STORAGE_KEY = "dbplus.auth.user";

// Rehydrate synchronously so the console doesn't flash a logged-out state on
// reload. localStorage is unavailable during SSR (and in reducer unit tests),
// so every access is guarded. Only the *user* is persisted - never tokens,
// which live in httpOnly cookies the browser can't read.
const storedUser =
  typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

const initialState: AuthState = {
  user: storedUser
    ? (() => {
        try {
          return JSON.parse(storedUser) as IUser;
        } catch {
          return null;
        }
      })()
    : null,
};

// First-party "probably signed in" hint for the Next.js proxy. The real session
// cookies are httpOnly on the *API's* origin, which the proxy can't see when
// the API lives on another domain (production) - so the /admin gate reads this
// hint instead. It's presence-only: RequireAuth still does the real check.
const HINT_COOKIE = "dbplus.auth.hint";

const setAuthHint = (on: boolean) => {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = on
    ? `${HINT_COOKIE}=1; path=/; max-age=${String(7 * 24 * 60 * 60)}; samesite=lax${secure}`
    : `${HINT_COOKIE}=; path=/; max-age=0; samesite=lax${secure}`;
};

const persistUser = (user: IUser | null) => {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  setAuthHint(Boolean(user));
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userLoggedIn: (state, action: PayloadAction<{ user: IUser }>) => {
      state.user = action.payload.user;
      persistUser(action.payload.user);
    },

    userLoggedOut: (state) => {
      state.user = null;
      persistUser(null);
      // Field-form drafts hold real business figures typed on what is often a
      // shared phone; they must not survive into the next person's session.
      clearAllDrafts();
    },
  },
});

export const { userLoggedIn, userLoggedOut } = authSlice.actions;

export default authSlice.reducer;
