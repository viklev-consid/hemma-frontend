"use client";

import { client } from "@/api/generated/client.gen";
import { redirectToLogin } from "@/api/problems";

client.setConfig({
  baseUrl: "/api/proxy",
});

client.interceptors.response.use((response) => {
  if (response.status === 401 && typeof window !== "undefined") {
    redirectToLogin();
  }

  return response;
});

export { client };
