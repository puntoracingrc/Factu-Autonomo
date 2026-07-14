import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "./input-contract";
import { analyzeFiscalNotificationVerticalSliceV1 } from "./extractor-core/vertical-slice-orchestrator.v1";
import {
  FiscalNotificationVerticalSliceReviewErrorV1,
  parseFiscalNotificationVerticalSliceReviewV1,
  projectFiscalNotificationVerticalSliceReviewV1,
} from "./vertical-slice-review.v1";

const PAYMENT = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "JUSTIFICANTE DE PAGO",
  "Número de justificante: REC-SYN-VIEW-001",
  "NRC: ABCDEF1234567890GHIJKL",
  "Fecha del pago: 14/07/2026",
  "N.I.F.: 12345678Z",
  "Modelo: 303",
  "Ejercicio: 2026",
  "Periodo: 2T",
  "Clave de liquidación: LQ-SYN-VIEW-001",
  "Clave de deuda: DEBT-SYN-VIEW-001",
  "Importe pagado: 600,00 euros",
  "Entidad colaboradora: BANCO SINTÉTICO",
  "Medio de pago: Cargo en cuenta",
  "Resultado del pago: Pago parcial",
  "Tipo de pago: Parcial",
  "Cuenta de cargo: ES12 3456 7890 1234 5678 9012",
].join("\n");

const NOTIFICATION = [
  "Dirección Electrónica Habilitada Única",
  "dehu.redsara.es",
  "ACUSE DE RECIBO",
  "Estado de la notificación: Aceptada",
  "Identificador de la notificación: NOT-SYN-VIEW-001",
  "Identificador del acto: ACT-SYN-VIEW-001",
  "Asunto: Liquidación sintética notificada",
  "Organismo emisor: Agencia Estatal de Administración Tributaria",
  "Destinatario: PERSONA SINTÉTICA",
  "Canal de notificación: DEHú",
  "Fecha de puesta a disposición: 10/07/2026 08:15",
  "Fecha de acceso: 12/07/2026 09:42",
].join("\n");

const BANK_SEIZURE = [
  "Agencia Tributaria",
  "sede.agenciatributaria.gob.es",
  "DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS",
  "Número de diligencia: EMB-SYN-VIEW-001",
  "Número de expediente: EXP-SYN-VIEW-001",
  "Clave de deuda: DEBT-SYN-VIEW-001",
  "Deudor: PERSONA DEUDORA SINTÉTICA",
  "NIF del deudor: 12345678Z",
  "Destinatario: BANCO SINTÉTICO",
  "NIF del destinatario: A12345674",
  "Entidad financiera: BANCO SINTÉTICO",
  "IBAN: ES00 0000 0000 0000 1234",
  "Principal: 1.000,00 EUR",
  "Importe a embargar: 1.240,00 EUR",
  "Límite del embargo: 1.240,00 EUR",
  "Importe retenido: 900,00 EUR",
  "Fecha del embargo: 04/03/2026",
  "Plazo de contestación: 12/03/2026",
  "Instrucciones: CONTESTAR POR LA SEDE ELECTRÓNICA",
].join("\n");

function document(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-review-projection",
    documentId: "document:synthetic-review-projection",
    pages: Object.freeze([Object.freeze({ pageNumber: 1, text, isBlank: false })]),
  });
}

