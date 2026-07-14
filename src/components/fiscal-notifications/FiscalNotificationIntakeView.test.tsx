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
const manualSource = readSource(
  "../../lib/manual/sections/consultor-fiscal.ts",
);
const surfaceSource = `${componentSource}\n${pageSource}\n${flowSource}\n${guidanceSource}\n${reviewStepsSource}\n${explicitFieldsPanelSource}\n${explicitFieldsViewModelSource}\n${partyFactsPanelSource}\n${partyFactsViewModelSource}\n${relationsViewModelSource}`;

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

    const pendingStructuredReviewContract = componentSource.slice(
      componentSource.indexOf("interface PendingStructuredReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingStructuredReviewContract).toContain("readonly reviewId: string");
    expect(pendingStructuredReviewContract).toContain("readonly createdAt: string");
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
    expect(workspace).toContain("fileInputRef.current.value = \"\"");
    expect(workspace).toContain("[ownerScope]");
    expect(workspace).toContain("saveOperationRef.current = null");
    expect(workspace).toContain(
      "projectFiscalNotificationStructuredHistoryV1(",
    );
    expect(workspace).toContain("projectStructuredReviewRelationsV1(");
    expect(workspace).toContain("data.fiscalNotificationsWorkspace");

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
      "extractAeatEnforcementExplicitFieldsV2",
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

  it("conecta el workspace durable al AppStore y al owner canónico", () => {
    expect(componentSource).toContain(
      'import { useAppStore } from "@/context/AppStore"',
    );
    expect(componentSource).toContain(
      "ready: appStoreReady",
    );
    expect(componentSource).toContain("saveFiscalNotificationStructuredReview,");
    expect(componentSource).toContain("if (!appStoreReady)");
    expect(componentSource).toContain(
      "projectFiscalNotificationStructuredHistoryV1(",
    );
    expect(componentSource).toContain(
      "data.fiscalNotificationsWorkspace",
    );
    expect(componentSource).toContain(
      "saveFiscalNotificationStructuredReview({",
    );
    expect(componentSource).toContain("key={ownerScope}");
    expect(componentSource).not.toContain(
      "createBrowserFiscalNotificationLocalReviewStore",
    );
  });

  it("guarda solo por acción explícita una ficha estructurada", () => {
    expect(componentSource).toContain("Guardar datos en mi cuenta");
    expect(componentSource).toContain("onClick={() => void onSave()}");
    expect(componentSource).toContain("saveFiscalNotificationStructuredReview({");
    expect(componentSource).toContain("expected: data");
    expect(componentSource).toContain("ownerScope,");
    expect(componentSource).toMatch(/reviewId:\s*[A-Za-z0-9_]+\.reviewId/);
    expect(componentSource).toMatch(/createdAt:\s*[A-Za-z0-9_]+\.createdAt/);
    expect(componentSource).toMatch(/analysis:\s*[A-Za-z0-9_]+\.analysis/);
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
      "nextAnalysis.ephemeralEnforcementPartyFacts",
    );
    expect(analysisSuccess).toContain(
      "nextAnalysis.ephemeralDeferralGrantFacts",
    );
    expect(analysisSuccess).toContain(
      "projectExplicitFieldsReviewViewModelV2(",
    );
    expect(analysisSuccess).toContain(
      "setExplicitFieldsReview(nextExplicitFieldsReview)",
    );
    expect(analysisSuccess).toContain(
      "setPartyFactsReview(nextPartyFactsReview)",
    );
    expect(analysisSuccess).toContain("analysis: nextAnalysis");
    expect(analysisSuccess).not.toContain(
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
    expect(componentSource).toContain(
      "documentTypeRecognized={",
    );

    const resultIndex = componentSource.indexOf("<ReviewResult");
    const stepsIndex = componentSource.indexOf(
      "recognizedCandidateFrom(result) !== null",
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

  it("solo presenta applied como guardado y separa los bloqueos", () => {
    const saveStart = componentSource.indexOf(
      "saveFiscalNotificationStructuredReview({",
    );
    const writeFlow = componentSource.slice(saveStart, saveStart + 4_000);
    expect(saveStart).toBeGreaterThan(-1);
    expect(writeFlow).toMatch(
      /\.status === "applied"[\s\S]{0,300}set[A-Za-z0-9_]+\("saved"\)/,
    );
    expect(writeFlow).toContain('write.status === "indeterminate"');
    expect(writeFlow).toContain('write.reason === "no_structured_facts"');
    expect(writeFlow).toContain('write.reason === "invalid_structured_review"');
    expect(
      componentSource.match(/set[A-Za-z0-9_]+\("saved"\)/g),
    ).toHaveLength(1);
    expect(componentSource).toContain('const successful = state === "saved"');
    expect(componentSource).toContain(
      "Ficha guardada en los datos de tu cuenta.",
    );
    expect(componentSource).toContain(
      "No se ha guardado una tarjeta vacía",
    );
    expect(componentSource).toContain(
      "No se puede confirmar el estado de la escritura",
    );
  });

  it("muestra el expediente validado con datos exactos sin exponer la huella", () => {
    expect(componentSource).toContain("Mis notificaciones guardadas");
    expect(componentSource).toContain(
      "const entries = viewModel.entries",
    );
    expect(componentSource).toContain("entries.map((entry)");
    expect(componentSource).toContain("entry.createdAt");
    expect(componentSource).toContain("entry.subjectName");
    expect(componentSource).toContain("entry.subjectTaxId");
    expect(componentSource).toContain("entry.money.map((fact)");
    expect(componentSource).toContain("entry.references");
    expect(componentSource).toContain("entry.printedDates");
    expect(componentSource).toContain("entry.installments");
    expect(componentSource).toContain("installment.amountCents");
    expect(componentSource).toContain("installment.dueDate");
    expect(componentSource).not.toContain("Huella local");
    expect(componentSource).not.toMatch(/\.sha256(?:\.|\[|\s|\})/);
    expect(componentSource).not.toMatch(
      />\s*\{[^}]*\b(?:reviewId|ownerScope)\b[^}]*\}\s*</,
    );
    expect(componentSource).toContain("key={entry.key}");
    expect(componentSource).not.toMatch(/\bentry\.ownerScope\b/);
    expect(compact(componentSource)).toContain(
      "Conservan los campos que aceptaste guardar, pero nunca el PDF, su nombre ni el texto completo.",
    );
    expect(componentSource).toContain("entry.authenticityLabel");
    expect(componentSource).toContain("PDF no conservado");
  });

  it("muestra relaciones guardadas por referencias exactas sin afirmar causalidad", () => {
    expect(componentSource).toContain("Relaciones entre documentos");
    expect(componentSource).toContain(
      "projectStructuredReviewRelationsV1(",
    );
    expect(componentSource).toContain(
      "data.fiscalNotificationsWorkspace",
    );
    expect(relationsViewModelSource).toContain(
      "Documentos relacionados por referencia",
    );
    expect(relationsViewModelSource).toContain("Relación detectada · revisar");
    expect(componentSource).toContain("entry.documents.map((document)");
    expect(componentSource).toContain("entry.matches.map((match)");
    expect(componentSource).toContain("Mismo valor impreso");
    expect(componentSource).toContain(
      "Mismo identificador, con formato distinto",
    );
    expect(componentSource).toContain("{entry.explanation}");
    expect(relationsViewModelSource).toContain(
      "no demuestra por sí sola cuál originó a la otra",
    );
    expect(relationsViewModelSource).toContain(
      "ni que el expediente esté cerrado",
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
      "Un acuerdo de alta en el ROI describe el documento analizado: no demuestra que el alta siga vigente ni valida el estado en VIES.",
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
    expect(componentSource).not.toMatch(/Posible (?:providencia|concesión|diligencia|requerimiento|acuerdo)/u);
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
      "El PDF, su texto y su nombre no se suben ni se guardan.",
      "Muestra y puede guardar importes, referencias, fechas y sujeto cuando constan expresamente.",
      "Los documentos escaneados quedan pendientes de OCR.",
      "No mostramos ni conservamos el nombre del archivo. El PDF y el texto desaparecen; solo se guardan los campos estructurados que aceptes conservar.",
      "Ficha guardada en los datos de tu cuenta. Ya puedes volver a consultar sus importes, referencias, fechas y sujeto identificado.",
      "Guarda únicamente campos estructurados visibles y su procedencia: nunca conserva el PDF, su nombre ni el texto completo.",
      "No se ha enviado a ningún proveedor y debes revisarlo manualmente.",
      "Reconoce la familia documental de providencia de apremio, concesión de aplazamiento o fraccionamiento, diligencia de embargo de bienes inmuebles, requerimiento formal de presentación y acuerdo de alta en el ROI. No confirma por sí sola el organismo emisor ni la autenticidad.",
      "Un acuerdo de alta en el ROI describe el documento analizado: no demuestra que el alta siga vigente ni valida el estado en VIES.",
      "El nombre, el NIF, los importes, los valores exactos de referencia y las fechas impresas pueden guardarse en una ficha estructurada mediante una acción explícita.",
      "Una fecha impresa se presenta como tal: no se convierte por sí sola en fecha de notificación o vencimiento ni activa una acción.",
      "No consulta automáticamente sedes oficiales, no ejecuta OCR remoto y no utiliza IA.",
      "Esta herramienta no sustituye la revisión de un asesor ni confirma la validez jurídica del documento.",
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
      "Permanecen solo en memoria hasta que pulses",
      "Guardar datos en mi cuenta",
      "No se encontró una etiqueta cubierta; no se ha convertido en cero.",
      "Una etiqueta cubierta aparece sin cifra; se mantiene pendiente.",
    ]) {
      expect(compact(componentSource)).toContain(expected);
    }
    expect(componentSource).toContain(
      'result.outcome !== "FACTS_AVAILABLE"',
    );
    expect(componentSource).toContain(
      'currency === "EUR"',
    );
    expect(componentSource).toContain("BigInt(amountCents)");
    expect(componentSource).not.toMatch(
      /(?:amountCents|ephemeralMoneyFacts)[^\n]{0,120}\?\?\s*0/,
    );
    expect(componentSource.match(/setEphemeralMoneyFacts\(null\)/g)?.length)
      .toBeGreaterThanOrEqual(3);

    const saveStart = componentSource.indexOf(
      "saveFiscalNotificationStructuredReview({",
    );
    const saveEnd = componentSource.indexOf("});", saveStart);
    const savePayload = componentSource.slice(saveStart, saveEnd);
    expect(savePayload).toContain("analysis: pendingReview.analysis");
    expect(savePayload).not.toMatch(/\b(?:file|text|raw)\b/i);
  });

  it("muestra los datos exactos de una concesión y su calendario de cuotas", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "Concesión de aplazamiento o fraccionamiento",
      "Cuotas, importes y vencimientos leídos literalmente de los anexos de la concesión.",
      "Importe concedido",
      "Cuenta de pago impresa",
      "Importe de deuda impreso",
      "Fecha de intereses impresa",
      "Vencimiento impreso",
      "Calendario de cuotas",
      "Son datos impresos guardados para consulta.",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("DeferralGrantFactsPanel");
    expect(componentSource).toContain(
      "setEphemeralDeferralFacts(nextAnalysis.ephemeralDeferralGrantFacts)",
    );
    expect(
      componentSource.match(/setEphemeralDeferralFacts\(null\)/g)?.length,
    ).toBeGreaterThanOrEqual(3);
    expect(componentSource).toContain(
      'result.outcome === "AMBIGUOUS"',
    );
    expect(copy).toContain(
      "No se ha marcado ninguna cuota como pagada ni se ha creado un gasto o asiento.",
    );
  });

  it("muestra referencias, importes y efectos exactos del acuerdo de compensación", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "Acuerdo de compensación de oficio",
      "Acuerdo de compensación solicitado",
      "Crédito, deudas, importes compensados, saldos y efectos leídos de los anexos del acuerdo.",
      "Número de acuerdo",
      "Fecha de solicitud impresa",
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
    ).toBeGreaterThanOrEqual(3);
    expect(componentSource).toContain("OFFSET_EFFECT_LABELS[debt.effectMeaning]");
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
      "también puede mostrar importes, valores exactos de referencias y fechas bajo etiquetas cerradas",
    );
    expect(compact(manualSource)).toContain(
      "Una fecha impresa no se interpreta como fecha de notificación ni como vencimiento",
    );
  });

  it("muestra nombre, NIF y rol exactos y permite guardarlos estructurados", () => {
    expect(componentSource).toContain(
      "useState<PartyFactsReviewViewModelV1 | null>(null)",
    );
    expect(componentSource).toContain("projectPartyFactsReviewViewModelV1(");
    expect(componentSource).toContain(
      "nextAnalysis.ephemeralEnforcementPartyFacts",
    );
    expect(componentSource).toContain(
      "setPartyFactsReview(nextPartyFactsReview)",
    );
    expect(componentSource.match(/setPartyFactsReview\(null\)/g)).toHaveLength(3);
    expect(componentSource).toContain("<FiscalNotificationPartyFactsReview");
    expect(componentSource).toContain("viewModel={partyFactsReview}");

    const pendingContract = componentSource.slice(
      componentSource.indexOf("interface PendingStructuredReview"),
      componentSource.indexOf("type ReviewPersistenceState"),
    );
    expect(pendingContract).toContain(
      "readonly analysis: FiscalNotificationLocalAnalysisResult",
    );
    expect(componentSource).toContain('label="Obligado al pago"');
    expect(componentSource).toContain('label="NIF impreso"');
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
      "muestra el nombre o razón social, el NIF y la condición de **obligado al pago** cuando aparecen juntos bajo la sección impresa **Identificación del obligado al pago**",
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

  it("solo añade el guardado estructurado seguro y no ofrece acciones fiscales", () => {
    const controls = [...componentSource.matchAll(
      /<(?:Button|ButtonLink|button|Link)\b[\s\S]*?<\/(?:Button|ButtonLink|button|Link)>/g,
    )]
      .map((match) => compact(match[0]))
      .join("\n");

    expect(controls).toContain("Analizar documento");
    expect(controls).toContain("Cancelar");
    expect(controls).toContain("Guardar datos en mi cuenta");
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
