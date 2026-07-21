import { describe, expect, it } from "vitest";
import {
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
  parseFiscalNotificationLibraryAiAuditInputV1,
  parseFiscalNotificationLibraryAiAuditResultV1,
  projectFiscalNotificationLibraryAiAuditInputV1,
} from "./library-ai-audit.v1";
import type { FiscalNotificationDocumentLibraryViewModelV1 } from "./structured-review-document-library.v1";

function readyLibrary(): FiscalNotificationDocumentLibraryViewModelV1 {
  const first = {
    key: "document:one",
    authority: "Agencia Estatal de Administración Tributaria",
    documentDate: "2026-01-10",
    documentDateBasis: "Fecha de emisión",
    pageCount: 2,
    reviewStatus: "PENDING",
    subjectName: "PERSONA PRIVADA",
    references: [{ label: "Número de expediente", value: "EXP-PRIVADA-001" }],
    orderedFacts: [
      {
        key: "fact:reference:one",
        semantic: "REFERENCE",
        label: "Número de expediente",
        value: "EXP-PRIVADA-001",
        pageNumber: 1,
        sourceReference: null,
      },
      {
        key: "fact:date:one",
        semantic: "DATE",
        label: "Fecha de emisión",
        value: "10/01/2026",
        pageNumber: 1,
        sourceReference: null,
      },
      {
        key: "fact:party:one",
        semantic: "PARTY",
        label: "Obligado tributario",
        value: "PERSONA PRIVADA 12345678Z",
        pageNumber: 1,
        sourceReference: null,
      },
      {
        key: "fact:obligation:one",
        semantic: "OBLIGATION",
        label: "Obligación impresa",
        value:
          "PERSONA PRIVADA debe responder por los créditos del deudor. Contacto: privada@example.test.",
        pageNumber: 2,
        sourceReference: null,
      },
    ],
    money: [
      {
        label: "Principal pendiente",
        amountCents: 14_955,
        currency: "EUR",
        pageNumbers: [2],
        sourceReference: "EXP-PRIVADA-001",
      },
    ],
    installments: [
      {
        key: "installment:one",
        label: "Cuota 1",
        amountCents: 14_955,
        dueDate: "2026-02-20",
        dueDatePageNumbers: [2],
        totalPageNumbers: [2],
        components: [
          { label: "Principal", amountCents: 12_000, pageNumbers: [2] },
          { label: "Intereses", amountCents: 2_955, pageNumbers: [2] },
        ],
        pageNumbers: [2],
      },
    ],
    amountReconciliation: {
      schemaVersion: 1,
      reconciliationVersion: "1.0.0",
      status: "MATCHED",
      passCount: 2,
      automaticPassLimit: 2,
      toleranceCents: 1,
      equations: [
        {
          equationId: "installment:1",
          formula: "INSTALLMENT_COMPONENTS_EQUAL_INSTALLMENT_TOTAL",
          scope: "INSTALLMENT",
          status: "MATCHED",
          toleranceCents: 1,
          leftCents: 14_955,
          rightCents: 14_955,
          differenceCents: 0,
          operands: [],
          result: {
            role: "TOTAL",
            sign: 1,
            amountCents: 14_955,
            fieldIds: ["synthetic:total"],
            sourcePageNumbers: [2],
          },
          sourcePageNumbers: [2],
        },
      ],
      discardedCandidates: [
        {
          fieldId: "synthetic:identifier",
          amountCents: 4_640_245_700,
          reason: "TAX_IDENTIFIER_REPEATED_CONTEXT",
          reclassifiedAs: "TAX_IDENTIFIER",
          sourcePageNumbers: [1, 2],
        },
      ],
      installments: [],
      totals: null,
      confidenceEffect: "RAISED_FOR_MATCHED_FIELDS",
      requiresManualReview: false,
      numericMutationPolicy: "NEVER_CHANGE_EXTRACTED_VALUES",
    },
    mathematicalIntegrity: {
      schemaVersion: 11,
      integrityVersion: "11.0.0",
      catalogReleaseId: "aeat-mathematical-integrity.2026-07-21.v11",
      familyId: "collection.enforcement_order",
      archetypeId: "ENFORCEMENT_SCENARIOS",
      validationMode: "ARITHMETIC_AND_LOGICAL",
      status: "VALIDATED_EXACT",
      passCount: 2,
      automaticPassLimit: 2,
      normalizedEvidence: [
        {
          evidenceId: "math-v11:synthetic-amount",
          sourceFieldFingerprint: `sha256:${"c".repeat(64)}`,
          semantic: "MONEY",
          canonicalType: "DOCUMENT_TOTAL",
          originalClassification: "TOTAL_CLAIMED",
          amountCents: 14_955,
          dateValue: null,
          countValue: null,
          sign: "POSITIVE",
          currency: "EUR",
          sourcePart: "MAIN_ADMINISTRATIVE_ACT",
          pageNumbers: [2],
          assertionType: "NORMALIZED",
          originalConfidence: 0.99,
        },
      ],
      checks: [
        {
          ruleId: "v11:enforcement-scenarios:arithmetic:1",
          checkKind: "ARITHMETIC",
          status: "VALIDATED_EXACT",
          operands: [{ evidenceId: "math-v11:synthetic-amount" }],
          expectedCents: 14_955,
          observedCents: 14_955,
          deltaCents: 0,
          toleranceCents: 0,
          calculation: {
            kind: "LINEAR_EQUALITY",
            resultEvidenceId: "math-v11:synthetic-amount",
            terms: [
              {
                evidenceId: "math-v11:synthetic-amount",
                sign: 1,
              },
            ],
          },
          safeMessage: "Los importes cuadran con las cifras impresas.",
        },
      ],
      hardFailureCodes: [],
      persistenceDecision: "ALLOW_CORE",
      relationSupport: {
        existingRelationsOnly: true,
        requiresStrongIdentifier: true,
        permitsAmountOnlyRelations: false,
        validatedEvidenceIds: [],
      },
      originalExtractionMutationPolicy: "NEVER_MUTATE_OR_REPLACE",
      retainedSourceContent: "NONE",
    },
    explanation: {
      whatItIs: "Una providencia inicia la vía ejecutiva.",
      whyReceived:
        "La ficha llega a PERSONA PRIVADA en Calle Mayor 12, por una actuación frente al deudor. Teléfono: 612 345 678.",
      result: "El resultado debe contrastarse con los datos impresos.",
      nextStep: {
        title: "Revisa la ficha",
        detail: "Comprueba referencias, fechas e importes.",
      },
      deadline: {
        title: "Comprueba el plazo",
        detail: "Usa únicamente la fecha de notificación efectiva.",
      },
      officialSources: [
        {
          authority: "BOE",
          title: "Ley 58/2003, General Tributaria",
        },
      ],
    },
  };
  const second = {
    ...first,
    key: "document:two",
    documentDate: "2026-02-12",
    references: [{ label: "Número de expediente", value: "EXP-PRIVADA-001" }],
    orderedFacts: [
      {
        key: "fact:reference:two",
        semantic: "REFERENCE",
        label: "Número de expediente",
        value: "EXP-PRIVADA-001",
        pageNumber: 1,
        sourceReference: null,
      },
    ],
    money: [],
    installments: [],
    amountReconciliation: null,
    mathematicalIntegrity: null,
  };
  const link = {
    key: "relation:one-two",
    relationType: "ENFORCES",
    fromDocumentId: "document:one",
    fromDocumentTitle: "Providencia sintética",
    toDocumentId: "document:two",
    toDocumentTitle: "Diligencia sintética",
    label: "Continúa el expediente",
    explanation: "Coincidencia por el expediente EXP-PRIVADA-001.",
    matches: [
      {
        label: "Número de expediente",
        value: "EXP-PRIVADA-001",
        issuer: "AEAT",
        matchMode: "EXACT_PRINTED",
        sourcePageNumbers: [1],
        targetPageNumbers: [1],
      },
    ],
    relationStatus: "SYSTEM_CONFIRMED_EXACT",
    visualStatus: "CONFIRMED",
    visualStatusLabel: "Confirmada por referencia exacta",
    statusLabel: "Referencia exacta · revisar efectos",
    directionSource: "DOMAIN_RELATION",
  };

  return {
    status: "READY",
    documents: [first, second],
    groups: [
      {
        key: "group:one",
        documents: [first, second],
        summaries: [
          {
            key: "document:one",
            familyLabel: "Providencia de apremio",
            typeLabel: "Acto ejecutivo",
          },
          {
            key: "document:two",
            familyLabel: "Diligencia de embargo",
            typeLabel: "Acto de embargo",
          },
        ],
        links: [link],
      },
    ],
    filterOptions: {
      families: [],
      authorities: [],
      years: [],
      periods: [],
    },
  } as unknown as FiscalNotificationDocumentLibraryViewModelV1;
}

