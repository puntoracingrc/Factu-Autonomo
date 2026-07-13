import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const componentSource = readSource("./FiscalNotificationIntakeView.tsx");
const pageSource = readSource(
  "../../app/consultor-fiscal/notificaciones/page.tsx",
);
const flowSource = readSource(
  "../../lib/fiscal-notifications/local-review-flow.ts",
);
const workerSource = readSource(
  "../../lib/fiscal-notifications/pdf-text-layer.worker.ts",
);
const workerContractSource = readSource(
  "../../lib/fiscal-notifications/pdf-worker-analysis-contract.ts",
);
const guidanceSource = readSource(
  "../../lib/fiscal-notifications/review-guidance.v1.ts",
);
const reviewStepsSource = readSource("./FiscalNotificationReviewSteps.tsx");
const explicitFieldsPanelSource = readSource(
  "./FiscalNotificationExplicitFieldsReview.tsx",
);
const explicitFieldsViewModelSource = readSource(
  "../../lib/fiscal-notifications/explicit-fields-review-view-model.v1.ts",
);
const manualSource = readSource(
  "../../lib/manual/sections/consultor-fiscal.ts",
);
const browserRepositorySource = readSource(
  "../../lib/fiscal-notifications/browser-local-review-repository.ts",
);
const surfaceSource = `${componentSource}\n${pageSource}\n${flowSource}\n${guidanceSource}\n${reviewStepsSource}\n${explicitFieldsPanelSource}\n${explicitFieldsViewModelSource}`;

