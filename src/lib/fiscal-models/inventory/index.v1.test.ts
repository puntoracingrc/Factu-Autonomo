import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getOfficialAeatModelInventoryV1,
  listOfficialAeatModelInventoryV1,
} from "./index.v1";
import { AEAT_OFFICIAL_INDEX_RELEASE_V1 } from "./official-aeat-index.release.v1";

const EXPECTED_CODES =
  `01 01C 04 05 06 030 035 036 038 039 040 043 044 045 100 102 111 113 115 117 121 122 123 124 126 128 130 131 136 140 143 145 146 147 149 150 151 156 159 165 170 171 172 173 174 179 180 181 182 184 185 186 187 188 189 190 192 193 194 195 196 198 199 200 202 206 210 211 213 216 217 220 221 222 226 228 230 231 232 233 234 235 236 237 238 239 240 241 242 247 270 280 281 282 283 289 290 291 294 295 296 303 308 309 318 319 322 341 345 346 347 349 353 360 361 364 365 368 369 379 380 381 390 410 411 430 480 490 504 505 506 507 508 510 512 515 517 518 519 520 521 522 523 524 544 545 546 547 548 553 559 560 561 562 563 566 568 571 572 573 576 581 582 583 584 585 586 587 588 589 590 591 592 593 595 596 600 610 615 620 630 602 604 611 616 650 651 655 681 682 683 684 685 695 696 714 718 720 721 763 770 771 780 781 791 792 793 795 796 797 798 840 848 901 933 952 980 981 990 991 992 993 995 996 997 A22 A23 A24`.split(
    " ",
  );

