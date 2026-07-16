import { describe, expect, it } from "vitest";
import {
  buildSensitiveReferenceExactIndexKeyV2,
  createSensitiveReferenceV2,
  isSensitiveReferenceV2,
  normalizeSensitiveReferenceForFingerprintV2,
  sensitiveReferenceSafeLabelV2,
  snapshotSensitiveReferenceV2,
  type SensitiveReferenceV2,
} from "./sensitive-reference.v2";

const OWNER = "user:00000000-0000-4000-8000-000000000061";
const OTHER_OWNER = "user:00000000-0000-4000-8000-000000000062";

describe("sensitive administrative references v2", () => {
  it("normalizes separators without losing significant characters", () => {
    expect(normalizeSensitiveReferenceForFingerprintV2(" 00-a/01.Z-5 ")).toBe(
      "00A01Z5",
    );
    expect(normalizeSensitiveReferenceForFingerprintV2("00001-A")).not.toBe(
      normalizeSensitiveReferenceForFingerprintV2("0001-A"),
    );
    expect(normalizeSensitiveReferenceForFingerprintV2("A-01")).not.toBe(
      normalizeSensitiveReferenceForFingerprintV2("A-01-B"),
    );
  });

  it("persists only a partitioned digest and returns opaque labels/index keys", async () => {
    const printedValue = "CSV-SYNTHETIC-00-A";
    const reference = await createSensitiveReferenceV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "CSV",
      printedValue,
    });

    expect(reference).toMatchObject({
      storage: "FINGERPRINT_ONLY",
      referenceType: "CSV",
      fingerprintSha256: expect.stringMatching(/^[0-9a-f]{64}$/u),
    });
    expect(JSON.stringify(reference)).not.toContain(printedValue);
    expect(JSON.stringify(reference)).not.toContain(OWNER);
    expect(sensitiveReferenceSafeLabelV2(reference)).toBe("CSV protegido");
    const key = await buildSensitiveReferenceExactIndexKeyV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      reference: reference!,
    });
    expect(key).toMatch(/^[0-9a-f]{64}$/u);
    expect(key).not.toContain(OWNER);
    expect(key).not.toContain(printedValue);

    const normalized = normalizeSensitiveReferenceForFingerprintV2(printedValue)!;
    const globalValueOnlyDigest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(normalized),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    expect(reference?.fingerprintSha256).not.toBe(globalValueOnlyDigest);
  });

  it("is deterministic only inside one owner/issuer/type partition", async () => {
    const [first, equivalent, foreignOwner, foreignIssuer, foreignType] =
      await Promise.all([
        createSensitiveReferenceV2({
          ownerScope: OWNER,
          issuerCode: "AEAT",
          referenceType: "NRC",
          printedValue: "NRC 0000 SYNTH",
        }),
        createSensitiveReferenceV2({
          ownerScope: OWNER,
          issuerCode: "AEAT",
          referenceType: "NRC",
          printedValue: "nrc-0000-synth",
        }),
        createSensitiveReferenceV2({
          ownerScope: OTHER_OWNER,
          issuerCode: "AEAT",
          referenceType: "NRC",
          printedValue: "NRC 0000 SYNTH",
        }),
        createSensitiveReferenceV2({
          ownerScope: OWNER,
          issuerCode: "TGSS",
          referenceType: "NRC",
          printedValue: "NRC 0000 SYNTH",
        }),
        createSensitiveReferenceV2({
          ownerScope: OWNER,
          issuerCode: "AEAT",
          referenceType: "CSV",
          printedValue: "NRC 0000 SYNTH",
        }),
      ]);

    expect(first).not.toBeNull();
    expect(first).toEqual(equivalent);
    expect(first?.fingerprintSha256).not.toBe(
      foreignOwner?.fingerprintSha256,
    );
    expect(first?.fingerprintSha256).not.toBe(
      foreignIssuer?.fingerprintSha256,
    );
    expect(first?.fingerprintSha256).not.toBe(
      foreignType?.fingerprintSha256,
    );

    const key = await buildSensitiveReferenceExactIndexKeyV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      reference: first!,
    });
    const foreignKey = await buildSensitiveReferenceExactIndexKeyV2({
      ownerScope: OTHER_OWNER,
      issuerCode: "AEAT",
      reference: first!,
    });
    expect(key).not.toBe(foreignKey);
  });

  it("enforces type-specific minimum length and diversity", async () => {
    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "AEAT",
        referenceType: "CSV",
        printedValue: "A-1",
      }),
    ).toBeNull();
    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "AEAT",
        referenceType: "NRC",
        printedValue: "AAAAAAAAAAAA",
      }),
    ).toBeNull();
    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "BANK",
        referenceType: "BANK_REFERENCE",
        printedValue: "12345678",
      }),
    ).toMatchObject({ referenceType: "BANK_REFERENCE" });
    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "BANK",
        referenceType: "BANK_REFERENCE",
        printedValue: "11111111",
      }),
    ).toBeNull();
  });

  it("accepts canonical UUIDv7 and synthetic opaque owners consistently", async () => {
    for (const ownerScope of [
      "user:019f7e00-0000-7000-8000-000000000001",
      "user:synthetic-owner",
    ]) {
      await expect(
        createSensitiveReferenceV2({
          ownerScope,
          issuerCode: "AEAT",
          referenceType: "CSV",
          printedValue: "CSV-SYNTHETIC-00-A",
        }),
      ).resolves.toMatchObject({ referenceType: "CSV" });
    }
  });

  it("rejects non-canonical or PII-like partition identifiers", async () => {
    for (const candidate of [
      {
        ownerScope: OWNER.toUpperCase(),
        issuerCode: "AEAT",
      },
      {
        ownerScope: OWNER,
        issuerCode: "aeat",
      },
      {
        ownerScope: OWNER,
        issuerCode: "Agencia Tributaria",
      },
      {
        ownerScope: "user:00000000T",
        issuerCode: "AEAT",
      },
      {
        ownerScope: "user:ES0000000000000000000000",
        issuerCode: "AEAT",
      },
      {
        ownerScope: "user:juan.perez",
        issuerCode: "AEAT",
      },
      {
        ownerScope: "user:019f7e00-0000-0000-8000-000000000001",
        issuerCode: "AEAT",
      },
      {
        ownerScope: "user:019f7e00-0000-f000-8000-000000000001",
        issuerCode: "AEAT",
      },
    ]) {
      expect(
        await createSensitiveReferenceV2({
          ...candidate,
          referenceType: "CSV",
          printedValue: "CSV-SYNTHETIC-00-A",
        }),
      ).toBeNull();
    }
  });

  it("rejects hostile envelopes without invoking accessors", async () => {
    let reads = 0;
    const hostileCreate: Record<string, unknown> = {
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "CSV",
    };
    Object.defineProperty(hostileCreate, "printedValue", {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("private printed value");
      },
    });
    expect(
      await createSensitiveReferenceV2(
        hostileCreate as unknown as Parameters<
          typeof createSensitiveReferenceV2
        >[0],
      ),
    ).toBeNull();
    expect(reads).toBe(0);

    const reference = await createSensitiveReferenceV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "CSV",
      printedValue: "CSV-SYNTHETIC-00-A",
    });
    expect(reference).not.toBeNull();

    const hostileReference: Record<string, unknown> = {
      storage: "FINGERPRINT_ONLY",
      referenceType: "CSV",
    };
    Object.defineProperty(hostileReference, "fingerprintSha256", {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error("private digest getter");
      },
    });
    expect(isSensitiveReferenceV2(hostileReference)).toBe(false);
    expect(snapshotSensitiveReferenceV2(hostileReference)).toBeNull();
    expect(sensitiveReferenceSafeLabelV2(hostileReference)).toBe(
      "referencia protegida",
    );
    expect(reads).toBe(0);

    const hostileBuild: Record<string, unknown> = {
      ownerScope: OWNER,
      issuerCode: "AEAT",
    };
    Object.defineProperty(hostileBuild, "reference", {
      enumerable: true,
      get() {
        reads += 1;
        return reference;
      },
    });
    expect(
      await buildSensitiveReferenceExactIndexKeyV2(
        hostileBuild as unknown as Parameters<
          typeof buildSensitiveReferenceExactIndexKeyV2
        >[0],
      ),
    ).toBeNull();
    expect(reads).toBe(0);
  });

  it("rejects unknown keys, symbols, exotic records and malformed digests", async () => {
    const reference = await createSensitiveReferenceV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "CSV",
      printedValue: "CSV-SYNTHETIC-00-A",
    });
    expect(reference).not.toBeNull();
    expect(isSensitiveReferenceV2({ ...reference, rawValue: "private" })).toBe(
      false,
    );
    expect(
      isSensitiveReferenceV2({ ...reference, fingerprintSha256: "x" }),
    ).toBe(false);

    const symbolDecorated = { ...reference } as Record<PropertyKey, unknown>;
    symbolDecorated[Symbol("private")] = "private";
    expect(isSensitiveReferenceV2(symbolDecorated)).toBe(false);

    const exotic = Object.assign(Object.create({ inherited: true }), reference);
    expect(isSensitiveReferenceV2(exotic)).toBe(false);

    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "AEAT",
        referenceType: "CSV",
        printedValue: "CSV-SYNTHETIC-00-A",
        rawValue: "private",
      } as unknown as Parameters<typeof createSensitiveReferenceV2>[0]),
    ).toBeNull();
  });

  it("fails closed without echoing an invalid value", async () => {
    const invalid = "secret\u0000value";
    expect(
      await createSensitiveReferenceV2({
        ownerScope: OWNER,
        issuerCode: "BANK",
        referenceType: "BANK_REFERENCE",
        printedValue: invalid,
      }),
    ).toBeNull();
    expect(normalizeSensitiveReferenceForFingerprintV2(" - / . ")).toBeNull();
  });

  it("returns an immutable defensive snapshot", async () => {
    const reference = await createSensitiveReferenceV2({
      ownerScope: OWNER,
      issuerCode: "AEAT",
      referenceType: "CSV",
      printedValue: "CSV-SYNTHETIC-00-A",
    });
    const snapshot = snapshotSensitiveReferenceV2(reference);
    expect(snapshot).toEqual(reference);
    expect(snapshot).not.toBe(reference);
    expect(Object.isFrozen(reference)).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(
      isSensitiveReferenceV2(snapshot as Readonly<SensitiveReferenceV2>),
    ).toBe(true);

    const nullPrototype = Object.assign(Object.create(null), reference);
    const nullPrototypeSnapshot = snapshotSensitiveReferenceV2(nullPrototype);
    expect(nullPrototypeSnapshot).toEqual(reference);
    expect(Object.getPrototypeOf(nullPrototypeSnapshot)).toBe(Object.prototype);
  });
});
