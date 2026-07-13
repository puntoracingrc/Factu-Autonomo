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
  it("keeps the official PDF preview when a verified thumbnail exists", () => {
    expect(resolveFiscalModelOfficialVisualMode(officialContent("145"))).toBe(
      "OFFICIAL_DOCUMENT_PREVIEW",
    );
  });

  it("uses the electronic-office visual only for an explicit AEAT procedure source", () => {
    expect(resolveFiscalModelOfficialVisualMode(officialContent("149"))).toBe(
      "AEAT_ELECTRONIC_OFFICE",
    );
  });

  it.each([
    [["BROWSER_FORM"], "SOURCE_DESCRIBED", "AEAT_BROWSER_FORM"],
    [["FILE_UPLOAD"], "SOURCE_DESCRIBED", "AEAT_FILE_UPLOAD"],
    [["WEB_SERVICE"], "SOURCE_DESCRIBED", "AEAT_WEB_SERVICE"],
    [
      ["BROWSER_FORM", "FILE_UPLOAD"],
      "SOURCE_DESCRIBED",
      "AEAT_FORM_AND_FILE",
    ],
    [["WEB_SERVICE"], "SOURCE_DESCRIBED_FUTURE", "AEAT_FUTURE_SERVICE"],
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
          methods: ["BROWSER_FORM", "WEB_SERVICE"],
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
