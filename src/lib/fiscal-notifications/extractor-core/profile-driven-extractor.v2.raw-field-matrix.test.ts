import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  AEAT_DOCUMENT_PROFILES_V1,
  type AeatDocumentProfileV1,
} from "../knowledge/aeat-document-knowledge.v1";
import { FISCAL_NOTIFICATION_FAMILY_RULES_V2 } from "./family-rule-registry.v2";
import {
  PROFILE_FIELD_LABELS_V2,
  type ProfileFieldLabelV2,
} from "./profile-field-labels.v2";
import { extractProfileDrivenFamilyV2 } from "./profile-driven-extractor.v2";

const OWNER_SCOPE = "user:synthetic-raw-field-matrix";

function profileCodes(
  profile: AeatDocumentProfileV1,
  field: ProfileFieldLabelV2,
): readonly string[] {
  switch (field.kind) {
    case "REFERENCE":
      return profile.mustExtract.references;
    case "DATE":
      return profile.mustExtract.dates;
    case "MONEY":
      return profile.mustExtract.money;
    case "FACT":
      return profile.mustExtract.facts;
    case "PARTICIPANT_ROLE":
      return profile.mustExtract.participantRoles;
  }
}

function profileFor(field: ProfileFieldLabelV2): AeatDocumentProfileV1 {
  const profile = AEAT_DOCUMENT_PROFILES_V1.find((candidate) =>
    profileCodes(candidate, field).includes(field.fieldCode),
  );
  if (!profile) throw new Error(`missing synthetic profile for ${field.kind}:${field.fieldCode}`);
  return profile;
}

function printedValue(field: ProfileFieldLabelV2, index: number): string | null {
  switch (field.kind) {
    case "REFERENCE":
      if (field.fieldCode === "MODEL") return "303";
      if (field.fieldCode === "FISCAL_YEAR") return "2026";
      if (field.fieldCode === "TAX_PERIOD") return "4T";
      return `SYN-${field.fieldCode}-${String(index + 1).padStart(3, "0")}-2026`;
    case "DATE":
      return "16/07/2026";
    case "MONEY":
      return "1.234,56 €";
    case "FACT":
    case "PARTICIPANT_ROLE":
      return null;
  }
}

function document(profile: AeatDocumentProfileV1, fieldLine: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER_SCOPE,
    documentId: `synthetic-${profile.id.replaceAll(".", "-")}`,
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: [
          "Agencia Estatal de Administración Tributaria",
          "Gobierno de España",
          profile.nameEs,
          fieldLine,
        ].join("\n"),
        isBlank: false,
      }),
    ]),
  });
}

function ruleFor(profile: AeatDocumentProfileV1) {
  const rule = FISCAL_NOTIFICATION_FAMILY_RULES_V2.find(
    ({ familyId }) => familyId === profile.id,
  );
  if (!rule) throw new Error(`missing production rule for ${profile.id}`);
  return rule;
}

describe("profile-driven extractor v2 raw-text field matrix", () => {
  it("passes all 128 closed fields through the real text parser", async () => {
    expect(PROFILE_FIELD_LABELS_V2).toHaveLength(128);

    for (const [index, field] of PROFILE_FIELD_LABELS_V2.entries()) {
      const profile = profileFor(field);
      const value = printedValue(field, index);
      const line = value === null ? field.labelEs : `${field.labelEs}: ${value}`;
      const result = await extractProfileDrivenFamilyV2({
        document: document(profile, line),
        rules: Object.freeze([ruleFor(profile)]),
      });

      expect(result.status, `${profile.id}:${field.kind}:${field.fieldCode}`).toBe(
        "REVIEW_REQUIRED",
      );
      expect(result.familyId, field.fieldCode).toBe(profile.id);
      const candidate = result.fieldCandidates.find(
        (item) => item.kind === field.kind && item.fieldCode === field.fieldCode,
      );
      expect(candidate, `${profile.id}:${field.kind}:${field.fieldCode}`).toBeDefined();

      switch (field.kind) {
        case "REFERENCE":
          if (field.privacy === "SENSITIVE_FINGERPRINT") {
            expect(candidate).toMatchObject({
              kind: "REFERENCE",
              normalizedValue: null,
              sensitiveReference: {
                storage: "FINGERPRINT_ONLY",
                fingerprintSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
              },
            });
            expect(JSON.stringify(result)).not.toContain(value);
          } else {
            expect(candidate).toMatchObject({
              kind: "REFERENCE",
              normalizedValue: value,
              sensitiveReference: null,
            });
          }
          break;
        case "DATE":
          expect(candidate).toMatchObject({ kind: "DATE", valueIso: "2026-07-16" });
          break;
        case "MONEY":
          expect(candidate).toMatchObject({
            kind: "MONEY",
            amountCents: 123_456,
            currency: "EUR",
          });
          break;
        case "FACT":
          expect(candidate).toMatchObject({ kind: "FACT", observed: true });
          break;
        case "PARTICIPANT_ROLE":
          expect(candidate).toMatchObject({ kind: "PARTICIPANT_ROLE", ordinal: 1 });
          break;
      }
    }
  });

  it.each([
    ["EXPEDIENTE_ID", "Número de expediente: SINREFERENCIA"],
    ["MODEL", "Modelo tributario: 9999"],
    ["TAX_PERIOD", "Período tributario: 5T"],
    ["ISSUE_DATE", "Fecha de emisión: 31/02/2026"],
    ["DOCUMENT_TOTAL", "Importe total del documento: sin importe"],
  ] as const)("rejects an invalid raw value for %s", async (fieldCode, line) => {
    const field = PROFILE_FIELD_LABELS_V2.find((candidate) => candidate.fieldCode === fieldCode);
    if (!field) throw new Error(`missing invalid fixture field ${fieldCode}`);
    const profile = profileFor(field);
    const result = await extractProfileDrivenFamilyV2({
      document: document(profile, line),
      rules: Object.freeze([ruleFor(profile)]),
    });

    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(
      result.fieldCandidates.some(
        (candidate) => candidate.kind === field.kind && candidate.fieldCode === fieldCode,
      ),
    ).toBe(false);
  });
});
