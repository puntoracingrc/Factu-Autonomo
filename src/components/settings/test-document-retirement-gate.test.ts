import { describe, expect, it } from "vitest";
import {
  maskAccountEmail,
  parseExactDocumentNumbers,
  resolveExactDocumentNumbers,
  testDocumentRetirementConfirmationPhrase,
  testDocumentRetirementReadiness,
  testDocumentRetirementRollbackPhrase,
  testDocumentRetirementSelectionCode,
  testDocumentRetirementTenantFingerprint,
} from "./test-document-retirement-gate";

const HASH = `sha256:${"a".repeat(64)}`;

describe("test document retirement UI gate", () => {
  it("deriva una huella opaca estable sin exponer el user id", () => {
    const fingerprint = testDocumentRetirementTenantFingerprint("user-synthetic");
    expect(fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(fingerprint).not.toContain("user-synthetic");
    expect(testDocumentRetirementTenantFingerprint(" user-synthetic ")).toBe(
      fingerprint,
    );
  });

  it("queda listo para cualquier cuenta autenticada con workspace sincronizado", () => {
    const base = {
      authReady: true,
      cloudEnabled: true,
      userId: "owner-synthetic",
      emailConfirmed: true,
      demoMode: false,
      localDataHandoffStatus: "none" as const,
      syncStatus: "synced" as const,
      pendingUpload: false,
      pendingChangeCount: 0,
      lastSyncedAt: "2026-07-14T06:00:00.000Z",
    };
    expect(testDocumentRetirementReadiness(base)).toEqual({
      ready: true,
      blockers: [],
    });
  });

  it("bloquea demo, handoff, nube no vigente y cambios pendientes", () => {
    const result = testDocumentRetirementReadiness({
      authReady: true,
      cloudEnabled: true,
      userId: "owner-synthetic",
      emailConfirmed: true,
      demoMode: true,
      localDataHandoffStatus: "pending",
      syncStatus: "error",
      pendingUpload: true,
      pendingChangeCount: 2,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "demo_workspace",
        "local_handoff_pending",
        "sync_not_current",
        "pending_changes",
        "never_synced",
      ]),
    );
  });

  it("resuelve solo números exactos y detecta duplicados, ausentes y ambiguos", () => {
    const value = "INV-SYN-1, REC-SYN-1\nINV-SYN-1; AUSENTE; DUPLICADO";
    expect(parseExactDocumentNumbers(value)).toEqual({
      numbers: ["INV-SYN-1", "REC-SYN-1", "AUSENTE", "DUPLICADO"],
      duplicateNumbers: ["INV-SYN-1"],
    });
    expect(
      resolveExactDocumentNumbers(
        [
          { id: "invoice", number: "INV-SYN-1" },
          { id: "receipt", number: "REC-SYN-1" },
          { id: "duplicate-a", number: "DUPLICADO" },
          { id: "duplicate-b", number: "DUPLICADO" },
        ],
        value,
      ),
    ).toEqual({
      numbers: ["INV-SYN-1", "REC-SYN-1", "AUSENTE", "DUPLICADO"],
      selectedDocumentIds: ["invoice", "receipt"],
      unknownNumbers: ["AUSENTE"],
      ambiguousNumbers: ["DUPLICADO"],
      duplicateNumbers: ["INV-SYN-1"],
    });
  });

  it("deriva códigos y frases exactas de la selección", () => {
    expect(testDocumentRetirementSelectionCode(HASH)).toBe("AAAAAAAA");
    expect(testDocumentRetirementConfirmationPhrase(5, HASH)).toBe(
      "RETIRAR 5 PRUEBAS AAAAAAAA",
    );
    expect(testDocumentRetirementRollbackPhrase(HASH)).toBe(
      "RESTAURAR LOTE AAAAAAAA",
    );
    expect(testDocumentRetirementConfirmationPhrase(0, HASH)).toBe("");
  });

  it("enmascara el email sin perder la referencia visual del dominio", () => {
    expect(maskAccountEmail("owner@example.test")).toBe("ow•••@example.test");
    expect(maskAccountEmail(undefined)).toBe("Cuenta sin email visible");
  });
});
