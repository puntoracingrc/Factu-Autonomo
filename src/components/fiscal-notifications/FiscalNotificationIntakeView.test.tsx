import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const componentSource = readSource("./FiscalNotificationIntakeView.tsx");
const documentLibraryComponentSource = readSource(
  "./FiscalNotificationDocumentLibrary.tsx",
);
const documentDeleteModalSource = readSource(
  "./FiscalNotificationDeleteConfirmationModal.tsx",
);
const pageSource = readSource(
  "../../app/consultor-fiscal/notificaciones/page.tsx",
);
const flowSource = readSource(
  "../../lib/fiscal-notifications/local-review-flow.ts",
);
const batchIntakeSource = readSource(
  "../../lib/fiscal-notifications/batch-intake.v1.ts",
);
const workerSource = readSource(
  "../../lib/fiscal-notifications/pdf-text-layer.worker.ts",
);
const workerContractSource = readSource(
  "../../lib/fiscal-notifications/pdf-worker-analysis-contract.ts",
);
const localOcrSource = readSource(
  "../../lib/fiscal-notifications/local-pdf-ocr.ts",
);
const guidanceSource = readSource(
  "../../lib/fiscal-notifications/review-guidance.v1.ts",
);
const reviewStepsSource = readSource("./FiscalNotificationReviewSteps.tsx");
const verticalSlicePanelSource = readSource(
  "./FiscalNotificationVerticalSliceReview.tsx",
);
const verticalSliceProjectionSource = readSource(
  "../../lib/fiscal-notifications/vertical-slice-review.v1.ts",
);
const explicitFieldsPanelSource = readSource(
  "./FiscalNotificationExplicitFieldsReview.tsx",
);
const explicitFieldsViewModelSource = readSource(
  "../../lib/fiscal-notifications/explicit-fields-review-view-model.v2.ts",
);
const partyFactsPanelSource = readSource(
  "./FiscalNotificationPartyFactsReview.tsx",
);
const partyFactsViewModelSource = readSource(
  "../../lib/fiscal-notifications/party-facts-review-view-model.v1.ts",
);
const relationsViewModelSource = readSource(
  "../../lib/fiscal-notifications/structured-review-relations-view-model.v1.ts",
);
const documentLibraryViewModelSource = readSource(
  "../../lib/fiscal-notifications/structured-review-document-library.v1.ts",
);
const documentDeletionSource = readSource(
  "../../lib/fiscal-notifications/document-deletion.v1.ts",
);
const documentDeletionCommandSource = readSource(
  "../../lib/fiscal-notifications/document-deletion-command.v1.ts",
);
const driveArchiveDomainSource = readSource(
  "../../lib/fiscal-notifications/drive-original-archive.v1.ts",
);
const driveArchiveUploadSource = readSource(
  "../../lib/google-drive/fiscal-notification-original-archive.v1.ts",
);
const driveOriginalDeleteSource = readSource(
  "../../lib/google-drive/fiscal-notification-original-delete.v1.ts",
);
const supportReportSource = readSource(
  "../../lib/fiscal-notifications/support-report.v1.ts",
);
const supportReportClientSource = readSource(
  "../../lib/fiscal-notifications/support-report-client.v1.ts",
);
const supportReportRouteSource = readSource(
  "../../app/api/fiscal-notifications/support/route.ts",
);
const manualSource = readSource(
  "../../lib/manual/sections/consultor-fiscal.ts",
);
const surfaceSource = `${componentSource}\n${documentLibraryComponentSource}\n${pageSource}\n${flowSource}\n${batchIntakeSource}\n${guidanceSource}\n${reviewStepsSource}\n${verticalSlicePanelSource}\n${explicitFieldsPanelSource}\n${explicitFieldsViewModelSource}\n${partyFactsPanelSource}\n${partyFactsViewModelSource}\n${relationsViewModelSource}\n${documentLibraryViewModelSource}`;

