import { describe, expect, it } from "vitest";
import {
  PROFILE_DATE_FIELD_CODES_V2,
  PROFILE_FACT_FIELD_CODES_V2,
  PROFILE_FIELD_ADAPTER_LIMITS_V2,
  PROFILE_FIELD_ADAPTERS_V2,
  PROFILE_MONEY_FIELD_CODES_V2,
  PROFILE_PARTICIPANT_ROLE_CODES_V2,
  PROFILE_REFERENCE_FIELD_CODES_V2,
  ProfileFieldAdapterValidationError,
  adaptProfileFieldCandidatesV2,
  resolveProfileFieldAdapterV2,
  type ProfileDateFieldCodeV2,
  type ProfileFactFieldCodeV2,
  type ProfileFieldAdapterContractV2,
  type ProfileFieldAdapterInputV2,
  type ProfileFieldCandidateV2,
  type ProfileFieldEvidenceV2,
  type ProfileMoneyFieldCodeV2,
  type ProfileParticipantRoleCodeV2,
  type ProfileReferenceFieldCodeV2,
} from "./profile-field-adapter.v2";

function evidence(index: number): ProfileFieldEvidenceV2 {
  return {
    evidenceId: `evidence-${index}`,
    pageNumber: (index % 10) + 1,
    evidenceBasis: "EXPLICIT_DOCUMENT_FIELD",
    assertionType: "EXPLICIT_IN_DOCUMENT",
    confidence: 1,
  };
}

function normalizedReference(
  fieldCode: ProfileReferenceFieldCodeV2,
  index: number,
): string {
  if (fieldCode === "MODEL") return "303";
  if (fieldCode === "FISCAL_YEAR") return "2026";
  if (fieldCode === "TAX_PERIOD") return "1T";
  return `REF${index}A`;
}

function referenceCandidate(
  fieldCode: ProfileReferenceFieldCodeV2,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  const sensitive = ["CSV", "NRC", "BANK_REFERENCE"].includes(fieldCode);
  return {
    candidateId: `candidate-reference-${index}`,
    candidateStatus,
    evidence: evidence(index),
    kind: "REFERENCE",
    fieldCode,
    normalizedValue: sensitive ? null : normalizedReference(fieldCode, index),
    sensitiveReference: sensitive
      ? {
          storage: "FINGERPRINT_ONLY",
          referenceType: fieldCode as "CSV" | "NRC" | "BANK_REFERENCE",
          fingerprintSha256: "a".repeat(64),
        }
      : null,
  };
}

function dateCandidate(
  fieldCode: ProfileDateFieldCodeV2,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  return {
    candidateId: `candidate-date-${index}`,
    candidateStatus,
    evidence: evidence(index),
    kind: "DATE",
    fieldCode,
    valueIso: "2026-07-16",
  };
}

function moneyCandidate(
  fieldCode: ProfileMoneyFieldCodeV2,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  return {
    candidateId: `candidate-money-${index}`,
    candidateStatus,
    evidence: evidence(index),
    kind: "MONEY",
    fieldCode,
    amountCents: 10_000 + index,
    currency: "EUR",
  };
}

function factCandidate(
  fieldCode: ProfileFactFieldCodeV2,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  return {
    candidateId: `candidate-fact-${index}`,
    candidateStatus,
    evidence: evidence(index),
    kind: "FACT",
    fieldCode,
    observed: true,
  };
}

function participantCandidate(
  fieldCode: ProfileParticipantRoleCodeV2,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  return {
    candidateId: `candidate-participant-${index}`,
    candidateStatus,
    evidence: evidence(index),
    kind: "PARTICIPANT_ROLE",
    fieldCode,
    ordinal: index + 1,
  };
}

