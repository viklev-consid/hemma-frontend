import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getLegalComplianceQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import { LegalAcceptancesCard } from "@/components/settings/legal-acceptances-card";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/tests/test-wrappers";

function seed(data: unknown) {
  const client = createTestQueryClient();
  client.setQueryData(getLegalComplianceQueryKey(), data);
  return client;
}

describe("LegalAcceptancesCard", () => {
  it("renders the empty state when no documents have been accepted", () => {
    const queryClient = seed({
      isCompliant: true,
      blockingLevel: "none",
      missingDocuments: [],
      acceptedDocuments: [],
    });
    renderWithProviders(<LegalAcceptancesCard />, { queryClient });

    expect(
      screen.getByText(/haven't accepted any legal documents/i),
    ).toBeInTheDocument();
  });

  it("lists accepted documents newest-first and surfaces 'Update available' when a newer version is pending", () => {
    const queryClient = seed({
      isCompliant: false,
      blockingLevel: "soft",
      missingDocuments: [
        {
          id: "doc-2",
          type: "termsOfService",
          title: "Terms of Service",
          version: "2.0",
          effectiveAt: "2026-04-01T00:00:00Z",
          contentHash: "hash-tos-2",
          markdown: "# v2",
        },
      ],
      acceptedDocuments: [
        {
          type: "privacyPolicy",
          version: "1.5",
          acceptedAt: "2026-03-15T10:00:00Z",
          contentHash: "hash-pp-1.5",
        },
        {
          type: "termsOfService",
          version: "1.0",
          acceptedAt: "2026-01-20T10:00:00Z",
          contentHash: "hash-tos-1",
        },
      ],
    });
    renderWithProviders(<LegalAcceptancesCard />, { queryClient });

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // Newest acceptance first.
    expect(rows[0]).toHaveTextContent("Privacy Policy");
    expect(rows[1]).toHaveTextContent("Terms of Service");
    // Only the row whose type also appears in missingDocuments gets the badge.
    expect(rows[0]).not.toHaveTextContent(/update available/i);
    expect(rows[1]).toHaveTextContent(/update available/i);
  });

  it("renders View buttons with accessible labels per row", () => {
    const queryClient = seed({
      isCompliant: true,
      blockingLevel: "none",
      missingDocuments: [],
      acceptedDocuments: [
        {
          type: "termsOfService",
          version: "1.0",
          acceptedAt: "2026-01-20T10:00:00Z",
          contentHash: "hash",
        },
      ],
    });
    renderWithProviders(<LegalAcceptancesCard />, { queryClient });

    expect(
      screen.getByRole("button", { name: /view terms of service 1\.0/i }),
    ).toBeInTheDocument();
  });
});