describe("contrato de interfaz de Notificaciones y expedientes", () => {
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
    expect(componentSource).not.toMatch(/(?:file|selectedFile)\.name/);
  });

  it("no conserva File, nombre, bytes ni texto del documento en estado React", () => {
    const selectedFileContract = componentSource.slice(
      componentSource.indexOf("interface SelectedFileSummary"),
      componentSource.indexOf("export function FiscalNotificationIntakeView"),
    );
    expect(selectedFileContract).toContain("readonly byteLength: number");
    expect(selectedFileContract).toContain("readonly mimeType: string");
    expect(selectedFileContract).not.toMatch(
      /\b(?:file|name|filename|bytes|text|pages|documentInput)\b/i,
    );

    expect(componentSource).not.toMatch(/useState\s*<\s*File\b/);
    expect(componentSource).not.toContain("setSelectedFile(file)");
    expect(componentSource).toContain(
      "file ? { byteLength: file.size, mimeType: file.type } : null",
    );
    expect(componentSource).toContain(
      "No mostramos ni conservamos el nombre del archivo",
    );

    const reviewResultContract = flowSource.slice(
      flowSource.indexOf("export interface FiscalNotificationLocalReviewResult"),
      flowSource.indexOf("/** @internal Test seam"),
    );
    expect(reviewResultContract).toContain("readonly sha256: string");
    expect(reviewResultContract).toContain('readonly retainedSourceContent: "NONE"');
    expect(reviewResultContract).not.toMatch(
      /readonly\s+(?:file|filename|bytes|text|pages|documentInput)\b/i,
    );

    const pendingSafeReviewContract = componentSource.slice(
      componentSource.indexOf("interface PendingSafeReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingSafeReviewContract).toContain("readonly reviewId: string");
    expect(pendingSafeReviewContract).toContain("readonly createdAt: string");
    expect(pendingSafeReviewContract).toContain(
      "readonly result: FiscalNotificationLocalReviewResult",
    );
    expect(pendingSafeReviewContract).not.toMatch(
      /\b(?:ownerScope|file|filename|name|bytes|text|pages|documentId|raw|nif|csv|amount|deadline)\b/i,
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
    expect(workspace).toContain("fileInputRef.current.value = \"\"");
    expect(workspace).toContain("[ownerScope]");
    expect(workspace).toContain("storeRef.current = null");
    expect(workspace).toContain("saveOperationRef.current = null");

    expect(componentSource).toContain("controller.signal.aborted ||");
    expect(componentSource).toContain(
      "controllerRef.current !== controller",
    );
  });

  it("encadena únicamente lector PDF local, reglas deterministas y OCR deshabilitado", () => {
    expect(componentSource).toContain(
      "analyzeFiscalNotificationLocallyWithEphemeralFacts({",
    );
    expect(componentSource).toContain("ownerScope,");
    expect(componentSource).toContain("file,");
    expect(componentSource).toContain("signal: controller.signal");
    expect(componentSource).toContain("globalThis.crypto?.randomUUID");

    expect(flowSource).toContain("readFiscalNotificationPdfTextLayer");
    expect(flowSource).not.toContain("extractFiscalNotificationCandidates");
    expect(workerSource).toContain("extractFiscalNotificationCandidates");
    expect(workerSource).toContain("extractAeatEnforcementMoneyFacts");
    expect(workerSource).toContain(
      "extractAeatEnforcementExplicitFieldsV1",
    );
    expect(workerSource).toContain(
      "projectFiscalNotificationPdfWorkerAnalysis",
    );
    expect(workerSource).not.toContain("pages: documentInput.pages");
    expect(workerContractSource).toContain(
      'retainedSourceContent: "NONE"',
    );
    expect(flowSource).toContain("DISABLED_FISCAL_NOTIFICATION_OCR_PORT");
    expect(flowSource).toContain("PRODUCTION_DEPENDENCIES");
    expect(flowSource).toContain(
      "FISCAL_NOTIFICATION_LOCAL_REVIEW_TEST_SEAM",
    );
    expect(flowSource).toContain('| "OCR_DISABLED";');
    expect(flowSource).toContain(
      "const ocr = await dependencies.ocrPort.recognize({",
    );
    expect(flowSource).toContain("assertDisabledOcrOutcome(ocr)");
    expect(flowSource).toContain("status: ocr.status");
    expect(flowSource).toContain("reason: ocr.reason");
    expect(flowSource).toContain("providerCalled: false");
    expect(flowSource).toContain(
      'materializationPolicy: "PROHIBITED_UNTIL_REVIEW"',
    );
  });

  it("conecta el repositorio browser solo tras montar y lo liga al owner canónico", () => {
    expect(componentSource).toContain(
      'from "@/lib/fiscal-notifications/browser-local-review-repository"',
    );
    expect(componentSource).toContain(
      "createBrowserFiscalNotificationLocalReviewStore(ownerScope)",
    );
    expect(componentSource).toContain("subscribeToExternalChanges");

    const factoryIndex = componentSource.indexOf(
      "createBrowserFiscalNotificationLocalReviewStore(ownerScope)",
    );
    const precedingEffectIndex = componentSource.lastIndexOf(
      "useEffect(",
      factoryIndex,
    );
    expect(factoryIndex).toBeGreaterThan(-1);
    expect(precedingEffectIndex).toBeGreaterThan(
      componentSource.indexOf("function FiscalNotificationReviewWorkspace"),
    );
    expect(
      componentSource.slice(precedingEffectIndex, factoryIndex),
    ).not.toContain("return (");
    expect(componentSource).toMatch(
      /subscribeToExternalChanges\([\s\S]{0,800}unsubscribe\(\)/,
    );
    expect(componentSource).toContain("key={ownerScope}");
  });

  it("guarda solo por acción explícita una ficha técnica con el sobre seguro N7", () => {
    expect(componentSource).toContain("Guardar ficha técnica local");
    expect(componentSource).toContain("onClick={() => void onSave()}");
    expect(componentSource).toContain(".repository.load()");
    expect(componentSource).toContain(".repository.append({");
    expect(componentSource).toMatch(
      /expectedRevision:\s*[A-Za-z0-9_]+\.snapshot\.revision/,
    );
    expect(componentSource).toMatch(/reviewId:\s*[A-Za-z0-9_]+\.reviewId/);
    expect(componentSource).toMatch(/createdAt:\s*[A-Za-z0-9_]+\.createdAt/);
    expect(componentSource).toMatch(/result:\s*[A-Za-z0-9_]+\.result/);
    expect(componentSource).toMatch(/`review:\$\{/);
    expect(componentSource).toContain("new Date().toISOString()");

    const analysisStart = componentSource.indexOf("const nextAnalysis =");
    const analysisEnd = componentSource.indexOf(
      "} catch (caught)",
      analysisStart,
    );
    const analysisSuccess = componentSource.slice(analysisStart, analysisEnd);
    expect(analysisStart).toBeGreaterThan(-1);
    expect(analysisEnd).toBeGreaterThan(analysisStart);
    expect(analysisSuccess).toContain(
      "await analyzeFiscalNotificationLocallyWithEphemeralFacts",
    );
    expect(analysisSuccess).toContain(
      "const nextResult = nextAnalysis.technicalReview",
    );
    expect(analysisSuccess).toContain("setResult(nextResult)");
    expect(analysisSuccess).toContain(
      "nextAnalysis.ephemeralEnforcementMoneyFacts",
    );
    expect(analysisSuccess).toContain(
      "nextAnalysis.ephemeralEnforcementExplicitFields",
    );
    expect(analysisSuccess).toContain(
      "projectExplicitFieldsReviewViewModelV1(",
    );
    expect(analysisSuccess).toContain(
      "setExplicitFieldsReview(nextExplicitFieldsReview)",
    );
    expect(analysisSuccess).toContain("result: nextResult");
    expect(analysisSuccess).not.toContain(".append(");

    const appendStart = componentSource.indexOf(".repository.append({");
    const appendEnd = componentSource.indexOf("});", appendStart);
    const appendPayload = componentSource.slice(appendStart, appendEnd);
    expect(appendStart).toBeGreaterThan(-1);
    expect(appendPayload).not.toMatch(
      /\b(?:ownerScope|file|filename|documentId|text|bytes|raw|nif|csv|amount|deadline)\b/i,
    );
    expect(appendPayload).not.toMatch(
      /explicit|reference|printedDate|calendarDate/i,
    );
    expect(appendPayload).not.toMatch(/guidance|reviewSteps|officialProcedure/i);
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
    expect(componentSource).toContain(
      "<FiscalNotificationReviewSteps guidance={reviewGuidance} />",
    );

    const resultIndex = componentSource.indexOf("<ReviewResult");
    const stepsIndex = componentSource.indexOf(
      "<FiscalNotificationReviewSteps guidance={reviewGuidance} />",
    );
    const persistenceIndex = componentSource.indexOf(
      "<ReviewPersistencePanel",
    );
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

  it("solo presenta applied o existing como guardado y separa blocked de indeterminate", () => {
    const appendStart = componentSource.indexOf(".repository.append({");
    const writeFlow = componentSource.slice(appendStart, appendStart + 4_000);
    expect(appendStart).toBeGreaterThan(-1);
    expect(writeFlow).toMatch(
      /\.status === "applied"[\s\S]{0,200}\.status === "existing"[\s\S]{0,600}set[A-Za-z0-9_]+\("saved"\)/,
    );
    expect(writeFlow).toContain(
      'write.status === "indeterminate" ? "indeterminate" : "blocked"',
    );
    expect(
      componentSource.match(/set[A-Za-z0-9_]+\("saved"\)/g),
    ).toHaveLength(1);
    expect(componentSource).toContain('const successful = state === "saved"');
    expect(componentSource).toContain(
      "Ficha técnica guardada en este navegador para esta cuenta. No se sincroniza.",
    );
    expect(componentSource).toContain(
      "la ficha técnica no se ha guardado",
    );
    expect(componentSource).toContain(
      "No se puede confirmar si se guardó",
    );
  });

  it("muestra historial validado por owner sin exponer SHA, reviewId ni ownerScope", () => {
    expect(componentSource).toContain("Historial técnico local");
    expect(componentSource).toContain(
      "const reviews = [...state.snapshot.reviews].reverse()",
    );
    expect(componentSource).toContain("reviews.map((review)");
    expect(componentSource).toContain("review.createdAt");
    expect(componentSource).toContain("review.result.status");
    expect(componentSource).not.toContain("Huella local");
    expect(componentSource).not.toMatch(/\.sha256(?:\.|\[|\s|\})/);
    expect(componentSource).not.toMatch(
      />\s*\{[^}]*\b(?:reviewId|ownerScope)\b[^}]*\}\s*</,
    );
    expect(componentSource).toContain("key={review.reviewId}");
    expect(componentSource).not.toMatch(/\breview\.ownerScope\b/);
    expect(componentSource).toContain(
      ": REASON_COPY[review.result.reason].detail",
    );
    expect(componentSource).not.toContain("Sin familia reconocida");
    expect(compact(componentSource)).toContain(
      "Para volver a ver importes, referencias o fechas impresas, selecciona otra vez el PDF original: esos datos no se conservan.",
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

  it("presenta las tres familias R1 como propuestas y limita expresamente ROI", () => {
    for (const expected of [
      "Posible diligencia de embargo de bienes inmuebles AEAT",
      "Posible requerimiento formal de presentación AEAT",
      "Posible acuerdo de alta en el ROI AEAT",
      "Un acuerdo de alta en el ROI describe el documento analizado: no demuestra que el alta siga vigente ni valida el estado en VIES.",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain("Revisión humana obligatoria");
    expect(guidanceSource).toContain(
      'materializationPolicy: "PROHIBITED_UNTIL_REVIEW"',
    );
    expect(componentSource).not.toMatch(/alta actual confirmada|VIES válido/iu);
  });

  it("prohíbe red, API y acceso directo a persistencia fuera del adaptador", () => {
    for (const forbidden of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /\/api\//,
      /localStorage/,
      /sessionStorage/,
      /indexedDB/,
      /useAppStore/,
      /context\/AppStore/,
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
    expect(componentSource).not.toMatch(
      /@\/lib\/storage|context\/AppStore|useAppStore/,
    );
    expect(browserRepositorySource).toContain("window.localStorage");
    expect(browserRepositorySource).toContain("window.navigator?.locks");
    for (const forbidden of [
      /\bfetch\s*\(/,
      /XMLHttpRequest/,
      /WebSocket/,
      /\/api\//,
      /sessionStorage/,
      /indexedDB/,
      /context\/AppStore/,
      /useAppStore/,
      /\bOpenAI\b/i,
      /\bAnthropic\b/i,
      /FileReader/,
      /createObjectURL/,
    ]) {
      expect(browserRepositorySource).not.toMatch(forbidden);
    }
  });

  it("explica con precisión OCR, alcance y persistencia local opcional", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "El PDF, su texto y su nombre no se suben ni se guardan.",
      "Toda clasificación es una propuesta, nunca una confirmación.",
      "Los documentos escaneados quedan pendientes de OCR.",
      "No mostramos ni conservamos el nombre del archivo. El PDF y el texto desaparecen; solo guardamos la ficha técnica si tú lo eliges.",
      "Ficha técnica guardada en este navegador para esta cuenta. No se sincroniza.",
      "Solo incluye la traza técnica de revisión; nunca el PDF, su texto, su nombre, NIF, CSV, referencias, importes, fechas impresas ni plazos.",
      "No se ha enviado a ningún proveedor y debes revisarlo manualmente.",
      "Reconoce únicamente indicios de providencia de apremio, concesión de aplazamiento o fraccionamiento, diligencia de embargo de bienes inmuebles, requerimiento formal de presentación y acuerdo de alta en el ROI de la AEAT.",
      "Un acuerdo de alta en el ROI describe el documento analizado: no demuestra que el alta siga vigente ni valida el estado en VIES.",
      "La ficha técnica local no contiene importes, fechas jurídicas, obligado, expediente, cuotas u obligaciones.",
      "Los importes, las categorías de referencia con valor oculto y las fechas impresas se muestran solo durante la revisión actual; desaparecen al salir y nunca se guardan en la ficha técnica.",
      "No consulta automáticamente sedes oficiales, no ejecuta OCR remoto y no utiliza IA.",
      "Esta herramienta no sustituye la revisión de un asesor ni confirma la validez jurídica del documento.",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("Revisión humana obligatoria");
    expect(componentSource).toContain(
      "Resultado local · pendiente de revisión",
    );
  });

  it("muestra solo importes explícitos efímeros sin inventar moneda, cero o total", () => {
    for (const expected of [
      "Principal pendiente impreso",
      "Recargo ordinario impreso",
      "Ingreso a cuenta impreso",
      "Importe total impreso",
      "Importes impresos detectados",
      "según el documento",
      "revisión obligatoria",
      "moneda no confirmada",
      "Una ausencia nunca se convierte en cero.",
      "No se han sumado, recalculado ni elegido como importe a pagar.",
      "Estos importes son efímeros",
      "No se encontró una etiqueta cubierta; no se ha convertido en cero.",
      "Una etiqueta cubierta aparece sin cifra; se mantiene pendiente.",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain(
      'result.outcome !== "FACTS_AVAILABLE"',
    );
    expect(componentSource).toContain(
      'fact.currency === "EUR"',
    );
    expect(componentSource).toContain("BigInt(fact.amountCents)");
    expect(componentSource).not.toMatch(
      /(?:amountCents|ephemeralMoneyFacts)[^\n]{0,120}\?\?\s*0/,
    );
    expect(componentSource.match(/setEphemeralMoneyFacts\(null\)/g)?.length)
      .toBeGreaterThanOrEqual(3);

    const appendStart = componentSource.indexOf(".repository.append({");
    const appendEnd = componentSource.indexOf("});", appendStart);
    const appendPayload = componentSource.slice(appendStart, appendEnd);
    expect(appendPayload).toContain("result: pendingReview.result");
    expect(appendPayload).not.toMatch(/money|amount|fact/i);
  });

  it("proyecta referencias y fechas a un estado React seguro, efímero y no persistible", () => {
    expect(componentSource).toContain(
      "useState<ExplicitFieldsReviewViewModelV1 | null>(null)",
    );
    expect(componentSource).toContain(
      "projectExplicitFieldsReviewViewModelV1(",
    );
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementExplicitFields",
    );
    expect(componentSource).toContain(
      "setExplicitFieldsReview(nextExplicitFieldsReview)",
    );
    const fileChangeFlow = componentSource.slice(
      componentSource.indexOf("function handleFileChange"),
      componentSource.indexOf("function cancelAnalysis"),
    );
    const cancelFlow = componentSource.slice(
      componentSource.indexOf("function cancelAnalysis"),
      componentSource.indexOf("async function handleSubmit"),
    );
    const submitStartFlow = componentSource.slice(
      componentSource.indexOf("async function handleSubmit"),
      componentSource.indexOf("try {", componentSource.indexOf("async function handleSubmit")),
    );
    for (const flow of [fileChangeFlow, cancelFlow, submitStartFlow]) {
      expect(flow).toContain("setExplicitFieldsReview(null)");
    }
    expect(componentSource.match(/setExplicitFieldsReview\(null\)/g)).toHaveLength(3);
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
      componentSource.indexOf("interface PendingSafeReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingContract).not.toMatch(
      /explicit|reference|printedDate|calendarDate/i,
    );
    const appendStart = componentSource.indexOf(".repository.append({");
    const appendEnd = componentSource.indexOf("});", appendStart);
    expect(componentSource.slice(appendStart, appendEnd)).not.toMatch(
      /explicit|reference|printedDate|calendarDate/i,
    );

    expect(explicitFieldsPanelSource).not.toMatch(
      /AeatEnforcementExplicitFieldsV1|rawValue|referenceValue|canonicalValue/,
    );
    expect(explicitFieldsViewModelSource).toContain(
      'referenceDisclosure: "CATEGORY_ONLY_VALUE_HIDDEN"',
    );
    expect(explicitFieldsViewModelSource).toContain(
      'persistencePolicy: "DO_NOT_PERSIST"',
    );
    expect(compact(manualSource)).toContain(
      "categorías de referencias con su valor oculto y fechas que figuran bajo etiquetas cerradas",
    );
    expect(compact(manualSource)).toContain(
      "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento",
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
    expect(componentSource).toContain('className="hidden"');
    expect(componentSource).toContain("tabIndex={-1}");
    expect(componentSource).toContain('aria-hidden="true"');
    expect(componentSource).toContain(
      "onClick={() => fileInputRef.current?.click()}",
    );
    expect(componentSource).toContain("Seleccionar PDF");
    expect(componentSource).toContain(
      'aria-describedby="fiscal-notification-file-help"',
    );
    expect(componentSource).toContain(
      'aria-labelledby="notification-review-heading"',
    );
    expect(componentSource).toContain(
      'id="notification-review-heading"',
    );
    expect(componentSource).toContain('type="submit"');
    expect(componentSource).toContain('type="button"');
    expect(componentSource).toContain("sm:flex-row");
    expect(componentSource).toContain("md:grid-cols-3");
    expect(componentSource).toContain("sm:grid-cols-2");
    expect(componentSource).not.toMatch(/w-\[(?:4|5|6|7|8|9)\d{2}px\]/);
  });

  it("solo añade el guardado local seguro y no ofrece acciones fiscales", () => {
    const controls = [...componentSource.matchAll(
      /<(?:Button|ButtonLink|button|Link)\b[\s\S]*?<\/(?:Button|ButtonLink|button|Link)>/g,
    )]
      .map((match) => compact(match[0]))
      .join("\n");

    expect(controls).toContain("Analizar documento");
    expect(controls).toContain("Cancelar");
    expect(controls).toContain("Guardar ficha técnica local");
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
