import { describe, expect, it } from "vitest";
import { EMPTY_DATA } from "@/lib/types";
import { hasWorkspaceContent } from "@/lib/workspace-state";

describe("hasWorkspaceContent", () => {
  it("detecta un espacio vacío", () => {
    expect(hasWorkspaceContent(EMPTY_DATA)).toBe(false);
  });

  it("detecta datos fiscales empezados", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        profile: { ...EMPTY_DATA.profile, name: "Demo Local" },
      }),
    ).toBe(true);
  });

  it("detecta entidades guardadas", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        customers: [
          {
            id: "customer-1",
            customerType: "person",
            firstName: "María",
            lastName: "López",
            name: "María López",
            nif: "12345678A",
            email: "",
            phone: "",
            streetType: "",
            address: "",
            residenceType: "flat",
            addressExtra: "",
            city: "",
            postalCode: "",
            notes: "",
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });
});
