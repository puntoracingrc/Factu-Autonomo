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
];

describe("public AEAT official model content v1", () => {
  it("publishes exactly the reviewed official-content catalog", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;
    expect(result.data.map((entry) => entry.code)).toEqual(EXPECTED_CODES);
    expect(new Set(result.data.map((entry) => entry.code)).size).toBe(21);
    for (const entry of result.data) {
      expect(entry).toMatchObject({
        contentStatus: "OFFICIAL_INFORMATION",
        sourceVerificationStatus: "VERIFIED",
        applicabilityStatus: "NOT_EVALUATED",
        lifecycleStatus: "UNDETERMINED",
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
        expect([
          "sede.agenciatributaria.gob.es",
          "www.boe.es",
        ]).toContain(url.hostname);
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
