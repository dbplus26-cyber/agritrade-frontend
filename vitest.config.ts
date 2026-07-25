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
  },
});
