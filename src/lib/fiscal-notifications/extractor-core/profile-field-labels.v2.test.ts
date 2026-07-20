import { describe, expect, it } from "vitest";
import {
  PROFILE_DATE_FIELD_CODES_V2,
  PROFILE_FACT_FIELD_CODES_V2,
  PROFILE_MONEY_FIELD_CODES_V2,
  PROFILE_PARTICIPANT_ROLE_CODES_V2,
  PROFILE_REFERENCE_FIELD_CODES_V2,
} from "./profile-field-adapter.v2";
import {
  PROFILE_DATE_FIELD_LABELS_V2,
  PROFILE_FACT_FIELD_LABELS_V2,
  PROFILE_FIELD_LABEL_LIMITS_V2,
  PROFILE_FIELD_LABELS_V2,
  PROFILE_MONEY_FIELD_LABELS_V2,
  PROFILE_PARTICIPANT_ROLE_LABELS_V2,
  PROFILE_REFERENCE_FIELD_LABELS_V2,
  resolveProfileFieldLabelV2,
  type ProfileFieldKindV2,
  type ProfileFieldLabelV2,
} from "./profile-field-labels.v2";

function sorted(values: readonly string[]): readonly string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function expectExactCoverage(
  labels: readonly ProfileFieldLabelV2[],
  codes: readonly string[],
): void {
  expect(labels).toHaveLength(codes.length);
  expect(sorted(labels.map((field) => field.fieldCode))).toEqual(sorted(codes));
  expect(new Set(labels.map((field) => field.fieldCode)).size).toBe(
    codes.length,
  );
}

