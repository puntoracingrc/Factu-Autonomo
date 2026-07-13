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
  "037",
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
  "198",
  "199",
  "200",
  "202",
  "206",
  "210",
  "211",
  "213",
  "216",
  "217",
  "220",
  "221",
  "222",
  "226",
  "228",
  "230",
  "231",
  "232",
  "233",
  "234",
  "235",
  "236",
  "237",
  "238",
  "239",
  "240",
  "241",
  "242",
  "247",
];

describe("public AEAT official model content v1", () => {
  it("publishes exactly the reviewed official-content catalog", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;
    expect(result.data.map((entry) => entry.code)).toEqual(EXPECTED_CODES);
    expect(new Set(result.data.map((entry) => entry.code)).size).toBe(91);
    for (const entry of result.data) {
      expect(entry).toMatchObject({
        contentStatus: "OFFICIAL_INFORMATION",
        sourceVerificationStatus: "VERIFIED",
        applicabilityStatus: "NOT_EVALUATED",
        lifecycleStatus:
          entry.code === "037" || entry.code === "150" || entry.code === "179"
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
    expect(resolvePublicAeatOfficialModelContentV1({ code: "270" })).toEqual({
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

  it("keeps every Batch 9 page useful and source-backed without evaluating applicability", () => {
    for (const code of [
      "234",
      "235",
      "236",
      "237",
      "238",
      "239",
      "240",
      "241",
      "242",
      "247",
    ]) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
      expect(result.data.externalNavigation, code).toBeNull();
    }
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
      "037": {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
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
      "198": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "199": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "200": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "202": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "206": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "210": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "211": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "213": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "216": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "217": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "220": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "221": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "222": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "226": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "228": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "230": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "231": {
        methods: ["WEB_SERVICE", "BROWSER_FORM"],
        status: "SOURCE_DESCRIBED",
      },
      "232": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "233": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "234": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "235": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "236": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "237": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "238": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "239": {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED_FUTURE",
      },
      "240": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "241": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "242": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "247": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
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

  it("preserves the source-backed Batch 7 lifecycle and document distinctions", () => {
    const model037 = resolvePublicAeatOfficialModelContentV1({ code: "037" });
    const model200 = resolvePublicAeatOfficialModelContentV1({ code: "200" });
    const model202 = resolvePublicAeatOfficialModelContentV1({ code: "202" });
    const model206 = resolvePublicAeatOfficialModelContentV1({ code: "206" });
    expect(model037.status).toBe("OFFICIAL_INFORMATION");
    expect(model200.status).toBe("OFFICIAL_INFORMATION");
    expect(model202.status).toBe("OFFICIAL_INFORMATION");
    expect(model206.status).toBe("OFFICIAL_INFORMATION");
    if (
      model037.status !== "OFFICIAL_INFORMATION" ||
      model200.status !== "OFFICIAL_INFORMATION" ||
      model202.status !== "OFFICIAL_INFORMATION" ||
      model206.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model037.data.lifecycleStatus).toBe("HISTORICAL");
    expect(model037.data.accessMethods?.status).toBe(
      "SOURCE_DESCRIBED_HISTORICAL",
    );
    expect(JSON.stringify(model037.data)).not.toContain("036");
    expect(model037.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "FORM",
          pageCount: 19,
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        }),
      ]),
    );
    expect(model037.data.thumbnail).toMatchObject({ pageNumber: 17 });

    expect(model200.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model200.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
    expect(model202.data.thumbnail).toBeNull();
    expect(model206.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model206.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
  });

  it("preserves the source-backed Batch 8 document, channel and version distinctions", () => {
    const model220 = resolvePublicAeatOfficialModelContentV1({ code: "220" });
    const model222 = resolvePublicAeatOfficialModelContentV1({ code: "222" });
    const model226 = resolvePublicAeatOfficialModelContentV1({ code: "226" });
    const model231 = resolvePublicAeatOfficialModelContentV1({ code: "231" });
    expect(model220.status).toBe("OFFICIAL_INFORMATION");
    expect(model222.status).toBe("OFFICIAL_INFORMATION");
    expect(model226.status).toBe("OFFICIAL_INFORMATION");
    expect(model231.status).toBe("OFFICIAL_INFORMATION");
    if (
      model220.status !== "OFFICIAL_INFORMATION" ||
      model222.status !== "OFFICIAL_INFORMATION" ||
      model226.status !== "OFFICIAL_INFORMATION" ||
      model231.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model220.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model220.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
    const model222Text = model222.data.sections
      .flatMap((section) => section.items)
      .map((item) => item.text)
      .join(" ");
    expect(model222Text).toContain("gestiones y la ayuda técnica");
    expect(model222Text).toContain("2026 y siguientes");
    expect(model222Text).toContain("instrucciones");
    expect(model222Text).toContain("2025 y siguientes");
    expect(model226.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "INSTRUCTIONS",
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        }),
      ]),
    );
    expect(model226.data.thumbnail).toBeNull();
    expect(model231.data.accessMethods).toMatchObject({
      methods: ["WEB_SERVICE", "BROWSER_FORM"],
      status: "SOURCE_DESCRIBED",
    });
    expect(model231.data.thumbnail).toBeNull();
  });

  it("preserves the source-backed Batch 9 channel and document distinctions", () => {
    const model236 = resolvePublicAeatOfficialModelContentV1({ code: "236" });
    const model239 = resolvePublicAeatOfficialModelContentV1({ code: "239" });
    const model240 = resolvePublicAeatOfficialModelContentV1({ code: "240" });
    const model241 = resolvePublicAeatOfficialModelContentV1({ code: "241" });
    const model242 = resolvePublicAeatOfficialModelContentV1({ code: "242" });
    const model247 = resolvePublicAeatOfficialModelContentV1({ code: "247" });
    for (const result of [
      model236,
      model239,
      model240,
      model241,
      model242,
      model247,
    ]) {
      expect(result.status).toBe("OFFICIAL_INFORMATION");
    }
    if (
      model236.status !== "OFFICIAL_INFORMATION" ||
      model239.status !== "OFFICIAL_INFORMATION" ||
      model240.status !== "OFFICIAL_INFORMATION" ||
      model241.status !== "OFFICIAL_INFORMATION" ||
      model242.status !== "OFFICIAL_INFORMATION" ||
      model247.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model236.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
      status: "SOURCE_DESCRIBED",
    });
    const model236Text = JSON.stringify(model236.data);
    expect(model236Text).toContain("disposición adicional vigésima cuarta");
    expect(model236Text).toContain("disposición adicional vigésima tercera");
    expect(model236Text).toContain("no la resuelve");
    expect(
      model236.data.sources.find(
        (source) =>
          source.id ===
          "boe.models-234-236.order-hac-342-2021.consolidated-2024-03-22",
      )?.sourceSha256,
    ).toBe("e49ba193ee0b2fb71ed3d189905e4d8101e8879c828eacd64807980733b7b185");
    expect(
      model236.data.sources.find(
        (source) => source.id === "boe.cross-border-mechanisms.law-10-2020",
      )?.sourceSha256,
    ).toBe("022489ce1497e28d96b1766834694e350b8188ed753bbc3e912e1e17f7701362");
    expect(model239.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM"],
      status: "SOURCE_DESCRIBED_FUTURE",
    });
    expect(
      model239.data.sources.find(
        (source) =>
          source.id === "boe.model-239.royal-decree-1065-2007-article-49-ter",
      ),
    ).toMatchObject({
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&p=20250402&tn=1#a4-4",
      officialUpdatedOn: "2025-04-02",
      sourceSha256:
        "34a9f6aa791b4b51089751a820cdf9fbb3eee1b51c065ccfef8172e3ea5a1c44",
    });
    expect(model239.data.links).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ label: expect.stringMatching(/presentar/i) }),
      ]),
    );
    expect(model240.data.documents).toHaveLength(2);
    expect(
      Object.fromEntries(
        model240.data.sources
          .filter((source) => source.authority === "BOE")
          .map((source) => [source.id, source.sourceSha256]),
      ),
    ).toMatchObject({
      "boe.complementary-tax.law-7-2024":
        "f18a569e552653c83ed9ff1111cf9fe30e98a1c4f3a13dd80ee3f96a66387d20",
      "boe.complementary-tax.royal-decree-252-2025":
        "96010894fc7db1b1d347fe263e52aeab7eec5dfe4de7355bee72cc7a91004d34",
      "boe.models-240-242.order-hac-1198-2025":
        "db4267865b9db046082376db5ccf9e7d0bf3cb7348f8989286c2d92c7364f30e",
    });
    expect(
      model240.data.sources.find(
        (source) => source.id === "boe.models-240-242.order-hac-1198-2025",
      ),
    ).toMatchObject({
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2025-21727&p=20260529&tn=1",
      officialUpdatedOn: "2026-05-29",
    });
    expect(model241.data.documents).toHaveLength(2);
    expect(
      model241.data.sources.some((source) =>
        source.canonicalUrl.includes("agenciatributaria.gob.aeat"),
      ),
    ).toBe(false);
    expect(model242.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM"],
      status: "SOURCE_DESCRIBED",
    });
    expect(model247.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "FORM",
          activeContentStatus: "JAVASCRIPT_PRESENT",
          formStatus: "ACROFORM_PRESENT",
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
          previewSuitability: "FORM_PREVIEW",
          usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        }),
      ]),
    );
    expect(model247.data.thumbnail).toMatchObject({
      pageNumber: 1,
      provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
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
      "037",
      "039",
      "043",
      "044",
      "045",
      "102",
      "145",
      "146",
      "147",
      "150",
      "200",
      "206",
      "220",
      "247",
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
