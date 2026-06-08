import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";

import { listMyHouseholdsQueryKey } from "@/api/generated/@tanstack/react-query.gen";
import type { ListMyHouseholdsResponse, MyHouseholdItem } from "@/api/generated";
import { HOUSEHOLD_PERMISSION } from "@/lib/household-permission-strings";

import {
  findMyHousehold,
  findMyHouseholdBySlug,
  hasHouseholdPermission,
} from "./household-permissions";

function makeHousehold(
  overrides: Partial<MyHouseholdItem> = {},
): MyHouseholdItem {
  return {
    householdId: "00000000-0000-0000-0000-000000000001",
    name: "Acme",
    slug: "acme",
    role: "owner",
    permissions: [
      HOUSEHOLD_PERMISSION.MembersRead,
      HOUSEHOLD_PERMISSION.InvitationsManage,
    ],
    permissionsVersion: "v1abc",
    ...overrides,
  };
}

function seed(client: QueryClient, households: MyHouseholdItem[]) {
  client.setQueryData<ListMyHouseholdsResponse>(listMyHouseholdsQueryKey(), {
    households,
  });
}

describe("household-permissions", () => {
  it("findMyHousehold returns the matching entry", () => {
    const client = new QueryClient();
    const household = makeHousehold();
    seed(client, [household]);

    expect(findMyHousehold(client, household.householdId)).toEqual(household);
    expect(findMyHouseholdBySlug(client, "acme")).toEqual(household);
  });

  it("returns undefined when /my hasn't been fetched yet", () => {
    const client = new QueryClient();
    expect(findMyHousehold(client, "missing")).toBeUndefined();
  });

  it("returns undefined for a household the caller is not a member of", () => {
    const client = new QueryClient();
    seed(client, [makeHousehold({ householdId: "a" })]);
    expect(findMyHousehold(client, "b")).toBeUndefined();
  });

  it("hasHouseholdPermission returns true when the permission is granted", () => {
    const client = new QueryClient();
    seed(client, [makeHousehold()]);

    expect(
      hasHouseholdPermission(
        client,
        "00000000-0000-0000-0000-000000000001",
        HOUSEHOLD_PERMISSION.InvitationsManage,
      ),
    ).toBe(true);
  });

  it("hasHouseholdPermission returns false when the household is missing", () => {
    const client = new QueryClient();
    seed(client, []);
    expect(hasHouseholdPermission(client, "missing", "anything")).toBe(false);
  });

  it("hasHouseholdPermission returns false when the permission is not granted", () => {
    const client = new QueryClient();
    seed(client, [
      makeHousehold({ permissions: ["households.members.read"] }),
    ]);

    expect(
      hasHouseholdPermission(
        client,
        "00000000-0000-0000-0000-000000000001",
        "households.households.delete",
      ),
    ).toBe(false);
  });
});
