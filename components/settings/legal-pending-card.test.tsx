import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  getLegalComplianceQueryKey,
  getLegalDocumentQueryKey,
} from "@/api/generated/@tanstack/react-query.gen";
import { LegalPendingCard } from "@/components/settings/legal-pending-card";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/tests/test-wrappers";

function seedClient(data: unknown) {
  const client = createTestQueryClient();
  client.setQueryData(getLegalComplianceQueryKey(), data);
  return client;
}

describe("LegalPendingCard", () => {
  it("renders nothing when there are no missing documents", () => {
    const queryClient = seedClient({
      isCompliant: true,
      blockingLevel: "none",
      missingDocuments: [],
      acceptedDocuments: [],
    });
    const { container } = renderWithProviders(<LegalPendingCard />, {
      queryClient,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("lists missing documents and exposes 'Review & accept' actions", () => {
    const queryClient = seedClient({
      isCompliant: false,
      blockingLevel: "soft",
      missingDocuments: [
        {
          id: "doc-1",
          type: "termsOfService",
          title: "Terms of Service",
          version: "2.0",
          effectiveAt: "2026-04-01T00:00:00Z",
          contentHash: "hash-1",
          markdown: "# Terms v2",
        },
        {
          id: "doc-2",
          type: "privacyPolicy",
          title: "Privacy Policy",
          version: "3.0",
          effectiveAt: "2026-04-10T00:00:00Z",
          contentHash: "hash-2",
          markdown: "# Privacy v3",
        },
      ],
      acceptedDocuments: [],
    });
    renderWithProviders(<LegalPendingCard />, { queryClient });

    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /review & accept terms of service 2\.0/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /review & accept privacy policy 3\.0/i,
      }),
    ).toBeInTheDocument();
  });

  it("pre-warms the per-document cache so the sheet does not need to refetch", () => {
    const queryClient = seedClient({
      isCompliant: false,
      blockingLevel: "soft",
      missingDocuments: [
        {
          id: "doc-1",
          type: "termsOfService",
          title: "Terms of Service",
          version: "2.0",
          effectiveAt: "2026-04-01T00:00:00Z",
          contentHash: "hash-1",
          markdown: "# Terms v2 body",
        },
      ],
      acceptedDocuments: [],
    });
    renderWithProviders(<LegalPendingCard />, { queryClient });

    const seeded = queryClient.getQueryData(
      getLegalDocumentQueryKey({
        path: { type: "termsOfService", version: "2.0" },
      }),
    );
    expect(seeded).toMatchObject({
      id: "doc-1",
      type: "termsOfService",
      title: "Terms of Service",
      version: "2.0",
      markdown: "# Terms v2 body",
      contentHash: "hash-1",
      // publishedAt is not on the compliance payload; we seed empty so the
      // sheet header's truthy check suppresses the "Published" line rather
      // than displaying a fake date.
      publishedAt: "",
    });
  });
});
