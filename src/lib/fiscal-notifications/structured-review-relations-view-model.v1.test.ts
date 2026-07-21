import { describe, expect, it } from "vitest";
import {
  appendStructuredReviewRelationSuggestionsV1,
  STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
  STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
  STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
} from "./structured-review-relation-suggestions.v1";
import { projectStructuredReviewRelationsV1 } from "./structured-review-relations-view-model.v1";
import {
  FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
  FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
} from "./relation-explanation.v2";
import type { FiscalNotificationsWorkspace } from "./types";
import { FISCAL_NOTIFICATIONS_PROJECTED_RELATION_ALGORITHM_VERSION_V2 } from "./persisted-workspace.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000093";
const NOW = "2026-07-14T11:30:00.000Z";

function workspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: OWNER,
    revision: 2,
    createdAt: NOW,
    updatedAt: NOW,
    packages: [0, 1].map((index) => ({
      id: `package:${index}`,
      ownerScope: OWNER,
      fileIds: [`file:${index}`],
      sourceChannel: "MANUAL_UPLOAD" as const,
      processingStatus: "NEEDS_REVIEW" as const,
      securityScanStatus: "NOT_AVAILABLE" as const,
      uploadedAt: NOW,
    })),
    files: [0, 1].map((index) => ({
      id: `file:${index}`,
      packageId: `package:${index}`,
      ownerScope: OWNER,
      role: "PRIMARY" as const,
      mimeType: "application/pdf",
      fileSize: 2_048,
      pageCount: 2,
      sha256: (index + 3).toString().repeat(64),
      contentFingerprint: (index + 3).toString().repeat(64),
      sourceContentRetention: "NOT_RETAINED" as const,
      uploadedAt: NOW,
    })),
    documents: [0, 1].map((index) => ({
      id: `document:${index}`,
      packageId: `package:${index}`,
      fileId: `file:${index}`,
      ownerScope: OWNER,
      documentType: "AEAT_ENFORCEMENT_ORDER" as const,
      titleRaw: `Providencia de apremio ${index + 1}`,
      titleNormalized: `PROVIDENCIA DE APREMIO ${index + 1}`,
      authorityId: "authority:aeat",
      notificationDates: {},
      status: "UNKNOWN" as const,
      urgency: "REVIEW" as const,
      extractionVersion: "synthetic-v1",
      analysisStatus: "NEEDS_REVIEW" as const,
      humanReviewStatus: "PENDING" as const,
      authenticityStatus: "NOT_CHECKED" as const,
      partIds: [],
      referenceIds: [
        `reference:liquidation:${index}`,
        `reference:csv:${index}`,
      ],
      debtIds: [],
      caseIds: [],
      analysisSnapshotIds: [],
      createdAt: `2026-07-14T11:${index}0:00.000Z`,
      updatedAt: NOW,
    })),
    parts: [],
    authorities: [
      {
        id: "authority:aeat",
        ownerScope: OWNER,
        administrationType: "AEAT",
        nameRaw: "Agencia Estatal de Administración Tributaria",
        nameNormalized: "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
        officialDomain: "sede.agenciatributaria.gob.es",
      },
    ],
    references: [
      reference(0, "LIQUIDATION_KEY", "LQ-SYNTH-093"),
      reference(0, "CSV", "CSV SYNTH 093"),
      reference(1, "LIQUIDATION_KEY", "LQ-SYNTH-093"),
      reference(1, "CSV", "CSV-SYNTH-093"),
    ],
    evidence: [
      evidence(0, "liquidation"),
      evidence(0, "csv"),
      evidence(1, "liquidation"),
      evidence(1, "csv"),
    ],
    debts: [],
    debtObservations: [],
    cases: [],
    relations: [],
    analysisSnapshots: [],
    paymentOptions: [],
    paymentPlans: [],
    installments: [],
    interestCalculations: [],
    deadlineRules: [],
    obligations: [],
    timeline: [],
    accountingDrafts: [],
    auditEvents: [],
  };
}

