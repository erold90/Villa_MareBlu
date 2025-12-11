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
  ]),
  // Regole personalizzate
  {
    rules: {
      // Disabilita warning per variabili non usate (solo warning, non errore)
      "@typescript-eslint/no-unused-vars": "warn",
      // Permetti any in alcuni casi (da sistemare in futuro)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
