import { describe, expect, it } from "vitest";
import { type BoundedDocumentInput, FiscalNotificationInputError } from "../input-contract";
import { createDocumentSegmentV1, type DetectedAuthorityV1, type DocumentSegmentTypeV1, type DocumentSegmentV1 } from "./document-segment.v1";
import { segmentFiscalNotificationDocumentV1 } from "./document-segmenter.v1";
import {
  NOTIFICATION_ENVELOPE_EXTRACTOR_RELEASE_V1,
  extractNotificationEnvelopeV1,
} from "./notification-envelope-extractor.v1";

const OWNER_SCOPE = "user:synthetic-notification-envelope";
const DOCUMENT_ID = "document:synthetic-notification-envelope";

const ACCESSED_RECEIPT = [
  "Dirección Electrónica Habilitada Única",
  "dehu.redsara.es",
  "ACUSE DE RECIBO",
  "Estado de la notificación: Aceptada",
  "Identificador de la notificación: NOT-SYN-001",
  "Identificador del acto: ACT-SYN-001",
  "Número de expediente: EXP-SYN-001",
  "Código Seguro de Verificación (CSV): CSV-SYN-001",
  "Asunto: Resolución administrativa sintética",
  "Organismo emisor: Agencia Estatal de Administración Tributaria",
  "Destinatario: PERSONA SINTÉTICA",
  "NIF del destinatario: 12345678Z",
  "Canal de notificación: DEHú",
  "Fecha y hora de puesta a disposición: 10/07/2026 08:15:30",
  "Fecha y hora de acceso: 12/07/2026 09:42:05",
  "Fecha de notificación: 12/07/2026",
].join("\n");

function document(...pagesOrSignal: readonly (string | AbortSignal)[]): BoundedDocumentInput {
  const signal = pagesOrSignal.at(-1) instanceof AbortSignal
    ? pagesOrSignal.at(-1) as AbortSignal
    : undefined;
  const texts = pagesOrSignal.filter((item): item is string => typeof item === "string");
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: DOCUMENT_ID,
    pages: Object.freeze(texts.map((text, index) => Object.freeze({
      pageNumber: index + 1,
      text,
      isBlank: text.trim().length === 0,
    }))),
    ...(signal ? { signal } : {}),
  });
}

function segment(
  type: DocumentSegmentTypeV1,
  pageFrom: number,
  pageTo = pageFrom,
  suffix = String(pageFrom),
  authority: DetectedAuthorityV1 = "DEHU",
  detectedTitle?: string,
): DocumentSegmentV1 {
  const hashSeed = [...suffix].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 0x01000193), 0x811c9dc5);
  const hashHex = (hashSeed >>> 0).toString(16).padStart(8, "0");
  return createDocumentSegmentV1({
    segmentId: `segment:${suffix}`,
    documentId: DOCUMENT_ID,
    segmentType: type,
    pageFrom,
    pageTo,
    detectedTitle: detectedTitle ?? (type === "DELIVERY_EVIDENCE" ? "acuse de recibo" : "notificación electrónica"),
    detectedAuthority: authority,
    classificationConfidence: 1,
    extractionStatus: "EXTRACTED_REVIEW_REQUIRED",
    contentHash: `sha256:${hashHex.repeat(8)}`,
    canGenerateAdministrativeFacts: ["MAIN_ADMINISTRATIVE_ACT", "DEBT_LIST", "PAYMENT_DOCUMENT"].includes(type),
  });
}

