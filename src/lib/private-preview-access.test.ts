import { describe, expect, it } from "vitest";
import {
  canReadManualSection,
  hasPrivatePreviewAccess,
  previewAccessForAccount,
  isPrivatePreviewManualSlug,
  isPrivatePreviewPath,
} from "./private-preview-access";

describe("private preview access", () => {
  it("allows only the two owner test accounts", () => {
    expect(hasPrivatePreviewAccess("persianasalmar@gmail.com")).toBe(true);
    expect(hasPrivatePreviewAccess(" PUNTORACINGRC@gmail.com ")).toBe(true);
    expect(hasPrivatePreviewAccess("otro@example.com")).toBe(false);
    expect(hasPrivatePreviewAccess(null)).toBe(false);
  });

  it("honours only the active company's grant for the signed-in account", () => {
    const user = { id: "member-one", email: "member@example.test" };
    const grantedCompany = { taxSummaryGrantedTo: user.id };
    expect(previewAccessForAccount(user, grantedCompany)).toBe("tax-summary");
    expect(previewAccessForAccount(user, {})).toBe("none");
    expect(previewAccessForAccount(user, null)).toBe("none");
    expect(previewAccessForAccount({ ...user, id: "member-two" }, grantedCompany)).toBe("none");
    expect(previewAccessForAccount(null, grantedCompany)).toBe("none");
    expect(previewAccessForAccount({ ...user, email: "persianasalmar@gmail.com" }, null)).toBe("full");
    expect(canReadManualSection("impuestos", "tax-summary")).toBe(true);
    expect(canReadManualSection("consultor-fiscal", "tax-summary")).toBe(false);
    expect(canReadManualSection("modelos-aeat", "tax-summary")).toBe(false);
  });

  it("matches the three private feature route trees without prefix collisions", () => {
    expect(isPrivatePreviewPath("/impuestos")).toBe(true);
    expect(isPrivatePreviewPath("/consultor-fiscal/modelos/303")).toBe(true);
    expect(isPrivatePreviewPath("/afiliados")).toBe(true);
    expect(isPrivatePreviewPath("/impuestos-anuales")).toBe(false);
    expect(isPrivatePreviewPath("/partners")).toBe(false);
  });

  it("identifies the manual sections that describe private features", () => {
    expect(isPrivatePreviewManualSlug("impuestos")).toBe(true);
    expect(isPrivatePreviewManualSlug("modelos-aeat")).toBe(true);
    expect(isPrivatePreviewManualSlug("facturas")).toBe(false);
  });
});