describe("contrato de interfaz de Notificaciones y expedientes", () => {
  it("explica la ficha con conocimiento local antes del detalle técnico", () => {
    expect(documentLibraryComponentSource).toContain(
      "Qué te está diciendo este documento",
    );
    expect(documentLibraryComponentSource).toContain("Por qué lo has recibido");
    expect(documentLibraryComponentSource).toContain("Qué tienes que hacer");
    expect(documentLibraryComponentSource).toContain(
      "Fuentes oficiales en las que se basa nuestro escáner",
    );
    expect(documentLibraryComponentSource).toContain(
      "Ver datos tal como aparecen en el documento",
    );
    expect(compact(documentLibraryComponentSource)).toContain(
      "Al escanear no se consulta internet, la AEAT, el BOE ni una IA",
    );
    expect(documentLibraryComponentSource).toContain(
      "Datos extraídos de la página ${pageNumber}",
    );
  });

  it("muestra organismo, título y fecha sin etiquetas técnicas en cada tarjeta", () => {
    expect(documentLibraryComponentSource).toContain(
      "abbreviateAuthority(document.authority)",
    );
    expect(documentLibraryComponentSource).toContain(
      "formatGroupMonthSequence(group)",
    );
    expect(documentLibraryComponentSource).toContain("<CalendarDays");
    expect(documentLibraryComponentSource).not.toContain("Solo ficha");
    expect(documentLibraryComponentSource).not.toContain(
      "Fecha del documento pendiente",
    );
    expect(documentLibraryComponentSource).not.toContain(
      "Documento independiente",
    );
    expect(documentLibraryComponentSource).not.toContain(
      "De izquierda a derecha: documento más antiguo",
    );
  });

  it("confirma de forma breve y separa borrar en Factu de enviar el original a la papelera de Drive", () => {
    expect(documentLibraryComponentSource).toContain("Eliminar ficha de Factu");
    expect(documentLibraryComponentSource).toContain(
      "deleteFiscalNotificationDocument({",
    );
    expect(documentDeleteModalSource).toContain(
      "¿Quieres eliminar también el documento original subido a Google Drive?",
    );
    expect(documentDeleteModalSource).toContain("¿Eliminar este documento?");
    expect(documentDeleteModalSource).not.toContain("Se eliminarán la ficha");
    expect(documentLibraryComponentSource).toContain(
      "trashFiscalNotificationOriginalInGoogleDriveV1",
    );
    expect(documentLibraryComponentSource).toContain(
      "restoreFiscalNotificationOriginalInGoogleDriveV1",
    );
    expect(documentDeletionSource).toContain(
      'drivePolicy: "PRESERVE_USER_DRIVE_ORIGINAL"',
    );
    expect(documentDeletionSource).toContain("driveFileIdsPreserved");
    expect(documentDeletionCommandSource).toContain(
      "fiscalNotificationsWorkspace: transitioned.workspace",
    );
    expect(documentDeletionCommandSource).toContain(
      "registerFiscalNotificationDocumentReductionTransitionV2(",
    );
    expect(driveOriginalDeleteSource).toContain(
      "body: JSON.stringify({ trashed })",
    );
    expect(driveOriginalDeleteSource).toContain(
      "FISCAL_NOTIFICATION_DRIVE_ARCHIVE_POLICY_V1",
    );
    expect(driveOriginalDeleteSource).not.toMatch(/method:\s*["']DELETE["']/u);
    expect(
      `${documentDeletionSource}\n${documentDeletionCommandSource}`,
    ).not.toMatch(
      /fetch\s*\(|googleapis|drive\.files\.(?:delete|update)|trashDrive/iu,
    );
  });

  it("obtiene el ámbito exclusivamente de la cuenta canónica confirmada", () => {
    expect(componentSource).toContain(
      'import { useCloudSync } from "@/context/CloudSyncContext"',
    );
    expect(componentSource).toContain(
      "const { authReady, user, emailConfirmed } = useCloudSync()",
    );
    expect(componentSource).toContain("`user:${user.id}`");
    expect(componentSource).toContain(
      "authReady && user && emailConfirmed ? `user:${user.id}` : null",
    );
    expect(componentSource).toContain("key={ownerScope}");
    expect(componentSource).toContain("ownerScope={ownerScope}");
    expect(componentSource).toContain("Cuenta confirmada necesaria");
    expect(componentSource).not.toMatch(/profile\.(?:nif|name)|data\.profile/);
    const ownerResolution = componentSource.slice(
      componentSource.indexOf("export function FiscalNotificationIntakeView"),
      componentSource.indexOf("function FiscalNotificationReviewWorkspace"),
    );
    expect(ownerResolution).not.toMatch(/(?:file|selectedFile)\.name/);
  });

  it("mantiene el File solo en una referencia efímera y nunca persiste nombre, bytes o texto", () => {
    const batchItemContract = componentSource.slice(
      componentSource.indexOf("interface FiscalNotificationBatchItem"),
      componentSource.indexOf("export function FiscalNotificationIntakeView"),
    );
    expect(batchItemContract).toContain("readonly byteLength: number");
    expect(batchItemContract).toContain("readonly displayName: string");
    expect(batchItemContract).toContain("readonly sha256: string");
    expect(batchItemContract).not.toMatch(
      /\b(?:bytes|text|pages|documentInput)\b/i,
    );

    expect(componentSource).not.toMatch(/useState\s*<\s*File\b/);
    expect(componentSource).toContain(
      "const filesRef = useRef(new Map<string, File>())",
    );
    expect(componentSource).toContain("filesRef.current.clear()");
    expect(componentSource).toContain("filesRef.current.delete(id)");
    expect(componentSource).toContain("archiveFilesRef.current.clear()");
    expect(componentSource).toContain("archiveFilesRef.current.delete(id)");
    expect(compact(componentSource)).toContain(
      "El análisis es local. Al guardar eliges Factu, Google Drive o ambos.",
    );

    const reviewResultContract = flowSource.slice(
      flowSource.indexOf(
        "export interface FiscalNotificationLocalReviewResult",
      ),
      flowSource.indexOf("/** @internal Test seam"),
    );
    expect(reviewResultContract).toContain("readonly sha256: string");
    expect(reviewResultContract).toContain(
      'readonly retainedSourceContent: "NONE"',
    );
    expect(reviewResultContract).not.toMatch(
      /readonly\s+(?:file|filename|bytes|text|pages|documentInput)\b/i,
    );

    const pendingStructuredReviewContract = componentSource.slice(
      componentSource.indexOf("interface PendingStructuredReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingStructuredReviewContract).toContain(
      "readonly reviewId: string",
    );
    expect(pendingStructuredReviewContract).toContain(
      "readonly createdAt: string",
    );
    expect(pendingStructuredReviewContract).toContain(
      "readonly analysis: FiscalNotificationLocalAnalysisResult",
    );
    expect(pendingStructuredReviewContract).not.toMatch(
      /\b(?:file|filename|bytes|text|pages|documentInput|raw)\b/i,
    );
  });

  it("desmonta síncronamente el workspace y aborta al cambiar de cuenta", () => {
    const workspaceStart = componentSource.indexOf(
      "function FiscalNotificationReviewWorkspace",
    );
    const authenticatedShell = componentSource.slice(0, workspaceStart);
    const workspace = componentSource.slice(workspaceStart);

    expect(authenticatedShell).toContain("key={ownerScope}");
    expect(authenticatedShell).not.toContain("useState<");
    expect(workspace).toContain("const controller = controllerRef.current");
    expect(workspace).toContain("controllerRef.current = null");
    expect(workspace).toContain("controller?.abort()");
    expect(workspace).toContain('fileInputRef.current.value = ""');
    expect(workspace).toContain("[ownerScope]");
    expect(workspace).toContain("saveOperationRef.current = null");
    expect(workspace).toContain("projectFiscalNotificationDocumentLibraryV1(");
    expect(workspace).toContain("data.fiscalNotificationsWorkspace");

    expect(componentSource).toContain("controller.signal.aborted ||");
    expect(componentSource).toContain("controllerRef.current !== controller");
  });

  it("encadena lector PDF, OCR local y reglas deterministas sin proveedor", () => {
    expect(componentSource).toContain(
      "analyzeFiscalNotificationLocallyWithEphemeralFacts({",
    );
    expect(componentSource).toContain("ownerScope,");
    expect(componentSource).toContain("file,");
    expect(componentSource).toContain("signal: controller.signal");
    expect(componentSource).toContain("globalThis.crypto?.randomUUID");

    expect(flowSource).toContain("readFiscalNotificationPdfTextLayer");
    expect(flowSource).not.toContain("extractFiscalNotificationCandidates");
    expect(workerSource).toContain("analyzeFiscalNotificationDocumentInput");
    expect(workerSource).toContain(
      "projectFiscalNotificationPdfWorkerAnalysis",
    );
    expect(workerSource).not.toContain("pages: documentInput.pages");
    expect(workerContractSource).toContain('retainedSourceContent: "NONE"');
    expect(flowSource).toContain("recognizeFiscalNotificationPdfLocally");
    expect(localOcrSource).toContain('createWorker("spa", OEM.LSTM_ONLY');
    expect(localOcrSource).toContain(
      'workerPath: "/ocr/tesseract-worker.min.js"',
    );
    expect(localOcrSource).toContain('retainedSourceContent: "NONE"');
    expect(localOcrSource).not.toMatch(/fetch\s*\(|axios|openai/i);
    expect(flowSource).toContain("PRODUCTION_DEPENDENCIES");
    expect(flowSource).toContain("FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM");
    expect(flowSource).toContain('| "OCR_DISABLED";');
    expect(flowSource).toContain("parseFiscalNotificationLocalOcrResult(");
    expect(flowSource).toContain('mode: "LOCAL_OCR" as const');
    expect(flowSource).toContain("providerCalled: false");
    expect(flowSource).toContain(
      'materializationPolicy: "PROHIBITED_UNTIL_REVIEW"',
    );
  });

  it("conecta el workspace durable al AppStore y al owner canónico", () => {
    expect(componentSource).toContain(
      'import { useAppStore } from "@/context/AppStore"',
    );
    expect(componentSource).toContain("ready: appStoreReady");
    expect(componentSource).toContain(
      "saveFiscalNotificationStructuredReview,",
    );
    expect(componentSource).toContain("if (!appStoreReady)");
    expect(componentSource).toContain(
      "projectFiscalNotificationDocumentLibraryV1(",
    );
    expect(componentSource).toContain("data.fiscalNotificationsWorkspace");
    expect(componentSource).toContain(
      "saveFiscalNotificationStructuredReview({",
    );
    expect(componentSource).toContain("getCurrentData,");
    expect(componentSource).toContain("key={ownerScope}");
    expect(componentSource).not.toContain(
      "createBrowserFiscalNotificationLocalReviewStore",
    );
  });

  it("elige destino y guarda solo por acción explícita", () => {
    expect(componentSource).toContain("¿Dónde quieres guardar este documento?");
    expect(componentSource).toContain('onSelect("ACCOUNT")');
    expect(componentSource).toContain('onSelect("DRIVE")');
    expect(componentSource).toContain('onSelect("BOTH")');
    expect(componentSource).toContain("Mi cuenta");
    expect(componentSource).toContain("Google Drive");
    expect(componentSource).toContain("Ambas");
    expect(compact(componentSource)).toContain(
      "no tendrás que seleccionarlo ni escanearlo otra vez",
    );
    expect(componentSource).toContain("onClick={() => void onSave()}");
    expect(componentSource).toContain(
      "saveFiscalNotificationStructuredReview({",
    );
    expect(componentSource).toContain("const currentData = getCurrentData()");
    expect(componentSource).toContain("expected: currentData");
    expect(componentSource).toContain("ownerScope,");
    expect(componentSource).toMatch(/reviewId:\s*[A-Za-z0-9_]+\.reviewId/);
    expect(componentSource).toMatch(/createdAt:\s*[A-Za-z0-9_]+\.createdAt/);
    expect(componentSource).toMatch(/analysis:\s*[A-Za-z0-9_]+\.analysis/);
    expect(componentSource).toMatch(/`review:\$\{/);
    expect(componentSource).toContain("new Date().toISOString()");
    expect(componentSource).toContain(
      "setRecentlySavedDocumentId(savedDocumentId)",
    );
    expect(componentSource).toContain(
      "focusDocumentId={recentlySavedDocumentId}",
    );
    expect(documentLibraryComponentSource).toContain('setQuery("")');
    expect(documentLibraryComponentSource).toContain("scrollIntoView({");
    expect(documentLibraryComponentSource).toContain("Guardado ahora");
    expect(documentLibraryComponentSource).toContain(
      "border-emerald-500 ring-2 ring-emerald-200",
    );
    expect(componentSource).toContain(
      "advanceAfterSuccessfulSave(activeId, savedDocumentId)",
    );
    expect(componentSource).toContain("reviewsRef.current.delete(savedItemId)");
    expect(componentSource).toContain("replaceQueue(remainingQueue)");
    expect(componentSource).toContain("showReview(nextReview.documentId)");
    expect(componentSource).toContain("setScannerOpen(false)");
    expect(componentSource).toContain("Escanear más documentos");

    expect(componentSource).toContain(
      "await analyzeFiscalNotificationLocallyWithEphemeralFacts",
    );
    expect(componentSource).toContain(
      "setResult(nextAnalysis.technicalReview)",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementMoneyFacts",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementExplicitFields",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementPartyFacts",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralDeferralGrantFacts",
    );
    expect(componentSource).toContain(
      "projectExplicitFieldsReviewViewModelV2(",
    );
    expect(componentSource).toContain("analysis: nextAnalysis");
    expect(componentSource).toContain("reviewsRef.current.set(id, review)");
    const analyzeQueue = componentSource.slice(
      componentSource.indexOf("async function analyzeQueue"),
      componentSource.indexOf("function handleDragEnter"),
    );
    expect(analyzeQueue).not.toContain(
      "saveFiscalNotificationStructuredReview",
    );

    const saveStart = componentSource.indexOf(
      "saveFiscalNotificationStructuredReview({",
    );
    const saveEnd = componentSource.indexOf("});", saveStart);
    const savePayload = componentSource.slice(saveStart, saveEnd);
    expect(saveStart).toBeGreaterThan(-1);
    expect(savePayload).toContain("analysis: pendingReview.analysis");
    expect(savePayload).not.toMatch(/\b(?:file|filename|text|bytes|raw)\b/i);
    expect(savePayload).not.toMatch(/guidance|reviewSteps|officialProcedure/i);
  });

  it("muestra una guía efímera antes del guardado sin registrar su progreso", () => {
    expect(componentSource).toContain(
      'import { FiscalNotificationReviewSteps } from "@/components/fiscal-notifications/FiscalNotificationReviewSteps"',
    );
    expect(componentSource).toContain(
      'import { projectFiscalNotificationReviewGuidanceV1 } from "@/lib/fiscal-notifications/review-guidance.v1"',
    );
    expect(componentSource).toContain(
      "projectFiscalNotificationReviewGuidanceV1({",
    );
    expect(componentSource).toContain("technicalReview: result");
    expect(componentSource).toContain(
      "ephemeralEnforcementMoneyFacts: ephemeralMoneyFacts",
    );
    expect(componentSource).toContain("documentTypeRecognized={");

    const resultIndex = componentSource.indexOf("<ReviewResult");
    const stepsIndex = componentSource.indexOf(
      "recognizedCandidateFrom(result) !== null",
    );
    const persistenceIndex = componentSource.indexOf("<ReviewPersistencePanel");
    expect(resultIndex).toBeGreaterThan(-1);
    expect(stepsIndex).toBeGreaterThan(resultIndex);
    expect(persistenceIndex).toBeGreaterThan(stepsIndex);

    expect(guidanceSource).toContain('completionTracking: "DISABLED"');
    expect(guidanceSource).toContain('userInputPolicy: "NONE"');
    expect(guidanceSource).toContain('persistencePolicy: "DO_NOT_PERSIST"');
    expect(reviewStepsSource).toContain("Antes de actuar");
    expect(reviewStepsSource).not.toMatch(
      /<(?:form|input|button|progress|select|textarea)\b/,
    );
    expect(compact(manualSource)).toContain(
      "El panel **Antes de actuar** enumera comprobaciones manuales y no guarda su progreso.",
    );
    expect(compact(manualSource)).toContain(
      "abrirlo es una decisión del usuario, no valida el PDF ni calcula plazos.",
    );
  });

  it("solo avanza tras applied y mantiene separados los bloqueos", () => {
    const saveStart = componentSource.indexOf(
      "saveFiscalNotificationStructuredReview({",
    );
    const writeFlow = componentSource.slice(saveStart, saveStart + 4_000);
    expect(saveStart).toBeGreaterThan(-1);
    expect(writeFlow).toContain('accountWrite.status !== "applied"');
    expect(writeFlow).toContain(
      'accountWrite.status !== "applied_with_warnings"',
    );
    expect(writeFlow).toContain('destination === "ACCOUNT"');
    expect(writeFlow).toContain(
      "advanceAfterSuccessfulSave(activeId, savedDocumentId)",
    );
    expect(componentSource).toContain(
      'write.safeCode === "CORE_INVALID_INPUT"',
    );
    expect(componentSource).toContain(
      'write.safeCode === "CORE_WORKSPACE_INTEGRITY_FAILED"',
    );
    expect(componentSource).toContain(
      'write.safeCode === "DURABILITY_CONFLICT"',
    );
    expect(componentSource).not.toContain("Código: ${write.safeCode}");
    expect(componentSource).toContain("errorMessage={saveError}");
    expect(componentSource).not.toContain('setPersistenceState("saved")');
    expect(componentSource).toContain("No se ha guardado una tarjeta vacía");
    expect(componentSource).toContain(
      "No se puede confirmar el estado de la escritura",
    );
  });

  it("muestra la biblioteca con datos seguros sin exponer identidad ni huellas", () => {
    expect(documentLibraryComponentSource).toContain("Tus documentos");
    expect(documentLibraryComponentSource).toContain(
      "group.documents.map((document, index)",
    );
    expect(documentLibraryComponentSource).toContain("document.createdAt");
    expect(documentLibraryComponentSource).not.toContain(
      "document.subjectName",
    );
    expect(documentLibraryComponentSource).not.toContain(
      "document.subjectTaxId",
    );
    expect(documentLibraryComponentSource).toContain("document.money");
    expect(documentLibraryComponentSource).toContain("document.references");
    expect(documentLibraryComponentSource).toContain("document.orderedFacts");
    expect(documentLibraryComponentSource).toContain("document.installments");
    expect(documentLibraryComponentSource).toContain("installment.amountCents");
    expect(documentLibraryComponentSource).toContain("installment.dueDate");
    expect(documentLibraryComponentSource).not.toContain("Huella local");
    expect(documentLibraryComponentSource).not.toMatch(
      /\.sha256(?:\.|\[|\s|\})/,
    );
    expect(documentLibraryComponentSource).not.toMatch(
      />\s*\{[^}]*\b(?:reviewId|ownerScope)\b[^}]*\}\s*</,
    );
    expect(documentLibraryComponentSource).toContain("key={document.key}");
    expect(documentLibraryComponentSource).not.toMatch(
      /\bdocument\.ownerScope\b/,
    );
    expect(documentLibraryComponentSource).toContain("original no archivado");
    expect(documentLibraryComponentSource).toContain(
      "Original archivado en tu Google Drive",
    );
  });

  it("muestra relaciones exactas con tarjetas iguales y navegación a la ficha", () => {
    expect(documentLibraryComponentSource).toContain(
      "Documentos del mismo expediente",
    );
    expect(documentLibraryComponentSource).toContain(
      "Cómo se relaciona con los demás",
    );
    expect(documentLibraryViewModelSource).toContain(
      "projectStructuredReviewRelationsV1(",
    );
    expect(componentSource).toContain("data.fiscalNotificationsWorkspace");
    expect(relationsViewModelSource).toContain(
      "Documentos relacionados por referencia",
    );
    expect(relationsViewModelSource).toContain("Relación detectada · revisar");
    expect(documentLibraryComponentSource).toContain(
      "h-[16rem] w-[18rem] min-w-[18rem]",
    );
    expect(documentLibraryComponentSource).toContain("{link.explanation}");
    expect(documentLibraryComponentSource).toContain(
      "?documento=${encodeURIComponent(documentId)}",
    );
    expect(relationsViewModelSource).toContain(
      "FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2",
    );
    expect(relationsViewModelSource).toContain(
      "FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2",
    );
    expect(relationsViewModelSource).toContain(
      "Embargo vinculado a providencia de apremio",
    );
    expect(relationsViewModelSource).toContain(
      "Ingreso de tercero vinculado a diligencia de embargo",
    );
    expect(relationsViewModelSource).toContain(
      "no marca automáticamente la deuda como pagada",
    );
    expect(relationsViewModelSource).toContain("no se infiere automáticamente");
    expect(relationsViewModelSource).toContain("Expediente relacionado");
    expect(relationsViewModelSource).toContain(
      "Referencias exactas · efectos por revisar",
    );
    expect(relationsViewModelSource).toContain(
      "no marca automáticamente la deuda como pagada",
    );
    expect(componentSource).not.toMatch(
      /relación confirmada|pago confirmado|expediente cerrado/iu,
    );
  });

  it("mantiene neutral el mensaje live cuando no hay candidatos", () => {
    expect(compact(componentSource)).toContain(
      "No hay una familia confirmable para esta revisión. No se crea ninguna entidad ni se toma ninguna acción automática.",
    );
    expect(compact(componentSource)).not.toContain(
      "El documento queda como información pendiente y no se crea ninguna entidad.",
    );
  });

  it("presenta las familias reconocidas sin confirmar autoridad y limita expresamente ROI", () => {
    for (const expected of [
      "Documento reconocido",
      "Diligencia de embargo de bienes inmuebles",
      "Requerimiento formal de presentación",
      "Acuerdo de alta en el ROI",
      "La familia documental coincide con una firma estructural cerrada. La autoridad, autenticidad, datos y efectos siguen pendientes de revisión.",
      "Este acuerdo describe el alta que figura en el documento; no confirma que siga vigente ni valida el estado actual en VIES.",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain("Documento reconocido");
    expect(componentSource).toContain("Revisa antes de actuar");
    expect(reviewStepsSource).toContain(
      "Comprueba los datos del documento reconocido",
    );
    expect(reviewStepsSource).toContain(
      "esa comprobación no vuelve a convertir el tipo en posible",
    );
    expect(guidanceSource).toContain(
      'materializationPolicy: "PROHIBITED_UNTIL_REVIEW"',
    );
    expect(componentSource).not.toMatch(/alta actual confirmada|VIES válido/iu);
    expect(componentSource).not.toMatch(
      /Posible (?:providencia|concesión|diligencia|requerimiento|acuerdo)/u,
    );
  });

  it("prohíbe red, API y acceso directo al almacenamiento del navegador", () => {
    for (const forbidden of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /\/api\//,
      /localStorage/,
      /sessionStorage/,
      /indexedDB/,
      /\bOpenAI\b/i,
      /\bAnthropic\b/i,
      /dangerouslySetInnerHTML/,
      /\.innerHTML\b/,
      /console\.(?:log|info|warn|error|debug)/,
      /reportAppError/,
      /reportError/,
      /FileReader/,
      /createObjectURL/,
    ]) {
      expect(surfaceSource).not.toMatch(forbidden);
    }
    expect(componentSource).not.toMatch(
      /window\.localStorage|globalThis\.localStorage|navigator\.locks/,
    );
    expect(componentSource).toContain(
      'import { useAppStore } from "@/context/AppStore"',
    );
    expect(componentSource).not.toMatch(/@\/lib\/storage|saveData\s*\(/);
  });

  it("explica con precisión OCR, alcance y persistencia estructurada opcional", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "Prepara un lote de hasta",
      "PDF, revísalo y pulsa una sola vez Analizar.",
      "El análisis es local. Al guardar eliges Factu, Google Drive o ambos.",
      "Los documentos duplicados se detectan automáticamente.",
      "Ficha guardada en los datos de tu cuenta. Ya puedes volver a consultar sus importes, referencias permitidas, fechas, estados y relaciones estructurados.",
      "Al guardar podrás elegir Mi cuenta, Google Drive o ambas opciones.",
      "No se ha enviado a ningún proveedor y debes revisarlo manualmente.",
      "Lectura OCR local",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("Documento reconocido");
    expect(componentSource).toContain(
      "Resultado local · pendiente de revisión",
    );
    expect(componentSource).toContain('"Resultado local"');
  });

  it("prioriza el tipo reconocido y mantiene la traza técnica accesible pero cerrada", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "Tipo de documento",
      "Título y estructura coinciden",
      "<details",
      "<summary",
      "Traza técnica",
      'label="Motor"',
      'label="Regla"',
      'label="Anclas encontradas"',
      'label="Anclas pendientes"',
      'label="Conflictos"',
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).not.toContain("Familias candidatas");
    expect(componentSource).not.toContain("Revisión humana obligatoria");
    expect(componentSource).not.toMatch(/<details[^>]*\sopen(?:=|\s|>)/u);
    expect(componentSource.indexOf("</details>")).toBeLessThan(
      componentSource.indexOf("{ephemeralMoneyFacts ?"),
    );
  });

  it("muestra solo importes explícitos efímeros sin inventar moneda, cero o total", () => {
    for (const expected of [
      "Principal pendiente",
      "Recargo ordinario",
      "Ingreso a cuenta",
      "Importe total",
      "Importes detectados",
      "según el documento",
      "revisión obligatoria",
      "moneda no confirmada",
      "Una ausencia nunca se convierte en cero.",
      "No se han sumado, recalculado ni elegido como importe a pagar.",
      "Permanecen solo en memoria hasta que pulses",
      "Guardar",
      "No se encontró una etiqueta cubierta; no se ha convertido en cero.",
      "Una etiqueta cubierta aparece sin cifra; se mantiene pendiente.",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain('result.outcome !== "FACTS_AVAILABLE"');
    expect(componentSource).toContain('currency === "EUR"');
    expect(componentSource).toContain("BigInt(amountCents)");
    expect(componentSource).not.toMatch(
      /(?:amountCents|ephemeralMoneyFacts)[^\n]{0,120}\?\?\s*0/,
    );
    expect(
      componentSource.match(/setEphemeralMoneyFacts\(null\)/g)?.length,
    ).toBeGreaterThanOrEqual(1);

    const saveStart = componentSource.indexOf(
      "saveFiscalNotificationStructuredReview({",
    );
    const saveEnd = componentSource.indexOf("});", saveStart);
    const savePayload = componentSource.slice(saveStart, saveEnd);
    expect(savePayload).toContain("analysis: pendingReview.analysis");
    expect(savePayload).not.toMatch(/\b(?:file|text|raw)\b/i);
  });

  it("muestra los datos exactos de una concesión y su calendario de cuotas", () => {
    const copy = compact(
      `${componentSource}\n${documentLibraryComponentSource}`,
    );
    for (const expected of [
      "Concesión de aplazamiento o fraccionamiento",
      "Cuotas, importes y vencimientos leídos literalmente de los anexos de la concesión.",
      "Importe concedido",
      "Cuenta de pago",
      "Importe de deuda",
      "Fecha de intereses",
      "Vencimiento",
      "Cuotas y vencimientos",
      "Son datos guardados para consulta.",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("DeferralGrantFactsPanel");
    expect(componentSource).toContain(
      "setEphemeralDeferralFacts(nextAnalysis.ephemeralDeferralGrantFacts)",
    );
    expect(
      componentSource.match(/setEphemeralDeferralFacts\(null\)/g)?.length,
    ).toBeGreaterThanOrEqual(1);
    expect(componentSource).toContain('result.outcome === "AMBIGUOUS"');
    expect(copy).toContain(
      "No se ha marcado ninguna cuota como pagada ni se ha creado un gasto o asiento.",
    );
  });

  it("muestra referencias, importes y efectos exactos del acuerdo de compensación", () => {
    const copy = compact(
      `${componentSource}\n${documentLibraryComponentSource}`,
    );
    for (const expected of [
      "Acuerdo de compensación de oficio",
      "Acuerdo de compensación solicitado",
      "Crédito, deudas, importes compensados, saldos y efectos leídos de los anexos del acuerdo.",
      "Número de acuerdo",
      "Fecha de solicitud",
      "Total del crédito",
      "Aplicado a compensar",
      "Principal pendiente",
      "Recargo ejecutivo",
      "Ingresos a cuenta",
      "Total antes de compensar",
      "Importe compensado",
      "Pendiente después de compensar",
      "Referencia:",
      "No se recalculan y no se crea, cancela ni marca como pagada ninguna deuda, gasto o asiento.",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("OffsetAgreementFactsPanel");
    expect(componentSource).toContain(
      "setEphemeralOffsetFacts(nextAnalysis.ephemeralOffsetAgreementFacts)",
    );
    expect(
      componentSource.match(/setEphemeralOffsetFacts\(null\)/g)?.length,
    ).toBeGreaterThanOrEqual(1);
    expect(componentSource).toContain(
      "OFFSET_EFFECT_LABELS[debt.effectMeaning]",
    );
    expect(componentSource).not.toMatch(
      /(?:remainingAfterOffset|compensatedAmount)[^\n]{0,120}\?\?\s*0/,
    );
  });

  it("proyecta referencias y fechas en memoria y las guarda solo por acción explícita", () => {
    expect(componentSource).toContain(
      "useState<ExplicitFieldsReviewViewModelV2 | null>(null)",
    );
    expect(componentSource).toContain(
      "projectExplicitFieldsReviewViewModelV2(",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementExplicitFields",
    );
    expect(
      componentSource.match(/setExplicitFieldsReview\(null\)/g),
    ).toHaveLength(1);
    expect(componentSource).toContain("function clearReviewDisplay()");
    expect(componentSource).toContain("filesRef.current.clear()");
    expect(componentSource).toContain(
      "<FiscalNotificationExplicitFieldsReview",
    );
    expect(componentSource).toContain("viewModel={explicitFieldsReview}");

    const resultStart = componentSource.indexOf("function ReviewResult");
    const resultEnd = componentSource.indexOf(
      "function EphemeralMoneyFactsPanel",
      resultStart,
    );
    const resultPanel = componentSource.slice(resultStart, resultEnd);
    const moneyIndex = resultPanel.indexOf("<EphemeralMoneyFactsPanel");
    const explicitIndex = resultPanel.indexOf(
      "<FiscalNotificationExplicitFieldsReview",
    );
    const localGuaranteeIndex = resultPanel.indexOf(
      "El análisis se ha realizado en este navegador",
    );
    expect(moneyIndex).toBeGreaterThan(-1);
    expect(explicitIndex).toBeGreaterThan(moneyIndex);
    expect(localGuaranteeIndex).toBeGreaterThan(explicitIndex);

    const pendingContract = componentSource.slice(
      componentSource.indexOf("interface PendingStructuredReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingContract).toContain(
      "readonly analysis: FiscalNotificationLocalAnalysisResult",
    );
    expect(componentSource).toContain(
      "saveFiscalNotificationStructuredReview({",
    );

    expect(explicitFieldsPanelSource).not.toMatch(
      /AeatEnforcementExplicitFieldsV2|rawValue|referenceValue|canonicalValue|dangerouslySetInnerHTML/,
    );
    expect(explicitFieldsViewModelSource).toContain(
      'referenceDisclosure: "EXACT_VALUE_VISIBLE_EPHEMERAL"',
    );
    expect(explicitFieldsViewModelSource).toContain(
      'persistencePolicy: "DO_NOT_PERSIST"',
    );
    expect(compact(manualSource)).toContain(
      "referencias administrativas seguras, importes, fechas impresas",
    );
    expect(compact(manualSource)).toContain(
      "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento",
    );
  });

  it("muestra nombre, NIF y rol solo durante la revisión y no los persiste", () => {
    expect(componentSource).toContain(
      "useState<PartyFactsReviewViewModelV1 | null>(null)",
    );
    expect(componentSource).toContain("projectPartyFactsReviewViewModelV1(");
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementPartyFacts",
    );
    expect(componentSource.match(/setPartyFactsReview\(null\)/g)).toHaveLength(
      1,
    );
    expect(componentSource).toContain("<FiscalNotificationPartyFactsReview");
    expect(componentSource).toContain("viewModel={partyFactsReview}");

    const pendingContract = componentSource.slice(
      componentSource.indexOf("interface PendingStructuredReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingContract).toContain(
      "readonly analysis: FiscalNotificationLocalAnalysisResult",
    );
    expect(documentLibraryComponentSource).not.toContain(
      'label="Obligado al pago"',
    );
    expect(documentLibraryComponentSource).not.toContain('label="NIF"');
    expect(documentLibraryComponentSource).not.toContain(
      "document.subjectName",
    );
    expect(documentLibraryComponentSource).not.toContain(
      "document.subjectTaxId",
    );
    expect(partyFactsViewModelSource).toContain("Obligado al pago");
    expect(partyFactsPanelSource).not.toMatch(/posible|podr[ií]a ser/iu);
    expect(partyFactsPanelSource).not.toMatch(
      /dangerouslySetInnerHTML|<(?:a|button|input|form)\b/,
    );
    expect(partyFactsViewModelSource).toContain(
      'persistencePolicy: "DO_NOT_PERSIST"',
    );
    expect(partyFactsViewModelSource).toContain(
      'materializationPolicy: "PROHIBITED_UNTIL_REVIEW"',
    );
    expect(compact(manualSource)).toContain(
      "puede leer temporalmente un nombre, NIF, cuenta o domicilio para entender la estructura, pero la ficha persistente no conserva esos valores",
    );
    expect(compact(manualSource)).toContain(
      "La condición impresa describe el documento: no compara el NIF con la cuenta, no verifica la autenticidad y nunca crea deudas, plazos, pagos, gastos o asientos.",
    );
  });

  it("mantiene controles y estados accesibles en escritorio y móvil", () => {
    expect(componentSource).not.toContain("<main");
    expect(componentSource).toContain('role="status"');
    expect(componentSource).toContain('aria-live="polite"');
    expect(componentSource).toContain('aria-atomic="true"');
    expect(componentSource).toContain('role="alert"');
    expect(componentSource).toContain('id="fiscal-notification-file"');
    expect(componentSource).toContain('type="file"');
    expect(componentSource).toContain('accept="application/pdf,.pdf"');
    expect(componentSource).toContain("multiple");
    expect(componentSource).toContain('className="hidden"');
    expect(componentSource).toContain("tabIndex={-1}");
    expect(componentSource).toContain('aria-hidden="true"');
    expect(componentSource).toContain(
      "onClick={() => fileInputRef.current?.click()}",
    );
    expect(componentSource).toContain("Elegir varios PDF");
    expect(componentSource).toContain(
      'data-drop-zone="FISCAL_NOTIFICATION_FILES"',
    );
    expect(componentSource).toContain("onDragEnter={handleDragEnter}");
    expect(componentSource).toContain("onDrop={handleDrop}");
    expect(componentSource).toContain("Quitar todos");
    expect(componentSource).toContain("Reintentar");
    expect(componentSource).toContain(
      'aria-describedby="fiscal-notification-file-help"',
    );
    expect(componentSource).toContain(
      'aria-labelledby="notification-review-heading"',
    );
    expect(componentSource).toContain('id="notification-review-heading"');
    expect(componentSource).toContain('type="button"');
    expect(componentSource).toContain("sm:flex-row");
    expect(componentSource).toContain("sm:grid-cols-2");
    expect(componentSource).not.toMatch(/w-\[(?:4|5|6|7|8|9)\d{2}px\]/);
  });

  it("compone un lote de cincuenta, no autoanaliza y rechaza duplicados por contenido", () => {
    expect(batchIntakeSource).toContain(
      "FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1 = 50",
    );
    expect(batchIntakeSource).toContain(
      'globalThis.crypto.subtle.digest("SHA-256", bytes)',
    );
    expect(batchIntakeSource).toContain(
      "parseFiscalNotificationsWorkspaceForPersistenceV1(",
    );
    expect(componentSource).toContain(
      "readPersistedFiscalNotificationHashesV1(",
    );
    expect(componentSource).toContain(
      'entry.collection === "fiscalNotificationsWorkspace"',
    );
    expect(componentSource).toContain(
      "allowAbsentWorkspace: !persistedWorkspaceWasQuarantined",
    );
    expect(componentSource).not.toContain("Revisar y restablecer");
    expect(componentSource).not.toContain(
      "¿Ya eliminaste todas las fichas de Notificaciones?",
    );
    expect(componentSource).not.toContain("Sí, iniciar historial vacío");
    expect(componentSource).toContain("repairFiscalNotificationEmptyHistory({");
    expect(componentSource).toContain("await addFiles(files, execution.data)");
    expect(componentSource).toContain(
      "if (!appStoreReady || !shouldInitializeEmptyHistory) return",
    );
    expect(componentSource).toContain("ya estaba escaneado");
    expect(componentSource).toContain("duplicado dentro del lote");
    expect(componentSource).toContain('status: "PREPARED" as const');
    expect(compact(componentSource)).toContain(
      "no se analizan hasta que tú pulses el botón",
    );
    expect(componentSource).toContain("onClick={() => void analyzeQueue()}");
    expect(componentSource).not.toContain("void analyzeQueue(accepted");
    expect(componentSource).toContain(
      "const showBatchControls = pendingCount > 0 || processing;",
    );
    expect(componentSource).toContain("{showBatchControls ? (");
    for (const status of [
      "Preparado",
      "Analizando",
      "Leído",
      "Necesita revisión",
      "No reconocido",
    ]) {
      expect(componentSource).toContain(status);
    }
  });

  it("reutiliza el flujo familiar de cola, revisión individual y avance al siguiente", () => {
    for (const expected of [
      "Primero prepara la cola. No analizaremos nada hasta que pulses Analizar.",
      "Archivos en la cola",
      "Puedes añadir más o quitar alguno antes de analizar.",
      "Documentos escaneados",
      "Revisa y guarda cada documento. Al guardar se abrirá automáticamente el siguiente.",
      "Revisar",
      "Revisión abierta",
      "Guardar y revisar siguiente",
      "Guardar documento",
      "Ficha seleccionada · documento",
      "Archivo temporal:",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain("hasNextReview={hasAnotherReview}");
    expect(componentSource).toContain("advanceAfterSuccessfulSave(");
    expect(componentSource).toContain("showReview(nextReview.documentId)");
    expect(componentSource).toContain("setScannerOpen(false)");
    expect(componentSource).toContain("errorMessage={saveError}");
    expect(componentSource).toContain('role="alert"');
    expect(componentSource).toContain(
      "El documento sigue abierto para que puedas reintentar.",
    );
    expect(componentSource).toContain(
      "El almacenamiento local del navegador está lleno.",
    );
    expect(componentSource).toContain(
      "El navegador no permite guardar datos locales ahora.",
    );
    expect(componentSource).not.toContain("Código: ${write.safeCode}");
    expect(componentSource).not.toContain("Guardar todo lo listo");
    expect(componentSource).toContain(
      "const review = reviewsRef.current.get(item.id)",
    );
    expect(componentSource).toContain(
      "projectBatchReviewSummary(review.analysis)",
    );
    expect(componentSource).toContain(
      'verticalDocuments.map((document) => document.title).join(" · ")',
    );
    expect(componentSource).not.toContain("documentos reconocidos en este PDF");
    expect(componentSource).toContain('item.kind === "DOCUMENT_TOTAL"');
    expect(componentSource).toContain('item.kind === "OUTSTANDING_PRINCIPAL"');
    expect(componentSource).toContain("pageCount: technicalReview.pageCount");
    expect(componentSource).toContain(
      "batchContext.position} de ${batchContext.total",
    );
  });

  it("permite preparar un caso de soporte saneado cuando falla lectura o guardado", () => {
    expect(componentSource).toContain(
      'import { sendFiscalNotificationSupportReportV1 } from "@/lib/fiscal-notifications/support-report-client.v1"',
    );
    expect(componentSource).toContain("buildAnalysisSupportReport(item)");
    expect(componentSource).toContain("supportReport={saveSupportReport}");
    expect(componentSource).toContain(
      "await sendFiscalNotificationSupportReportV1(report)",
    );
    expect(componentSource).toContain("Recibido por soporte");
    expect(componentSource).toContain("Enviar caso a soporte");
    expect(supportReportSource).toContain(
      'FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1 =\n  "soporte-tecnico@facturacion-autonomos.app"',
    );
    expect(supportReportClientSource).toContain(
      'fetch("/api/fiscal-notifications/support"',
    );
    expect(supportReportRouteSource).toContain(
      "to: FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1",
    );
    expect(supportReportRouteSource).not.toContain("attachments:");
    expect(supportReportSource).toContain(
      "privacy=no_pdf_no_text_no_filename_no_nif_no_amounts_no_references",
    );
    expect(supportReportClientSource).not.toMatch(/localStorage|rawText|fileName/);
  });

  it("ofrece archivar voluntariamente un duplicado registrado sin custodiar el PDF", () => {
    expect(componentSource).toContain(
      "inspectFiscalNotificationDriveArchiveCandidateV1(",
    );
    expect(componentSource).toContain(
      'inspection.status === "READY_TO_ARCHIVE"',
    );
    expect(componentSource).toContain("Archivar original en Drive");
    expect(componentSource).toContain("Conectar Drive y archivar");
    expect(compact(componentSource)).toContain(
      "Nada se sube hasta que pulses el botón",
    );
    expect(componentSource).toContain('status: "ARCHIVING"');
    expect(componentSource).toContain("runExclusiveDriveOperation(() =>");
    expect(componentSource).toContain(
      "uploadFiscalNotificationOriginalToGoogleDriveV1(",
    );
    expect(componentSource).toContain("archiveFiscalNotificationOriginal({");
    expect(componentSource).toContain("Fecha pendiente");
    expect(componentSource).toContain("driveArchiveDatePath");

    const admission = componentSource.slice(
      componentSource.indexOf("async function addFiles"),
      componentSource.indexOf("function removeItem"),
    );
    expect(admission).not.toContain(
      "uploadFiscalNotificationOriginalToGoogleDriveV1(",
    );
    expect(driveArchiveDomainSource).toContain(
      'verification: "SHA256_READBACK_MATCH"',
    );
    expect(driveArchiveUploadSource).toContain("verifyDriveFileHash(");
    expect(driveArchiveUploadSource).toContain(
      "FISCAL_NOTIFICATION_DRIVE_ARCHIVE_PENDING_FOLDER_V1",
    );
    expect(driveArchiveUploadSource).not.toMatch(
      /originalFilename|localFilename|rawText|documentText/u,
    );
    expect(compact(manualSource)).toContain(
      "Factu - documentos oficiales/AAAA/MM",
    );
    expect(compact(manualSource)).toContain(
      "conectar Drive más tarde no puede recuperarlos automáticamente",
    );
  });

  it("prioriza el tipo exacto y los campos del extractor reutilizable", () => {
    expect(componentSource).toContain(
      "setVerticalSliceReview(nextAnalysis.ephemeralVerticalSliceReview ?? null)",
    );
    expect(componentSource).toContain(
      "<FiscalNotificationVerticalSliceReview review={verticalSliceReview} />",
    );
    expect(componentSource).toContain(
      'verticalSliceReview?.status === "REVIEW_REQUIRED"',
    );
    expect(verticalSlicePanelSource).toContain("Datos leídos del documento");
    expect(verticalSlicePanelSource).toContain("Documento reconocido");
    expect(verticalSlicePanelSource).toContain("field.displayValue");
    expect(verticalSlicePanelSource).toContain("field.sourcePageNumbers");
    expect(verticalSlicePanelSource).not.toMatch(/posible familia/iu);
    expect(verticalSliceProjectionSource).toContain(
      'addStatus(fields, "Orden de pago", pagesForOutput(output))',
    );
    expect(verticalSliceProjectionSource).not.toContain("pago no confirmado");
  });

  it("solo añade el guardado estructurado seguro y no ofrece acciones fiscales", () => {
    const controls = [
      ...componentSource.matchAll(
        /<(?:Button|ButtonLink|button|Link)\b[\s\S]*?<\/(?:Button|ButtonLink|button|Link)>/g,
      ),
    ]
      .map((match) => compact(match[0]))
      .join("\n");

    expect(controls).toContain("Analizar ${pendingCount} documento");
    expect(controls).toContain("Cancelar");
    expect(controls).toContain("Guardar");
    expect(controls).toContain("Mi cuenta");
    expect(controls).toContain("Google Drive");
    expect(controls).toContain("Ambas");
    expect(controls).not.toMatch(
      /(?:Confirmar|Aceptar propuesta|Crear (?:expediente|deuda|plazo|pago|gasto|asiento)|Pagar|Contabilizar|Aplicar propuesta|Borrar ficha|Eliminar ficha)/i,
    );
    expect(surfaceSource).not.toMatch(
      /payment-actions|prepareAccountingDraft|confirmReportedInstallmentPayment|reportInstallmentPayment/,
    );
  });

  it("publica la revisión local fuera del gate de gastos y sin indexación", () => {
    expect(pageSource).not.toContain("notFound");
    expect(pageSource).not.toContain("isConsultorFiscalEnabled");
    expect(pageSource).toContain('export const dynamic = "force-dynamic"');
    expect(compact(pageSource)).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(pageSource).toContain("return <FiscalNotificationIntakeView />");
  });
});
