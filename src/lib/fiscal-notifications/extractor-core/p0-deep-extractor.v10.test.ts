import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  AEAT_P0_DEEP_PROFILES_V10,
  type AeatP0CanonicalFieldV10,
  type AeatP0ProfileV10,
} from "../knowledge/p0-deep-contracts.v10";
import { extractAeatP0DeepDocumentV10 } from "./p0-deep-extractor.v10";

function document(text: string, documentId = "document-p0-v10-synthetic"): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "user:synthetic-p0-v10",
    documentId,
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

function syntheticValue(field: AeatP0CanonicalFieldV10): string {
  if (field.type === "DATE" || field.type === "DATE_TIME" || field.type === "DATE_OR_RULE") return "17/07/2026";
  if (field.type === "MONEY") return "1.234,56 €";
  if (field.type === "BOOLEAN") return "Sí";
  if (field.type === "INTEGER") return "2";
  if (field.type === "MODEL") return "303";
  if (field.type === "YEAR") return "2026";
  if (field.type === "PERIOD") return "3T";
  if (field.type === "SENSITIVE_REFERENCE") return "CSV-SYNTHETIC-REFERENCE-001";
  if (field.id === "SUBMISSION_RESULT") return "Presentado";
  if (field.id === "DECISION_RESULT") return "Conceder";
  if (field.id === "PROPOSAL_RESULT") return "Estimar";
  if (field.id === "FINAL_RESULT") return "Estimar";
  if (field.id === "CERTIFICATE_RESULT") return "Positivo";
  if (field.id === "CORRECTION_RESULT") return "Corregido";
  if (field.type === "REFERENCE") return `REF-${field.id}-001`;
  return "Contenido estructurado presente";
}

function positiveText(profile: AeatP0ProfileV10): string {
  return [
    "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
    profile.titleEs,
    ...profile.recognition.strongAnchorSets[0]!,
    ...profile.canonicalFields.map((field) => `${field.labelVariants[0]}: ${syntheticValue(field)}`),
    "RAW-SOURCE-MARKER-MUST-NOT-BE-RETAINED",
  ].join("\n");
}

