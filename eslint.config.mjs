import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // n8n Code node bodies: run as a function body inside n8n (top-level
  // return) with n8n's globals.
  {
    files: ["n8n/templates/code/**/*.js"],
    languageOptions: {
      sourceType: "script",
      parserOptions: { ecmaFeatures: { globalReturn: true } },
      globals: { $input: "readonly", $: "readonly", $getWorkflowStaticData: "readonly", Buffer: "readonly" },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
