import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Purely informational ("Compilation Skipped"): react-hook-form's
      // `watch()` and TanStack Table's `useReactTable()` are on the React
      // Compiler's known-incompatible list, so it safely skips memoizing the
      // components that use them - no bug, no action to take. Both libraries
      // are core to the console by design (every form, every register), so
      // the warning would fire on most screens forever. `"use no memo"` does
      // not silence it either - the rule reports the library use regardless
      // of the opt-out. Re-enable if/when RHF and TanStack ship
      // compiler-safe APIs and the forms migrate.
      "react-hooks/incompatible-library": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Isolated dist dir used by verification builds (NEXT_DIST_DIR).
    ".next-build/**",
  ]),
]);

export default eslintConfig;