describe("fiscal notification vertical-slice review v1", () => {
  it.each([
    ["DILIGENCIA DE EMBARGO DE CUENTAS BANCARIAS", "Diligencia de embargo de cuenta bancaria"],
    ["DILIGENCIA DE EMBARGO DE CRÉDITOS COMERCIALES O ARRENDATICIOS", "Diligencia de embargo de créditos comerciales o arrendaticios"],
    ["DILIGENCIA DE EMBARGO DE SUELDOS, SALARIOS O PENSIONES", "Diligencia de embargo de sueldos, salarios o pensiones"],
    ["DILIGENCIA DE EMBARGO DE COBROS MEDIANTE TERMINAL DE PUNTO DE VENTA", "Diligencia de embargo de cobros mediante TPV"],
    ["DILIGENCIA DE EMBARGO DE DEVOLUCIONES TRIBUTARIAS", "Diligencia de embargo de efectivo, devoluciones o créditos públicos"],
    ["DILIGENCIA DE EMBARGO DE BIENES INMUEBLES", "Diligencia de embargo de inmueble"],
    ["LEVANTAMIENTO DE DILIGENCIA DE EMBARGO", "Levantamiento de embargo"],
    ["CONTESTACIÓN A DILIGENCIA DE EMBARGO", "Contestación a diligencia de embargo"],
    ["JUSTIFICANTE DE INGRESO DE DILIGENCIA DE EMBARGO", "Ingreso efectuado por tercero retenedor"],
  ])("names %s exactly in the visible review", async (printedTitle, visibleTitle) => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document([
        "Agencia Tributaria",
        "sede.agenciatributaria.gob.es",
        printedTitle,
        "Número de diligencia: EMB-SYN-VIEW-TABLE",
        "Deudor: PERSONA DEUDORA SINTÉTICA",
      ].join("\n"))),
    );

    expect(review.documents).toEqual([
      expect.objectContaining({ extractorId: "seizure", title: visibleTitle }),
    ]);
    expect(review.documents[0]?.title).not.toMatch(/posible/iu);
  });

  it("projects the exact electronic-notification facts into the visible review", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(NOTIFICATION)),
    );

    expect(review.documents).toEqual([
      expect.objectContaining({
        extractorId: "notification-envelope",
        familyId: "notification.dehu_envelope",
        title: "Sobre o acuse de notificación electrónica",
        subtitle: "Notificación accedida o aceptada",
      }),
    ]);
    expect(review.documents[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        semantic: "STATUS",
        displayValue: "Notificación accedida o aceptada",
      }),
      expect.objectContaining({
        semantic: "REFERENCE",
        canonicalType: "NOTIFICATION_ID",
        displayValue: "NOT-SYN-VIEW-001",
      }),
      expect.objectContaining({
        semantic: "REFERENCE",
        canonicalType: "ACT_ID",
        displayValue: "ACT-SYN-VIEW-001",
      }),
      expect.objectContaining({
        semantic: "DATE",
        canonicalType: "AVAILABILITY_DATE",
        displayValue: "10/07/2026 08:15",
        normalizedValue: "2026-07-10",
      }),
      expect.objectContaining({
        semantic: "DATE",
        canonicalType: "ACCESS_DATE",
        displayValue: "12/07/2026 09:42",
        normalizedValue: "2026-07-12",
      }),
      expect.objectContaining({
        semantic: "PARTY",
        canonicalType: "ISSUING_AUTHORITY",
        displayValue: "Agencia Estatal de Administración Tributaria",
      }),
      expect.objectContaining({
        semantic: "PARTY",
        canonicalType: "TAXPAYER",
        displayValue: "PERSONA SINTÉTICA",
      }),
      expect.objectContaining({
        semantic: "DETAIL",
        canonicalType: "NOTIFICATION_SUBJECT",
        displayValue: "Liquidación sintética notificada",
      }),
      expect.objectContaining({
        semantic: "DETAIL",
        canonicalType: "NOTIFICATION_CHANNEL",
        displayValue: "DEHú",
      }),
    ]));
    expect(review).toMatchObject({
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("projects visible exact fields without retaining raw document text", async () => {
    const analysis = await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT));
    const review = projectFiscalNotificationVerticalSliceReviewV1(analysis);

    expect(review.status).toBe("REVIEW_REQUIRED");
    expect(review.documents).toEqual([
      expect.objectContaining({
        extractorId: "payment-evidence",
        familyId: "payment.receipt",
        title: "Justificante de pago",
        pageFrom: 1,
        pageTo: 1,
      }),
    ]);
    expect(review.documents[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        semantic: "STATUS",
        displayValue: "Pago parcial confirmado en el justificante",
      }),
      expect.objectContaining({
        semantic: "REFERENCE",
        canonicalType: "DEBT_KEY",
        displayValue: "DEBT-SYN-VIEW-001",
      }),
      expect.objectContaining({
        semantic: "MONEY",
        canonicalType: "PARTIAL_PAYMENT",
        amountCents: 60_000,
        currency: "EUR",
        displayValue: "600,00 €",
      }),
      expect.objectContaining({
        semantic: "MASKED_VALUE",
        displayValue: "****9012",
      }),
    ]));
    expect(JSON.stringify(review)).not.toContain("ES12 3456");
    expect(review).toMatchObject({
      retainedSourceContent: "NONE",
      permitsDebtCreation: false,
      permitsDeadlineCreation: false,
      permitsPaymentAction: false,
      permitsAccountingAction: false,
    });
  });

  it("projects the exact seizure type, parties, amounts and masked account", async () => {
    const review = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(BANK_SEIZURE)),
    );

    expect(review.documents).toEqual([
      expect.objectContaining({
        extractorId: "seizure",
        familyId: "seizure.bank_account",
        title: "Diligencia de embargo de cuenta bancaria",
        subtitle: "Diligencia de embargo registrada",
      }),
    ]);
    expect(review.documents[0]?.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({
        semantic: "STATUS",
        displayValue: "Diligencia de embargo registrada",
      }),
      expect.objectContaining({
        semantic: "REFERENCE",
        canonicalType: "SEIZURE_ORDER_ID",
        displayValue: "EMB-SYN-VIEW-001",
      }),
      expect.objectContaining({
        semantic: "PARTY",
        canonicalType: "PRIMARY_DEBTOR",
        displayValue: "PERSONA DEUDORA SINTÉTICA",
      }),
      expect.objectContaining({
        semantic: "MONEY",
        canonicalType: "SEIZURE_LIMIT",
        label: "Límite del embargo",
        amountCents: 124_000,
      }),
      expect.objectContaining({
        semantic: "MONEY",
        canonicalType: "RETAINED_AMOUNT",
        amountCents: 90_000,
      }),
      expect.objectContaining({
        semantic: "MASKED_VALUE",
        canonicalType: "MASKED_ACCOUNT",
        displayValue: "****1234",
      }),
      expect.objectContaining({
        semantic: "DETAIL",
        canonicalType: "DEBTOR_TAX_ID",
        displayValue: "12345678Z",
      }),
      expect.objectContaining({
        semantic: "DATE",
        canonicalType: "RESPONSE_DEADLINE",
        normalizedValue: "2026-03-12",
      }),
    ]));
    expect(JSON.stringify(review)).not.toContain("ES00 0000 0000 0000 1234");
    expect(JSON.stringify(review)).not.toContain(BANK_SEIZURE);
  });

  it("returns an empty information-pending review for unsupported content", async () => {
    const analysis = await analyzeFiscalNotificationVerticalSliceV1(
      document("Agencia Tributaria\nComunicación informativa sintética"),
    );
    expect(projectFiscalNotificationVerticalSliceReviewV1(analysis)).toMatchObject({
      status: "INFORMATION_PENDING",
      documents: [],
    });
  });

  it("reparses defensively and rejects unknown nested keys", async () => {
    const projected = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
    );
    const parsed = parseFiscalNotificationVerticalSliceReviewV1(
      structuredClone(projected),
    );
    const tampered = structuredClone(projected) as unknown as {
      documents: Array<{ fields: Array<Record<string, unknown>> }>;
    };
    tampered.documents[0]!.fields[0]!.nif = "synthetic";

    expect(parsed).toEqual(projected);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.documents[0]?.fields)).toBe(true);
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(tampered)).toThrow(
      FiscalNotificationVerticalSliceReviewErrorV1,
    );
  });

  it("rejects money without safe integer cents and fields outside document pages", async () => {
    const projected = projectFiscalNotificationVerticalSliceReviewV1(
      await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT)),
    );
    const invalidMoney = structuredClone(projected);
    const money = invalidMoney.documents[0]!.fields.find((field) => field.semantic === "MONEY")!;
    (money as { amountCents: number }).amountCents = 1.5;
    const invalidPage = structuredClone(projected);
    (
      invalidPage.documents[0]!.fields[0] as unknown as {
        sourcePageNumbers: number[];
      }
    ).sourcePageNumbers = [2];

    expect(() => parseFiscalNotificationVerticalSliceReviewV1(invalidMoney)).toThrow(
      FiscalNotificationVerticalSliceReviewErrorV1,
    );
    expect(() => parseFiscalNotificationVerticalSliceReviewV1(invalidPage)).toThrow(
      FiscalNotificationVerticalSliceReviewErrorV1,
    );
  });

  it("does not let a parsed output contaminate a later projection", async () => {
    const analysis = await analyzeFiscalNotificationVerticalSliceV1(document(PAYMENT));
    const first = structuredClone(projectFiscalNotificationVerticalSliceReviewV1(analysis));
    (
      first.documents[0]!.fields[0]! as unknown as { displayValue: string }
    ).displayValue = "ALTERADO";
    const second = projectFiscalNotificationVerticalSliceReviewV1(analysis);

    expect(second.documents[0]?.fields[0]?.displayValue).not.toBe("ALTERADO");
  });
});
