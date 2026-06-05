"use client";

import {
  handleProblem,
  problemFromResponse,
  type ProblemDetails,
} from "@/api/problems";

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { redirectOnUnauthorized?: boolean },
) {
  const { redirectOnUnauthorized = true, ...requestInit } = init ?? {};
  // Let the browser set the multipart boundary itself when sending FormData;
  // otherwise default to JSON.
  const isFormData =
    typeof FormData !== "undefined" && requestInit.body instanceof FormData;
  const response = await fetch(input, {
    ...requestInit,
    headers: isFormData
      ? requestInit.headers
      : {
          "content-type": "application/json",
          ...requestInit.headers,
        },
  });

  if (!response.ok) {
    const problem = await problemFromResponse(response);
    // Auth-elevated actions (confirm/regenerate/disable 2FA, change password)
    // return 401 when the *submitted credential* is wrong, not when the
    // session is gone. Callers can opt out of the session-expired redirect.
    if (redirectOnUnauthorized || problem.status !== 401) {
      handleProblem(problem);
    }
    throw problem;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function fieldMessage(
  problem: ProblemDetails,
  fieldName: string,
  fallback = "Invalid value",
) {
  const entries = Object.entries(problem.errors ?? {});
  const match = entries.find(
    ([key]) => key.toLowerCase() === fieldName.toLowerCase(),
  );

  return match?.[1][0] ?? problem.detail ?? problem.title ?? fallback;
}
