import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./api/generated",
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
    },
    {
      name: "zod",
    },
    {
      name: "@hey-api/sdk",
    },
    {
      name: "@hey-api/client-fetch",
      baseUrl: "/api/proxy",
    },
    {
      name: "@tanstack/react-query",
    },
  ],
});
