import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { listMyOrganizationsQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import type {
  ListMyOrganizationsResponse,
  MyOrganizationItem,
} from "@/api/generated";
import { ORG_PERMISSION } from "@/lib/org-permission-strings";

import {
  findMyOrganization,
  findMyOrganizationBySlug,
  hasOrgPermission,
} from "./org-permissions";

function makeOrg(
  overrides: Partial<MyOrganizationItem> = {},
): MyOrganizationItem {
  return {
    organizationId: "00000000-0000-0000-0000-000000000001",
    name: "Acme",
    slug: "acme",
    role: "Owner",
    permissions: [ORG_PERMISSION.MembersRead, ORG_PERMISSION.InvitationsManage],
    permissionsVersion: "v1abc",
    ...overrides,
  };
}

function seed(client: QueryClient, organizations: MyOrganizationItem[]) {
  client.setQueryData<ListMyOrganizationsResponse>(
    listMyOrganizationsQueryKey(),
    { organizations },
  );
}

describe("org-permissions", () => {
  it("findMyOrganization returns the matching entry", () => {
    const client = new QueryClient();
    const org = makeOrg();
    seed(client, [org]);

    expect(findMyOrganization(client, org.organizationId)).toEqual(org);
    expect(findMyOrganizationBySlug(client, "acme")).toEqual(org);
  });

  it("returns undefined when /my hasn't been fetched yet", () => {
    const client = new QueryClient();
    expect(findMyOrganization(client, "missing")).toBeUndefined();
  });

  it("returns undefined for an org the caller is not a member of", () => {
    const client = new QueryClient();
    seed(client, [makeOrg({ organizationId: "a" })]);
    expect(findMyOrganization(client, "b")).toBeUndefined();
  });

  it("hasOrgPermission returns true when the permission is granted", () => {
    const client = new QueryClient();
    seed(client, [makeOrg()]);

    expect(
      hasOrgPermission(
        client,
        "00000000-0000-0000-0000-000000000001",
        ORG_PERMISSION.InvitationsManage,
      ),
    ).toBe(true);
  });

  it("hasOrgPermission returns false when the org is missing", () => {
    const client = new QueryClient();
    seed(client, []);
    expect(hasOrgPermission(client, "missing", "anything")).toBe(false);
  });

  it("hasOrgPermission returns false when the permission is not granted", () => {
    const client = new QueryClient();
    seed(client, [makeOrg({ permissions: ["organizations.members.read"] })]);

    expect(
      hasOrgPermission(
        client,
        "00000000-0000-0000-0000-000000000001",
        "organizations.delete",
      ),
    ).toBe(false);
  });
});
