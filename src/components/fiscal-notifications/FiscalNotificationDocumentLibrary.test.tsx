import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const librarySource = readFileSync(
  new URL("./FiscalNotificationDocumentLibrary.tsx", import.meta.url),
  "utf8",
);
const detailSource = readFileSync(
  new URL("./FiscalNotificationDocumentDetail.tsx", import.meta.url),
  "utf8",
);
const visualsSource = readFileSync(
  new URL("./FiscalNotificationDocumentVisuals.tsx", import.meta.url),
  "utf8",
);
const intakeSource = readFileSync(
  new URL("./FiscalNotificationIntakeView.tsx", import.meta.url),
  "utf8",
);
const deleteModalSource = readFileSync(
  new URL("./FiscalNotificationDeleteConfirmationModal.tsx", import.meta.url),
  "utf8",
);
const deletionHookSource = readFileSync(
  new URL("./useFiscalNotificationDocumentDeletion.ts", import.meta.url),
  "utf8",
);
const deleteAllModalSource = readFileSync(
  new URL(
    "./FiscalNotificationDeleteAllConfirmationModal.tsx",
    import.meta.url,
  ),
  "utf8",
);
const clearLibraryHookSource = readFileSync(
  new URL("./useFiscalNotificationLibraryClear.ts", import.meta.url),
  "utf8",
);
const aiAuditSource = readFileSync(
  new URL("./FiscalNotificationLibraryAiAudit.tsx", import.meta.url),
  "utf8",
);
const aiAuditContractSource = readFileSync(
  new URL(
    "../../lib/fiscal-notifications/library-ai-audit.v1.ts",
    import.meta.url,
  ),
  "utf8",
);
const appStoreSource = readFileSync(
  new URL("../../context/AppStore.tsx", import.meta.url),
  "utf8",
);
const viewModelSource = readFileSync(
  new URL(
    "../../lib/fiscal-notifications/structured-review-document-library.v1.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("FiscalNotificationDocumentLibrary UI contract", () => {
  it("comparte familia, organismo, fecha, revisión, original y relación con la ficha", () => {
    for (const component of [
      "FiscalNotificationFamilyLabel",
      "FiscalNotificationAuthorityLabel",
      "FiscalNotificationDateLabel",
      "FiscalNotificationReviewStatus",
      "FiscalNotificationOriginalStatus",
      "FiscalNotificationRelationStatus",
    ]) {
      expect(visualsSource).toContain(`export function ${component}`);
    }
    expect(librarySource).toContain(
      'from "@/components/fiscal-notifications/FiscalNotificationDocumentVisuals"',
    );
    expect(detailSource).toContain(
      'from "@/components/fiscal-notifications/FiscalNotificationDocumentVisuals"',
    );
  });

  it("presenta todos los documentos con la misma escala y admite títulos de tres líneas", () => {
    expect(librarySource).toContain(
      'className="flex min-w-0 sm:w-[18rem] sm:min-w-[18rem]"',
    );
    expect(librarySource).toContain('className="relative h-[21rem] w-full');
    expect(librarySource).toContain("line-clamp-3 min-h-[4.5rem]");
    expect(librarySource).toContain("summary.amounts.length === 0");
    expect(librarySource).not.toMatch(
      /Documento independiente|Sin importes guardados|Datos fiscales|Solo ficha|Ficha pendiente/u,
    );
    expect(librarySource).not.toContain("<Card");
  });

  it("mantiene una cadena horizontal con scroll interno y la convierte en vertical en móvil", () => {
    expect(librarySource).toContain("sm:overflow-x-auto sm:pb-2");
    expect(librarySource).toContain(
      "flex min-w-0 flex-col items-stretch sm:min-w-max sm:flex-row",
    );
    expect(librarySource).toContain("sm:h-[21rem] sm:w-28");
    expect(librarySource).toContain("sm:hidden");
    expect(librarySource).toContain("hidden h-5 w-5");
    expect(librarySource).toContain("sm:block");
    expect(librarySource).toContain("w-full min-w-0");
    expect(librarySource).not.toContain("min-w-screen");
  });

  it("ofrece la búsqueda, los seis órdenes y los filtros secundarios solicitados", () => {
    expect(librarySource).toContain(
      "Título, organismo, expediente, modelo o periodo",
    );
    for (const option of [
      "Por primer documento",
      "Por último documento",
      "Más reciente",
      "Más antiguo",
      "Próximo vencimiento",
      "Pendiente de revisión",
    ]) {
      expect(librarySource).toContain(option);
    }
    for (const filter of [
      'label="Familia"',
      'label="Organismo"',
      'label="Año"',
      'label="Periodo"',
      'label="Revisión"',
      'label="Relaciones"',
      'label="Original"',
      'label="Vencimiento"',
    ]) {
      expect(librarySource).toContain(filter);
    }
  });

  it("distingue relaciones confirmadas y sugeridas y abre su evidencia", () => {
    expect(librarySource).toContain('"border-emerald-500"');
    expect(librarySource).toContain('relation.visualStatus === "CONFIRMED"');
    expect(librarySource).toContain('"border-dashed border-amber-400"');
    expect(librarySource).toContain("onClick={onOpen}");
    expect(librarySource).toContain('label="Documento origen"');
    expect(librarySource).toContain('label="Documento destino"');
    expect(librarySource).toContain("Identificador coincidente");
    expect(librarySource).toContain("relation.visualStatusLabel");
    expect(viewModelSource).toContain('directionSource: "DOMAIN_RELATION"');
  });

  it("destaca temporalmente la última ficha y conserva el avance de la cola", () => {
    expect(librarySource).toContain(
      "const RECENTLY_SAVED_HIGHLIGHT_MS = 6_000",
    );
    expect(librarySource).toContain("localCalendarDate(new Date())");
    expect(librarySource).toContain("focusDocumentExists");
    expect(librarySource).toContain("scrollIntoView({");
    expect(librarySource).toContain('role="status" aria-live="polite"');
    expect(librarySource).toContain("Guardado ahora · Abrir ficha");
    expect(librarySource).toContain("CheckCircle2");
    expect(librarySource).toContain(
      "setFilters(EMPTY_FISCAL_NOTIFICATION_DOCUMENT_LIBRARY_FILTERS_V1)",
    );
    expect(intakeSource).toContain(
      "advanceAfterSuccessfulSave(activeId, savedDocumentIds[0] ?? null)",
    );
    expect(intakeSource).toContain("showReview(nextReview.documentId)");
    expect(intakeSource).toContain("setScannerOpen(false)");
    expect(intakeSource).toContain("focusDocumentId={recentlySavedDocumentId}");
  });

  it("envía a eliminación solo la ficha pulsada y deja Drive como decisión opcional", () => {
    expect(librarySource).toContain("onDelete(summary.key)");
    expect(librarySource).toContain(
      "onConfirmLocalOnly={() => void deletion.confirm(false)}",
    );
    expect(librarySource).toContain(
      "onConfirmIncludingDrive={() => void deletion.confirm(true)}",
    );
    expect(deletionHookSource).toContain(
      "const selectedDocumentId = documentId",
    );
    expect(deletionHookSource).toContain("documentId: selectedDocumentId");
    expect(deletionHookSource).toContain("if (deleteDriveOriginal && archive)");
    expect(deleteModalSource).toContain("¿Eliminar este documento?");
    expect(deleteModalSource).toContain("Solo ficha");
    expect(deleteModalSource).toContain("Ficha y original");
    expect(deleteModalSource).toContain("Cancelar");
  });

  it("muestra el nombre de sesión dentro de cada ficha y conserva el vínculo multiacto", () => {
    expect(librarySource).toContain("readonly documentIds: readonly string[]");
    expect(librarySource).toContain("sessionFileNamesByDocumentId");
    expect(librarySource).toContain("sourceFileNames.join");
    expect(librarySource).toContain("Archivo:");
    expect(librarySource).toContain("Archivos guardados en esta sesión");
    expect(librarySource).toContain("Copiar nombres");
    expect(intakeSource).toContain(
      "documentIds: Object.freeze([...savedDocumentIds])",
    );
    expect(intakeSource).toContain(
      "documentIds: Object.freeze([...savedItem.documentIds])",
    );
    expect(intakeSource).toContain(
      "onLibraryCleared={() => setSessionFileInventory([])}",
    );
  });

  it("ofrece revisión GPT-4o completa, seudonimizada y sin aplicar cambios", () => {
    expect(librarySource).toContain("<FiscalNotificationLibraryAiAudit");
    expect(aiAuditSource).toContain("Revisar fichas y relaciones con GPT-4o");
    expect(aiAuditSource).toContain("resolveAuditAliases(result.summary");
    expect(aiAuditSource).toContain("resolveAuditAliases(finding.detail");
    expect(aiAuditSource).toContain("resolveAuditAliases(evidence.value");
    expect(aiAuditSource).toContain(
      "projectFiscalNotificationLibraryAiAuditInputV1",
    );
    expect(aiAuditSource).toContain("sessionFileInventory");
    expect(aiAuditSource).toContain("X-AI-Consent-Version");
    expect(aiAuditSource).toContain("useAiProcessingConsent");
    expect(aiAuditSource).toContain("AiProcessingConsentNotice");
    expect(aiAuditSource).toContain("!aiConsent.accepted");
    expect(aiAuditSource).toContain("No se envían el PDF, el texto bruto");
    expect(aiAuditSource).toContain("buildAuditAliasLabels");
    expect(aiAuditSource).toContain("auditSignature");
    expect(aiAuditSource).toContain(
      "latestAuditSignatureRef.current !== requestedAuditSignature",
    );
    expect(aiAuditContractSource).toContain(
      'FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1 = "gpt-4o"',
    );
    for (const field of [
      "sourceFileAliases",
      "references",
      "facts",
      "amounts",
      "installments",
      "explanation",
      "officialSources",
      "relations",
      "explanation: safeAuditContentText",
    ]) {
      expect(aiAuditContractSource).toContain(field);
    }
    expect(aiAuditSource).not.toMatch(
      /deleteFiscalNotification|saveFiscalNotification|replaceData|setData\(/u,
    );
  });

  it("borra toda la biblioteca con confirmación atómica y sin acoplar Drive", () => {
    expect(librarySource).toContain("Borrar todas las fichas");
    expect(librarySource).toContain(
      "<FiscalNotificationDeleteAllConfirmationModal",
    );
    expect(deleteAllModalSource).toContain(
      "Se eliminarán del listado todas las fichas, sus relaciones y sus datos",
    );
    expect(deleteAllModalSource).toContain(
      "estructurados en una única operación.",
    );
    expect(deleteAllModalSource).toContain(
      "Los archivos originales que existan en Google Drive no se borrarán.",
    );
    expect(clearLibraryHookSource).toContain(
      "deleteAllFiscalNotificationDocuments({",
    );
    expect(clearLibraryHookSource).toContain("expected: getCurrentData()");
    expect(clearLibraryHookSource).not.toMatch(
      /runExclusiveDriveOperation|trashFiscalNotificationOriginal|google-drive/iu,
    );
    expect(appStoreSource).toContain(
      "runDeleteAllFiscalNotificationDocumentsCommandV1",
    );
    expect(appStoreSource).toContain(
      "runFiscalNotificationCommandAgainstLatestPersistedV1<DurableDeleteAllFiscalNotificationDocumentsResultV1>",
    );
  });

  it("muestra un vacío sencillo con acceso al escáner y mantiene la lógica fiscal fuera del JSX", () => {
    expect(librarySource).toContain("Todavía no hay documentos guardados");
    expect(librarySource).toContain("Escanear documentos");
    expect(librarySource).toContain("onOpenScanner");
    expect(librarySource).not.toContain("document.money");
    expect(librarySource).not.toContain("document.references");
    expect(librarySource).not.toContain("resolveAeatDocumentProfileV1");
    expect(viewModelSource).toContain(
      "projectFiscalNotificationDocumentDetailV1",
    );
    expect(viewModelSource).toContain("detail.economy?.summary");
  });
});
