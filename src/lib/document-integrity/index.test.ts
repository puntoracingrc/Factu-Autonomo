import { describe, expect, it } from "vitest";
import {
  acceptQuote,
  applyGenericDocumentUpdate,
  assertDocumentEditable,
  deriveDocumentLifecycle,
  deriveIntegrityLock,
  DocumentIntegrityError,
  issueDocument,
  markDocumentPaid,
  markDocumentSent,
} from ".";
import type { BusinessProfile, Document, IssuerSnapshot } from "../types";

const NOW = "2026-06-24T10:00:00.000Z";

const issuer: IssuerSnapshot = {
  name: "Punto Racing RC",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  city: "Barcelona",
  postalCode: "08001",
  phone: "600000000",
  email: "hola@example.com",
  iban: "ES0000000000000000000000",
  logoUrl: "logo.png",
  capturedAt: "2026-06-01T10:00:00.000Z",
};

const profile: BusinessProfile = {
  name: issuer.name,
  nif: issuer.nif,
  address: issuer.address,
  city: issuer.city,
  postalCode: issuer.postalCode,
  phone: issuer.phone ?? "",
  email: issuer.email ?? "",
  iban: issuer.iban,
  logoUrl: issuer.logoUrl,
  iva: { rates: [0, 4, 10, 21], defaultRate: 21 },
  numbering: {
    year: 2026,
    lastSequence: {
      factura: 7,
      factura_rectificativa: 0,
      presupuesto: 2,
      recibo: 0,
    },
    formats: {
      factura: { template: "F-{year}-{num}", padding: 4 },
      factura_rectificativa: { template: "FR-{year}-{num}", padding: 4 },
      presupuesto: { template: "P-{year}-{num}", padding: 4 },
      recibo: { template: "R-{year}-{num}", padding: 4 },
    },
  },
};

function doc(overrides: Partial<Document> = {}): Document {
  return {
    id: "doc-1",
    type: "factura",
    number: "F-2026-0007",
    date: "2026-06-24",
    dueDate: "2026-07-24",
    client: {
      firstName: "Ana",
      lastName: "García",
      name: "Ana García",
      nif: "11111111H",
      email: "ana@example.com",
      phone: "600111222",
      address: "Calle Cliente 2, 08002 Barcelona",
    },
    items: [
      {
        id: "line-1",
        description: "Servicio técnico",
        quantity: 2,
        unit: "h",
        unitPrice: 50,
        ivaPercent: 21,
      },
    ],
    issuer,
    notes: "Notas visibles",
    paymentTerms: "Transferencia",
    rectification: undefined,
    verifactu: {
      recordHash: "hash",
      previousHash: "",
      recordTimestamp: "2026-06-24T09:00:00.000Z",
      qrUrl: "https://example.com/qr",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
      tipoFactura: "F1",
      cuotaTotal: "21.00",
      importeTotal: "121.00",
    },
    status: "borrador",
    createdAt: "2026-06-24T09:00:00.000Z",
    updatedAt: "2026-06-24T09:00:00.000Z",
    ...overrides,
  };
}

function protectedContent(document: Document) {
  return {
    id: document.id,
    type: document.type,
    number: document.number,
    date: document.date,
    dueDate: document.dueDate,
    client: document.client,
    items: document.items,
    issuer: document.issuer,
    notes: document.notes,
    paymentTerms: document.paymentTerms,
    rectification: document.rectification,
    rectifiedById: document.rectifiedById,
    verifactu: document.verifactu,
    sourceDocumentId: document.sourceDocumentId,
    receiptDocumentId: document.receiptDocumentId,
  };
}

function expectIntegrityError(
  action: () => unknown,
  code: DocumentIntegrityError["code"],
) {
  expect(action).toThrow(DocumentIntegrityError);
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(DocumentIntegrityError);
    expect((error as DocumentIntegrityError).code).toBe(code);
  }
}

