import { describe, expect, it } from "vitest";
import {
  buildDeclarationMandatoryFields,
  buildDeclarationOfConformity,
  buildDeclarationStatementEs,
} from "./declaration";

describe("declaration of conformity art. 15", () => {
  it("includes all mandatory fields a–l", () => {
    const doc = buildDeclarationOfConformity(new Date("2026-06-10T12:00:00Z"));
    const m = doc.mandatory;

    expect(m.systemName).toBeTruthy();
    expect(m.systemId).toMatch(/^[A-Z0-9]+$/);
    expect(m.systemVersion).toBeTruthy();
    expect(m.componentsDescription).toContain("Veri*Factu");
    expect(m.exclusiveVerifactu).toBe(false);
    expect(m.producerName).toBeTruthy();
    expect(m.producerNif).toBeTruthy();
    expect(m.producerPostalAddress).toBeTruthy();
    expect(m.complianceStatement).toContain("Real Decreto 1007/2023");
    expect(m.signedAt).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(m.signedPlace).toContain("España");
  });

  it("renders Spanish statement with labeled sections", () => {
    const fields = buildDeclarationMandatoryFields();
    const text = buildDeclarationStatementEs(fields, {
      complianceNotes: "Notas de prueba",
    });

    expect(text).toContain("DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN");
    expect(text).toContain("a) Nombre del sistema informático:");
    expect(text).toContain("b) Código identificador del sistema informático:");
    expect(text).toContain("k) Declaración de cumplimiento:");
    expect(text).toContain("l) Fecha y lugar:");
    expect(text).toContain("ANEXO");
  });

  it("keeps backward-compatible top-level fields", () => {
    const doc = buildDeclarationOfConformity();
    expect(doc.modality).toBe("VERI*FACTU");
    expect(doc.softwareName).toBe(doc.mandatory.systemName);
    expect(doc.developerNif).toBe(doc.mandatory.producerNif);
    expect(doc.issuedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
