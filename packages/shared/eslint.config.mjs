// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "src/**/*.js"],
  },
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.mjs", "vitest.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-deprecated": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
]);
