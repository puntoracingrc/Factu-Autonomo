import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { documentTotals } from "@/lib/calculations";

const cardSource = readFileSync(
  new URL("./TestDocumentRetirementCard.tsx", import.meta.url),
  "utf8",
);
const accountSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);

describe("TestDocumentRetirementCard wiring", () => {
  it("queda integrada en Cuenta → Copias como mantenimiento explícito", () => {
    expect(accountSource).toContain(
      'import { TestDocumentRetirementCard } from "@/components/settings/TestDocumentRetirementCard"',
    );
    expect(accountSource).toContain('id="mantenimiento-documentos-prueba"');
    expect(accountSource).toContain("<TestDocumentRetirementCard />");
    expect(accountSource.indexOf("<TestDocumentRetirementCard />")).toBeLessThan(
      accountSource.indexOf("<AppIssuedDocumentRecoveryCard />"),
    );
  });

  it("exige cuenta autenticada, nube vigente, cero pendientes y fuera de demo", () => {
    expect(cardSource).toContain("testDocumentRetirementReadiness({");
    expect(cardSource).toContain("authReady,");
    expect(cardSource).toContain("cloudEnabled,");
    expect(cardSource).toContain("emailConfirmed,");
    expect(cardSource).toContain("demoMode,");
    expect(cardSource).toContain("localDataHandoffStatus,");
    expect(cardSource).toContain("syncStatus,");
    expect(cardSource).toContain("pendingUpload,");
    expect(cardSource).toContain("pendingChangeCount: Math.max(");
    expect(cardSource).toContain("lastSyncedAt: current.meta?.lastSyncedAt");
    expect(cardSource).not.toContain("getAuthenticatorAssuranceLevel()");
    expect(cardSource).not.toContain("currentAal");
    expect(cardSource).not.toContain("nextAal");
    expect(cardSource).toContain("maskAccountEmail(user?.email)");
    expect(cardSource).not.toContain("user.id}");
  });

  it("resuelve números exactos y confirma directamente desde la vista previa", () => {
    expect(cardSource).toContain(
      "resolveExactDocumentNumbers(data.documents, numberInput)",
    );
    expect(cardSource).toContain("buildTestDocumentRetirementPreview(data, {");
    expect(cardSource).toContain("resolution.unknownNumbers.length > 0");
    expect(cardSource).toContain("resolution.ambiguousNumbers.length > 0");
    expect(cardSource).toContain("resolution.duplicateNumbers.length > 0");
    expect(cardSource).not.toContain("testDocumentRetirementConfirmationPhrase(");
    expect(cardSource).not.toContain("retirementPhrase");
    expect(cardSource).toContain("retiredDocuments.map(");
    expect(cardSource).toContain("Factu no los clasifica");
    expect(cardSource).toContain("automáticamente. La operación conserva");
    expect(cardSource).toContain("Factu preparará automáticamente una copia");
    expect(cardSource).toContain(
      "Retirar estos ${preparedRetirement.preview.affectedCount}",
    );
  });

  it("muestra importes archivados desde snapshot y usa líneas como fallback", () => {
    const items = [
      {
        id: "line-synthetic",
        description: "Línea sintética",
        quantity: 2,
        unitPrice: 10,
        ivaPercent: 21,
      },
    ];
    const snapshotAmounts = { subtotal: 91, iva: 9, total: 100 };
    const resolveAmounts = (snapshot: typeof snapshotAmounts | undefined) =>
      snapshot ?? documentTotals({ items });

    expect(resolveAmounts(snapshotAmounts)).toBe(snapshotAmounts);
    expect(resolveAmounts(undefined)).toEqual({
      subtotal: 20,
      iva: 4.2,
      total: 24.2,
    });
    expect(cardSource).toContain(
      "document.documentSnapshot?.taxSummary ?? documentTotals(document)",
    );
    expect(cardSource).toContain("Importe archivado · Base");
    expect(cardSource).not.toContain("documentAmounts");
    expect(cardSource).not.toContain("importe fiscal validado");
  });

  it("expone las únicas facturas supervivientes cuyo backlink se limpia", () => {
    expect(cardSource).toContain(
      'if (count === 0) return "0 otros documentos se modifican."',
    );
    expect(cardSource).toContain(
      "`${count} otros documentos se modifican únicamente",
    );
    expect(cardSource).toContain(
      "preparedRetirement.preview.candidate.backlinkChanges.map(",
    );
    expect(cardSource).toContain("change.before.number");
    expect(cardSource).toContain("Factura superviviente");
    expect(cardSource).toContain("la vista activa dejará de mostrar");
    expect(cardSource).toContain("<code>receiptDocumentId</code>");
  });

  it("crea la copia previa dentro de la acción durable y sincroniza solo tras éxito", () => {
    expect(cardSource).toContain(
      "runTestDocumentRetirementWithSafetyCopy({",
    );
    expect(cardSource).toContain("getCurrent: getCurrentData");
    expect(cardSource).toContain('purpose: "pre_test_retirement"');
    expect(cardSource).toContain("apply: applyTestDocumentRetirement");
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).toContain("void syncNow(result.data);");
    expect(cardSource.indexOf("setFeedback({\n        tone: \"success\"")).toBeLessThan(
      cardSource.lastIndexOf("void syncNow(result.data);"),
    );
    expect(cardSource).not.toContain("replaceData");
    expect(cardSource).not.toContain("filter((document) => !");
  });

  it("muestra historial owner-scoped y ofrece rollback con copia y frase propias", () => {
    expect(cardSource).toContain(
      "batch.tenantFingerprint === tenantFingerprint",
    );
    expect(cardSource).toContain("batch.events.at(-1)");
    expect(cardSource).toContain("latestEvent.backup.filename");
    expect(cardSource).toContain(
      "buildTestDocumentRetirementRollbackPreview(",
    );
    expect(cardSource).toContain(
      "testDocumentRetirementRollbackPhrase(",
    );
    expect(cardSource).toContain(
      "runTestDocumentRetirementRollbackWithSafetyCopy({",
    );
    expect(cardSource).toContain(
      "rollback: rollbackTestDocumentRetirement",
    );
    expect(cardSource).toContain("Preparar copia y restaurar este lote");
    expect(cardSource).toContain(
      "La auditoría y la reserva de numeración permanecerán",
    );
  });

  it("bloquea doble submit, stale e incertidumbre durable", () => {
    expect(cardSource).toContain("actionLockRef.current");
    expect(cardSource).toContain("storageStateUnknown");
    expect(cardSource).toContain('reason === "stale_preview"');
    expect(cardSource).toContain('reason === "stale_precondition"');
    expect(cardSource).toContain("Mantenimiento deshabilitado hasta recargar");
  });
});
