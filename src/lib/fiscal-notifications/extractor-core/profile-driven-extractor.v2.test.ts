import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  defineFamilyRecognitionRuleV2,
  type FamilyRecognitionRuleV2,
} from "./family-rule-contract.v2";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./family-rule-registry.v2";
import {
  PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2,
  PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2,
  PROFILE_DRIVEN_EXTRACTOR_VERSION_V2,
  extractProfileDrivenFamilyV2,
} from "./profile-driven-extractor.v2";

const OWNER_SCOPE = "user:synthetic-profile-runtime";

function document(
  lines: readonly string[],
  signal?: AbortSignal,
): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: "synthetic-document-v2",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: lines.join("\n"),
        isBlank: lines.every((line) => line.length === 0),
      }),
    ]),
    ...(signal ? { signal } : {}),
  });
}

function documentPages(pages: readonly (readonly string[])[]): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: "synthetic-multipage-document-v2",
    pages: Object.freeze(
      pages.map((lines, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text: lines.join("\n"),
          isBlank: lines.every((line) => line.length === 0),
        }),
      ),
    ),
  });
}

function firstAuthorityLiteral(
  rule: (typeof FISCAL_NOTIFICATION_FAMILY_RULES_V2)[number],
): string {
  return rule.allowedAuthorities[0].anchors[0].literals[0];
}

function withSyntheticRequirement(
  base: FamilyRecognitionRuleV2,
): FamilyRecognitionRuleV2 {
  return defineFamilyRecognitionRuleV2({
    familyId: base.familyId,
    extractorId: base.extractorId,
    ruleId: base.ruleId,
    canonicalTitle: base.canonicalTitle,
    titleAnchors: base.titleAnchors,
    requiredAnchors: Object.freeze([
      Object.freeze({
        anchorId: "SYNTHETIC_REQUIRED_GROUP",
        matchMode: "LINE_EXACT" as const,
        literals: Object.freeze(["Ancla sintética obligatoria"]),
      }),
    ]),
    allowedAuthorities: base.allowedAuthorities,
    conflicts: base.conflicts,
    sourceIds: base.sourceIds,
  });
}

function withSyntheticHostAuthority(
  base: FamilyRecognitionRuleV2,
): FamilyRecognitionRuleV2 {
  return defineFamilyRecognitionRuleV2({
    familyId: base.familyId,
    extractorId: base.extractorId,
    ruleId: base.ruleId,
    canonicalTitle: base.canonicalTitle,
    titleAnchors: base.titleAnchors,
    requiredAnchors: base.requiredAnchors,
    allowedAuthorities: Object.freeze([
      Object.freeze({
        authorityId: "AEAT_COMMON_TERRITORY" as const,
        anchors: Object.freeze([
          Object.freeze({
            anchorId: "SYNTHETIC_EXACT_HOST",
            matchMode: "HOST_EXACT" as const,
            literals: Object.freeze(["sede.agenciatributaria.gob.es"]),
          }),
        ]),
      }),
    ]),
    conflicts: base.conflicts,
    sourceIds: base.sourceIds,
  });
}

