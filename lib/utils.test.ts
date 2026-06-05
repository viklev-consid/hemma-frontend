import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts in favor of the last class", () => {
    expect(cn("px-4", "px-2")).toBe("px-2");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });
});