describe("document integrity domain", () => {
  it("permite editar un borrador desbloqueado", () => {
    const draft = doc();
    expect(() => assertDocumentEditable(draft)).not.toThrow();

    const updated = applyGenericDocumentUpdate(
      draft,
      { ...draft, notes: "Nueva nota" },
      NOW,
    );

    expect(updated.notes).toBe("Nueva nota");
    expect(updated.documentLifecycle).toBe("draft");
    expect(updated.integrityLock).toBe("unlocked");
  });

  it("bloquea documentos legacy no borrador", () => {
    const legacy = doc({ status: "enviado" });

    expect(deriveDocumentLifecycle(legacy)).toBe("issued");
    expect(deriveIntegrityLock(legacy)).toBe("locked");
    expectIntegrityError(
      () => assertDocumentEditable(legacy),
      "DOCUMENT_LOCKED",
    );
  });

  it("integrityLock desbloqueado no desbloquea un legacy emitido", () => {
    const manipulated = doc({
      status: "enviado",
      integrityLock: "unlocked",
      documentLifecycle: "draft",
    });

    expect(deriveDocumentLifecycle(manipulated)).toBe("issued");
    expect(deriveIntegrityLock(manipulated)).toBe("locked");
  });

  it("prevalece el estado más restrictivo en contradicciones explícitas", () => {
    const statusIssuedButUnlocked = doc({
      status: "enviado",
      integrityLock: "unlocked",
    });
    const lifecycleIssuedButDraftStatus = doc({
      status: "borrador",
      documentLifecycle: "issued",
    });
    const canceled = doc({
      status: "borrador",
      documentLifecycle: "canceled",
    });
    const lockedDraft = doc({
      status: "borrador",
      documentLifecycle: "draft",
      integrityLock: "locked",
    });
    const legacyWithoutNewFields = doc({ status: "pagado" });

    for (const current of [
      statusIssuedButUnlocked,
      lifecycleIssuedButDraftStatus,
      canceled,
      lockedDraft,
      legacyWithoutNewFields,
    ]) {
      expect(deriveIntegrityLock(current)).toBe("locked");
      expectIntegrityError(
        () => assertDocumentEditable(current),
        "DOCUMENT_LOCKED",
      );
    }
  });

  it("rechaza volver issued a draft mediante payload nuevo", () => {
    const current = doc({
      status: "borrador",
      documentLifecycle: "issued",
      integrityLock: "locked",
    });
    const payload = {
      ...current,
      documentLifecycle: "draft" as const,
      integrityLock: "unlocked" as const,
    };

    expectIntegrityError(
      () => applyGenericDocumentUpdate(current, payload),
      "DOCUMENT_LOCKED",
    );
  });

  it("issueDocument no muta el objeto recibido", () => {
    const draft = doc();
    const before = structuredClone(draft);

    issueDocument(draft, profile, NOW);

    expect(draft).toEqual(before);
  });

  it("issueDocument bloquea y conserva número y contenido", () => {
    const draft = doc();
    const before = protectedContent(draft);

    const issued = issueDocument(draft, profile, NOW);

    expect(issued.number).toBe("F-2026-0007");
    expect(protectedContent(issued)).toEqual(before);
    expect(issued.status).toBe("enviado");
    expect(issued.documentLifecycle).toBe("issued");
    expect(issued.integrityLock).toBe("locked");
    expect(issued.deliveryStatus).toBe("not_sent");
    expect(issued.issuedAt).toBe(NOW);
  });

  it("issueDocument captura issuer solo si falta", () => {
    const withoutIssuer = doc({ issuer: undefined });

    const issued = issueDocument(withoutIssuer, profile, NOW);
    const alreadyHadIssuer = issueDocument(doc(), profile, NOW);

    expect(issued.issuer).toMatchObject({
      name: profile.name,
      nif: profile.nif,
      address: profile.address,
    });
    expect(alreadyHadIssuer.issuer).toEqual(issuer);
  });

  it("issueDocument no renumera", () => {
    const issued = issueDocument(doc({ number: "F-2026-0099" }), profile, NOW);

    expect(issued.number).toBe("F-2026-0099");
  });

  it("issueDocument rechaza una segunda emisión", () => {
    const issued = issueDocument(doc(), profile, NOW);

    expectIntegrityError(
      () => issueDocument(issued, profile, NOW),
      "DOCUMENT_ALREADY_ISSUED",
    );
  });

  it("rechaza updateDocument genérico de un emitido", () => {
    const issued = issueDocument(doc(), profile, NOW);

    expectIntegrityError(
      () => applyGenericDocumentUpdate(issued, { ...issued, notes: "tocada" }),
      "DOCUMENT_LOCKED",
    );
  });

  it("rechaza volver un emitido a borrador mediante payload manipulado", () => {
    const issued = issueDocument(doc(), profile, NOW);

    expectIntegrityError(
      () =>
        applyGenericDocumentUpdate(issued, {
          ...issued,
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
        }),
      "DOCUMENT_LOCKED",
    );
  });

  it("rechaza que una edición genérica de borrador lo emita", () => {
    const draft = doc();

    expectIntegrityError(
      () => applyGenericDocumentUpdate(draft, { ...draft, status: "enviado" }),
      "GENERIC_UPDATE_WOULD_LOCK_DOCUMENT",
    );
  });

  it("marcar enviado no modifica contenido protegido", () => {
    const issued = issueDocument(doc(), profile, NOW);
    const before = protectedContent(issued);

    const sent = markDocumentSent(issued, "2026-06-24T10:05:00.000Z");

    expect(protectedContent(sent)).toEqual(before);
    expect(sent.deliveryStatus).toBe("sent");
    expect(sent.sentAt).toBe("2026-06-24T10:05:00.000Z");
  });

  it("marcar enviado dos veces es estable e idempotente", () => {
    const issued = issueDocument(doc(), profile, NOW);
    const first = markDocumentSent(issued, "2026-06-24T10:05:00.000Z");
    const second = markDocumentSent(first, "2026-06-24T10:10:00.000Z");

    expect(protectedContent(second)).toEqual(protectedContent(first));
    expect(second.deliveryStatus).toBe("sent");
    expect(second.sentAt).toBe(first.sentAt);
  });

  it("marcar pagado no modifica contenido protegido", () => {
    const issued = issueDocument(doc(), profile, NOW);
    const before = protectedContent(issued);

    const paid = markDocumentPaid(issued, "2026-06-24T10:10:00.000Z");

    expect(protectedContent(paid)).toEqual(before);
    expect(paid.status).toBe("pagado");
    expect(paid.paymentStatus).toBe("paid");
    expect(paid.paidAt).toBe("2026-06-24T10:10:00.000Z");
  });

  it("marcar pagado dos veces es estable e idempotente", () => {
    const issued = issueDocument(doc(), profile, NOW);
    const first = markDocumentPaid(issued, "2026-06-24T10:10:00.000Z");
    const second = markDocumentPaid(first, "2026-06-24T10:20:00.000Z");

    expect(protectedContent(second)).toEqual(protectedContent(first));
    expect(second.paymentStatus).toBe("paid");
    expect(second.paidAt).toBe(first.paidAt);
  });

  it("aceptar presupuesto no modifica contenido protegido", () => {
    const draftQuote = doc({
      type: "presupuesto",
      number: "P-2026-0002",
      verifactu: undefined,
    });
    const issuedQuote = issueDocument(draftQuote, profile, NOW);
    const before = protectedContent(issuedQuote);

    const accepted = acceptQuote(issuedQuote, "2026-06-24T10:15:00.000Z");

    expect(protectedContent(accepted)).toEqual(before);
    expect(accepted.status).toBe("aceptado");
    expect(accepted.acceptanceStatus).toBe("accepted");
    expect(accepted.acceptedAt).toBe("2026-06-24T10:15:00.000Z");
  });

  it("aceptar presupuesto dos veces es estable e idempotente", () => {
    const issuedQuote = issueDocument(
      doc({
        type: "presupuesto",
        number: "P-2026-0002",
        verifactu: undefined,
      }),
      profile,
      NOW,
    );
    const first = acceptQuote(issuedQuote, "2026-06-24T10:15:00.000Z");
    const second = acceptQuote(first, "2026-06-24T10:30:00.000Z");

    expect(protectedContent(second)).toEqual(protectedContent(first));
    expect(second.acceptanceStatus).toBe("accepted");
    expect(second.acceptedAt).toBe(first.acceptedAt);
  });
});
