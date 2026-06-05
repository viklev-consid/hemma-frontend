import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import {
  emitLegalComplianceRequired,
  extractMissingDocuments,
  type ProblemDetails,
} from "@/api/problems";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { skipLegalGate?: boolean };
    mutationMeta: { skipLegalGate?: boolean };
  }
}

function maybeHandleLegalComplianceRequired(
  error: unknown,
  source:
    | { meta?: { skipLegalGate?: boolean } }
    | { options?: { meta?: { skipLegalGate?: boolean } } },
) {
  const problem = error as ProblemDetails | undefined;
  if (!problem || problem.status !== 428) return;

  const meta =
    "meta" in source
      ? source.meta
      : "options" in source
        ? source.options?.meta
        : undefined;
  if (meta?.skipLegalGate) return;

  emitLegalComplianceRequired({
    missingDocuments: extractMissingDocuments(problem),
  });
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) =>
        maybeHandleLegalComplianceRequired(error, query),
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) =>
        maybeHandleLegalComplianceRequired(error, mutation),
    }),
  });
}
