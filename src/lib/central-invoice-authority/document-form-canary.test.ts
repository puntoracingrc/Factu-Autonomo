import { describe, expect, it } from "vitest";

import { DEFAULT_PROFILE, type Document } from "@/lib/types";

import {
  CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
  CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
  CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY,
  buildCentralInvoiceAuthorityDocumentFormIssueRequest,
  buildCentralInvoiceAuthorityRectificationFormIssueRequest,
  deriveCentralInvoiceAuthorityInvoiceSeries,
  deriveCentralInvoiceAuthorityRectificationSeries,
  resolveCentralInvoiceAuthorityRectificationTarget,
  shouldUseCentralInvoiceAuthorityDocumentFormCanary,
  shouldUseCentralInvoiceAuthorityRectificationFormCanary,
  type CentralInvoiceAuthorityDocumentFormPayload,
  type CentralInvoiceAuthorityRectificationFormPayload,
} from "./document-form-canary";

function payload(
  overrides: Partial<CentralInvoiceAuthorityDocumentFormPayload> = {},
): CentralInvoiceAuthorityDocumentFormPayload {
  return {
    type: "factura",
    date: "2026-07-27",
    client: {
      name: "Cliente de prueba",
      nif: "12345678Z",
      address: "Calle Prueba 1",
      postalCode: "08001",
      city: "Barcelona",
    },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    ...overrides,
  };
}