describe("notification envelope extractor v1", () => {
  it("runs after the closed segmenter and extracts an accepted DEHú receipt", async () => {
    const source = document(ACCESSED_RECEIPT);
    const segmentation = await segmentFiscalNotificationDocumentV1({
      ownerScope: OWNER_SCOPE,
      documentId: DOCUMENT_ID,
      pages: source.pages.map((page) => ({
        pageNumber: page.pageNumber,
        normalizedLines: page.text.split("\n").map((line) => line
          .normalize("NFD")
          .replace(/\p{M}/gu, "")
          .toLowerCase()),
        isBlank: page.isBlank,
      })),
    });

    expect(segmentation.segments).toEqual([
      expect.objectContaining({ segmentType: "DELIVERY_EVIDENCE", detectedAuthority: "DEHU" }),
    ]);
    const output = extractNotificationEnvelopeV1({ document: source, segments: segmentation.segments });
    expect(output.status).toBe("REVIEW_REQUIRED");
    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "notification.dehu_envelope", confidence: 1 }),
    ]);
    expect(output.notificationEnvelopeFacts).toMatchObject({
      documentKind: "ELECTRONIC_NOTIFICATION_RECEIPT",
      notificationState: "ACCESSED",
      stateBasis: "EXPLICIT_PRINTED_STATE",
      printedState: { printedValue: "Aceptada" },
      notificationReference: { printedValue: "NOT-SYN-001" },
      actReference: { printedValue: "ACT-SYN-001" },
      expediente: { printedValue: "EXP-SYN-001" },
      csv: { printedValue: "CSV-SYN-001" },
      subject: { printedValue: "Resolución administrativa sintética" },
      issuer: { printedValue: "Agencia Estatal de Administración Tributaria" },
      recipientName: { printedValue: "PERSONA SINTÉTICA" },
      recipientTaxId: { printedValue: "12345678Z" },
      channel: { printedValue: "DEHú" },
      availabilityDate: { printedValue: "10/07/2026 08:15:30", parsedDate: "2026-07-10", parsedTime: "08:15:30" },
      accessDate: { printedValue: "12/07/2026 09:42:05", parsedDate: "2026-07-12", parsedTime: "09:42:05" },
      effectiveNotificationDate: { printedValue: "12/07/2026", parsedDate: "2026-07-12", parsedTime: null },
    });
    expect(output.references.map((item) => [item.referenceType, item.normalizedValue])).toEqual([
      ["NOTIFICATION_ID", "NOT-SYN-001"],
      ["ACT_ID", "ACT-SYN-001"],
      ["EXPEDIENTE_ID", "EXP-SYN-001"],
      ["CSV", "CSV-SYN-001"],
      ["NIF", "12345678Z"],
    ]);
    expect(output.proceduralDates).toEqual([
      expect.objectContaining({ dateType: "AVAILABILITY_DATE", parsedDate: "2026-07-10", timezone: "Europe/Madrid", legallyComputed: false }),
      expect.objectContaining({ dateType: "ACCESS_DATE", parsedDate: "2026-07-12", timezone: "Europe/Madrid", legallyComputed: false }),
      expect.objectContaining({ dateType: "EFFECTIVE_NOTIFICATION_DATE", parsedDate: "2026-07-12", timezone: null, legallyComputed: false }),
    ]);
    expect(output.entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityKind: "ADMINISTRATIVE_ACT", familyId: "notification.dehu_envelope" }),
      expect.objectContaining({ entityKind: "NOTIFICATION_EVENT", notificationStatus: "ACCESSED" }),
      expect.objectContaining({ entityKind: "PARTY", roles: ["ISSUING_AUTHORITY"] }),
      expect.objectContaining({ entityKind: "PARTY", roles: ["TAXPAYER"] }),
    ]));
    expect(output).toMatchObject({
      retainedSourceContent: "NONE",
      familyDecisionPolicy: "EXACT_CLOSED_TITLE_AND_TRUSTED_AUTHORITY_REQUIRED",
      stateDecisionPolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY",
      legalDateComputationPolicy: "PROHIBITED",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
      permitsAutomaticFamilyConfirmation: false,
    });
  });

  it("represents an explicitly expired notification as EXPIRED without computing its date", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "Dirección Electrónica Habilitada Única",
        "ACUSE DE RECIBO",
        "Estado: Expirada",
        "Identificador de la notificación: NOT-SYN-EXPIRED",
        "Fecha de puesta a disposición: 01/07/2026 10:00",
        "Fecha de expiración: 11/07/2026 10:00",
      ].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });

    expect(output.notificationEnvelopeFacts).toMatchObject({
      notificationState: "EXPIRED",
      stateBasis: "EXPLICIT_PRINTED_STATE",
      expirationDate: { printedValue: "11/07/2026 10:00", parsedDate: "2026-07-11", parsedTime: "10:00:00" },
    });
    expect(output.entities).toContainEqual(expect.objectContaining({
      entityKind: "NOTIFICATION_EVENT",
      notificationStatus: "EXPIRED",
    }));
    expect(output.proceduralDates).toContainEqual(expect.objectContaining({
      dateType: "EXPIRATION_DATE",
      legallyComputed: false,
      computationRuleId: null,
    }));
  });

  it.each([
    ["Fecha de acceso: 12/07/2026", "ACCESSED", "ACCESS_DATE"],
    ["Fecha de rechazo: 12/07/2026", "REJECTED", "REJECTION_DATE"],
    ["Fecha de expiración: 12/07/2026", "EXPIRED", "EXPIRATION_DATE"],
    ["Fecha de puesta a disposición: 12/07/2026", "AVAILABLE", "AVAILABILITY_DATE"],
  ] as const)("uses only the printed event %s when state is absent", (eventLine, state, dateType) => {
    const output = extractNotificationEnvelopeV1({
      document: document(["DEHú", "ACUSE DE RECIBO", eventLine].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });
    expect(output.notificationEnvelopeFacts).toMatchObject({ notificationState: state, stateBasis: "EXPLICIT_EVENT_DATE" });
    expect(output.proceduralDates).toContainEqual(expect.objectContaining({ dateType, legallyComputed: false }));
  });

  it("keeps a recognized envelope exact while leaving its missing state UNKNOWN", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "Dirección Electrónica Habilitada Única",
        "NOTIFICACIÓN ELECTRÓNICA",
        "Identificador de la notificación: NOT-SYN-INCOMPLETE",
        "Asunto: Acto sintético sin estado impreso",
        "La ley aplicable describe con carácter general cuándo una notificación podría entenderse rechazada.",
      ].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "incomplete")],
    });

    expect(output.familyCandidates).toEqual([
      expect.objectContaining({ familyId: "notification.dehu_envelope", confidence: 1 }),
    ]);
    expect(output.notificationEnvelopeFacts).toMatchObject({
      documentKind: "DEHU_NOTIFICATION_ENVELOPE",
      notificationState: "UNKNOWN",
      stateBasis: "UNKNOWN",
    });
    expect(output.warnings).toContain("MISSING_EXPLICIT_NOTIFICATION_STATE_OR_EVENT_DATE");
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "NOTIFICATION_EVENT" }));
  });

  it("does not silently choose between contradictory printed event dates", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "DEHú",
        "ACUSE DE RECIBO",
        "Fecha de acceso: 12/07/2026",
        "Fecha de rechazo: 13/07/2026",
      ].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });

    expect(output.notificationEnvelopeFacts).toMatchObject({ notificationState: "UNKNOWN", stateBasis: "UNKNOWN" });
    expect(output.warnings).toContain("CONFLICTING_PRINTED_NOTIFICATION_EVENT_DATES");
    expect(output.entities).not.toContainEqual(expect.objectContaining({ entityKind: "NOTIFICATION_EVENT" }));
  });

  it("uses an explicit final event when an earlier printed state still says available", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "DEHú",
        "ACUSE DE RECIBO",
        "Estado: Disponible",
        "Fecha de puesta a disposición: 10/07/2026",
        "Fecha de acceso: 12/07/2026",
      ].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });

    expect(output.notificationEnvelopeFacts).toMatchObject({
      notificationState: "ACCESSED",
      stateBasis: "EXPLICIT_EVENT_DATE",
    });
    expect(output.warnings).toContain("PRINTED_AVAILABLE_STATE_PRECEDES_FINAL_EVENT");
  });

  it("maps a literal notice of availability to the delivery-attempt family", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "Agencia Tributaria",
        "sede.agenciatributaria.gob.es",
        "AVISO DE PUESTA A DISPOSICIÓN",
        "Estado: Disponible",
        "Fecha de puesta a disposición: 14/07/2026",
      ].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "attempt", "AEAT", "aviso de puesta a disposición")],
    });

    expect(output.familyCandidates[0]).toMatchObject({ familyId: "notification.delivery_attempt", confidence: 1 });
    expect(output.notificationEnvelopeFacts).toMatchObject({
      documentKind: "DELIVERY_ATTEMPT",
      notificationState: "AVAILABLE",
    });
  });

  it("maps an exact publication to publication or appearance", () => {
    const output = extractNotificationEnvelopeV1({
      document: document([
        "Agencia Tributaria",
        "sede.agenciatributaria.gob.es",
        "ANUNCIO DE CITACIÓN",
        "Estado de la notificación: Publicada",
        "Número de expediente: EXP-SYN-PUBLISHED",
      ].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "published", "AEAT", "anuncio de citación")],
    });

    expect(output.familyCandidates[0]).toMatchObject({ familyId: "notification.publication_or_appearance" });
    expect(output.notificationEnvelopeFacts.notificationState).toBe("PUBLISHED");
    expect(output.entities).toContainEqual(expect.objectContaining({ notificationStatus: "PUBLISHED" }));
  });

  it("blocks guides, conflicting territories and incompatible document kinds", () => {
    const guide = extractNotificationEnvelopeV1({
      document: document(["GUÍA DE EJEMPLO", "DEHú", "ACUSE DE RECIBO"].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });
    expect(guide).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_NON_DOCUMENT_GUIDE"] });

    const territory = extractNotificationEnvelopeV1({
      document: document(["Hacienda Foral", "NOTIFICACIÓN ELECTRÓNICA"].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "territory", "AEAT")],
    });
    expect(territory).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_AUTHORITY_OR_TERRITORY"] });

    const kindConflict = extractNotificationEnvelopeV1({
      document: document(["DEHú", "AVISO DE PUESTA A DISPOSICIÓN", "ANUNCIO DE CITACIÓN"].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "kind", "DEHU", "aviso de puesta a disposición")],
    });
    expect(kindConflict).toMatchObject({ status: "BLOCKED", warnings: ["CONFLICTING_NOTIFICATION_DOCUMENT_KIND"] });
  });

  it("requires a trusted authority or printed official domain", () => {
    const unknown = extractNotificationEnvelopeV1({
      document: document(["NOTIFICACIÓN ELECTRÓNICA", "Estado: Aceptada"].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "unknown", "UNKNOWN")],
    });
    expect(unknown).toMatchObject({ status: "UNKNOWN", familyCandidates: [] });

    const domainBacked = extractNotificationEnvelopeV1({
      document: document(["dehu.redsara.es", "NOTIFICACIÓN ELECTRÓNICA", "Estado: Aceptada"].join("\n")),
      segments: [segment("NOTIFICATION_COVER", 1, 1, "domain", "UNKNOWN")],
    });
    expect(domainBacked.familyCandidates[0]).toMatchObject({ familyId: "notification.dehu_envelope" });
  });

  it("fails closed on malformed segment coverage, resource overflow and abort", () => {
    expect(() => extractNotificationEnvelopeV1({
      document: document(ACCESSED_RECEIPT, "segunda página"),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    })).toThrowError(expect.objectContaining({ path: "notificationEnvelope.segments.coverage" }));

    expect(() => extractNotificationEnvelopeV1({
      document: document(["DEHú", "ACUSE DE RECIBO", ...Array.from({ length: 10_001 }, () => "x")].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    })).toThrowError(expect.objectContaining({ code: "COLLECTION_LIMIT_EXCEEDED" }));

    const controller = new AbortController();
    controller.abort();
    expect(() => extractNotificationEnvelopeV1({
      document: document(ACCESSED_RECEIPT, controller.signal),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    })).toThrowError(expect.objectContaining({ code: "ABORTED" }));
  });

  it("rejects unknown input keys and invalid printed dates without leaking values in errors", () => {
    const source = document(ACCESSED_RECEIPT);
    expect(() => extractNotificationEnvelopeV1({
      document: source,
      segments: [segment("DELIVERY_EVIDENCE", 1)],
      secretExtra: "PII-SHOULD-NOT-APPEAR",
    } as never)).toThrowError(expect.objectContaining({ path: "notificationEnvelopeInput.$shape" }));

    const foreign = Object.freeze({ ...source, ownerScope: "user:other-synthetic-owner" });
    const result = extractNotificationEnvelopeV1({ document: foreign, segments: [segment("DELIVERY_EVIDENCE", 1)] });
    expect(result.entities.every((entity) => entity.ownerScope === "user:other-synthetic-owner")).toBe(true);

    const invalidDate = extractNotificationEnvelopeV1({
      document: document(["DEHú", "ACUSE DE RECIBO", "Fecha de acceso: 31/02/2026"].join("\n")),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });
    expect(invalidDate.notificationEnvelopeFacts.accessDate).toMatchObject({ parsedDate: null });
    expect(invalidDate.warnings).toContain("INVALID_PRINTED_ACCESS_DATE");
  });

  it("returns defensive outputs and never retains source pages", () => {
    const output = extractNotificationEnvelopeV1({
      document: document(ACCESSED_RECEIPT),
      segments: [segment("DELIVERY_EVIDENCE", 1)],
    });
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.entities)).toBe(true);
    expect(Object.isFrozen(output.notificationEnvelopeFacts)).toBe(true);
    expect(Object.isFrozen(output.notificationEnvelopeFacts.notificationReference?.pageNumbers)).toBe(true);
    expect(output.retainedSourceContent).toBe("NONE");
    expect(JSON.stringify(output)).not.toContain("Dirección Electrónica Habilitada Única\ndehu.redsara.es");
  });

  it("publishes only official interpretation metadata and no active legal rule", () => {
    expect(NOTIFICATION_ENVELOPE_EXTRACTOR_RELEASE_V1).toMatchObject({
      familyIds: [
        "notification.delivery_attempt",
        "notification.publication_or_appearance",
        "notification.dehu_envelope",
      ],
      sourcePriority: "DOCUMENT_LITERAL_CONTROLS_FACTS",
      statePolicy: "PRINTED_STATE_OR_PRINTED_EVENT_DATE_ONLY",
      datePolicy: "NEVER_COMPUTE_EFFECTIVE_DATE_OR_EXPIRATION",
    });
    expect(NOTIFICATION_ENVELOPE_EXTRACTOR_RELEASE_V1.officialInterpretationSources).toHaveLength(3);
  });

  it("uses deterministic entity identifiers and does not mutate inputs", () => {
    const source = document(ACCESSED_RECEIPT);
    const segments = Object.freeze([segment("DELIVERY_EVIDENCE", 1)]);
    const before = JSON.stringify({ source, segments });
    const first = extractNotificationEnvelopeV1({ document: source, segments });
    const second = extractNotificationEnvelopeV1({ document: source, segments });
    expect(first.entities.map((item) => item.entityId)).toEqual(second.entities.map((item) => item.entityId));
    expect(JSON.stringify({ source, segments })).toBe(before);
  });

  it("uses sanitized error paths for duplicate segment identities", () => {
    const source = document(ACCESSED_RECEIPT, "anexo");
    const duplicate = segment("DELIVERY_EVIDENCE", 2, 2, "1");
    try {
      extractNotificationEnvelopeV1({ document: source, segments: [segment("DELIVERY_EVIDENCE", 1), duplicate] });
      throw new Error("expected validation failure");
    } catch (error) {
      expect(error).toBeInstanceOf(FiscalNotificationInputError);
      expect((error as FiscalNotificationInputError).path).toBe("notificationEnvelope.segments.identity");
      expect(String(error)).not.toContain("segment:1");
    }
  });
});
