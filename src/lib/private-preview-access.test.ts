import { describe, expect, it } from "vitest";
import {
  hasPrivatePreviewAccess,
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
