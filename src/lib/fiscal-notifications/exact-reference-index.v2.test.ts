import { describe, expect, it } from "vitest";
import {
  createFiscalNotificationExactReferenceIndexV2,
  createFiscalNotificationExactReferenceKeyV2,
  normalizeFiscalNotificationReferenceV2,
  type FiscalNotificationExactReferenceInputV2,
  type FiscalNotificationExactReferenceQueryV2,
} from "./exact-reference-index.v2";
import {
  createSensitiveReferenceV2,
  type SensitiveReferenceTypeV2,
  type SensitiveReferenceV2,
} from "./sensitive-reference.v2";

const OWNER_A = "user:00000000-0000-4000-8000-000000000061";
const OWNER_B = "user:00000000-0000-4000-8000-000000000062";

async function protectedReference(
  referenceType: SensitiveReferenceTypeV2,
  printedValue: string,
  ownerScope = OWNER_A,
  issuerCode = "AEAT",
): Promise<Readonly<SensitiveReferenceV2>> {
  const reference = await createSensitiveReferenceV2({
    ownerScope,
    issuerCode,
    referenceType,
    printedValue,
  });
  expect(reference).not.toBeNull();
  return reference!;
}

describe("fiscal notification exact reference index v2", () => {
  it("uses owner, normalized issuer, reference type and exact normalized value", () => {
    const index = createFiscalNotificationExactReferenceIndexV2([
      {
        referenceId: "ref-1",
        documentId: "doc-1",
        ownerScope: OWNER_A,
        issuer: "Agencia Tributaria",
        referenceType: "LIQUIDATION_KEY",
        reference: "A-0001 / 05",
      },
    ]);

    expect(
      index.findExact({
        ownerScope: OWNER_A,
        issuer: "AGENCIA  TRIBUTARIA",
        referenceType: "LIQUIDATION_KEY",
        reference: "Ａ 0001-05",
      }),
    ).toHaveLength(1);
    expect(
      index.findExact({
        ownerScope: OWNER_B,
        issuer: "Agencia Tributaria",
        referenceType: "LIQUIDATION_KEY",
        reference: "A-0001 / 05",
      }),
    ).toEqual([]);
  });

  it("preserves zeros, letters, control digits, suffixes and installment numbers", () => {
    expect(normalizeFiscalNotificationReferenceV2("A-0001/01")).toBe(
      "A000101",
    );
    expect(normalizeFiscalNotificationReferenceV2("A-0001/02")).toBe(
      "A000102",
    );
    expect(normalizeFiscalNotificationReferenceV2("0007-X-05")).toBe(
      "0007X05",
    );

    const installmentKeys = Array.from({ length: 5 }, (_, index) =>
      createFiscalNotificationExactReferenceKeyV2({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "AGREEMENT_ID",
        reference: `PLAN-0009-CUOTA-${index + 1}`,
      }),
    );
    expect(new Set(installmentKeys)).toHaveLength(5);
  });

  it("does not link by prefix, amount, date, different type or incompatible issuer", async () => {
    const protectedNrc = await protectedReference(
      "NRC",
      "NRC-0000-SYNTH-A",
    );
    const index = createFiscalNotificationExactReferenceIndexV2([
      {
        referenceId: "nrc-1",
        documentId: "payment-1",
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "NRC",
        sensitiveReference: protectedNrc,
      },
    ]);

    expect(
      index.findExact({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "NRC",
        sensitiveReference: {
          ...protectedNrc,
          fingerprintSha256: "b".repeat(64),
        },
      }),
    ).toEqual([]);
    expect(
      index.findExact({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "PAYMENT_RECEIPT_ID",
        reference: "NRC-000001-A",
      }),
    ).toEqual([]);
    expect(
      index.findExact({
        ownerScope: OWNER_A,
        issuer: "TGSS",
        referenceType: "NRC",
        sensitiveReference: protectedNrc,
      }),
    ).toEqual([]);
  });

  it("length-prefixes tuple components so embedded separators cannot cross owner boundaries", () => {
    const left = createFiscalNotificationExactReferenceKeyV2({
      ownerScope: "user:a|B",
      issuer: "C",
      referenceType: "DEBT_KEY",
      reference: "D-1",
    });
    const right = createFiscalNotificationExactReferenceKeyV2({
      ownerScope: "user:a",
      issuer: "B|C",
      referenceType: "DEBT_KEY",
      reference: "D-1",
    });
    expect(left).not.toBe(right);

    const index = createFiscalNotificationExactReferenceIndexV2([
      {
        referenceId: "ref-separator-safe",
        documentId: "doc-separator-safe",
        ownerScope: "user:a|B",
        issuer: "C",
        referenceType: "DEBT_KEY",
        reference: "D-1",
      },
    ]);
    expect(
      index.findExact({
        ownerScope: "user:a",
        issuer: "B|C",
        referenceType: "DEBT_KEY",
        reference: "D-1",
      }),
    ).toEqual([]);
  });

  it("fails closed on coercion, controls, duplicates and variant smuggling", async () => {
    expect(() => normalizeFiscalNotificationReferenceV2(" A-1 ")).toThrow(
      "INVALID_EXACT_REFERENCE:reference",
    );
    expect(() => normalizeFiscalNotificationReferenceV2("A\u0000B")).toThrow(
      "INVALID_EXACT_REFERENCE:reference",
    );

    const first = await protectedReference("NRC", "NRC-0000-SYNTH-A");
    const second = await protectedReference("NRC", "NRC-0000-SYNTH-B");
    expect(() =>
      createFiscalNotificationExactReferenceIndexV2([
        {
          referenceId: "same",
          documentId: "doc-1",
          ownerScope: OWNER_A,
          issuer: "AEAT",
          referenceType: "NRC",
          sensitiveReference: first,
        },
        {
          referenceId: "same",
          documentId: "doc-2",
          ownerScope: OWNER_A,
          issuer: "AEAT",
          referenceType: "NRC",
          sensitiveReference: second,
        },
      ]),
    ).toThrow("INVALID_EXACT_REFERENCE:referenceId");

    expect(() =>
      createFiscalNotificationExactReferenceKeyV2({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "DEBT_KEY",
        reference: "D-1",
        sensitiveReference: undefined,
      } as unknown as Parameters<
        typeof createFiscalNotificationExactReferenceKeyV2
      >[0]),
    ).toThrow("INVALID_EXACT_REFERENCE:reference");
  });

  it("snapshots hostile arrays and records without invoking accessors or custom methods", async () => {
    let accessorReads = 0;
    const accessorRecord: Record<string, unknown> = {
      referenceId: "ref-hostile",
      documentId: "doc-hostile",
      issuer: "AEAT",
      referenceType: "DEBT_KEY",
      reference: "D-0001",
    };
    Object.defineProperty(accessorRecord, "ownerScope", {
      enumerable: true,
      get() {
        accessorReads += 1;
        throw new Error("private getter payload");
      },
    });
    expect(() =>
      createFiscalNotificationExactReferenceIndexV2([
        accessorRecord as unknown as FiscalNotificationExactReferenceInputV2,
      ]),
    ).toThrow("INVALID_EXACT_REFERENCE:values[0].$shape");
    expect(accessorReads).toBe(0);

    const accessorArray: unknown[] = [];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      configurable: true,
      get() {
        accessorReads += 1;
        throw new Error("private array payload");
      },
    });
    expect(() =>
      createFiscalNotificationExactReferenceIndexV2(
        accessorArray as readonly FiscalNotificationExactReferenceInputV2[],
      ),
    ).toThrow("INVALID_EXACT_REFERENCE:values.$shape");
    expect(accessorReads).toBe(0);

    const sparse = new Array(1) as FiscalNotificationExactReferenceInputV2[];
    expect(() => createFiscalNotificationExactReferenceIndexV2(sparse)).toThrow(
      "INVALID_EXACT_REFERENCE:values",
    );

    let customMethodCalls = 0;
    const decorated: FiscalNotificationExactReferenceInputV2[] = [];
    Object.defineProperty(decorated, "map", {
      enumerable: true,
      value() {
        customMethodCalls += 1;
        return [];
      },
    });
    expect(() =>
      createFiscalNotificationExactReferenceIndexV2(decorated),
    ).toThrow("INVALID_EXACT_REFERENCE:values");
    expect(customMethodCalls).toBe(0);

    const protectedNrc = await protectedReference(
      "NRC",
      "NRC-0000-SYNTH-A",
    );
    const hostileEnvelope: Record<string, unknown> = {
      storage: "FINGERPRINT_ONLY",
      referenceType: "NRC",
    };
    Object.defineProperty(hostileEnvelope, "fingerprintSha256", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return protectedNrc.fingerprintSha256;
      },
    });
    expect(() =>
      createFiscalNotificationExactReferenceKeyV2({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "NRC",
        sensitiveReference:
          hostileEnvelope as unknown as SensitiveReferenceV2,
      }),
    ).toThrow("INVALID_EXACT_REFERENCE:sensitiveReference");
    expect(accessorReads).toBe(0);
  });

  it("snapshots find queries and keeps rejection errors path-only", () => {
    const index = createFiscalNotificationExactReferenceIndexV2([
      {
        referenceId: "ref-1",
        documentId: "doc-1",
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "DEBT_KEY",
        reference: "D-01",
      },
    ]);
    let reads = 0;
    const hostileQuery: Record<string, unknown> = {
      ownerScope: OWNER_A,
      issuer: "AEAT",
      referenceType: "DEBT_KEY",
    };
    Object.defineProperty(hostileQuery, "reference", {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("private query payload");
      },
    });

    let message = "";
    try {
      index.findExact(
        hostileQuery as unknown as FiscalNotificationExactReferenceQueryV2,
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(reads).toBe(0);
    expect(message).toBe("INVALID_EXACT_REFERENCE:input.$shape");
    expect(message).not.toContain("private query payload");

    let unknownKeyMessage = "";
    try {
      createFiscalNotificationExactReferenceKeyV2({
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "DEBT_KEY",
        reference: "D-01",
        rawPrivateValue: "private identifier payload",
      } as unknown as Parameters<
        typeof createFiscalNotificationExactReferenceKeyV2
      >[0]);
    } catch (error) {
      unknownKeyMessage =
        error instanceof Error ? error.message : String(error);
    }
    expect(unknownKeyMessage).toBe("INVALID_EXACT_REFERENCE:input.$shape");
    expect(unknownKeyMessage).not.toContain("rawPrivateValue");
    expect(unknownKeyMessage).not.toContain("private identifier payload");
  });

  it("does not mutate inputs and returns immutable matches", () => {
    const values = [
      {
        referenceId: "ref-1",
        documentId: "doc-1",
        ownerScope: OWNER_A,
        issuer: "AEAT",
        referenceType: "DEBT_KEY" as const,
        reference: "D-01",
      },
    ];
    const before = structuredClone(values);
    const index = createFiscalNotificationExactReferenceIndexV2(values);
    const matches = index.findExact({
      ownerScope: OWNER_A,
      issuer: "AEAT",
      referenceType: "DEBT_KEY",
      reference: "D01",
    });

    expect(values).toEqual(before);
    expect(Object.isFrozen(index)).toBe(true);
    expect(Object.isFrozen(matches)).toBe(true);
    expect(Object.isFrozen(matches[0])).toBe(true);
  });
});
