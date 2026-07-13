import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  listPublicAeatOfficialModelContentsV1,
  resolvePublicAeatOfficialModelContentV1,
} from "./resolver.v1";

const EXPECTED_CODES = [
  "01",
  "01C",
  "04",
  "05",
  "06",
  "030",
  "035",
  "036",
  "038",
  "039",
  "040",
  "043",
  "044",
  "045",
  "100",
  "102",
  "111",
  "113",
  "115",
  "117",
  "121",
  "122",
  "123",
  "124",
  "126",
  "128",
  "130",
  "131",
  "136",
  "140",
  "143",
  "145",
  "146",
  "147",
  "149",
  "150",
  "151",
  "156",
  "159",
  "165",
  "170",
  "171",
  "172",
  "173",
  "174",
  "179",
  "180",
  "181",
  "182",
  "184",
  "185",
  "186",
  "187",
  "188",
  "189",
  "190",
  "192",
  "193",
  "194",
  "195",
  "196",
];

describe("public AEAT official model content v1", () => {
  it("publishes exactly the reviewed official-content catalog", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;
    expect(result.data.map((entry) => entry.code)).toEqual(EXPECTED_CODES);
    expect(new Set(result.data.map((entry) => entry.code)).size).toBe(61);
    for (const entry of result.data) {
      expect(entry).toMatchObject({
        contentStatus: "OFFICIAL_INFORMATION",
        sourceVerificationStatus: "VERIFIED",
        applicabilityStatus: "NOT_EVALUATED",
        lifecycleStatus:
          entry.code === "150" || entry.code === "179"
            ? "HISTORICAL"
            : "UNDETERMINED",
        reviewedOn: "2026-07-13",
      });
      expect(entry.faq.length).toBeGreaterThanOrEqual(3);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.sources)).toBe(true);
      expect(Object.isFrozen(entry.faq)).toBe(true);
    }
  });

  it("rejects invalid, coerced, accessor and unknown inputs", () => {
    for (const input of [
      null,
      undefined,
      "01",
      { code: 1 },
      { code: "01", extra: true },
      { code: "01 " },
      { code: "01c" },
      { code: "1" },
      { code: "0001" },
      Object.create({ code: "01" }),
    ]) {
      expect(resolvePublicAeatOfficialModelContentV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
    expect(
      resolvePublicAeatOfficialModelContentV1({
        get code() {
          return "01";
        },
      }),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "037" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "191" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "999" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
  });

  it("keeps source provenance complete and internally referenced", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    if (result.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    for (const entry of result.data) {
      const sourceIds = new Set(entry.sources.map((source) => source.id));
      expect(sourceIds.size).toBe(entry.sources.length);
      for (const source of entry.sources) {
        const url = new URL(source.canonicalUrl);
        expect(url.protocol).toBe("https:");
        expect(["sede.agenciatributaria.gob.es", "www.boe.es"]).toContain(
          url.hostname,
        );
        expect(source.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
      for (const section of entry.sections) {
        for (const item of section.items) {
          expect(item.sourceIds.length).toBeGreaterThan(0);
          expect(item.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
        }
      }
      for (const item of entry.faq) {
        expect(item.question.length).toBeGreaterThan(0);
        expect(item.answer.length).toBeGreaterThan(0);
        expect(item.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
      }
      if (entry.accessMethods) {
        expect(entry.accessMethods.methods.length).toBeGreaterThan(0);
        expect(new Set(entry.accessMethods.methods).size).toBe(
          entry.accessMethods.methods.length,
        );
        expect(entry.accessMethods.sourceIds.length).toBeGreaterThan(0);
        expect(
          entry.accessMethods.sourceIds.every((id) => sourceIds.has(id)),
        ).toBe(true);
        expect(entry.accessMethods.semantics).toBe("OFFICIAL_INFORMATION_ONLY");
      }
    }
  });

  it("cannot be changed by a consumer mutation attempt", () => {
    const first = resolvePublicAeatOfficialModelContentV1({ code: "01" });
    if (first.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    const originalName = first.data.canonicalName;
    const originalQuestion = first.data.faq[0].question;
    expect(() => {
      (first.data as { canonicalName: string }).canonicalName = "mutado";
    }).toThrow();
    expect(() => {
      (first.data.faq[0] as { question: string }).question = "mutada";
    }).toThrow();
    const second = resolvePublicAeatOfficialModelContentV1({ code: "01" });
    expect(second.status).toBe("OFFICIAL_INFORMATION");
    if (second.status !== "OFFICIAL_INFORMATION") return;
    expect(second.data.canonicalName).toBe(originalName);
    expect(second.data.faq[0].question).toBe(originalQuestion);
  });

  it("keeps the source-backed access channels exact and immutable", () => {
    const expected = {
      "171": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "172": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "173": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "174": {
        methods: ["WEB_SERVICE"],
        status: "SOURCE_DESCRIBED_FUTURE",
      },
      "179": {
        methods: ["BROWSER_FORM", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
      "180": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "181": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "182": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "184": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "185": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "186": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "187": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "188": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "189": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "190": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "192": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "193": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "194": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "195": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "196": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
    } as const;

    for (const [code, access] of Object.entries(expected)) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.accessMethods).toMatchObject(access);
      expect(Object.isFrozen(result.data.accessMethods)).toBe(true);
      expect(Object.isFrozen(result.data.accessMethods?.methods)).toBe(true);
      expect(Object.isFrozen(result.data.accessMethods?.sourceIds)).toBe(true);
    }
  });

  it("preserves the source-backed Batch 6 distinctions", () => {
    const model187 = resolvePublicAeatOfficialModelContentV1({ code: "187" });
    const model194 = resolvePublicAeatOfficialModelContentV1({ code: "194" });
    const model196 = resolvePublicAeatOfficialModelContentV1({ code: "196" });
    expect(model187.status).toBe("OFFICIAL_INFORMATION");
    expect(model194.status).toBe("OFFICIAL_INFORMATION");
    expect(model196.status).toBe("OFFICIAL_INFORMATION");
    if (
      model187.status !== "OFFICIAL_INFORMATION" ||
      model194.status !== "OFFICIAL_INFORMATION" ||
      model196.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model187.data.canonicalName).toContain("derechos de suscripción");
    expect(
      model194.data.sources.map((source) => source.canonicalUrl),
    ).toContain("https://www.boe.es/buscar/act.php?id=BOE-A-1999-22309");
    expect(
      model194.data.sources.map((source) => source.canonicalUrl),
    ).not.toContain("https://www.boe.es/buscar/act.php?id=BOE-A-1999-22896");
    expect(model196.data.canonicalName).toContain(
      "Declaración Informativa mensual de cuentas",
    );
    expect(model196.data.sections.flatMap((section) => section.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("2026 y siguientes"),
        }),
      ]),
    );
    expect(model196.data.accessMethods).toMatchObject({
      methods: ["WEB_SERVICE"],
      status: "SOURCE_DESCRIBED",
    });
  });

  it("keeps the Model 180 certificate with active content external-only", () => {
    const result = resolvePublicAeatOfficialModelContentV1({ code: "180" });
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;

    const certificate = result.data.documents.find(
      (document) => document.id === "model-180-certificate-form",
    );
    expect(certificate).toMatchObject({
      activeContentStatus: "JAVASCRIPT_PRESENT",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    });
  });

  it("keeps thumbnails tied to hashed official documents or images", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    if (result.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    const thumbnailCodes = result.data
      .filter((entry) => entry.thumbnail !== null)
      .map((entry) => entry.code);
    expect(thumbnailCodes).toEqual([
      "01",
      "01C",
      "04",
      "06",
      "030",
      "035",
      "036",
      "039",
      "043",
      "044",
      "045",
      "102",
      "145",
      "146",
      "147",
      "150",
    ]);
    expect(
      result.data.find((entry) => entry.code === "038")?.thumbnail,
    ).toBeNull();
    expect(
      result.data.find((entry) => entry.code === "040")?.thumbnail,
    ).toBeNull();

    for (const entry of result.data) {
      if (!entry.thumbnail) continue;
      const file = readFileSync(
        new URL(
          `../../../../../public/${entry.thumbnail.publicHref.slice(1)}`,
          import.meta.url,
        ),
      );
      expect(createHash("sha256").update(file).digest("hex")).toBe(
        entry.thumbnail.sha256,
      );
    }
  });
});
