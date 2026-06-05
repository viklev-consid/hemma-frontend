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
    "api/generated/**",
  ]),
  // Vendored headless UI primitives use ref mutation and other patterns the
  // React Compiler diagnostics flag. Keep the rules on for app code, disable
  // them only here.
  {
    files: ["components/ui/cropper.tsx", "components/ui/file-upload.tsx"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "jsx-a11y/role-supports-aria-props": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
