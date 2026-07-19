import { describe, expect, it } from "vitest";
import {
  buildFiscalNotificationSupportReportV1,
  buildFiscalNotificationSupportMailtoHrefV1,
  FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1,
  formatFiscalNotificationSupportReportTextV1,
  parseFiscalNotificationSupportReportV1,
} from "./support-report.v1";

describe("fiscal notification support report v1", () => {
  it("crea un correo de soporte con contexto técnico saneado", () => {
    const href = buildFiscalNotificationSupportMailtoHrefV1({
      stage: "LOCAL_ANALYSIS",
      status: "ERROR",
      message:
        "No se ha podido abrir el PDF de forma segura. NIF B12345678 y 1.234,56 € ocultos.",
      route: "/consultor-fiscal/notificaciones",
      fileByteLength: 49_000,
      mimeType: "application/pdf",
      pageCount: 6,
      recognizedTitle: "Diligencia de embargo A123456789012345",
    });

    expect(href).toContain(`mailto:${FISCAL_NOTIFICATION_SUPPORT_EMAIL_V1}`);
    expect(decodeURIComponent(href)).toContain(
      "FACTU_FISCAL_NOTIFICATION_SUPPORT_CASE_V1",
    );
    expect(decodeURIComponent(href)).toContain(
      "privacy=no_pdf_no_text_no_filename_no_nif_no_amounts_no_references",
    );
    expect(decodeURIComponent(href)).toContain("stage=LOCAL_ANALYSIS");
    expect(decodeURIComponent(href)).toContain("fileByteLength=49000");
    expect(decodeURIComponent(href)).toContain("mimeType=application/pdf");
    expect(decodeURIComponent(href)).toContain("pageCount=6");
    expect(decodeURIComponent(href)).toContain("[dato oculto]");
    expect(decodeURIComponent(href)).toContain("[identificador oculto]");
    expect(decodeURIComponent(href)).not.toContain("B12345678");
    expect(decodeURIComponent(href)).not.toContain("1.234,56");
    expect(decodeURIComponent(href)).not.toContain("A123456789012345");
  });

  it("no incluye nombre de archivo, texto bruto ni huella documental", () => {
    const href = buildFiscalNotificationSupportMailtoHrefV1({
      stage: "STRUCTURED_SAVE",
      status: "blocked",
      message: "No se pudo confirmar el guardado.",
      route: "/consultor-fiscal/notificaciones",
      persistenceState: "indeterminate",
    });
    const decoded = decodeURIComponent(href);

    expect(decoded).not.toMatch(/\b(?:fileName|displayName|rawText|textLayer|sha256)=/i);
    expect(decoded).toContain("persistenceState=indeterminate");
  });

  it("crea un payload estricto y saneado para envío desde Factu", () => {
    const report = buildFiscalNotificationSupportReportV1(
      {
        stage: "STRUCTURED_SAVE",
        status: "DURABILITY_CONFLICT:stale_precondition",
        message: "No se guardó B12345678 ni 1.234,56 €.",
        route: "/consultor-fiscal/notificaciones",
        fileByteLength: 49_000,
        mimeType: "application/pdf",
        pageCount: 6,
        persistenceState: "blocked",
      },
      "case:00000000-0000-4000-8000-000000000001",
    );

    expect(report).not.toBeNull();
    const text = formatFiscalNotificationSupportReportTextV1(report!);
    expect(text).toContain("caseId=case:00000000-0000-4000-8000-000000000001");
    expect(text).toContain("DURABILITY_CONFLICT:stale_precondition");
    expect(text).toContain("[dato oculto]");
    expect(text).not.toContain("B12345678");
    expect(text).not.toContain("1.234,56");
  });

  it("rechaza claves extra, identificadores inválidos y límites imposibles", () => {
    const base = {
      schemaVersion: 1,
      caseId: "case:00000000-0000-4000-8000-000000000001",
      stage: "LOCAL_ANALYSIS",
      status: "ERROR",
      message: "No leído",
      route: "/consultor-fiscal/notificaciones",
      mimeType: "application/pdf",
    };

    expect(parseFiscalNotificationSupportReportV1(base)).not.toBeNull();
    expect(
      parseFiscalNotificationSupportReportV1({ ...base, rawText: "privado" }),
    ).toBeNull();
    expect(
      parseFiscalNotificationSupportReportV1({ ...base, caseId: "case:bad" }),
    ).toBeNull();
    expect(
      parseFiscalNotificationSupportReportV1({
        ...base,
        fileByteLength: 4 * 1024 * 1024 + 1,
      }),
    ).toBeNull();
  });
});