function reference(
  documentIndex: number,
  type: "LIQUIDATION_KEY" | "CSV",
  rawValue: string,
) {
  const suffix = type === "CSV" ? "csv" : "liquidation";
  return {
    id: `reference:${suffix}:${documentIndex}`,
    ownerScope: OWNER,
    referenceType: type,
    rawValue,
    normalizedValue: type === "CSV" ? "CSV-SYNTH-093" : "LQ-SYNTH-093",
    issuer: "AEAT",
    scope: "DOCUMENT" as const,
    documentId: `document:${documentIndex}`,
    isPrimary: type === "LIQUIDATION_KEY",
    confidence: "EXACT" as const,
    confirmationStatus: "PENDING" as const,
    extractionMethod: "RULE" as const,
    occurrenceIds: [`evidence:${suffix}:${documentIndex}`],
    createdAt: NOW,
  };
}

function evidence(documentIndex: number, suffix: "liquidation" | "csv") {
  return {
    id: `evidence:${suffix}:${documentIndex}`,
    ownerScope: OWNER,
    documentId: `document:${documentIndex}`,
    pageNumber: 1,
    textSnippet:
      suffix === "csv"
        ? "Código Seguro de Verificación"
        : "Clave de liquidación",
    extractionMethod: "RULE" as const,
    confidence: "EXACT" as const,
    assertionType: "EXPLICIT_IN_DOCUMENT" as const,
  };
}

