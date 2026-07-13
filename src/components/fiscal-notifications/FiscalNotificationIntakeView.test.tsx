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
const surfaceSource = `${componentSource}\n${pageSource}\n${flowSource}`;

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
    expect(workspace).toContain("[],");

    expect(componentSource).toContain("controller.signal.aborted ||");
    expect(componentSource).toContain(
      "controllerRef.current !== controller",
    );
  });

  it("encadena únicamente lector PDF local, reglas deterministas y OCR deshabilitado", () => {
    expect(componentSource).toContain("analyzeFiscalNotificationLocally({");
    expect(componentSource).toContain("ownerScope,");
    expect(componentSource).toContain("file,");
    expect(componentSource).toContain("signal: controller.signal");
    expect(componentSource).toContain("globalThis.crypto?.randomUUID");

    expect(flowSource).toContain("readFiscalNotificationPdfTextLayer");
    expect(flowSource).toContain("extractFiscalNotificationCandidates");
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

  it("prohíbe red, API, persistencia, AppStore, IA y telemetría en la superficie", () => {
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
  });

  it("explica con precisión OCR, alcance, revisión y no persistencia", () => {
    const copy = compact(componentSource);
    for (const expected of [
      "El PDF y su texto no se suben ni se guardan.",
      "Toda clasificación es una propuesta, nunca una confirmación.",
      "Los documentos escaneados quedan pendientes de OCR.",
      "No mostramos ni conservamos el nombre del archivo. Al recargar, el análisis desaparece.",
      "No se ha enviado a ningún proveedor y debes revisarlo manualmente.",
      "Reconoce únicamente indicios de providencia de apremio y concesión de aplazamiento o fraccionamiento de la AEAT.",
      "Todavía no extrae ni guarda importes, fechas, obligado, expediente, cuotas u obligaciones.",
      "No consulta sedes oficiales, no ejecuta OCR remoto y no utiliza IA.",
      "Esta herramienta no sustituye la revisión de un asesor ni confirma la validez jurídica del documento.",
    ]) {
      expect(copy).toContain(expected);
    }
    expect(componentSource).toContain("Revisión humana obligatoria");
    expect(componentSource).toContain(
      "Resultado local · pendiente de revisión",
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

  it("no ofrece controles operativos de guardado, deuda, pago o asiento", () => {
    const controls = [...componentSource.matchAll(
      /<(?:Button|ButtonLink|button|Link)\b[\s\S]*?<\/(?:Button|ButtonLink|button|Link)>/g,
    )]
      .map((match) => compact(match[0]))
      .join("\n");

    expect(controls).toContain("Analizar documento");
    expect(controls).toContain("Cancelar");
    expect(controls).not.toMatch(
      /(?:Guardar|Confirmar|Aceptar propuesta|Crear (?:expediente|deuda|pago|gasto|asiento)|Pagar|Contabilizar)/i,
    );
    expect(surfaceSource).not.toMatch(
      /payment-actions|prepareAccountingDraft|confirmReportedInstallmentPayment|reportInstallmentPayment/,
    );
  });

  it("publica la página únicamente tras el gate server-side y sin indexación", () => {
    expect(pageSource).toContain(
      'import { notFound } from "next/navigation"',
    );
    expect(pageSource).toContain("isConsultorFiscalEnabled");
    expect(pageSource).toContain(
      "if (!isConsultorFiscalEnabled()) notFound();",
    );
    expect(pageSource).toContain('export const dynamic = "force-dynamic"');
    expect(compact(pageSource)).toContain(
      "robots: { index: false, follow: false, noarchive: true }",
    );
    expect(pageSource).toContain("return <FiscalNotificationIntakeView />");
  });
});
