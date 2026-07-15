import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SEGMENTER_LIMITS_V1,
  segmentFiscalNotificationDocumentV1,
  type SegmentFiscalNotificationDocumentInputV1,
  type SegmentableNormalizedPageV1,
} from "./document-segmenter.v1";

function page(pageNumber: number, ...normalizedLines: string[]): SegmentableNormalizedPageV1 {
  return { pageNumber, normalizedLines, isBlank: normalizedLines.every((line) => line.length === 0) };
}

function input(...pages: SegmentableNormalizedPageV1[]): SegmentFiscalNotificationDocumentInputV1 {
  return { ownerScope: "user:synthetic", documentId: "document-synthetic-1", pages };
}

describe("multipage fiscal notification segmenter v1", () => {
  it("separates cover, main act, debt annex, payment document and appeal information", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "notificacion electronica", "direccion electronica habilitada unica"),
      page(2, "providencia de apremio", "agencia tributaria"),
      page(3, "continuacion del acto"),
      page(4, "relacion de deudas"),
      page(5, "detalle deuda sintetica"),
      page(6, "carta de pago"),
      page(7, "recursos y reclamaciones"),
    ));

    expect(result.segments.map((segment) => [segment.segmentType, segment.pageFrom, segment.pageTo])).toEqual([
      ["NOTIFICATION_COVER", 1, 1],
      ["MAIN_ADMINISTRATIVE_ACT", 2, 3],
      ["DEBT_LIST", 4, 5],
      ["PAYMENT_DOCUMENT", 6, 6],
      ["APPEAL_INFORMATION", 7, 7],
    ]);
    expect(result.segments[0].canGenerateAdministrativeFacts).toBe(false);
    expect(result.segments[1].canGenerateAdministrativeFacts).toBe(true);
    expect(result.retainedSourceContent).toBe("NONE");
    expect(JSON.stringify(result)).not.toContain("detalle deuda sintetica");
  });

  it("does not classify the whole PDF from page one", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "datos de la notificacion"),
      page(2, "acuse de recibo"),
      page(3, "requerimiento de presentacion de declaraciones o autoliquidaciones"),
      page(4, "continuacion"),
    ));
    expect(result.segments.map((segment) => segment.segmentType)).toEqual([
      "NOTIFICATION_COVER",
      "DELIVERY_EVIDENCE",
      "MAIN_ADMINISTRATIVE_ACT",
    ]);
    expect(result.segments[2]).toMatchObject({ pageFrom: 3, pageTo: 4 });
  });

  it("segments closed payment-receipt titles as factual payment documents", async () => {
    const titles = [
      "justificante de pago",
      "justificante del ingreso",
      "recibo de pago",
      "resultado del pago",
    ];
    for (const title of titles) {
      const result = await segmentFiscalNotificationDocumentV1(input(
        page(1, title, "agencia tributaria"),
      ));
      expect(result.segments).toEqual([
        expect.objectContaining({
          segmentType: "PAYMENT_DOCUMENT",
          detectedTitle: title,
          canGenerateAdministrativeFacts: true,
        }),
      ]);
    }
  });

  it("segments the implemented assessment titles as main administrative acts", async () => {
    const titles = [
      "notificacion del tramite de alegaciones y propuesta de liquidacion provisional",
      "notificacion de resolucion con liquidacion provisional",
      "resolucion con liquidacion provisional",
    ];
    for (const title of titles) {
      const result = await segmentFiscalNotificationDocumentV1(input(
        page(1, title, "agencia tributaria"),
      ));
      expect(result.segments).toEqual([
        expect.objectContaining({
          segmentType: "MAIN_ADMINISTRATIVE_ACT",
          detectedTitle: title,
          canGenerateAdministrativeFacts: true,
        }),
      ]);
    }
  });

  it("segments every implemented seizure title as a separate main administrative act", async () => {
    const titles = [
      "diligencia de embargo de cuentas bancarias",
      "diligencia de embargo de vehiculos",
      "diligencia de embargo de creditos comerciales o arrendaticios",
      "diligencia de embargo de sueldos salarios o pensiones",
      "diligencia de embargo de valores",
      "diligencia de embargo de cobros mediante terminal de punto de venta",
      "diligencia de embargo de intereses, rentas y frutos de toda especie",
      "diligencia de embargo de devoluciones tributarias",
      "diligencia de embargo de bienes inmuebles",
      "reiteracion de embargo de creditos",
      "levantamiento de diligencia de embargo",
      "contestacion a diligencia de embargo",
      "justificante de ingreso de diligencia de embargo",
    ];
    for (const title of titles) {
      const result = await segmentFiscalNotificationDocumentV1(input(
        page(1, title, "agencia tributaria"),
      ));
      expect(result.segments).toEqual([
        expect.objectContaining({
          segmentType: "MAIN_ADMINISTRATIVE_ACT",
          detectedTitle: title,
          canGenerateAdministrativeFacts: true,
        }),
      ]);
    }
  });

  it("keeps a seizure notification cover and annex outside the main diligence", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "datos de la notificacion", "dehu"),
      page(2, "diligencia de embargo de cuentas bancarias", "agencia tributaria"),
      page(3, "continuacion de la diligencia"),
      page(4, "anexo", "detalle sintetico"),
    ));
    expect(result.segments).toEqual([
      expect.objectContaining({ segmentType: "NOTIFICATION_COVER", pageFrom: 1, pageTo: 1 }),
      expect.objectContaining({ segmentType: "MAIN_ADMINISTRATIVE_ACT", pageFrom: 2, pageTo: 3 }),
      expect.objectContaining({ segmentType: "ANNEX", pageFrom: 4, pageTo: 4 }),
    ]);
  });

  it("classifies the closed deferral debt-schedule annex as a debt list, not a generic annex", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "concesion del aplazamiento o fraccionamiento de pago sin garantia"),
      page(2, "anexo i: deudas y plazos de la notificacion"),
    ));
    expect(result.segments).toEqual([
      expect.objectContaining({ segmentType: "MAIN_ADMINISTRATIVE_ACT", pageFrom: 1, canGenerateAdministrativeFacts: true }),
      expect.objectContaining({ segmentType: "DEBT_LIST", pageFrom: 2, canGenerateAdministrativeFacts: true }),
    ]);
  });

  it("keeps generic instructions outside the administrative act", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "providencia de apremio"),
      page(2, "continuacion"),
      page(3, "instrucciones generales"),
      page(4, "texto general"),
    ));
    expect(result.segments).toEqual([
      expect.objectContaining({ segmentType: "MAIN_ADMINISTRATIVE_ACT", pageFrom: 1, pageTo: 2, canGenerateAdministrativeFacts: true }),
      expect.objectContaining({ segmentType: "GENERIC_INSTRUCTIONS", pageFrom: 3, pageTo: 4, canGenerateAdministrativeFacts: false }),
    ]);
  });

  it("retains unknown leading pages without promoting them to facts", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "contenido sin titulo registrado"),
      page(2, "providencia de apremio"),
    ));
    expect(result.segments[0]).toMatchObject({ segmentType: "UNKNOWN", canGenerateAdministrativeFacts: false });
    expect(result.warnings).toContain("UNKNOWN_LEADING_PAGES");
  });

  it("retains blank continuation pages in the current segment and reports them", async () => {
    const result = await segmentFiscalNotificationDocumentV1(input(
      page(1, "providencia de apremio"),
      page(2, ""),
      page(3, "continuacion"),
    ));
    expect(result.segments).toEqual([
      expect.objectContaining({ segmentType: "MAIN_ADMINISTRATIVE_ACT", pageFrom: 1, pageTo: 3 }),
    ]);
    expect(result.warnings).toContain("BLANK_PAGES_RETAINED_IN_SEGMENT");
  });

  it("creates deterministic SHA-256 hashes without retaining text", async () => {
    const source = input(page(1, "carta de pago"));
    const first = await segmentFiscalNotificationDocumentV1(source);
    const second = await segmentFiscalNotificationDocumentV1(source);
    expect(first).toEqual(second);
    expect(first.segments[0].contentHash).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.segments)).toBe(true);
  });

  it("does not mutate caller-owned pages or lines", async () => {
    const pages = [page(1, "providencia de apremio"), page(2, "continuacion")];
    const before = structuredClone(pages);
    await segmentFiscalNotificationDocumentV1(input(...pages));
    expect(pages).toEqual(before);
  });

  it("fails closed on unknown keys and inconsistent blank state", async () => {
    await expect(segmentFiscalNotificationDocumentV1({ ...input(page(1, "carta de pago")), nif: "synthetic" } as unknown as SegmentFiscalNotificationDocumentInputV1)).rejects.toMatchObject({ path: "segmenter.$shape" });
    await expect(segmentFiscalNotificationDocumentV1(input({ pageNumber: 1, normalizedLines: ["carta de pago"], isBlank: true }))).rejects.toMatchObject({ path: "segmenter.pages[0].isBlank" });
  });

  it("enforces global line, text and page limits before classification", async () => {
    await expect(segmentFiscalNotificationDocumentV1(input(page(1, ...Array.from({ length: DOCUMENT_SEGMENTER_LIMITS_V1.maxLinesPerPage + 1 }, () => "line"))))).rejects.toMatchObject({ code: "COLLECTION_LIMIT_EXCEEDED" });
    await expect(segmentFiscalNotificationDocumentV1(input(page(1, "x".repeat(DOCUMENT_SEGMENTER_LIMITS_V1.maxLineChars + 1))))).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("honors cancellation before processing", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(segmentFiscalNotificationDocumentV1({ ...input(page(1, "carta de pago")), signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
  });
});