describe("profile field labels v2 inventory", () => {
  it("covers every mustExtract code exactly once in its closed group", () => {
    expect(PROFILE_REFERENCE_FIELD_CODES_V2).toHaveLength(20);
    expect(PROFILE_DATE_FIELD_CODES_V2).toHaveLength(20);
    expect(PROFILE_MONEY_FIELD_CODES_V2).toHaveLength(30);
    expect(PROFILE_FACT_FIELD_CODES_V2).toHaveLength(44);
    expect(PROFILE_PARTICIPANT_ROLE_CODES_V2).toHaveLength(15);

    expectExactCoverage(
      PROFILE_REFERENCE_FIELD_LABELS_V2,
      PROFILE_REFERENCE_FIELD_CODES_V2,
    );
    expectExactCoverage(
      PROFILE_DATE_FIELD_LABELS_V2,
      PROFILE_DATE_FIELD_CODES_V2,
    );
    expectExactCoverage(
      PROFILE_MONEY_FIELD_LABELS_V2,
      PROFILE_MONEY_FIELD_CODES_V2,
    );
    expectExactCoverage(
      PROFILE_FACT_FIELD_LABELS_V2,
      PROFILE_FACT_FIELD_CODES_V2,
    );
    expectExactCoverage(
      PROFILE_PARTICIPANT_ROLE_LABELS_V2,
      PROFILE_PARTICIPANT_ROLE_CODES_V2,
    );

    expect(PROFILE_FIELD_LABELS_V2).toHaveLength(129);
    expect(
      new Set(
        PROFILE_FIELD_LABELS_V2.map(
          (field) => `${field.kind}:${field.fieldCode}`,
        ),
      ).size,
    ).toBe(PROFILE_FIELD_LABELS_V2.length);
  });

  it("assigns a closed parser and privacy policy to every field kind", () => {
    for (const field of PROFILE_FIELD_LABELS_V2) {
      switch (field.kind) {
        case "REFERENCE":
          expect(field.parser).toBe("REFERENCE");
          expect(field.privacy).toBe(
            ["CSV", "NRC", "BANK_REFERENCE"].includes(field.fieldCode)
              ? "SENSITIVE_FINGERPRINT"
              : "NORMALIZED_VALUE",
          );
          break;
        case "DATE":
          expect(field).toMatchObject({
            parser: "ISO_DATE",
            privacy: "NORMALIZED_VALUE",
          });
          break;
        case "MONEY":
          expect(field).toMatchObject({
            parser: "EUR_MONEY",
            privacy: "NORMALIZED_VALUE",
          });
          break;
        case "FACT":
          expect(field).toMatchObject({
            parser: "PRESENCE",
            privacy: "PRESENCE_ONLY",
          });
          break;
        case "PARTICIPANT_ROLE":
          expect(field).toMatchObject({
            parser: "ROLE",
            privacy: "ROLE_ORDINAL",
          });
          break;
      }
    }
  });

  it("uses bounded, normalized, non-empty Spanish labels and aliases", () => {
    const normalizedAlias = /^[a-záéíóúüñ0-9][a-záéíóúüñ0-9 ]*$/u;
    for (const field of PROFILE_FIELD_LABELS_V2) {
      expect(field.labelEs).toBe(field.labelEs.trim());
      expect(field.labelEs.length).toBeGreaterThan(0);
      expect(field.labelEs.length).toBeLessThanOrEqual(
        PROFILE_FIELD_LABEL_LIMITS_V2.maxLabelChars,
      );
      expect(field.aliasesEs.length).toBeGreaterThan(0);
      expect(field.aliasesEs.length).toBeLessThanOrEqual(
        PROFILE_FIELD_LABEL_LIMITS_V2.maxAliasesPerField,
      );
      expect(new Set(field.aliasesEs).size).toBe(field.aliasesEs.length);

      for (const alias of field.aliasesEs) {
        expect(alias).toBe(alias.trim());
        expect(alias).toBe(alias.replace(/\s+/gu, " "));
        expect(alias.length).toBeGreaterThan(0);
        expect(alias.length).toBeLessThanOrEqual(
          PROFILE_FIELD_LABEL_LIMITS_V2.maxAliasChars,
        );
        expect(alias).toMatch(normalizedAlias);
        expect(alias).toBe(alias.toLocaleLowerCase("es-ES"));
      }
    }
  });

  it("contains rule metadata only and no example personal or banking values", () => {
    const publicText = PROFILE_FIELD_LABELS_V2.flatMap((field) => [
      field.labelEs,
      ...field.aliasesEs,
    ]).join("\n");

    expect(publicText).not.toMatch(/\b\d{8}[A-Z]\b/u);
    expect(publicText).not.toMatch(/\b[XYZ]\d{7}[A-Z]\b/u);
    expect(publicText).not.toMatch(/\b[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]\b/u);
    expect(publicText).not.toMatch(/\bES\d{22}\b/u);
    expect(publicText).not.toMatch(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u);
    expect(publicText).not.toMatch(/(?:^|\D)(?:34)?[6789]\d{8}(?:$|\D)/u);
    expect(publicText).not.toMatch(/\b[A-Z0-9]{16,}\b/u);
  });

  it("is deeply immutable and later consumers cannot contaminate the registry", () => {
    expect(Object.isFrozen(PROFILE_FIELD_LABELS_V2)).toBe(true);
    expect(Object.isFrozen(PROFILE_REFERENCE_FIELD_LABELS_V2)).toBe(true);
    for (const field of PROFILE_FIELD_LABELS_V2) {
      expect(Object.isFrozen(field)).toBe(true);
      expect(Object.isFrozen(field.aliasesEs)).toBe(true);
    }

    const first = PROFILE_FIELD_LABELS_V2[0];
    expect(first).toBeDefined();
    expect(() =>
      (PROFILE_FIELD_LABELS_V2 as unknown as ProfileFieldLabelV2[]).push(
        first!,
      ),
    ).toThrow();
    expect(() =>
      (first!.aliasesEs as unknown as string[]).push("alias inyectado"),
    ).toThrow();
    expect(resolveProfileFieldLabelV2(first!.kind, first!.fieldCode)).toBe(
      first,
    );
  });

  it("resolves only an exact kind and code pair", () => {
    for (const field of PROFILE_FIELD_LABELS_V2) {
      expect(resolveProfileFieldLabelV2(field.kind, field.fieldCode)).toBe(
        field,
      );
    }
    expect(resolveProfileFieldLabelV2("REFERENCE", "UNKNOWN_FIELD")).toBeNull();
    expect(
      resolveProfileFieldLabelV2("MONEY", PROFILE_REFERENCE_FIELD_CODES_V2[0]!),
    ).toBeNull();
  });
});

const closedKinds: readonly ProfileFieldKindV2[] = [
  "REFERENCE",
  "DATE",
  "MONEY",
  "FACT",
  "PARTICIPANT_ROLE",
];

describe.each(closedKinds)("%s label group", (kind) => {
  it("does not contain an entry assigned to another kind", () => {
    const matching = PROFILE_FIELD_LABELS_V2.filter(
      (field) => field.kind === kind,
    );
    expect(matching.length).toBeGreaterThan(0);
    expect(matching.every((field) => field.kind === kind)).toBe(true);
  });
});