function candidateFor(
  kind: ProfileFieldCandidateV2["kind"],
  fieldCode: string,
  index: number,
  candidateStatus: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  switch (kind) {
    case "REFERENCE":
      return referenceCandidate(
        fieldCode as ProfileReferenceFieldCodeV2,
        index,
        candidateStatus,
      );
    case "DATE":
      return dateCandidate(
        fieldCode as ProfileDateFieldCodeV2,
        index,
        candidateStatus,
      );
    case "MONEY":
      return moneyCandidate(
        fieldCode as ProfileMoneyFieldCodeV2,
        index,
        candidateStatus,
      );
    case "FACT":
      return factCandidate(
        fieldCode as ProfileFactFieldCodeV2,
        index,
        candidateStatus,
      );
    case "PARTICIPANT_ROLE":
      return participantCandidate(
        fieldCode as ProfileParticipantRoleCodeV2,
        index,
        candidateStatus,
      );
  }
}

function completeCandidates(
  adapter: ProfileFieldAdapterContractV2,
): readonly ProfileFieldCandidateV2[] {
  let index = 0;
  const next = (): number => {
    index += 1;
    return index;
  };
  return [
    ...adapter.fieldContract.references.map((code) =>
      referenceCandidate(code, next()),
    ),
    ...adapter.fieldContract.dates.map((code) => dateCandidate(code, next())),
    ...adapter.fieldContract.money.map((code) => moneyCandidate(code, next())),
    ...adapter.fieldContract.facts.map((code) => factCandidate(code, next())),
    ...adapter.fieldContract.participantRoles.map((code) =>
      participantCandidate(code, next()),
    ),
  ];
}

function firstAllowedCandidate(
  adapter: ProfileFieldAdapterContractV2,
  status: "EXACT" | "AMBIGUOUS" = "EXACT",
): ProfileFieldCandidateV2 {
  const groups = [
    ["REFERENCE", adapter.fieldContract.references],
    ["DATE", adapter.fieldContract.dates],
    ["MONEY", adapter.fieldContract.money],
    ["FACT", adapter.fieldContract.facts],
    ["PARTICIPANT_ROLE", adapter.fieldContract.participantRoles],
  ] as const;
  for (const [kind, codes] of groups) {
    if (codes[0]) return candidateFor(kind, codes[0], 1, status);
  }
  throw new Error(`profile ${adapter.familyId} has no field contract`);
}

function outsideCandidate(
  adapter: ProfileFieldAdapterContractV2,
): ProfileFieldCandidateV2 {
  const groups = [
    [
      "REFERENCE",
      PROFILE_REFERENCE_FIELD_CODES_V2,
      adapter.fieldContract.references,
    ],
    ["DATE", PROFILE_DATE_FIELD_CODES_V2, adapter.fieldContract.dates],
    ["MONEY", PROFILE_MONEY_FIELD_CODES_V2, adapter.fieldContract.money],
    ["FACT", PROFILE_FACT_FIELD_CODES_V2, adapter.fieldContract.facts],
    [
      "PARTICIPANT_ROLE",
      PROFILE_PARTICIPANT_ROLE_CODES_V2,
      adapter.fieldContract.participantRoles,
    ],
  ] as const;
  for (const [kind, allCodes, acceptedCodes] of groups) {
    const outside = allCodes.find(
      (code) => !(acceptedCodes as readonly string[]).includes(code),
    );
    if (outside) return candidateFor(kind, outside, 1);
  }
  throw new Error(`profile ${adapter.familyId} accepts every known field`);
}

function selectedInput(
  adapter: ProfileFieldAdapterContractV2,
  candidates: readonly ProfileFieldCandidateV2[],
  basis: "SYSTEM_EXACT" | "USER_SELECTED" = "SYSTEM_EXACT",
): ProfileFieldAdapterInputV2 {
  return {
    ownerScope: "user:synthetic-001",
    documentId: `document-${adapter.familyId.replaceAll(".", "-")}`,
    selection: {
      selectionStatus: "SELECTED",
      familyId: adapter.familyId,
      basis,
    },
    candidates,
  };
}

function allUnobservedCounts(adapter: ProfileFieldAdapterContractV2): number {
  return (
    adapter.fieldContract.references.length +
    adapter.fieldContract.dates.length +
    adapter.fieldContract.money.length +
    adapter.fieldContract.facts.length +
    adapter.fieldContract.participantRoles.length
  );
}

