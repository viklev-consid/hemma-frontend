"use client";

import { toast } from "sonner";

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  extensions?: Record<string, unknown>;
}

export type MissingLegalDocument = {
  id: string;
  type: string;
  title: string;
  version: string;
  contentHash: string;
};

const LEGAL_COMPLIANCE_REQUIRED_EVENT = "hemma:legal-compliance-required";

export type LegalComplianceRequiredDetail = {
  missingDocuments?: MissingLegalDocument[];
};

export function emitLegalComplianceRequired(
  detail: LegalComplianceRequiredDetail,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LegalComplianceRequiredDetail>(
      LEGAL_COMPLIANCE_REQUIRED_EVENT,
      { detail },
    ),
  );
}

export function onLegalComplianceRequired(
  handler: (detail: LegalComplianceRequiredDetail) => void,
) {
  if (typeof window === "undefined") return () => undefined;
  const listener = (event: Event) => {
    handler((event as CustomEvent<LegalComplianceRequiredDetail>).detail ?? {});
  };
  window.addEventListener(LEGAL_COMPLIANCE_REQUIRED_EVENT, listener);
  return () => {
    window.removeEventListener(LEGAL_COMPLIANCE_REQUIRED_EVENT, listener);
  };
}

export function extractMissingDocuments(
  problem: ProblemDetails,
): MissingLegalDocument[] | undefined {
  const inline = (problem as unknown as Record<string, unknown>)
    .missingDocuments;
  const candidates = [problem.extensions?.missingDocuments, inline];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as MissingLegalDocument[];
    }
  }
  return undefined;
}

// Toast / fallback strings used by handleProblem and mapProblemToFieldErrors.
// Wired through a setter (rather than useTranslations directly) because these
// helpers are module-scope: they're called from `client-fetch.ts` and from
// callbacks where hooks can't run. The English values here are the SSR / pre-
// mount fallback; ProblemLabelsInit (mounted in the root layout) replaces them
// with locale-aware strings on first client render.
type ProblemLabels = {
  generic: { title: string; description: string };
  failed: string;
  invalidValue: string;
};

let labels: ProblemLabels = {
  generic: {
    title: "Something went wrong",
    description: "Please try again in a moment.",
  },
  failed: "Request failed",
  invalidValue: "Invalid value",
};

export function setProblemLabels(next: ProblemLabels) {
  labels = next;
}

function toCamelCase(value: string) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

// Matches RFC 9457 fields meant for error categorization (`type`, `title`).
// `detail` is intentionally excluded — it often carries localized human-readable
// text that could substring-match an error code by coincidence.
export function problemHasErrorCode(
  problem: ProblemDetails,
  code: string,
): boolean {
  return Boolean(problem.type?.includes(code) || problem.title?.includes(code));
}

export function mapProblemToFieldErrors(problem: ProblemDetails) {
  return Object.fromEntries(
    Object.entries(problem.errors ?? {}).map(([field, messages]) => [
      toCamelCase(field),
      messages[0] ?? problem.title ?? labels.invalidValue,
    ]),
  );
}

export function redirectToLogin() {
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

export function handleProblem(problem: ProblemDetails) {
  if (problem.status === 401) {
    redirectToLogin();
    return;
  }

  if (problem.status === 428) {
    emitLegalComplianceRequired({
      missingDocuments: extractMissingDocuments(problem),
    });
    return;
  }

  if (problem.errors) {
    return;
  }

  if (problem.status >= 500) {
    toast.error(labels.generic.title, {
      description: labels.generic.description,
    });
    return;
  }

  toast.error(problem.title ?? labels.failed, {
    description: problem.detail,
  });
}

export async function problemFromResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {
      title: response.statusText,
      status: response.status,
    } satisfies ProblemDetails;
  }

  try {
    return JSON.parse(text) as ProblemDetails;
  } catch {
    return {
      title: response.statusText,
      detail: text,
      status: response.status,
    } satisfies ProblemDetails;
  }
}