describe("AEAT P0 deep extractor v10", () => {
  it("covers all 11 profiles with deterministic positive and incomplete cases", () => {
    for (const [index, profile] of AEAT_P0_DEEP_PROFILES_V10.entries()) {
      const positive = extractAeatP0DeepDocumentV10(document(positiveText(profile), `document-positive-${index}`));
      expect(positive.status, profile.profileId).toBe("REVIEW_REQUIRED");
      expect(positive.familyId, profile.profileId).toBe(profile.profileId);
      expect(positive.missingRequiredFieldIds, profile.profileId).toEqual([]);
      expect(positive.retainedSourceContent, profile.profileId).toBe("NONE");
      expect(positive.requiresHumanReview, profile.profileId).toBe(true);
      expect(positive.materializationPolicy, profile.profileId).toBe("PROHIBITED_UNTIL_HUMAN_REVIEW");
      expect(positive.confirmsFamily, profile.profileId).toBe(false);
      expect(positive.confirmsObligation, profile.profileId).toBe(false);
      expect(positive.confirmsDebt, profile.profileId).toBe(false);
      expect(positive.confirmsPayment, profile.profileId).toBe(false);
      expect(positive.confirmsDeadline, profile.profileId).toBe(false);
      expect(JSON.stringify(positive), profile.profileId).not.toContain("RAW-SOURCE-MARKER-MUST-NOT-BE-RETAINED");

      const incomplete = extractAeatP0DeepDocumentV10(document([
        "AGENCIA TRIBUTARIA",
        profile.titleEs,
        ...profile.recognition.strongAnchorSets[0]!,
      ].join("\n"), `document-incomplete-${index}`));
      expect(incomplete.status, profile.profileId).toBe("REVIEW_REQUIRED");
      expect(incomplete.familyId, profile.profileId).toBe(profile.profileId);
      expect(incomplete.issues, profile.profileId).toContain("INCOMPLETE_REQUIRED_FIELDS");
      expect(incomplete.missingRequiredFieldIds.length, profile.profileId).toBeGreaterThan(0);
    }
  });

  it("blocks a conflicting tax authority and leaves an anchorless document unknown", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10[0]!;
    expect(extractAeatP0DeepDocumentV10(document([
      "TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL",
      profile.titleEs,
      ...profile.recognition.strongAnchorSets[0]!,
    ].join("\n")))).toMatchObject({ status: "BLOCKED", familyId: null, issues: ["CONFLICTING_AUTHORITY"] });
    expect(extractAeatP0DeepDocumentV10(document("AGENCIA TRIBUTARIA\nDocumento sintético sin anclas"))).toMatchObject({
      status: "UNKNOWN",
      familyId: null,
      issues: ["P0_STRONG_SIGNATURE_NOT_FOUND"],
    });
  });

  it("returns ambiguity instead of selecting between two exact titles", () => {
    const first = AEAT_P0_DEEP_PROFILES_V10[0]!;
    const second = AEAT_P0_DEEP_PROFILES_V10[1]!;
    const result = extractAeatP0DeepDocumentV10(document([
      "AGENCIA TRIBUTARIA",
      first.titleEs,
      ...first.recognition.strongAnchorSets[0]!,
      second.titleEs,
      ...second.recognition.strongAnchorSets[0]!,
    ].join("\n")));
    expect(result).toMatchObject({ status: "AMBIGUOUS", familyId: null, issues: ["MULTIPLE_P0_PROFILES"] });
  });

  it("honors every profile's incompatible anchor instead of forcing a family", () => {
    for (const [index, profile] of AEAT_P0_DEEP_PROFILES_V10.entries()) {
      const incompatible = profile.recognition.incompatibleAnchors[0];
      if (!incompatible) continue;
      const result = extractAeatP0DeepDocumentV10(document([
        "AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA",
        ...profile.recognition.strongAnchorSets[0]!,
        incompatible,
      ].join("\n"), `document-negative-${index}`));
      expect(result.familyId, profile.profileId).not.toBe(profile.profileId);
    }
  });

  it("fingerprints CSV locally and never returns its printed value", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "evidence.submission_receipt")!;
    const result = extractAeatP0DeepDocumentV10(document(positiveText(profile)));
    const csv = result.fields.find((field) => field.fieldCode === "CSV");
    expect(csv).toMatchObject({
      kind: "SENSITIVE_REFERENCE",
      displayValue: "CSV protegido",
      normalizedValue: null,
      persistencePolicy: "FINGERPRINT_ONLY",
    });
    expect(csv?.fingerprintSha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(JSON.stringify(result)).not.toContain("CSV-SYNTHETIC-REFERENCE-001");
  });

  it("keeps a rejected submission rejected instead of presenting it as attended", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "evidence.submission_receipt")!;
    const submissionResult = profile.canonicalFields.find((field) => field.id === "SUBMISSION_RESULT")!;
    const label = submissionResult.labelVariants[0]!;
    const text = positiveText(profile).replace(`${label}: Presentado`, `${label}: Rechazado`);
    const result = extractAeatP0DeepDocumentV10(document(text));
    expect(result.familyId).toBe("evidence.submission_receipt");
    expect(result.fields.find((field) => field.fieldCode === "SUBMISSION_RESULT")).toMatchObject({
      kind: "NORMALIZED_STATE",
      normalizedValue: "REJECTED_OR_INCOMPLETE",
      reviewStatus: "REVIEW_REQUIRED",
    });
    expect(result.confirmsObligation).toBe(false);
    expect(result.permitsAccountingAction).toBe(false);
  });

  it("normalizes safe time, duration, channel, role and certificate-kind values without retaining free text", () => {
    const receipt = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "evidence.submission_receipt")!;
    const receiptResult = extractAeatP0DeepDocumentV10(document([
      "AGENCIA TRIBUTARIA",
      receipt.titleEs,
      ...receipt.recognition.strongAnchorSets[0]!,
      "Número de entrada de registro: REG-SYN-001",
      "Fecha de presentación: 17/07/2026",
      "Hora de presentación: 09:42:15",
      "Canal: Sede electrónica",
      "Presentado: Registrado",
      "Representante: Representante",
    ].join("\n"), "document-safe-enums"));
    expect(receiptResult.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "FILING_TIME", kind: "TIME", normalizedValue: "09:42:15" }),
      expect.objectContaining({ fieldCode: "SUBMISSION_CHANNEL", kind: "NORMALIZED_ENUM", normalizedValue: "ELECTRONIC_REGISTER" }),
      expect.objectContaining({ fieldCode: "PRESENTER_ROLE", kind: "NORMALIZED_ENUM", normalizedValue: "REPRESENTATIVE" }),
    ]));

    const extension = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "procedure.deadline_extension_request")!;
    const extensionResult = extractAeatP0DeepDocumentV10(document([
      "AGENCIA TRIBUTARIA",
      extension.titleEs,
      ...extension.recognition.strongAnchorSets[0]!,
      "Número de entrada: REG-SYN-002",
      "Expediente: PROC-SYN-002",
      "Fecha y hora de presentación: 17/07/2026 09:42",
      "Fecha límite: 30/07/2026",
      "Plazo concedido: 10 días",
      "Motivo: detalle sintético que no debe persistir",
    ].join("\n"), "document-safe-duration"));
    expect(extensionResult.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldCode: "ORIGINAL_TERM_LENGTH", kind: "DURATION", displayValue: "10 días", normalizedValue: "P10D" }),
      expect.objectContaining({ fieldCode: "REQUEST_REASON", kind: "STRUCTURED_PRESENCE", displayValue: "Detectado en el documento", normalizedValue: null }),
    ]));
    expect(JSON.stringify(extensionResult)).not.toContain("detalle sintético");

    const certificate = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "certificate.specialized")!;
    const certificateResult = extractAeatP0DeepDocumentV10(document([
      "AGENCIA TRIBUTARIA",
      certificate.titleEs,
      ...certificate.recognition.strongAnchorSets[0]!,
      "Número de certificado: CERT-SYN-001",
      "Tipo de certificado: Situación censal",
      "Fecha de expedición: 17/07/2026",
      "Positivo: Positivo",
      "Alcance: texto sintético no persistente",
    ].join("\n"), "document-safe-certificate-kind"));
    expect(certificateResult.fields.find((field) => field.fieldCode === "CERTIFICATE_KIND")).toMatchObject({
      kind: "NORMALIZED_ENUM",
      normalizedValue: "CENSUS_STATUS",
    });
    expect(JSON.stringify(certificateResult)).not.toContain("texto sintético");
  });

  it("omits a PII-like printed value and never copies it to issues", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "certificate.specialized")!;
    const privateValue = "12345678Z";
    const result = extractAeatP0DeepDocumentV10(document([
      "AGENCIA TRIBUTARIA",
      profile.titleEs,
      ...profile.recognition.strongAnchorSets[0]!,
      `Número de certificado: ${privateValue}`,
    ].join("\n")));
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.missingRequiredFieldIds).toContain("CERTIFICATE_ID");
    expect(JSON.stringify(result)).not.toContain(privateValue);
  });

  it("preserves the printed negative sign without making the extracted magnitude negative", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "filing.rectifying_self_assessment_receipt")!;
    const difference = profile.canonicalFields.find((field) => field.id === "DIFFERENCE")!;
    const label = difference.labelVariants[0]!;
    const result = extractAeatP0DeepDocumentV10(document(
      positiveText(profile).replace(`${label}: 1.234,56 €`, `${label}: -1.234,56 €`),
    ));

    expect(result.fields.find((field) => field.fieldCode === "DIFFERENCE")).toMatchObject({
      amountCents: 123_456,
      displayValue: "-1.234,56 €",
      assertionLayer: "PRINTED",
    });
  });

  it("takes the sign from the same printed amount when a line contains several figures", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10.find((item) => item.profileId === "filing.rectifying_self_assessment_receipt")!;
    const previous = profile.canonicalFields.find((field) => field.id === "PREVIOUS_RESULT")!;
    const label = previous.labelVariants[0]!;
    const result = extractAeatP0DeepDocumentV10(document(
      positiveText(profile).replace(
        `${label}: 1.234,56 €`,
        `${label}: 100,00 €; -20,00 €`,
      ),
    ));

    expect(result.fields.find((field) => field.fieldCode === "PREVIOUS_RESULT")).toMatchObject({
      amountCents: 10_000,
      displayValue: "100,00 €",
      assertionLayer: "PRINTED",
    });
  });

  it("is deterministic, immutable and does not mutate the document input", () => {
    const profile = AEAT_P0_DEEP_PROFILES_V10[3]!;
    const input = document(positiveText(profile));
    const before = structuredClone(input);
    const first = extractAeatP0DeepDocumentV10(input);
    const second = extractAeatP0DeepDocumentV10(input);
    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.fields)).toBe(true);
    expect(() => {
      (first.fields as unknown as Record<string, unknown>[])[0]!.displayValue = "changed";
    }).toThrow();
  });
});
