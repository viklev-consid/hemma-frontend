import { describe, expect, it } from "vitest";

import {
  formatRoleLabel,
  isHigherOrEqualRank,
  isOrgRole,
  ORG_ROLES,
  roleRank,
  rolesBelow,
} from "./org-roles";

describe("org-roles", () => {
  it("recognises known roles (case-insensitive)", () => {
    expect(isOrgRole("owner")).toBe(true);
    expect(isOrgRole("Owner")).toBe(true);
    expect(isOrgRole("ADMIN")).toBe(true);
    expect(isOrgRole("Guest")).toBe(false);
    expect(isOrgRole("")).toBe(false);
  });

  it("ranks owner > admin > member", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("admin"));
    expect(roleRank("admin")).toBeGreaterThan(roleRank("member"));
    expect(roleRank("member")).toBeGreaterThan(0);
  });

  it("ranks are case-insensitive", () => {
    expect(roleRank("Owner")).toBe(roleRank("owner"));
    expect(roleRank("ADMIN")).toBe(roleRank("admin"));
  });

  it("returns 0 for unknown roles so they sort below everything", () => {
    expect(roleRank("guest")).toBe(0);
    expect(roleRank("")).toBe(0);
  });

  it("rolesBelow returns only strictly-lower roles (no equals)", () => {
    expect(rolesBelow("owner")).toEqual(["admin", "member"]);
    expect(rolesBelow("admin")).toEqual(["member"]);
    expect(rolesBelow("member")).toEqual([]);
  });

  it("rolesBelow returns empty for unknown roles", () => {
    expect(rolesBelow("guest")).toEqual([]);
  });

  it("isHigherOrEqualRank allows demoting equals but not promoting above", () => {
    expect(isHigherOrEqualRank("owner", "admin")).toBe(true);
    expect(isHigherOrEqualRank("admin", "admin")).toBe(true);
    expect(isHigherOrEqualRank("admin", "owner")).toBe(false);
  });

  it("exports a stable ORG_ROLES tuple", () => {
    expect(ORG_ROLES).toEqual(["owner", "admin", "member"]);
  });

  it("formatRoleLabel renders Title Case", () => {
    expect(formatRoleLabel("owner")).toBe("Owner");
    expect(formatRoleLabel("ADMIN")).toBe("Admin");
    expect(formatRoleLabel("")).toBe("");
  });
});