describe("profile field adapter v2 inventory", () => {
  it("registers one real preselected-family adapter for every knowledge profile", () => {
    expect(PROFILE_FIELD_ADAPTERS_V2).toHaveLength(87);
    expect(
      new Set(PROFILE_FIELD_ADAPTERS_V2.map((item) => item.familyId)).size,
    ).toBe(87);
    for (const adapter of PROFILE_FIELD_ADAPTERS_V2) {
      expect(resolveProfileFieldAdapterV2(adapter.familyId)).toBe(adapter);
      expect(adapter).toMatchObject({
        recognitionPolicy: "PRESELECTED_FAMILY_ONLY",
        reviewPolicy: "ALWAYS_REVIEW_REQUIRED",
        materializationPolicy: "PROHIBITED",
      });
    }
    expect(resolveProfileFieldAdapterV2("unknown.family")).toBeNull();
    expect(resolveProfileFieldAdapterV2(null)).toBeNull();
  });
});

describe.each(PROFILE_FIELD_ADAPTERS_V2)(
  "$familyId profile-driven matrix",
  (adapter) => {
    it("adapts every declared field positively without confirming effects", () => {
      const candidates = completeCandidates(adapter);
      const outcome = adapter.adapt(selectedInput(adapter, candidates));
      expect(outcome.fields).toHaveLength(candidates.length);
      expect(outcome.issues).toEqual([]);
      expect(allUnobservedCounts(adapter)).toBe(candidates.length);
      expect(Object.values(outcome.unobservedProfileFields).flat()).toEqual([]);
      expect(outcome).toMatchObject({
        status: "REVIEW_REQUIRED",
        familyId: adapter.familyId,
        selectionBasis: "SYSTEM_EXACT",
        requiresHumanReview: true,
        materializationPolicy: "PROHIBITED",
        confirmsFamily: false,
        confirmsObligation: false,
        confirmsDebt: false,
        confirmsPayment: false,
        confirmsDeadline: false,
        confirmsSeizure: false,
        permitsAccountingAction: false,
      });
      expect(
        outcome.fields.every(
          (field) => field.reviewStatus === "REVIEW_REQUIRED",
        ),
      ).toBe(true);
    });

    it("rejects a candidate outside the selected profile contract", () => {
      const outcome = adapter.adapt(
        selectedInput(adapter, [outsideCandidate(adapter)]),
      );
      expect(outcome.fields).toEqual([]);
      expect(outcome.issues).toEqual(["CANDIDATE_OUTSIDE_PROFILE_CONTRACT"]);
      expect(allUnobservedCounts(adapter)).toBeGreaterThan(0);
    });

    it("keeps an ambiguous candidate out of all fields", () => {
      const outcome = adapter.adapt(
        selectedInput(adapter, [firstAllowedCandidate(adapter, "AMBIGUOUS")]),
      );
      expect(outcome.fields).toEqual([]);
      expect(outcome.issues).toEqual(["AMBIGUOUS_FIELD_CANDIDATE"]);
      expect(outcome.status).toBe("REVIEW_REQUIRED");
    });

    it("reports an incomplete candidate set without materializing anything", () => {
      const outcome = adapter.adapt(selectedInput(adapter, []));
      expect(outcome.fields).toEqual([]);
      expect(outcome.issues).toEqual(["INCOMPLETE_PROFILE_FIELDS"]);
      expect(outcome.materializationPolicy).toBe("PROHIBITED");
      expect(allUnobservedCounts(adapter)).toBeGreaterThan(0);
    });
  },
);

