import { describe, expect, it } from "vitest";

import {
  formatRoleLabel,
  HOUSEHOLD_ROLES,
  isHigherOrEqualRank,
  isHouseholdRole,
  roleRank,
  rolesBelow,
} from "./household-roles";

describe("household-roles", () => {
  it("recognises known roles (case-insensitive)", () => {
    expect(isHouseholdRole("owner")).toBe(true);
    expect(isHouseholdRole("Owner")).toBe(true);
    expect(isHouseholdRole("MEMBER")).toBe(true);
    expect(isHouseholdRole("admin")).toBe(false);
    expect(isHouseholdRole("Guest")).toBe(false);
    expect(isHouseholdRole("")).toBe(false);
  });

  it("ranks owner > member", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("member"));
    expect(roleRank("member")).toBeGreaterThan(0);
  });

  it("ranks are case-insensitive", () => {
    expect(roleRank("Owner")).toBe(roleRank("owner"));
    expect(roleRank("MEMBER")).toBe(roleRank("member"));
  });

  it("returns 0 for unknown roles so they sort below everything", () => {
    expect(roleRank("admin")).toBe(0);
    expect(roleRank("guest")).toBe(0);
    expect(roleRank("")).toBe(0);
  });

  it("rolesBelow returns only strictly-lower roles (no equals)", () => {
    expect(rolesBelow("owner")).toEqual(["member"]);
    expect(rolesBelow("member")).toEqual([]);
  });

  it("rolesBelow returns empty for unknown roles", () => {
    expect(rolesBelow("guest")).toEqual([]);
  });

  it("isHigherOrEqualRank allows demoting equals but not promoting above", () => {
    expect(isHigherOrEqualRank("owner", "member")).toBe(true);
    expect(isHigherOrEqualRank("member", "member")).toBe(true);
    expect(isHigherOrEqualRank("member", "owner")).toBe(false);
  });

  it("exports a stable HOUSEHOLD_ROLES tuple", () => {
    expect(HOUSEHOLD_ROLES).toEqual(["owner", "member"]);
  });

  it("formatRoleLabel renders Title Case", () => {
    expect(formatRoleLabel("owner")).toBe("Owner");
    expect(formatRoleLabel("MEMBER")).toBe("Member");
    expect(formatRoleLabel("")).toBe("");
  });
});
