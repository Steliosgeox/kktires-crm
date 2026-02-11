import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local tooling / one-off scripts (not shipped).
    "scripts/**",
  ]),
  {
    rules: {
      // This repo has a lot of legacy `any` usage; keep it visible but don't fail CI/dev loops.
      "@typescript-eslint/no-explicit-any": "warn",
      // Too strict / false-positives for event handlers and builders in this app.
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
