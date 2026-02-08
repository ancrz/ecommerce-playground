import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
// import tailwind from "eslint-plugin-tailwindcss"; // Incompatible with v4 exports currently
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/api/generated/**", "src/**/*.generated.ts"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      // ...tailwind.configs["flat/recommended"]
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // React 17+ doesn't need this
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // "tailwindcss/no-custom-classname": "off",
    },
    settings: {
      react: { version: "detect" }, // Auto-detect React version
    },
  }
);
