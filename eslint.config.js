import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
});

export default [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", ".open-next/**", ".wrangler/**", "next-env.d.ts"],
  },
];
