import js from "@eslint/js";
import globals from "globals";
export default [
  {
    ignores: ["dist/**", "node_modules/**", "artifacts/**", "test-results/**"],
  },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
];
