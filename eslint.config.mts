import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // JavaScript files configuration
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: ["node_modules/**", "dist/**"],
    ...js.configs.recommended,
    languageOptions: { 
      globals: globals.browser 
    },
    rules: {
      "no-unused-vars": "off", // Prevent conflict with TS
    }
  },
  
  // TypeScript files configuration
  {
    files: ["src/**/*.{ts,mts,cts}"],
    ignores: ["node_modules/**", "dist/**", "boltts.ts"],
    ...tseslint.configs.recommended[0],
    languageOptions: {
      parser: tseslint.parser,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn"],
    }
  }
];
