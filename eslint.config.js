import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "infra/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
);