describe("structured review relations view model v1", () => {
  it("shows the matching values and both documents without exposing hashes", () => {
    const source = workspace();
    const derived = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: source,
      createdAt: NOW,
    });
    expect(derived.status).toBe("APPLIED");

    const result = projectStructuredReviewRelationsV1(derived.workspace, OWNER);

    expect(result).toEqual({
      status: "READY",
      timelines: [],
      entries: [
        expect.objectContaining({
          title: "Documentos relacionados por referencia",
          statusLabel: "Relación detectada · revisar",
          requiresHumanReview: true,
          documents: [
            expect.objectContaining({
              id: "document:0",
              title: "Providencia de apremio 1",
            }),
            expect.objectContaining({
              id: "document:1",
              title: "Providencia de apremio 2",
            }),
          ],
          matches: [
            {
              referenceType: "LIQUIDATION_KEY",
              label: "Clave de liquidación",
              value: "LQ-SYNTH-093",
              issuer: "AEAT",
              matchMode: "EXACT_PRINTED",
              sourcePageNumbers: [1],
              targetPageNumbers: [1],
            },
            {
              referenceType: "CSV",
              label: "Código Seguro de Verificación (CSV)",
              value: "Referencia protegida",
              issuer: "AEAT",
              matchMode: "NORMALIZED_FORMAT",
              sourcePageNumbers: [1],
              targetPageNumbers: [1],
            },
          ],
        }),
      ],
    });
    const serialized = JSON.stringify(result);
    expect(result.entries[0]?.explanation).toBe(
      FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
    );
    expect(serialized).not.toContain("3".repeat(64));
    expect(serialized).not.toContain("4".repeat(64));
    expect(serialized).not.toContain("CSV-SYNTH-093");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.entries)).toBe(true);
  });

  it("never exposes a fingerprinted bank reference collapsed into the legacy payment-reference type", () => {
    const source = workspace();
    const protectedFingerprint = "a".repeat(64);
    for (const reference of source.references.filter(({ id }) =>
      id.includes(":csv:"),
    )) {
      reference.referenceType = "PAYMENT_JUSTIFICANTE";
      reference.rawValue = protectedFingerprint;
      reference.normalizedValue = protectedFingerprint;
    }
    const derived = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: source,
      createdAt: NOW,
    });

    const result = projectStructuredReviewRelationsV1(derived.workspace, OWNER);

    expect(result.status).toBe("READY");
    expect(result.entries[0]?.matches).toEqual(
      expect.arrayContaining([
        {
          referenceType: "PAYMENT_JUSTIFICANTE",
          label: "Referencia bancaria",
          value: "Referencia protegida",
          issuer: "AEAT",
          matchMode: "NORMALIZED_FORMAT",
          sourcePageNumbers: [1],
          targetPageNumbers: [1],
        },
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(protectedFingerprint);
  });

  it("projects a non-seizure declared chain with a prudent V2 explanation and timeline", () => {
    const source = workspace();
    source.documents[0]!.documentType = "GENERIC_ADMINISTRATIVE_NOTICE";
    source.documents[0]!.documentSubtype =
      "collection.deferral_request_receipt";
    source.documents[0]!.titleRaw = "Solicitud de aplazamiento";
    source.documents[1]!.documentType = "AEAT_INSTALLMENT_OR_DEFERRAL_GRANT";
    source.documents[1]!.documentSubtype = "collection.deferral_grant";
    source.documents[1]!.titleRaw = "Concesión de aplazamiento";

    const derived = appendStructuredReviewRelationSuggestionsV1({
      ownerScope: OWNER,
      workspace: source,
      createdAt: NOW,
    });
    expect(derived.status).toBe("APPLIED");
    expect(derived.workspace.relations[0]).toMatchObject({
      relationType: "CREATES_PAYMENT_PLAN_FOR",
      algorithmVersion: STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
      evidence: { chainId: "deferral_chain" },
    });

    const result = projectStructuredReviewRelationsV1(derived.workspace, OWNER);

    expect(result.status).toBe("READY");
    expect(result.entries).toEqual([
      expect.objectContaining({
        chainId: "deferral_chain",
        algorithmVersion: STRUCTURED_REVIEW_DOCUMENT_CHAIN_ALGORITHM_VERSION_V2,
        relationType: "CREATES_PAYMENT_PLAN_FOR",
        title:
          "Solicitud, subsanación, resolución, modificación e incumplimiento de aplazamiento",
        statusLabel: "Referencia exacta · revisar efectos",
        explanation: FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
      }),
    ]);
    expect(result.entries[0]?.explanation).toBe(
      FISCAL_NOTIFICATION_EXACT_LINK_NEUTRAL_PHRASE_V2,
    );
    expect(result.entries[0]?.explanation).not.toContain(
      "Este acuerdo concede un calendario",
    );
    expect(result.timelines).toEqual([
      expect.objectContaining({
        key: "timeline:document:0:document:1",
        links: [
          expect.objectContaining({
            earlierDocumentId: "document:0",
            laterDocumentId: "document:1",
            label: "Vínculo documental exacto",
          }),
        ],
      }),
    ]);
  });

  it.each([
    [
      "ENFORCES",
      "Embargo vinculado a providencia de apremio",
      "ni modifica ningún saldo",
      "Ejecución mediante embargo",
    ],
    [
      "RESPONDS_TO_SEIZURE",
      "Contestación vinculada a diligencia de embargo",
      "no convierte al tercero en deudor",
      "Contestación a la diligencia",
    ],
    [
      "TRANSFERS_SEIZED_FUNDS",
      "Ingreso de tercero vinculado a diligencia de embargo",
      "no marca automáticamente la deuda como pagada",
      "Ingreso del tercero retenedor",
    ],
    [
      "RELEASES_SEIZURE",
      "Levantamiento vinculado a diligencia de embargo",
      "no se infiere automáticamente",
      "Levantamiento de la diligencia",
    ],
  ] as const)(
    "explains the exact %s edge without applying an operational effect",
    (relationType, title, explanationFragment, linkLabel) => {
      const source = workspace();
      source.relations.push({
        id: `relation:typed:${relationType}`,
        ownerScope: OWNER,
        sourceDocumentId: "document:1",
        targetDocumentId: "document:0",
        relationType,
        confidenceBand: "EXACT",
        score: 100,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [
            "No cambia saldos, estados, pagos, deudas, plazos ni asientos.",
          ],
        },
        algorithmVersion: STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
        status: "SYSTEM_CONFIRMED_EXACT",
        createdAt: NOW,
      });

      const result = projectStructuredReviewRelationsV1(source, OWNER);

      expect(result.status).toBe("READY");
      expect(result.entries).toEqual([
        expect.objectContaining({
          relationType,
          title,
          statusLabel: "Referencia exacta · revisar efectos",
          explanation: expect.stringContaining(explanationFragment),
          requiresHumanReview: true,
        }),
      ]);
      expect(result.timelines).toEqual([
        {
          key: "timeline:document:0:document:1",
          title: "Expediente relacionado · 2 documentos",
          statusLabel: "Referencias exactas · efectos por revisar",
          steps: [
            {
              id: "document:0",
              title: "Providencia de apremio 1",
              createdAt: "2026-07-14T11:00:00.000Z",
              position: 1,
            },
            {
              id: "document:1",
              title: "Providencia de apremio 2",
              createdAt: "2026-07-14T11:10:00.000Z",
              position: 2,
            },
          ],
          links: [
            expect.objectContaining({
              key: `relation:typed:${relationType}`,
              earlierDocumentId: "document:0",
              laterDocumentId: "document:1",
              label: linkLabel,
              explanation: expect.stringContaining(explanationFragment),
            }),
          ],
          requiresHumanReview: true,
        },
      ]);
      expect(Object.isFrozen(result.timelines)).toBe(true);
      expect(Object.isFrozen(result.timelines[0]?.steps)).toBe(true);
    },
  );

  it("keeps an exact relation projected by an earlier persisted workspace", () => {
    const source = workspace();
    source.relations.push({
      id: "relation:projected:enforces",
      ownerScope: OWNER,
      sourceDocumentId: "document:1",
      targetDocumentId: "document:0",
      relationType: "ENFORCES",
      confidenceBand: "EXACT",
      score: 100,
      evidence: {
        matchingReferenceTypes: ["LIQUIDATION_KEY"],
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [],
      },
      algorithmVersion:
        FISCAL_NOTIFICATIONS_PROJECTED_RELATION_ALGORITHM_VERSION_V2,
      status: "SYSTEM_CONFIRMED_EXACT",
      createdAt: NOW,
    });

    const result = projectStructuredReviewRelationsV1(source, OWNER);

    expect(result.status).toBe("READY");
    expect(result.entries).toEqual([
      expect.objectContaining({
        key: "relation:projected:enforces",
        relationType: "ENFORCES",
        title: "Embargo vinculado a providencia de apremio",
        matches: [
          expect.objectContaining({
            label: "Clave de liquidación",
            value: "LQ-SYNTH-093",
          }),
        ],
      }),
    ]);
    expect(result.timelines).toHaveLength(1);
    expect(result.timelines[0]?.steps).toHaveLength(2);
  });

  it("downgrades an exact relation supported only by a fiscal year", () => {
    const source = workspace();
    for (const reference of source.references.filter(({ id }) =>
      id.includes(":liquidation:"),
    )) {
      reference.referenceType = "TAX_EXERCISE";
      reference.rawValue = "2025";
      reference.normalizedValue = "2025";
    }
    source.relations.push({
      id: "relation:weak-year",
      ownerScope: OWNER,
      sourceDocumentId: "document:0",
      targetDocumentId: "document:1",
      relationType: "ENFORCES",
      confidenceBand: "EXACT",
      score: 100,
      evidence: {
        matchingReferenceTypes: ["TAX_EXERCISE"],
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [],
      },
      algorithmVersion: STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
      status: "SYSTEM_CONFIRMED_EXACT",
      createdAt: NOW,
    });

    const result = projectStructuredReviewRelationsV1(source, OWNER);

    expect(result.status).toBe("READY");
    expect(result.entries).toEqual([
      expect.objectContaining({
        key: "relation:weak-year",
        relationStatus: "SUGGESTED",
        statusLabel: "Relación detectada · revisar",
        explanation: FISCAL_NOTIFICATION_SUGGESTED_RELATION_PHRASE_V2,
        matches: [
          expect.objectContaining({
            label: "Ejercicio fiscal",
            value: "2025",
          }),
        ],
      }),
    ]);
    expect(result.timelines).toEqual([]);
  });

  it("blocks a contradictory exact cycle instead of inventing a chronology", () => {
    const source = workspace();
    source.relations.push(
      {
        id: "relation:cycle:forward",
        ownerScope: OWNER,
        sourceDocumentId: "document:1",
        targetDocumentId: "document:0",
        relationType: "ENFORCES",
        confidenceBand: "EXACT",
        score: 100,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [],
        },
        algorithmVersion: STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
        status: "SYSTEM_CONFIRMED_EXACT",
        createdAt: NOW,
      },
      {
        id: "relation:cycle:reverse",
        ownerScope: OWNER,
        sourceDocumentId: "document:0",
        targetDocumentId: "document:1",
        relationType: "ENFORCES",
        confidenceBand: "EXACT",
        score: 100,
        evidence: {
          matchingReferenceTypes: ["LIQUIDATION_KEY"],
          matchingAmountTypes: [],
          matchingDates: [],
          differences: [],
        },
        algorithmVersion: STRUCTURED_REVIEW_TYPED_RELATION_ALGORITHM_VERSION_V1,
        status: "SYSTEM_CONFIRMED_EXACT",
        createdAt: NOW,
      },
    );

    expect(projectStructuredReviewRelationsV1(source, OWNER)).toEqual({
      status: "BLOCKED",
      entries: [],
      timelines: [],
    });
  });

  it("blocks another owner and hides rejected or unrelated algorithms", () => {
    const source = workspace();
    source.relations.push({
      id: "relation:other",
      ownerScope: OWNER,
      sourceDocumentId: "document:0",
      targetDocumentId: "document:1",
      relationType: "POSSIBLY_RELATED",
      confidenceBand: "LOW",
      score: 1,
      evidence: {
        matchingReferenceTypes: ["LIQUIDATION_KEY"],
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [],
      },
      algorithmVersion: "another-algorithm/1.0.0",
      status: "SUGGESTED",
      createdAt: NOW,
    });
    expect(projectStructuredReviewRelationsV1(source, OWNER)).toEqual({
      status: "READY",
      entries: [],
      timelines: [],
    });
    expect(
      projectStructuredReviewRelationsV1(
        source,
        "user:00000000-0000-4000-8000-000000000099",
      ),
    ).toEqual({ status: "BLOCKED", entries: [], timelines: [] });
  });

  it("does not revive a relation rejected by the user", () => {
    const source = workspace();
    source.relations.push({
      id: "relation:rejected",
      ownerScope: OWNER,
      sourceDocumentId: "document:0",
      targetDocumentId: "document:1",
      relationType: "POSSIBLY_RELATED",
      confidenceBand: "HIGH",
      score: 100,
      evidence: {
        matchingReferenceTypes: ["LIQUIDATION_KEY"],
        matchingAmountTypes: [],
        matchingDates: [],
        differences: [],
      },
      algorithmVersion: STRUCTURED_REVIEW_RELATION_ALGORITHM_VERSION_V1,
      status: "USER_REJECTED",
      createdAt: NOW,
      confirmedAt: NOW,
      confirmedBy: "actor:synthetic",
    });
    expect(projectStructuredReviewRelationsV1(source, OWNER)).toEqual({
      status: "READY",
      entries: [],
      timelines: [],
    });
  });
});