describe("profile field adapter v2 fail-closed boundary", () => {
  const adapter = PROFILE_FIELD_ADAPTERS_V2[0];

  it.each([
    ["UNKNOWN", "FAMILY_SELECTION_UNKNOWN"],
    ["AMBIGUOUS", "FAMILY_SELECTION_AMBIGUOUS"],
    ["NON_EXACT", "FAMILY_SELECTION_NON_EXACT"],
  ] as const)(
    "returns no fields for %s family selection",
    (selectionStatus, issue) => {
      const outcome = adaptProfileFieldCandidatesV2({
        ownerScope: "user:synthetic-001",
        documentId: "document-synthetic-001",
        selection: { selectionStatus, familyId: null, basis: null },
        candidates: [firstAllowedCandidate(adapter)],
      });
      expect(outcome).toMatchObject({
        familyId: null,
        selectionBasis: null,
        fields: [],
        issues: [issue],
        status: "REVIEW_REQUIRED",
        confirmsFamily: false,
      });
    },
  );

  it("does not turn SYSTEM_EXACT or confidence 1 into fiscal confirmation", () => {
    const system = adapter.adapt(
      selectedInput(adapter, [firstAllowedCandidate(adapter)]),
    );
    const user = adapter.adapt(
      selectedInput(adapter, [firstAllowedCandidate(adapter)], "USER_SELECTED"),
    );
    for (const outcome of [system, user]) {
      expect(outcome.status).toBe("REVIEW_REQUIRED");
      expect(outcome.confirmsFamily).toBe(false);
      expect(outcome.confirmsObligation).toBe(false);
      expect(outcome.confirmsDebt).toBe(false);
      expect(outcome.confirmsPayment).toBe(false);
      expect(outcome.confirmsDeadline).toBe(false);
      expect(outcome.confirmsSeizure).toBe(false);
      expect(outcome.permitsAccountingAction).toBe(false);
    }
  });

  it("rejects raw PII and untyped text keys instead of copying them", () => {
    const participant = participantCandidate(
      adapter.fieldContract.participantRoles[0],
      1,
    ) as unknown as Record<string, unknown>;
    participant.name = "SECRET_VALUE_NOT_FOR_ERRORS";
    expect(() =>
      adapter.adapt(selectedInput(adapter, [participant as never])),
    ).toThrowError(ProfileFieldAdapterValidationError);
    try {
      adapter.adapt(selectedInput(adapter, [participant as never]));
    } catch (error) {
      expect((error as Error).message).not.toContain(
        "SECRET_VALUE_NOT_FOR_ERRORS",
      );
    }

    const reference = referenceCandidate(
      adapter.fieldContract.references[0],
      2,
    ) as unknown as Record<string, unknown>;
    reference.rawValue = "raw-document-text";
    expect(() =>
      adapter.adapt(selectedInput(adapter, [reference as never])),
    ).toThrowError(ProfileFieldAdapterValidationError);
  });

  it.each([
    "12345678Z",
    "12345678-Z",
    "REF-12345678-Z-42",
    "X1234567L",
    "X-1234567-L",
    "ES9121000418450200051332",
    "ES91-2100-0418-4502-0005-1332",
    "REF-612345678-42",
  ])(
    "rejects the PII-shaped normalized reference %s",
    (normalizedValue) => {
      const code = PROFILE_REFERENCE_FIELD_CODES_V2.find(
        (item) =>
          ![
            "CSV",
            "NRC",
            "BANK_REFERENCE",
            "MODEL",
            "FISCAL_YEAR",
            "TAX_PERIOD",
          ].includes(item),
      );
      expect(code).toBeDefined();
      const candidate = referenceCandidate(code!, 1) as unknown as Record<
        string,
        unknown
      >;
      candidate.normalizedValue = normalizedValue;
      expect(() =>
        adaptProfileFieldCandidatesV2(
          selectedInput(
            resolveProfileFieldAdapterV2(
              PROFILE_FIELD_ADAPTERS_V2.find((item) =>
                item.fieldContract.references.includes(code!),
              )!.familyId,
            )!,
            [candidate as never],
          ),
        ),
      ).toThrowError(ProfileFieldAdapterValidationError);
    },
  );

  it("requires fingerprint-only values for CSV, NRC and bank references", () => {
    const sensitiveAdapter = PROFILE_FIELD_ADAPTERS_V2.find((item) =>
      item.fieldContract.references.some((code) =>
        ["CSV", "NRC", "BANK_REFERENCE"].includes(code),
      ),
    )!;
    const code = sensitiveAdapter.fieldContract.references.find((item) =>
      ["CSV", "NRC", "BANK_REFERENCE"].includes(item),
    )!;
    const candidate = referenceCandidate(code, 1) as unknown as Record<
      string,
      unknown
    >;
    candidate.normalizedValue = "PRINTED-SENSITIVE-VALUE";
    expect(() =>
      sensitiveAdapter.adapt(
        selectedInput(sensitiveAdapter, [candidate as never]),
      ),
    ).toThrowError(ProfileFieldAdapterValidationError);

    const outcome = sensitiveAdapter.adapt(
      selectedInput(sensitiveAdapter, [referenceCandidate(code, 2)]),
    );
    expect(outcome.fields[0]).toMatchObject({
      kind: "REFERENCE",
      normalizedValue: null,
      sensitiveReference: {
        storage: "FINGERPRINT_ONLY",
        fingerprintSha256: "a".repeat(64),
      },
    });
    expect(outcome.fields[0]).not.toHaveProperty("rawValue");
  });

  it.each([-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid integer cents %s",
    (amountCents) => {
      const moneyAdapter = PROFILE_FIELD_ADAPTERS_V2.find(
        (item) => item.fieldContract.money.length > 0,
      )!;
      const candidate = moneyCandidate(
        moneyAdapter.fieldContract.money[0],
        1,
      ) as unknown as Record<string, unknown>;
      candidate.amountCents = amountCents;
      expect(() =>
        moneyAdapter.adapt(selectedInput(moneyAdapter, [candidate as never])),
      ).toThrowError(ProfileFieldAdapterValidationError);
    },
  );

  it.each(["2026-02-31", "16-07-2026", "2026-7-16"])(
    "rejects the non-ISO calendar date %s",
    (valueIso) => {
      const dateAdapter = PROFILE_FIELD_ADAPTERS_V2.find(
        (item) => item.fieldContract.dates.length > 0,
      )!;
      const candidate = dateCandidate(
        dateAdapter.fieldContract.dates[0],
        1,
      ) as unknown as Record<string, unknown>;
      candidate.valueIso = valueIso;
      expect(() =>
        dateAdapter.adapt(selectedInput(dateAdapter, [candidate as never])),
      ).toThrowError(ProfileFieldAdapterValidationError);
    },
  );

  it("uses document chronology only and never creates a deadline", () => {
    const dateAdapter = PROFILE_FIELD_ADAPTERS_V2.find((item) =>
      item.fieldContract.dates.includes("ISSUE_DATE"),
    )!;
    const issueDate = dateCandidate("ISSUE_DATE", 1);
    const outcome = dateAdapter.adapt(selectedInput(dateAdapter, [issueDate]));
    expect(outcome.chronology).toEqual({
      schemaVersion: 2,
      chronologyDate: "2026-07-16",
      chronologyDateBasis: "ISSUE_DATE",
    });
    expect(outcome.confirmsDeadline).toBe(false);
    expect(outcome.materializationPolicy).toBe("PROHIBITED");
  });

  it("does not select a chronology date from conflicting exact values", () => {
    const dateAdapter = PROFILE_FIELD_ADAPTERS_V2.find((item) =>
      item.fieldContract.dates.includes("ISSUE_DATE"),
    )!;
    const first = dateCandidate("ISSUE_DATE", 1);
    const conflicting = {
      ...dateCandidate("ISSUE_DATE", 2),
      valueIso: "2026-07-15",
    };
    const outcome = dateAdapter.adapt(
      selectedInput(dateAdapter, [first, conflicting]),
    );
    expect(outcome.fields).toEqual([]);
    expect(outcome.issues).toEqual(["CONFLICTING_EXACT_FIELD_VALUES"]);
    expect(outcome.chronology).toEqual({
      schemaVersion: 2,
      chronologyDate: null,
      chronologyDateBasis: null,
    });
  });

  it("enforces collection limits before adapting candidates", () => {
    const candidate = firstAllowedCandidate(adapter);
    const tooMany = Array.from(
      { length: PROFILE_FIELD_ADAPTER_LIMITS_V2.maxCandidates + 1 },
      (_, index) => ({
        ...candidate,
        candidateId: `candidate-limit-${index}`,
        evidence: {
          ...candidate.evidence,
          evidenceId: `evidence-limit-${index}`,
        },
      }),
    );
    expect(() => adapter.adapt(selectedInput(adapter, tooMany))).toThrowError(
      ProfileFieldAdapterValidationError,
    );

    const tooManyOfKind = Array.from(
      { length: PROFILE_FIELD_ADAPTER_LIMITS_V2.maxCandidatesPerKind + 1 },
      (_, index) => ({
        ...candidate,
        candidateId: `candidate-kind-${index}`,
        evidence: {
          ...candidate.evidence,
          evidenceId: `evidence-kind-${index}`,
        },
      }),
    );
    expect(() =>
      adapter.adapt(selectedInput(adapter, tooManyOfKind)),
    ).toThrowError(ProfileFieldAdapterValidationError);
  });

  it("rejects duplicate candidate and evidence identities", () => {
    const first = firstAllowedCandidate(adapter);
    const duplicateCandidate = {
      ...first,
      evidence: { ...first.evidence, evidenceId: "evidence-distinct" },
    };
    expect(() =>
      adapter.adapt(selectedInput(adapter, [first, duplicateCandidate])),
    ).toThrowError(ProfileFieldAdapterValidationError);

    const duplicateEvidence = {
      ...first,
      candidateId: "candidate-distinct",
    };
    expect(() =>
      adapter.adapt(selectedInput(adapter, [first, duplicateEvidence])),
    ).toThrowError(ProfileFieldAdapterValidationError);
  });

  it("does not mutate inputs and returns deeply defensive fields", () => {
    const input = selectedInput(adapter, [firstAllowedCandidate(adapter)]);
    const before = structuredClone(input);
    const outcome = adapter.adapt(input);
    expect(input).toEqual(before);
    expect(Object.isFrozen(outcome)).toBe(true);
    expect(Object.isFrozen(outcome.fields)).toBe(true);
    expect(Object.isFrozen(outcome.fields[0])).toBe(true);
    expect(Object.isFrozen(outcome.fields[0].evidence)).toBe(true);
    expect(Object.isFrozen(outcome.unobservedProfileFields)).toBe(true);
  });

  it("rejects a family selected against the wrong concrete adapter", () => {
    const other = PROFILE_FIELD_ADAPTERS_V2[1];
    expect(() => adapter.adapt(selectedInput(other, []))).toThrowError(
      ProfileFieldAdapterValidationError,
    );
  });

  it("rejects non-canonical owner scopes and document identifiers", () => {
    const badOwner = selectedInput(adapter, []);
    (badOwner as unknown as { ownerScope: string }).ownerScope = "tenant:other";
    expect(() => adapter.adapt(badOwner)).toThrowError(
      ProfileFieldAdapterValidationError,
    );

    const badDocument = selectedInput(adapter, []);
    (badDocument as unknown as { documentId: string }).documentId =
      " document:bad";
    expect(() => adapter.adapt(badDocument)).toThrowError(
      ProfileFieldAdapterValidationError,
    );
  });

  it("allows calculated assertions only for monetary candidates", () => {
    const nonMoneyAdapter = PROFILE_FIELD_ADAPTERS_V2.find(
      (item) =>
        item.fieldContract.references.length > 0 ||
        item.fieldContract.dates.length > 0 ||
        item.fieldContract.facts.length > 0,
    )!;
    const candidate = firstAllowedCandidate(nonMoneyAdapter) as unknown as {
      evidence: { assertionType: string };
    };
    candidate.evidence.assertionType = "CALCULATED_FROM_PRINTED_VALUES";
    expect(() =>
      nonMoneyAdapter.adapt(
        selectedInput(nonMoneyAdapter, [candidate as never]),
      ),
    ).toThrowError(ProfileFieldAdapterValidationError);

    const moneyAdapter = PROFILE_FIELD_ADAPTERS_V2.find(
      (item) => item.fieldContract.money.length > 0,
    )!;
    const money = moneyCandidate(moneyAdapter.fieldContract.money[0], 99);
    (
      money as unknown as { evidence: { assertionType: string } }
    ).evidence.assertionType = "CALCULATED_FROM_PRINTED_VALUES";
    expect(
      moneyAdapter.adapt(selectedInput(moneyAdapter, [money])).fields[0]
        ?.evidence.assertionType,
    ).toBe("CALCULATED_FROM_PRINTED_VALUES");
  });
});