describe("profile-driven extractor v2", () => {
  it("recognizes every one of the 87 exact family rules without confirming the family", async () => {
    expect(FISCAL_NOTIFICATION_FAMILY_RULES_V2).toHaveLength(87);
    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      const result = await extractProfileDrivenFamilyV2({
        document: document([
          firstAuthorityLiteral(rule),
          rule.canonicalTitle,
          ...rule.requiredAnchors.map((anchor) => anchor.literals[0]),
        ]),
      });
      expect(result, rule.familyId).toMatchObject({
        extractorVersion: PROFILE_DRIVEN_EXTRACTOR_VERSION_V2,
        implementationId: PROFILE_DRIVEN_EXTRACTOR_IMPLEMENTATION_ID_V2,
        status: "REVIEW_REQUIRED",
        familyId: rule.familyId,
        ruleId: rule.ruleId,
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED",
        confirmsFamily: false,
        permitsAccountingAction: false,
      });
      expect(result.familyCandidates, rule.familyId).toHaveLength(1);
      expect(result.familyCandidates[0].matchedPageNumbers).toEqual([1]);
      expect(result.adaptedFields, rule.familyId).not.toBeNull();
    }
  });

  it("rejects a near-miss for every family rule without extracting fields", async () => {
    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      const result = await extractProfileDrivenFamilyV2({
        document: document([
          firstAuthorityLiteral(rule),
          `x ${rule.canonicalTitle}`,
        ]),
      });
      expect(result.status, rule.familyId).toBe("UNKNOWN");
      expect(result.familyId, rule.familyId).toBeNull();
      expect(result.fieldCandidates, rule.familyId).toEqual([]);
      expect(result.adaptedFields, rule.familyId).toBeNull();
    }
  });

  it("does not promote a body citation or a title outside the bounded header", async () => {
    const citation = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Providencia de apremio citada en el informe",
      ]),
    });
    const belowHeader = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        ...Array.from({ length: 40 }, (_, index) => `Línea informativa ${index + 1}`),
        "Providencia de apremio",
      ]),
    });

    expect(citation.status).toBe("UNKNOWN");
    expect(belowHeader.status).toBe("UNKNOWN");
  });

  it("keeps conflicting or multiple family matches ambiguous and empty", async () => {
    const first = FISCAL_NOTIFICATION_FAMILY_RULES_V2[3];
    const second = FISCAL_NOTIFICATION_FAMILY_RULES_V2[4];
    const ambiguous = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        first.canonicalTitle,
        second.canonicalTitle,
      ]),
    });
    expect(ambiguous.status).toBe("AMBIGUOUS");
    expect(ambiguous.familyCandidates.map(({ familyId }) => familyId)).toEqual([
      first.familyId,
      second.familyId,
    ]);
    expect(ambiguous.fieldCandidates).toEqual([]);
    expect(ambiguous.adaptedFields).toBeNull();

    for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      for (const conflict of [
        "Tesorería General de la Seguridad Social",
        "Hacienda foral",
        "Guía",
      ]) {
        const blocked = await extractProfileDrivenFamilyV2({
          document: document([
            firstAuthorityLiteral(rule),
            conflict,
            rule.canonicalTitle,
          ]),
        });
        expect(blocked.status, `${rule.familyId}:${conflict}`).toBe("BLOCKED");
        expect(blocked.familyId, `${rule.familyId}:${conflict}`).toBeNull();
        expect(blocked.fieldCandidates, `${rule.familyId}:${conflict}`).toEqual([]);
        expect(blocked.adaptedFields, `${rule.familyId}:${conflict}`).toBeNull();
      }
    }
  });

  it("keeps incomplete inputs unknown and empty", async () => {
    for (const base of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
      const required = withSyntheticRequirement(base);
      const missingRequired = await extractProfileDrivenFamilyV2({
        document: document([
          firstAuthorityLiteral(base),
          base.canonicalTitle,
        ]),
        rules: Object.freeze([required]),
      });
      expect(missingRequired.status, base.familyId).toBe("UNKNOWN");
      expect(missingRequired.issues, base.familyId).toContain("REQUIRED_ANCHORS_MISSING");
      expect(missingRequired.fieldCandidates, base.familyId).toEqual([]);

      const authorityRequired = withSyntheticHostAuthority(base);
      const missingAuthority = await extractProfileDrivenFamilyV2({
        document: document([base.canonicalTitle]),
        rules: Object.freeze([authorityRequired]),
      });
      expect(missingAuthority.status, base.familyId).toBe("UNKNOWN");
      expect(missingAuthority.issues, base.familyId).toContain("AUTHORITY_NOT_COMPATIBLE");
      expect(missingAuthority.fieldCandidates, base.familyId).toEqual([]);
    }
  });

  it("extracts only closed profile fields and fingerprints sensitive references", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Providencia de apremio",
        "Código seguro de verificación: ABCD1234EFGH5678",
        "Fecha de emisión: 16/07/2026",
        "Principal pendiente: 1.632,95 €",
        "Alcance del pago",
        "Órgano emisor",
        "NIF: 12345678Z",
        "Nombre: Persona Sintética",
      ]),
    });
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.familyId).toBe("collection.enforcement_order");
    expect(result.fieldCandidates).toHaveLength(5);
    expect(result.fieldCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "ISSUE_DATE",
          valueIso: "2026-07-16",
        }),
        expect.objectContaining({
          kind: "MONEY",
          fieldCode: "OUTSTANDING_PRINCIPAL",
          amountCents: 163_295,
          currency: "EUR",
        }),
        expect.objectContaining({
          kind: "FACT",
          fieldCode: "PAYMENT_SCOPE",
          observed: true,
        }),
        expect.objectContaining({
          kind: "PARTICIPANT_ROLE",
          fieldCode: "ISSUING_AUTHORITY",
          ordinal: 1,
        }),
        expect.objectContaining({
          kind: "REFERENCE",
          fieldCode: "CSV",
          normalizedValue: null,
          sensitiveReference: expect.objectContaining({
            storage: "FINGERPRINT_ONLY",
            referenceType: "CSV",
            fingerprintSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
          }),
        }),
      ]),
    );
    expect(result.adaptedFields?.fields).toHaveLength(5);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("ABCD1234EFGH5678");
    expect(serialized).not.toContain("12345678Z");
    expect(serialized).not.toContain("Persona Sintética");
    expect(serialized).not.toContain(OWNER_SCOPE);
  });

  it("reads closed labels followed by values without requiring a colon", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Liquidación independiente de intereses de demora",
        "Resumen — Número de expediente EXP20260716001",
        "Fecha de emisión 16/07/2026",
        "Detalle del cálculo — Intereses de demora 1.234,56 €",
        "Verificación — Código seguro de verificación ABCD1234EFGH5678",
      ]),
    });

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.interest_assessment",
    });
    expect(result.fieldCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "REFERENCE",
          fieldCode: "EXPEDIENTE_ID",
          normalizedValue: "EXP20260716001",
        }),
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "ISSUE_DATE",
          valueIso: "2026-07-16",
        }),
        expect.objectContaining({
          kind: "MONEY",
          fieldCode: "LATE_PAYMENT_INTEREST",
          amountCents: 123_456,
          currency: "EUR",
        }),
        expect.objectContaining({
          kind: "REFERENCE",
          fieldCode: "CSV",
          normalizedValue: null,
          sensitiveReference: expect.objectContaining({
            storage: "FINGERPRINT_ONLY",
          }),
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("ABCD1234EFGH5678");
  });

  it("extracts repeated dates and amounts from bounded PDF table coordinates", async () => {
    const rows = Object.freeze([
      Object.freeze({
        yMilli: 200_000,
        cells: Object.freeze([
          Object.freeze({
            xMilli: 300_000,
            widthMilli: 150_000,
            text: "Fecha desde - Fecha hasta",
          }),
          Object.freeze({
            xMilli: 680_000,
            widthMilli: 100_000,
            text: "Importe total intereses",
          }),
        ]),
      }),
      Object.freeze({
        yMilli: 150_000,
        cells: Object.freeze([
          Object.freeze({
            xMilli: 306_000,
            widthMilli: 150_000,
            text: "01/01/2026 - 31/03/2026",
          }),
          Object.freeze({
            xMilli: 760_000,
            widthMilli: 40_000,
            text: "29,91",
          }),
        ]),
      }),
    ]);
    const input: BoundedDocumentInput = Object.freeze({
      ownerScope: OWNER_SCOPE,
      documentId: "synthetic-interest-table-v2",
      pages: Object.freeze([
        Object.freeze({
          pageNumber: 1,
          text: [
            "Agencia Estatal de Administración Tributaria",
            "Liquidación independiente de intereses de demora",
            "Fecha desde - Fecha hasta",
            "Importe total intereses",
          ].join("\n"),
          isBlank: false,
          layoutRows: rows,
        }),
      ]),
    });

    const result = await extractProfileDrivenFamilyV2({ document: input });

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.interest_assessment",
    });
    expect(result.fieldCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "INTEREST_START_DATE",
          valueIso: "2026-01-01",
        }),
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "INTEREST_END_DATE",
          valueIso: "2026-03-31",
        }),
        expect.objectContaining({
          kind: "MONEY",
          fieldCode: "LATE_PAYMENT_INTEREST",
          amountCents: 2_991,
          currency: "EUR",
        }),
      ]),
    );
  });

  it("does not treat an unqualified integer as a monetary amount", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Providencia de apremio",
        "Principal pendiente: 15",
      ]),
    });

    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.fieldCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "MONEY", amountCents: 1_500 }),
      ]),
    );
  });

  it("does not turn a payment-receipt title or date into a receipt identifier", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Justificante de pago 16/07/2026",
        "Fecha de pago: 16/07/2026",
      ]),
    });

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "payment.receipt",
    });
    expect(result.fieldCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "REFERENCE",
          fieldCode: "PAYMENT_RECEIPT_ID",
        }),
      ]),
    );
    expect(result.fieldCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "PAYMENT_DATE",
          valueIso: "2026-07-16",
        }),
      ]),
    );
  });

  it("drops malformed closed-label references instead of throwing on a valid document", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Denegación de aplazamiento o fraccionamiento",
        "Número de expediente: EXP-SYN-DENIAL-PIPELINE",
        "Fecha de emisión: 16/07/2026",
      ]),
    });
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.familyId).toBe("collection.deferral_denial");
    expect(result.fieldCandidates).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "REFERENCE",
          fieldCode: "EXPEDIENTE_ID",
        }),
      ]),
    );
    expect(result.fieldCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "DATE",
          fieldCode: "ISSUE_DATE",
          valueIso: "2026-07-16",
        }),
      ]),
    );
  });

  it("keeps exact body anchors usable while title matching remains header-only", async () => {
    const base = FISCAL_NOTIFICATION_FAMILY_RULES_V2.find(
      ({ familyId }) => familyId === "collection.enforcement_order",
    );
    if (!base) throw new Error("missing synthetic rule fixture");
    const required = defineFamilyRecognitionRuleV2({
      familyId: base.familyId,
      extractorId: base.extractorId,
      ruleId: base.ruleId,
      canonicalTitle: base.canonicalTitle,
      titleAnchors: base.titleAnchors,
      requiredAnchors: Object.freeze([
        Object.freeze({
          anchorId: "SYNTHETIC_BODY_EXACT",
          matchMode: "LINE_EXACT" as const,
          literals: Object.freeze(["Ancla exacta en cuerpo"]),
        }),
      ]),
      allowedAuthorities: base.allowedAuthorities,
      conflicts: base.conflicts,
      sourceIds: base.sourceIds,
    });
    const bodyLines = Array.from({ length: 85 }, (_, index) =>
      index === 0
        ? "Agencia Estatal de Administración Tributaria"
        : index === 1
          ? base.canonicalTitle
          : index === 84
            ? "Ancla exacta en cuerpo"
            : `relleno sintético ${index}`,
    );
    const exact = await extractProfileDrivenFamilyV2({
      document: document(bodyLines),
      rules: Object.freeze([required]),
    });
    expect(exact.status).toBe("REVIEW_REQUIRED");

    const quotedTitle = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        ...Array.from({ length: 82 }, (_, index) => `relleno ${index}`),
        base.canonicalTitle,
        "Ancla exacta en cuerpo",
      ]),
      rules: Object.freeze([required]),
    });
    expect(quotedTitle.status).toBe("UNKNOWN");
  });

  it("recognizes an exact act after a cover page without treating body quotations as titles", async () => {
    const result = await extractProfileDrivenFamilyV2({
      document: documentPages([
        ["Carátula de copia electrónica", "Agencia Tributaria"],
        [
          "Agencia Estatal de Administración Tributaria",
          "Liquidación independiente de intereses de demora",
          "Fecha de emisión 16/07/2026",
        ],
      ]),
    });

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "collection.interest_assessment",
    });
    expect(result.familyCandidates[0]?.matchedPageNumbers).toEqual([1, 2]);

    const quotedOnlyInLongBody = await extractProfileDrivenFamilyV2({
      document: documentPages([
        ["Agencia Estatal de Administración Tributaria"],
        [
          ...Array.from({ length: 81 }, (_, index) => `cuerpo ${index}`),
          "Liquidación independiente de intereses de demora",
        ],
      ]),
    });
    expect(quotedOnlyInLongBody.status).toBe("UNKNOWN");
  });

  it("does not mutate inputs and returns defensive immutable outcomes", async () => {
    const source = document([
      "Agencia Estatal de Administración Tributaria",
      "Providencia de apremio",
    ]);
    const before = JSON.stringify(source);
    const first = await extractProfileDrivenFamilyV2({ document: source });
    const second = await extractProfileDrivenFamilyV2({ document: source });
    expect(JSON.stringify(source)).toBe(before);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.familyCandidates)).toBe(true);
    expect(Object.isFrozen(first.familyCandidates[0])).toBe(true);
    expect(Object.isFrozen(first.familyCandidates[0].matchedPageNumbers)).toBe(true);
    expect(Object.isFrozen(first.fieldCandidates)).toBe(true);
    expect(Object.isFrozen(first.printedEffects)).toBe(true);
    expect(Object.isFrozen(first.adaptedFields)).toBe(true);
  });

  it("detects only closed compatible printed effects for a variable-result family", async () => {
    const granted = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Acuerdo sobre la suspensión solicitada",
        "Suspensión concedida en relación con el acto identificado",
      ]),
    });

    expect(granted).toMatchObject({
      status: "REVIEW_REQUIRED",
      familyId: "review.suspension_decision",
      printedEffects: [
        {
          effectCode: "SUSPENSION_GRANTED",
          pageNumbers: [1],
          detectionBasis: "CLOSED_PRINTED_PHRASE",
        },
      ],
    });
    expect(granted.adaptedFields?.printedEffects).toEqual(
      granted.printedEffects,
    );
    expect(JSON.stringify(granted)).not.toContain(
      "en relación con el acto identificado",
    );

    const incompatible = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Acuerdo sobre la suspensión solicitada",
        "Compensación total",
      ]),
    });
    expect(incompatible.printedEffects).toEqual([]);
  });

  it.each([
    ["collection.offset_requested", "Solicitud de compensación presentada", "OFFSET_REQUESTED"],
    ["collection.offset_ex_officio", "Compensación de oficio", "OFFSET_EX_OFFICIO"],
    ["collection.offset_resolution", "Compensación total", "OFFSET_TOTAL"],
    ["collection.offset_resolution", "Compensación parcial", "OFFSET_PARTIAL"],
    ["collection.offset_resolution", "Compensación denegada", "OFFSET_DENIED"],
    ["collection.offset_resolution", "Queda un saldo pendiente tras la compensación", "OFFSET_RESIDUAL"],
    ["collection.offset_resolution", "Deuda totalmente extinguida", "EXTINCTION_CONFIRMED"],
    ["refund.undue_payment", "Devolución reconocida", "REFUND_RECOGNIZED"],
    ["refund.undue_payment", "Devolución pagada", "REFUND_PAYMENT_CONFIRMED"],
    ["review.suspension_decision", "Suspensión concedida", "SUSPENSION_GRANTED"],
    ["review.suspension_decision", "Suspensión denegada", "SUSPENSION_DENIED"],
    ["review.third_party_claim", "Recurso presentado", "APPEAL_FILED"],
    ["review.third_party_claim", "Recurso resuelto", "REVIEW_RESOLVED"],
    ["review.material_error", "Revisión solicitada", "REVIEW_REQUESTED"],
    ["review.material_error", "Error material rectificado", "ACT_CORRECTED"],
    ["review.revocation", "El acto queda sin efecto", "ACT_CANCELLED"],
    ["liability.solidary", "Responsabilidad propuesta", "LIABILITY_PROPOSED"],
    ["liability.solidary", "Responsabilidad declarada", "LIABILITY_DECLARED"],
  ] as const)(
    "recognizes the closed %s printed result %s",
    async (familyId, printedLine, expectedEffect) => {
      const rule = FISCAL_NOTIFICATION_FAMILY_RULES_V2.find(
        (candidate) => candidate.familyId === familyId,
      );
      if (!rule) throw new Error("missing variable-effect family fixture");
      const result = await extractProfileDrivenFamilyV2({
        document: document([
          firstAuthorityLiteral(rule),
          rule.canonicalTitle,
          printedLine,
        ]),
      });
      expect(
        result.printedEffects.map(({ effectCode }) => effectCode),
      ).toContain(expectedEffect);
    },
  );

  it("does not turn a negated phrase into an affirmative effect and preserves conflicts for review", async () => {
    const negative = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Acuerdo sobre la suspensión solicitada",
        "No se concede la suspensión solicitada",
      ]),
    });
    expect(negative.printedEffects).toEqual([]);

    const conflicting = await extractProfileDrivenFamilyV2({
      document: document([
        "Agencia Estatal de Administración Tributaria",
        "Acuerdo sobre la suspensión solicitada",
        "Suspensión concedida",
        "Suspensión denegada",
      ]),
    });
    expect(conflicting.status).toBe("REVIEW_REQUIRED");
    expect(conflicting.printedEffects.map(({ effectCode }) => effectCode)).toEqual([
      "SUSPENSION_GRANTED",
      "SUSPENSION_DENIED",
    ]);
    expect(conflicting.confirmsObligation).toBe(false);
    expect(conflicting.confirmsDebt).toBe(false);
  });

  it("enforces rule, line and line-size limits before unbounded work", async () => {
    await expect(
      extractProfileDrivenFamilyV2({
        document: document(["x"]),
        rules: Object.freeze(
          Array.from(
            { length: PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxRules + 1 },
            () => FISCAL_NOTIFICATION_FAMILY_RULES_V2[0],
          ),
        ),
      }),
    ).rejects.toMatchObject({ code: "COLLECTION_LIMIT_EXCEEDED", path: "rules" });

    await expect(
      extractProfileDrivenFamilyV2({
        document: document(["x".repeat(PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxLineChars + 1)]),
      }),
    ).rejects.toMatchObject({ code: "TEXT_TOO_LARGE" });

    await expect(
      extractProfileDrivenFamilyV2({
        document: document(
          Array.from(
            { length: PROFILE_DRIVEN_EXTRACTOR_LIMITS_V2.maxLines + 1 },
            () => "x",
          ),
        ),
      }),
    ).rejects.toMatchObject({ code: "COLLECTION_LIMIT_EXCEEDED" });
  });

  it("honours cancellation without returning partial fields", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      extractProfileDrivenFamilyV2({
        document: document([
          "Agencia Estatal de Administración Tributaria",
          "Providencia de apremio",
        ], controller.signal),
      }),
    ).rejects.toMatchObject({ code: "ABORTED", path: "signal" });
  });
});