function validResult(documentCount: number, relationCount: number) {
  return {
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    summary: "Revisión completada sin aplicar cambios.",
    documentsReviewed: documentCount,
    relationsReviewed: relationCount,
    findings: [
      {
        id: "finding-1",
        severity: "MEDIUM",
        scope: "RELATION",
        category: "RELATION_EVIDENCE",
        documentAliases: ["DOC-001", "DOC-002"],
        relationAliases: ["REL-001"],
        title: "Revisar la dirección de la relación",
        detail: "Las dos fichas comparten REF-001 en la página indicada.",
        recommendation: "Contrastar el acto anterior y posterior.",
        evidence: [{ label: "Coincidencia", value: "REF-001", pages: [1] }],
      },
    ],
  };
}

describe("library AI audit v1", () => {
  it("seudonimiza documentos, referencias y relaciones sin enviar PII ni nombres de archivo", () => {
    const result = projectFiscalNotificationLibraryAiAuditInputV1(
      readyLibrary(),
      [
        {
          key: "upload:one",
          fileName: "nombre-privado.pdf",
          documentIds: ["document:one", "document:two"],
        },
      ],
    );
    const serialized = JSON.stringify(result);

    expect(result.documents.map((document) => document.alias)).toEqual([
      "DOC-001",
      "DOC-002",
    ]);
    expect(result.documents[0]?.facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "REFERENCE",
          value: "REF-001",
          page: 1,
        }),
        expect.objectContaining({ kind: "DATE", value: "10/01/2026" }),
      ]),
    );
    expect(result.documents[0]?.amounts[0]).toMatchObject({
      amountCents: 14_955,
      sourceReferenceAlias: "REF-001",
      pages: [2],
    });
    expect(result.documents[0]?.installments).toEqual([
      expect.objectContaining({
        label: "Cuota 1",
        dueDate: "2026-02-20",
        amountCents: 14_955,
        components: [
          { label: "Principal", amountCents: 12_000, pages: [2] },
          { label: "Intereses", amountCents: 2_955, pages: [2] },
        ],
      }),
    ]);
    expect(result.documents[0]?.arithmeticReview).toEqual({
      status: "MATCHED",
      requiresManualReview: false,
      passCount: 2,
      automaticPassLimit: 2,
      equations: [
        {
          description:
            "Principal, intereses y recargo de la cuota suman el total de la cuota.",
          status: "MATCHED",
          leftCents: 14_955,
          rightCents: 14_955,
          differenceCents: 0,
          pages: [2],
        },
      ],
      discardedCandidates: [
        {
          reason: "La cifra se repite en contexto de identificador fiscal.",
          reclassifiedAs: "Identificador fiscal",
          pages: [1, 2],
        },
      ],
    });
    expect(JSON.stringify(result.documents[0]?.arithmeticReview)).not.toContain(
      "4640245700",
    );
    expect(result.documents[0]?.integrityReview).toEqual({
      status: "VALIDATED_EXACT",
      persistenceDecision: "ALLOW_CORE",
      existingRelationsOnly: true,
      requiresStrongIdentifier: true,
      permitsAmountOnlyRelations: false,
      checks: [
        {
          kind: "ARITHMETIC",
          status: "VALIDATED_EXACT",
          message: "Los importes cuadran con las cifras impresas.",
          expectedCents: 14_955,
          observedCents: 14_955,
          deltaCents: 0,
          toleranceCents: 0,
          calculation: {
            kind: "LINEAR_EQUALITY",
            expression: "DOCUMENT_TOTAL = DOCUMENT_TOTAL",
            operator: "EQUALS",
            rateBasisPoints: null,
          },
          pages: [2],
          sourceParts: ["MAIN_ADMINISTRATIVE_ACT"],
          evidence: [
            {
              semantic: "MONEY",
              canonicalType: "DOCUMENT_TOTAL",
              amountCents: 14_955,
              dateValue: null,
              countValue: null,
              pages: [2],
              sourcePart: "MAIN_ADMINISTRATIVE_ACT",
            },
          ],
        },
      ],
    });
    expect(result.documents[0]).toMatchObject({
      sourceFileAliases: ["FILE-001"],
      references: [
        {
          label: "Número de expediente",
          referenceAlias: "REF-001",
          pages: [1],
        },
      ],
      facts: expect.arrayContaining([
        expect.objectContaining({ kind: "PARTY", value: "PARTY-002" }),
        expect.objectContaining({
          kind: "OBLIGATION",
          value:
            "PARTY-001 debe responder por los créditos del deudor. Contacto: correo seudonimizado.",
        }),
      ]),
      explanation: expect.objectContaining({
        whatItIs: "Una providencia inicia la vía ejecutiva.",
        whyReceived:
          "La ficha llega a PARTY-001 en dirección seudonimizada, por una actuación frente al deudor. dato personal seudonimizado.",
      }),
      officialSources: [
        { authority: "BOE", title: "Ley 58/2003, General Tributaria" },
      ],
    });
    expect(result.relations).toEqual([
      expect.objectContaining({
        alias: "REL-001",
        sourceDocumentAlias: "DOC-001",
        targetDocumentAlias: "DOC-002",
        explanation: "Coincidencia por el expediente REF-001.",
        matches: [
          expect.objectContaining({
            referenceAlias: "REF-001",
            sourcePages: [1],
            targetPages: [1],
          }),
        ],
      }),
    ]);
    expect(serialized).not.toMatch(
      /EXP-PRIVADA-001|PERSONA PRIVADA|12345678Z|nombre-privado\.pdf|privada@example\.test|Calle Mayor|612 345 678/iu,
    );
    expect(parseFiscalNotificationLibraryAiAuditInputV1(result)).toEqual(
      result,
    );
  });

  it("rechaza tokens internos y relaciones con alias de documentos inexistentes", () => {
    const projected =
      projectFiscalNotificationLibraryAiAuditInputV1(readyLibrary());
    expect(
      parseFiscalNotificationLibraryAiAuditInputV1({
        ...projected,
        documents: [
          { ...projected.documents[0], type: "EXACT_TITLE_AND_AUTHORITY" },
        ],
      }),
    ).toBeNull();
    expect(
      parseFiscalNotificationLibraryAiAuditInputV1({
        ...projected,
        relations: [
          { ...projected.relations[0], targetDocumentAlias: "DOC-999" },
        ],
      }),
    ).toBeNull();
    expect(
      parseFiscalNotificationLibraryAiAuditInputV1({
        ...projected,
        documents: projected.documents.map((document, index) =>
          index === 0
            ? {
                ...document,
                integrityReview: document.integrityReview
                  ? {
                      ...document.integrityReview,
                      checks: document.integrityReview.checks.map(
                        (check, checkIndex) =>
                          checkIndex === 0
                            ? {
                                ...check,
                                evidence: check.evidence.map(
                                  (evidence, evidenceIndex) =>
                                    evidenceIndex === 0
                                      ? {
                                          ...evidence,
                                          canonicalType:
                                            "EXACT_TITLE_AND_AUTHORITY",
                                        }
                                      : evidence,
                                ),
                              }
                            : check,
                      ),
                    }
                  : null,
              }
            : document,
        ),
      }),
    ).toBeNull();
    expect(
      parseFiscalNotificationLibraryAiAuditInputV1({
        ...projected,
        documents: projected.documents.map((document, index) =>
          index === 0
            ? {
                ...document,
                facts: [
                  ...document.facts,
                  {
                    kind: "DETAIL",
                    label: "Contacto observado",
                    value: "privada@example.test",
                    page: 1,
                  },
                ],
              }
            : document,
        ),
      }),
    ).toBeNull();
    expect(
      parseFiscalNotificationLibraryAiAuditInputV1({
        ...projected,
        documents: projected.documents.map((document, index) =>
          index === 0 && document.arithmeticReview
            ? {
                ...document,
                arithmeticReview: {
                  ...document.arithmeticReview,
                  discardedCandidates:
                    document.arithmeticReview.discardedCandidates.map(
                      (candidate, candidateIndex) =>
                        candidateIndex === 0
                          ? {
                              ...candidate,
                              reason: "Candidato descartado 46402457",
                            }
                          : candidate,
                    ),
                },
              }
            : document,
        ),
      }),
    ).toBeNull();
  });

  it("valida conteos, alias y lenguaje limpio en los hallazgos del proveedor", () => {
    const input =
      projectFiscalNotificationLibraryAiAuditInputV1(readyLibrary());
    expect(
      parseFiscalNotificationLibraryAiAuditResultV1(
        validResult(input.documents.length, input.relations.length),
        input,
      ),
    ).toMatchObject({ findings: [{ id: "finding-1" }] });
    expect(
      parseFiscalNotificationLibraryAiAuditResultV1(
        {
          ...validResult(input.documents.length, input.relations.length),
          findings: [
            {
              ...validResult(input.documents.length, input.relations.length)
                .findings[0],
              documentAliases: ["DOC-999"],
            },
          ],
        },
        input,
      ),
    ).toBeNull();
    expect(
      parseFiscalNotificationLibraryAiAuditResultV1(
        {
          ...validResult(input.documents.length, input.relations.length),
          summary: "EXPLANATION:internal.summary",
        },
        input,
      ),
    ).toBeNull();
  });

  it("acepta una revisión completa sin hallazgos", () => {
    const input =
      projectFiscalNotificationLibraryAiAuditInputV1(readyLibrary());
    expect(
      parseFiscalNotificationLibraryAiAuditResultV1(
        {
          ...validResult(input.documents.length, input.relations.length),
          summary: "No se han detectado incoherencias en los datos enviados.",
          findings: [],
        },
        input,
      ),
    ).toMatchObject({ findings: [] });
  });
});
