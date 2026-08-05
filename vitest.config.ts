import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Resolves the `@/` alias from tsconfig.json (no manual moduleNameMapper).
  // Vitest 4 transforms TSX with the automatic JSX runtime out of the box —
  // no babel/react plugin needed.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    // The API origin is required at import time (src/lib/env.ts fails fast);
    // tests never hit the network (RTK/fetch are mocked), so any value works.
    env: { NEXT_PUBLIC_SERVER_URI: "http://localhost:4060" },
    // Component tests drive radix dialogs through jsdom, which is slow enough
    // that the 5s default is not a bug signal but a load signal: a file that
    // finishes in 100ms alone intermittently blew the budget once vitest ran
    // the suite's files in parallel, and CI runners are slower again. A real
    // hang still fails, just later. Matches agritrade-backend's config.
    testTimeout: 20000,
  },
});