function centralOriginal(overrides: Partial<Document> = {}): Document {
  return {
    id: "original-central-1",
    type: "factura",
    number: "F-2026-0007",
    date: "2026-07-20",
    client: {
      name: "Cliente original",
      nif: "12345678Z",
      address: "Calle Original 1",
      postalCode: "08001",
      city: "Barcelona",
    },
    items: [
      {
        id: "line-original",
        description: "Servicio original",
        quantity: 1,
        unitPrice: 120,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    centralInvoiceAuthority: {
      schemaVersion: 1,
      source: "central_invoice_authority",
      serverDocumentId: "server-doc-original-1",
      identityId: "identity-original-1",
      outboxEventId: "event-original-1",
      eventType: "invoice_issued",
      fullNumber: "F-2026-0007",
      sequence: 7,
      documentVersion: 2,
      receivedAt: "2026-07-20T10:00:00.000Z",
    },
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

function rectificationPayload(
  overrides: Partial<CentralInvoiceAuthorityRectificationFormPayload> = {},
): CentralInvoiceAuthorityRectificationFormPayload {
  return {
    type: "factura",
    date: "2026-07-27",
    client: {
      name: "Cliente de prueba",
      nif: "12345678Z",
      address: "Calle Prueba 1",
      postalCode: "08001",
      city: "Barcelona",
    },
    items: [
      {
        id: "line-rectification",
        description: "Correccion",
        quantity: 1,
        unitPrice: -20,
        ivaPercent: 21,
      },
    ],
    status: "enviado",
    rectification: {
      originalDocumentId: "original-central-1",
      originalNumber: "F-2026-0007",
      originalDate: "2026-07-20",
      reason: "Correccion de importe",
      type: "correccion",
    },
    ...overrides,
  };
}

describe("central invoice authority document form canary", () => {
  it("se limita a facturas nuevas emitidas sin rectificacion", () => {
    expect(
      shouldUseCentralInvoiceAuthorityDocumentFormCanary({
        type: "factura",
        existing: null,
        payload: payload(),
        resolvedStatus: "enviado",
      }),
    ).toBe(true);
    expect(
      shouldUseCentralInvoiceAuthorityDocumentFormCanary({
        type: "factura",
        existing: null,
        payload: payload({ status: "borrador" }),
        resolvedStatus: "borrador",
      }),
    ).toBe(false);
    expect(
      shouldUseCentralInvoiceAuthorityDocumentFormCanary({
        type: "recibo",
        existing: null,
        payload: payload({ type: "recibo" }),
        resolvedStatus: "pagado",
      }),
    ).toBe(false);
    expect(
      shouldUseCentralInvoiceAuthorityDocumentFormCanary({
        type: "factura",
        existing: { id: "existing" } as Pick<Document, "id">,
        payload: payload(),
        resolvedStatus: "enviado",
      }),
    ).toBe(false);
    expect(
      shouldUseCentralInvoiceAuthorityDocumentFormCanary({
        type: "factura",
        existing: null,
        payload: payload({
          rectification: {
            originalDocumentId: "original",
            originalNumber: "F-2026-0001",
            originalDate: "2026-07-20",
            reason: "Correccion",
            type: "correccion",
          },
        }),
        resolvedStatus: "enviado",
      }),
    ).toBe(false);
  });

  it("deriva serie compatible con la RPC desde el perfil y la fecha", () => {
    expect(
      deriveCentralInvoiceAuthorityInvoiceSeries({
        profile: {
          ...DEFAULT_PROFILE,
          nif: " b12345678 ",
          verifactu: { enabled: true, environment: "production" },
        },
        date: "2026-07-27",
      }),
    ).toEqual({
      environment: "production",
      issuerNif: "B12345678",
      seriesCode: "F-2026",
      fiscalYear: 2026,
    });

    expect(
      deriveCentralInvoiceAuthorityRectificationSeries({
        profile: {
          ...DEFAULT_PROFILE,
          nif: " b12345678 ",
          numbering: {
            ...DEFAULT_PROFILE.numbering,
            formats: {
              ...DEFAULT_PROFILE.numbering.formats,
              factura_rectificativa: {
                template: "RECT-{year}-{num}",
                padding: 5,
              },
            },
          },
        },
        date: "2026-07-27",
      }),
    ).toEqual({
      environment: "test",
      issuerNif: "B12345678",
      seriesCode: "RECT-2026",
      fiscalYear: 2026,
    });
  });

  it("construye una peticion estable sin usuario ni token derivados en cliente", () => {
    const request = buildCentralInvoiceAuthorityDocumentFormIssueRequest({
      localDocumentId: "doc-local-1",
      payload: payload(),
      profile: { ...DEFAULT_PROFILE, nif: "B12345678" },
      issuedAt: "2026-07-27T12:00:00.000Z",
    });

    expect(request).toMatchObject({
      kind: "invoice",
      idempotencyKey: "FORM_CANARY:doc-local-1",
      draft: {
        localDocumentId: "doc-local-1",
        expectedVersion: 0,
        draftCreatedAt: "2026-07-27T12:00:00.000Z",
      },
      series: {
        environment: "test",
        issuerNif: "B12345678",
        seriesCode: "F-2026",
        fiscalYear: 2026,
      },
      issuedAt: "2026-07-27T12:00:00.000Z",
    });
    expect(request.draft.draftHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(request.emittedHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(request)).toContain(
      CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY,
    );
    expect(JSON.stringify(request)).toContain(
      CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
    );
    expect(JSON.stringify(request)).not.toContain("access-token");
    expect(JSON.stringify(request)).not.toContain("device-token");
  });

  it("solo acepta rectificar una factura original con identidad central coherente", () => {
    expect(
      resolveCentralInvoiceAuthorityRectificationTarget(centralOriginal()),
    ).toEqual({
      originalDocumentId: "original-central-1",
      originalIdentityId: "identity-original-1",
      originalFullNumber: "F-2026-0007",
      originalDocumentVersion: 2,
    });

    expect(
      resolveCentralInvoiceAuthorityRectificationTarget(
        centralOriginal({ centralInvoiceAuthority: undefined }),
      ),
    ).toBeNull();
    expect(
      resolveCentralInvoiceAuthorityRectificationTarget(
        centralOriginal({ number: "F-2026-9999" }),
      ),
    ).toBeNull();
    expect(
      resolveCentralInvoiceAuthorityRectificationTarget(
        centralOriginal({
          rectification: {
            originalDocumentId: "other",
            originalNumber: "F-2026-0001",
            originalDate: "2026-07-01",
            reason: "No es original",
            type: "correccion",
          },
        }),
      ),
    ).toBeNull();
    expect(
      resolveCentralInvoiceAuthorityRectificationTarget(
        centralOriginal({
          centralInvoiceAuthority: {
            ...centralOriginal().centralInvoiceAuthority!,
            eventType: "rectification_issued",
          },
        }),
      ),
    ).toBeNull();
  });

  it("solo intercepta rectificativas emitidas de una original central", () => {
    expect(
      shouldUseCentralInvoiceAuthorityRectificationFormCanary({
        original: centralOriginal(),
        payload: rectificationPayload(),
        resolvedStatus: "enviado",
      }),
    ).toBe(true);
    expect(
      shouldUseCentralInvoiceAuthorityRectificationFormCanary({
        original: centralOriginal(),
        payload: rectificationPayload({ status: "borrador" }),
        resolvedStatus: "borrador",
      }),
    ).toBe(false);
    expect(
      shouldUseCentralInvoiceAuthorityRectificationFormCanary({
        original: centralOriginal({ centralInvoiceAuthority: undefined }),
        payload: rectificationPayload(),
        resolvedStatus: "enviado",
      }),
    ).toBe(false);
    expect(
      shouldUseCentralInvoiceAuthorityRectificationFormCanary({
        original: centralOriginal(),
        payload: rectificationPayload({
          rectification: {
            ...rectificationPayload().rectification,
            originalDocumentId: "another-original",
          },
        }),
        resolvedStatus: "enviado",
      }),
    ).toBe(false);
  });

  it("construye una rectificativa central enlazada a la identidad tecnica original", () => {
    const request = buildCentralInvoiceAuthorityRectificationFormIssueRequest({
      localDocumentId: "rect-local-1",
      payload: rectificationPayload(),
      original: centralOriginal(),
      profile: { ...DEFAULT_PROFILE, nif: "B12345678" },
      issuedAt: "2026-07-27T12:30:00.000Z",
    });

    expect(request).toMatchObject({
      kind: "rectification",
      idempotencyKey: "FORM_CANARY_RECTIFICATION:rect-local-1",
      rectifiesIdentityId: "identity-original-1",
      draft: {
        localDocumentId: "rect-local-1",
        expectedVersion: 0,
        draftCreatedAt: "2026-07-27T12:30:00.000Z",
      },
      series: {
        environment: "test",
        issuerNif: "B12345678",
        seriesCode: "FR-2026",
        fiscalYear: 2026,
      },
      issuedAt: "2026-07-27T12:30:00.000Z",
    });
    expect(request.draft.draftHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(request.emittedHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(request)).toContain(
      CENTRAL_INVOICE_AUTHORITY_RECTIFICATION_FORM_CANARY,
    );
    expect(JSON.stringify(request)).toContain(
      CENTRAL_INVOICE_AUTHORITY_PENDING_NUMBER,
    );
    expect(JSON.stringify(request)).toContain("identity-original-1");
    expect(JSON.stringify(request)).not.toContain("access-token");
    expect(JSON.stringify(request)).not.toContain("device-token");
  });

  it("falla cerrado si la rectificativa no puede enlazarse a una identidad central", () => {
    expect(() =>
      buildCentralInvoiceAuthorityRectificationFormIssueRequest({
        localDocumentId: "rect-local-1",
        payload: rectificationPayload(),
        original: centralOriginal({ centralInvoiceAuthority: undefined }),
        profile: { ...DEFAULT_PROFILE, nif: "B12345678" },
        issuedAt: "2026-07-27T12:30:00.000Z",
      }),
    ).toThrow(/identidad central/);
  });

  it("falla cerrado si la referencia local no coincide con la identidad original", () => {
    expect(() =>
      buildCentralInvoiceAuthorityRectificationFormIssueRequest({
        localDocumentId: "rect-local-1",
        payload: rectificationPayload({
          rectification: {
            ...rectificationPayload().rectification,
            originalNumber: "F-2026-9999",
          },
        }),
        original: centralOriginal(),
        profile: { ...DEFAULT_PROFILE, nif: "B12345678" },
        issuedAt: "2026-07-27T12:30:00.000Z",
      }),
    ).toThrow(/coincide/);
  });
});
