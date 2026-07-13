import { describe, expect, it } from "vitest";
import { resolvePublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages";
import {
  resolveFiscalModelOfficialVisualMode,
  type FiscalModelOfficialVisualMode,
} from "./fiscal-model-official-visual";

function officialContent(code: string) {
  const result = resolvePublicAeatOfficialModelContentV1({ code });
  expect(result.status).toBe("OFFICIAL_INFORMATION");
  if (result.status !== "OFFICIAL_INFORMATION") {
    throw new Error(`Missing official test content for model ${code}`);
  }
  return result.data;
}

describe("FiscalModelOfficialVisual", () => {
  it.each(["037", "145", "200", "206", "220"])(
    "keeps the official PDF preview when Model %s has a verified thumbnail",
    (code) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        "OFFICIAL_DOCUMENT_PREVIEW",
      );
    },
  );

  it("uses the electronic-office visual only for an explicit AEAT procedure source", () => {
    expect(resolveFiscalModelOfficialVisualMode(officialContent("149"))).toBe(
      "AEAT_ELECTRONIC_OFFICE",
    );
  });

  it.each([
    ["186", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["187", "AEAT_FORM_AND_FILE"],
    ["188", "AEAT_FORM_AND_FILE"],
    ["189", "AEAT_FILE_UPLOAD"],
    ["190", "AEAT_FORM_AND_FILE"],
    ["192", "AEAT_FILE_UPLOAD"],
    ["193", "AEAT_FORM_AND_FILE"],
    ["194", "AEAT_FILE_UPLOAD"],
    ["195", "AEAT_FILE_UPLOAD"],
    ["196", "AEAT_WEB_SERVICE"],
  ] as const)(
    "uses the source-backed Batch 6 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["217", "AEAT_BROWSER_FORM"],
    ["221", "AEAT_BROWSER_FORM"],
    ["222", "AEAT_FORM_AND_FILE"],
    ["226", "AEAT_FORM_AND_FILE"],
    ["228", "AEAT_FORM_AND_FILE"],
    ["230", "AEAT_BROWSER_FORM"],
    ["231", "AEAT_FORM_AND_WEB_SERVICE"],
    ["232", "AEAT_FORM_AND_FILE"],
    ["233", "AEAT_FORM_AND_FILE"],
  ] as const)(
    "uses the source-backed Batch 8 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["234", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["235", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["236", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["237", "AEAT_BROWSER_FORM"],
    ["238", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["239", "AEAT_FUTURE_CHANNEL"],
    ["240", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["241", "AEAT_FORM_FILE_AND_WEB_SERVICE"],
    ["242", "AEAT_BROWSER_FORM"],
    ["247", "OFFICIAL_DOCUMENT_PREVIEW"],
  ] as const)(
    "uses the source-backed Batch 9 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["198", "AEAT_FORM_AND_FILE"],
    ["199", "AEAT_FILE_UPLOAD"],
    ["202", "AEAT_FORM_AND_FILE"],
    ["210", "AEAT_FORM_AND_FILE"],
    ["211", "AEAT_FORM_AND_FILE"],
    ["213", "AEAT_FORM_AND_FILE"],
    ["216", "AEAT_FORM_AND_FILE"],
  ] as const)(
    "uses the source-backed Batch 7 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    [["BROWSER_FORM"], "SOURCE_DESCRIBED", "AEAT_BROWSER_FORM"],
    [["FILE_UPLOAD"], "SOURCE_DESCRIBED", "AEAT_FILE_UPLOAD"],
    [["WEB_SERVICE"], "SOURCE_DESCRIBED", "AEAT_WEB_SERVICE"],
    [
      ["ADMINISTRATIVE_TRANSFER"],
      "SOURCE_DESCRIBED",
      "AEAT_ADMINISTRATIVE_TRANSFER",
    ],
    [["BROWSER_FORM", "FILE_UPLOAD"], "SOURCE_DESCRIBED", "AEAT_FORM_AND_FILE"],
    [
      ["BROWSER_FORM", "WEB_SERVICE"],
      "SOURCE_DESCRIBED",
      "AEAT_FORM_AND_WEB_SERVICE",
    ],
    [
      ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
      "SOURCE_DESCRIBED",
      "AEAT_FORM_FILE_AND_WEB_SERVICE",
    ],
    [["WEB_SERVICE"], "SOURCE_DESCRIBED_FUTURE", "AEAT_FUTURE_CHANNEL"],
    [
      ["ADMINISTRATIVE_TRANSFER"],
      "SOURCE_DESCRIBED_FUTURE",
      "AEAT_FUTURE_CHANNEL",
    ],
    [
      ["BROWSER_FORM", "WEB_SERVICE"],
      "SOURCE_DESCRIBED_HISTORICAL",
      "AEAT_HISTORICAL_PROCEDURE",
    ],
  ] as const)(
    "renders %s as the source-backed %s visual",
    (methods, status, expectedMode) => {
      const content = officialContent("149");
      expect(
        resolveFiscalModelOfficialVisualMode({
          ...content,
          accessMethods: {
            methods,
            status,
            sourceIds: [content.sources[0].id],
            semantics: "OFFICIAL_INFORMATION_ONLY",
          },
        }),
      ).toBe(expectedMode);
    },
  );

  it("fails closed to the generic procedure visual for an unrepresented channel combination", () => {
    const content = officialContent("149");
    expect(
      resolveFiscalModelOfficialVisualMode({
        ...content,
        accessMethods: {
          methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
          status: "SOURCE_DESCRIBED",
          sourceIds: [content.sources[0].id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      }),
    ).toBe("AEAT_ELECTRONIC_OFFICE");
  });

  it("fails closed to neutral official information without a confirmed procedure link", () => {
    const content = officialContent("149");
    const withoutProcedure = {
      ...content,
      links: content.links.filter((link) => link.category !== "PROCEDURE"),
    };
    const mode: FiscalModelOfficialVisualMode =
      resolveFiscalModelOfficialVisualMode(withoutProcedure);

    expect(mode).toBe("AEAT_OFFICIAL_INFORMATION");
  });
});