describe("official AEAT model inventory v1", () => {
  it("preserves the exact versioned source evidence", () => {
    expect(AEAT_OFFICIAL_INDEX_RELEASE_V1).toMatchObject({
      schemaVersion: "aeat-model-inventory.v1",
      releaseId: "aeat-declarations-by-model-2026-07-08.v1",
      source: {
        id: "aeat.declarations-by-model.2026-07-08",
        authority: "AEAT",
        title: "Presentar y consultar declaraciones por modelo",
        canonicalUrl:
          "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
        sourceUpdatedOn: "2026-07-08",
        verifiedOn: "2026-07-12",
        sourceSha256:
          "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
        reviewStatus: "PENDING_REVIEW",
      },
    });
  });

  it("contains exactly 218 explicit source rows and 228 unique identifiers", () => {
    const { rows, records } = AEAT_OFFICIAL_INDEX_RELEASE_V1;
    const codes = records.map((record) => record.code);

    expect(rows).toHaveLength(218);
    expect(records).toHaveLength(228);
    expect(codes).toEqual(EXPECTED_CODES);
    expect(new Set(codes).size).toBe(228);
    expect(rows.flatMap((row) => row.codes)).toEqual(EXPECTED_CODES);

    for (const row of rows) {
      const codesWrittenByAeat =
        row.sourceRowLabel.match(/A\d{2}|\d{2,3}[A-Z]?/g);
      expect(codesWrittenByAeat, row.sourceRowLabel).toEqual(row.codes);
    }
  });

  it("keeps source facts exact without inferring validity, category, or duties", () => {
    const result = listOfficialAeatModelInventoryV1();
    expect(result.status).toBe("REVIEW_ONLY");
    if (result.status !== "REVIEW_ONLY") return;

    for (const record of result.data) {
      expect(record).toMatchObject({
        identityStatus: "SOURCE_CAPTURED",
        procedureHrefStatus: "SOURCE_CAPTURED",
        validityStatus: "SOURCE_PENDING",
        lifecycleStatus: "UNDETERMINED",
        reviewStatus: "PENDING_REVIEW",
        contentLevel: "STRUCTURAL_INDEX_ONLY",
      });
      expect(record).not.toHaveProperty("category");
      expect(record).not.toHaveProperty("obligations");
      expect(record).not.toHaveProperty("deadlines");
      expect(record).not.toHaveProperty("amounts");
      expect(record).not.toHaveProperty("filingHref");
      expect(record).not.toHaveProperty("href");
    }

    expect(getOfficialAeatModelInventoryV1({ code: "130" })).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        officialName:
          "IRPF. Empresarios y profesionales en Estimación Directa. Pago fraccionado.",
      },
    });
    expect(getOfficialAeatModelInventoryV1({ code: "349" })).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        officialName:
          "IVA. Declaración recapitulativa de operaciones intracomunitarias.",
      },
    });
    expect(getOfficialAeatModelInventoryV1({ code: "A24" })).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        officialName:
          "II. EE. Solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
      },
    });
  });

  it("preserves grouped rows without expanding implicit ranges", () => {
    const model360 = getOfficialAeatModelInventoryV1({ code: "360" });
    const model361 = getOfficialAeatModelInventoryV1({ code: "361" });
    const model600 = getOfficialAeatModelInventoryV1({ code: "600" });

    expect(model360).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        sourceRowLabel: "Modelo 360 - 361",
        sourceGroupCodes: ["360", "361"],
      },
    });
    expect(model361).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        sourceRowLabel: "Modelo 360 - 361",
        sourceGroupCodes: ["360", "361"],
      },
    });
    expect(model600).toMatchObject({
      status: "REVIEW_ONLY",
      data: {
        sourceRowLabel: "Modelo 600-610-615-620-630",
        sourceGroupCodes: ["600", "610", "615", "620", "630"],
      },
    });
    expect(getOfficialAeatModelInventoryV1({ code: "601" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_NOT_FOUND",
    });
  });

  it("allows only exact official HTTPS references", () => {
    const sourceUrl = new URL(
      AEAT_OFFICIAL_INDEX_RELEASE_V1.source.canonicalUrl,
    );
    expect(sourceUrl).toMatchObject({
      protocol: "https:",
      hostname: "sede.agenciatributaria.gob.es",
      port: "",
      username: "",
      password: "",
    });

    for (const record of AEAT_OFFICIAL_INDEX_RELEASE_V1.records) {
      const url = new URL(record.officialProcedureHref);
      expect(url.protocol, record.code).toBe("https:");
      expect(url.hostname, record.code).toBe("sede.agenciatributaria.gob.es");
      expect(url.port, record.code).toBe("");
      expect(url.username, record.code).toBe("");
      expect(url.password, record.code).toBe("");
      expect(url.pathname, record.code).toMatch(
        /^\/Sede\/procedimientoini\/[A-Z0-9]+\.shtml$/,
      );
    }
  });

  it("blocks unknown and malformed inputs without coercion or fallback", () => {
    for (const code of ["037", "999", "A25", "99X"]) {
      expect(getOfficialAeatModelInventoryV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "MODEL_NOT_FOUND",
      });
    }

    for (const code of ["01c", "A22 ", "130\n", "０３６", "1", "1234"]) {
      expect(getOfficialAeatModelInventoryV1({ code })).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }

    let getterCalls = 0;
    const accessor = {};
    Object.defineProperty(accessor, "code", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return "130";
      },
    });

    for (const input of [
      null,
      undefined,
      [],
      {},
      { code: 130 },
      { code: "130", extra: true },
      Object.create({ code: "130" }),
      { [Symbol("code")]: "130" },
      accessor,
    ]) {
      expect(getOfficialAeatModelInventoryV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
    expect(getterCalls).toBe(0);
  });

  it("returns fresh deeply frozen records that consumers cannot corrupt", () => {
    const first = getOfficialAeatModelInventoryV1({ code: "360" });
    const second = getOfficialAeatModelInventoryV1({ code: "360" });
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    if (first.status !== "REVIEW_ONLY" || second.status !== "REVIEW_ONLY") {
      return;
    }

    expect(first.data).not.toBe(second.data);
    expect(first.data.sourceGroupCodes).not.toBe(second.data.sourceGroupCodes);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.data)).toBe(true);
    expect(Object.isFrozen(first.data.sourceGroupCodes)).toBe(true);
    expect(Object.isFrozen(AEAT_OFFICIAL_INDEX_RELEASE_V1)).toBe(true);
    expect(Object.isFrozen(AEAT_OFFICIAL_INDEX_RELEASE_V1.source)).toBe(true);
    expect(Object.isFrozen(AEAT_OFFICIAL_INDEX_RELEASE_V1.rows)).toBe(true);
    expect(Object.isFrozen(AEAT_OFFICIAL_INDEX_RELEASE_V1.records)).toBe(true);
    expect(() => {
      (first.data.sourceGroupCodes as unknown as string[]).push("362");
    }).toThrow(TypeError);
    expect(getOfficialAeatModelInventoryV1({ code: "360" })).toEqual(second);
  });

  it("stays deterministic, local, and isolated from fiscal engines", () => {
    const source = [
      readFileSync(
        new URL("./official-aeat-index.release.v1.ts", import.meta.url),
        "utf8",
      ),
      readFileSync(new URL("./index.v1.ts", import.meta.url), "utf8"),
    ].join("\n");

    expect(source).not.toMatch(/\bfetch\s*\(|Date\.now|process\.env/);
    expect(source).not.toMatch(/node:fs|localStorage|sessionStorage|supabase/i);
    expect(source).not.toMatch(
      /fiscal-calendar|fiscal-notifications|AppStore|BusinessProfile|tax-engine|taxes\.ts|verifactu/i,
    );
    expect(source).not.toMatch(/\b(?:AVAILABLE|CURRENT|APPROVED)\b/);
  });
});
