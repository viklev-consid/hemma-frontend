import { useTranslations } from "next-intl";

/**
 * Parse an ISO 8601 date string from the backend. Centralised so JSX never
 * has to call `new Date()` directly (which trips
 * react-doctor/rendering-hydration-mismatch-time even in client-only
 * components).
 */
export function parseIsoDate(value: string): Date {
  return new Date(value);
}

/**
 * Backend legal document type slugs that have curated, locale-aware
 * labels in the i18n catalog. Anything not in this set falls back to
 * `titleCaseLegalType` so a new backend type renders reasonably without
 * a frontend release.
 *
 * NOTE: these slugs match the backend's actual emitted values (camelCase),
 * not what feels canonical (kebab-case). Keep them in sync with
 * `settingsForms.data.legal.types.*` keys.
 */
const KNOWN_LEGAL_TYPE_SLUGS = [
  "termsOfService",
  "privacyPolicy",
  "cookiePolicy",
  "dpa",
] as const;

type KnownLegalTypeSlug = (typeof KNOWN_LEGAL_TYPE_SLUGS)[number];

function isKnownLegalTypeSlug(value: string): value is KnownLegalTypeSlug {
  return (KNOWN_LEGAL_TYPE_SLUGS as readonly string[]).includes(value);
}

/**
 * Pure title-case fallback for unknown slugs. Exported for use in
 * non-React contexts (and unit tests).
 */
export function titleCaseLegalType(type: string): string {
  return type
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Hook returning a function that maps a backend legal-document `type`
 * slug to a locale-aware human label.
 *
 * `acceptedDocuments[]` from `GET /v1/users/me/legal-compliance` does not
 * include a `title`, only `type`. This helper produces a readable label
 * without an extra request — used for row labels in the settings ledger
 * and for accessible `aria-label`s. The View sheet still fetches the
 * canonical title via `getLegalDocument`.
 */
export function useHumanizeLegalType() {
  const t = useTranslations("settingsForms.data.legal.types");
  return (type: string): string => {
    if (isKnownLegalTypeSlug(type)) return t(type);
    return titleCaseLegalType(type);
  };
}
