import { render, screen } from "@testing-library/react";
import { KeyRoundIcon, MailIcon, UserIcon } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SectionTabs } from "@/components/app-shell/section-tabs";

let mockPath = "/app/me/settings";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPath,
}));

const tabs = [
  { href: "/app/me/settings", label: "Profile", icon: UserIcon },
  { href: "/app/me/settings/password", label: "Password", icon: KeyRoundIcon },
  { href: "/app/me/settings/email", label: "Email", icon: MailIcon },
];

describe("SectionTabs", () => {
  beforeEach(() => {
    mockPath = "/app/me/settings";
  });

  it("marks the section root active only on its exact path", () => {
    mockPath = "/app/me/settings";
    render(<SectionTabs tabs={tabs} />);
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Password/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("does NOT keep the section root active on sub-paths", () => {
    mockPath = "/app/me/settings/password";
    render(<SectionTabs tabs={tabs} />);
    expect(screen.getByRole("link", { name: /Profile/ })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: /Password/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks a leaf tab active on nested paths", () => {
    mockPath = "/app/me/settings/password/extra";
    render(<SectionTabs tabs={tabs} />);
    expect(screen.getByRole("link", { name: /Password/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /Profile/ })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
