import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import {
  needsVerifactuRegistration,
  verifactuRecordType,
} from "./eligibility";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test" },
};

const factura: Document = {
  id: "1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "A" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("verifactu eligibility", () => {
  it("requires registration for emitted factura", () => {
    expect(needsVerifactuRegistration(factura, profile)).toBe(true);
  });

  it("skips presupuestos", () => {
    expect(
      needsVerifactuRegistration({ ...factura, type: "presupuesto" }, profile),
    ).toBe(false);
  });

  it("detects anulacion rectificativa", () => {
    expect(
      verifactuRecordType({
        ...factura,
        rectification: {
          originalDocumentId: "x",
          originalNumber: "F-1",
          originalDate: "2026-01-01",
          reason: "Error",
          type: "anulacion",
        },
      }),
    ).toBe("anulacion");
  });
});
