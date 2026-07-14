import { describe, expect, it } from "vitest";
import {
  SUPPORTING_DOCUMENT_CATALOG_VERSION,
  SUPPORTING_DOCUMENT_STRUCTURES,
  parseSupportingDocumentText,
} from "./supporting-document";

describe("closed supporting-document parser", () => {
  it("keeps the five additional reports and certificates in a versioned registry", () => {
    expect(SUPPORTING_DOCUMENT_STRUCTURES).toHaveLength(5);
    expect(SUPPORTING_DOCUMENT_CATALOG_VERSION).toBe(
      "fiscal-supporting-document-catalog.2026-07.v1",
    );
    for (const structure of SUPPORTING_DOCUMENT_STRUCTURES) {
      expect(structure.officialInformationUrl).toMatch(/^https:\/\//);
      expect(structure.extractableFacts.length).toBeGreaterThan(0);
    }
  });

  it("uses a current RETA status only when the active regime is explicit", () => {
    expect(
      parseSupportingDocumentText(`
        Tesorería General de la Seguridad Social
        Informe de situación actual del trabajador
        Régimen especial de trabajadores por cuenta propia o autónomos
        Situación actual: ALTA
      `),
    ).toMatchObject({
      documentType: "RETA_CURRENT_STATUS_REPORT",
      status: "RESOLVED",
      retaDuringYear: "YES",
    });
  });

  it("recognizes a life report but does not invent RETA when no autonomous period appears", () => {
    expect(
      parseSupportingDocumentText(`
        Seguridad Social · Informe de vida laboral
        Situaciones y días en alta
        Régimen General · Fecha de alta 01/01/2026
      `),
    ).toMatchObject({
      documentType: "WORK_LIFE_REPORT",
      status: "REVIEW_REQUIRED",
    });
  });

  it("reads positive ROI and landlord-exemption certificates", () => {
    expect(
      parseSupportingDocumentText(`
        Agencia Tributaria · Certificado tributario
        Registro de Operadores Intracomunitarios
        Consta de alta en el Registro de Operadores Intracomunitarios
      `),
    ).toMatchObject({
      documentType: "INTRACOMMUNITY_OPERATOR_CERTIFICATE",
      roiRegistered: "YES",
    });
    expect(
      parseSupportingDocumentText(`
        Agencia Tributaria · Certificado tributario
        Exoneración de retención del arrendador de inmuebles
        Se acredita que se encuentra exonerado de la obligación de retener
      `),
    ).toMatchObject({
      documentType: "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
      landlordWithholdingExemption: "YES",
    });
  });

  it("fails closed for an unrelated document", () => {
    expect(parseSupportingDocumentText("Factura de proveedor")).toMatchObject({
      documentType: "UNKNOWN",
      status: "BLOCKED",
    });
  });
});
