// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "scripts/**", "vitest.config.ts"],
  },
  {
    files: ["src/**/*.ts", "scripts/**/*.ts", "**/*.mjs"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.mjs", "prisma.config.js"],
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
