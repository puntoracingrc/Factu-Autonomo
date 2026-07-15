import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
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

  it.each(["390", "411", "490"])(
    "keeps the official instructions preview when Batch 13 Model %s has a verified thumbnail",
    (code) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        "OFFICIAL_DOCUMENT_PREVIEW",
      );
    },
  );

  it.each(["506", "508", "512", "518", "546", "553"])(
    "keeps the official document preview when Batch 14/15 Model %s has a verified thumbnail",
    (code) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        "OFFICIAL_DOCUMENT_PREVIEW",
      );
    },
  );

  it.each(["506", "508", "512", "518", "546", "553"])(
    "keeps the Batch 14/15 Model %s preview readable without black padding",
    (code) => {
      const content = officialContent(code);
      if (!content.thumbnail) throw new Error(`Missing thumbnail for ${code}`);
      const png = PNG.sync.read(
        readFileSync(
          new URL(
            `../../../public/${content.thumbnail.publicHref.slice(1)}`,
            import.meta.url,
          ),
        ),
      );
      expect([png.width, png.height]).toEqual([640, 640]);

      const pixelRatio = (
        startY: number,
        endY: number,
        predicate: (red: number, green: number, blue: number) => boolean,
      ) => {
        let matches = 0;
        let total = 0;
        for (let y = startY; y < endY; y += 1) {
          for (let x = 0; x < png.width; x += 1) {
            const offset = (y * png.width + x) * 4;
            total += 1;
            if (
              predicate(
                png.data[offset],
                png.data[offset + 1],
                png.data[offset + 2],
              )
            ) {
              matches += 1;
            }
          }
        }
        return matches / total;
      };
      const nearBlack = (red: number, green: number, blue: number) =>
        red < 24 && green < 24 && blue < 24;
      const visibleInk = (red: number, green: number, blue: number) =>
        red < 245 || green < 245 || blue < 245;

      expect(pixelRatio(0, 64, nearBlack), code).toBeLessThan(0.05);
      expect(pixelRatio(576, 640, nearBlack), code).toBeLessThan(0.05);
      expect(pixelRatio(0, 220, visibleInk), code).toBeGreaterThan(0.1);
      expect(pixelRatio(0, 640, visibleInk), code).toBeGreaterThan(0.1);
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
    ["798", "AEAT_HISTORICAL_PROCEDURE"],
    ["840", "AEAT_BROWSER_FORM"],
    ["848", "AEAT_BROWSER_FORM"],
    ["901", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["933", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["952", "AEAT_FORM_AND_FILE"],
    ["980", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["981", "AEAT_HISTORICAL_PROCEDURE"],
    ["990", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["991", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["992", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["993", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["995", "AEAT_FORM_AND_FILE"],
    ["996", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["997", "AEAT_FILE_UPLOAD"],
    ["A22", "AEAT_FORM_AND_FILE"],
    ["A23", "AEAT_BROWSER_FORM"],
    ["A24", "AEAT_BROWSER_FORM"],
  ] as const)(
    "uses the source-backed Batch 18 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["559", "AEAT_BROWSER_FORM"],
    ["560", "AEAT_BROWSER_FORM"],
    ["561", "AEAT_BROWSER_FORM"],
    ["562", "AEAT_BROWSER_FORM"],
    ["563", "AEAT_BROWSER_FORM"],
    ["566", "AEAT_BROWSER_FORM"],
    ["568", "AEAT_FORM_AND_FILE"],
    ["571", "AEAT_BROWSER_FORM"],
    ["572", "AEAT_BROWSER_FORM"],
    ["573", "AEAT_BROWSER_FORM"],
    ["576", "AEAT_FORM_AND_FILE"],
    ["581", "AEAT_BROWSER_FORM"],
    ["582", "AEAT_HISTORICAL_PROCEDURE"],
    ["583", "AEAT_BROWSER_FORM"],
    ["584", "AEAT_BROWSER_FORM"],
    ["585", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["586", "AEAT_HISTORICAL_PROCEDURE"],
    ["587", "AEAT_BROWSER_FORM"],
    ["588", "AEAT_BROWSER_FORM"],
    ["589", "AEAT_BROWSER_FORM"],
    ["590", "AEAT_BROWSER_FORM"],
    ["591", "AEAT_FORM_AND_FILE"],
    ["592", "AEAT_BROWSER_FORM"],
    ["593", "AEAT_BROWSER_FORM"],
    ["595", "AEAT_BROWSER_FORM"],
    ["596", "AEAT_BROWSER_FORM"],
    ["600", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["610", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["615", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["620", "AEAT_ADMINISTRATIVE_TRANSFER"],
  ] as const)(
    "uses the source-backed Batch 16 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["630", "AEAT_ADMINISTRATIVE_TRANSFER"],
    ["602", "AEAT_BROWSER_FORM"],
    ["604", "AEAT_BROWSER_FORM"],
    ["611", "AEAT_FILE_UPLOAD"],
    ["616", "AEAT_FILE_UPLOAD"],
    ["650", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["651", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["655", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["681", "AEAT_BROWSER_FORM"],
    ["682", "AEAT_BROWSER_FORM"],
    ["683", "AEAT_BROWSER_FORM"],
    ["684", "AEAT_BROWSER_FORM"],
    ["685", "AEAT_BROWSER_FORM"],
    ["695", "AEAT_FORM_AND_ADMINISTRATIVE_TRANSFER"],
    ["696", "AEAT_FORM_AND_FILE"],
    ["714", "AEAT_BROWSER_FORM"],
    ["718", "AEAT_BROWSER_FORM"],
    ["720", "AEAT_FORM_AND_FILE"],
    ["721", "AEAT_FORM_AND_WEB_SERVICE"],
    ["763", "AEAT_BROWSER_FORM"],
    ["770", "AEAT_BROWSER_FORM"],
    ["771", "AEAT_BROWSER_FORM"],
    ["780", "AEAT_BROWSER_FORM"],
    ["781", "AEAT_BROWSER_FORM"],
    ["791", "AEAT_BROWSER_FORM"],
    ["792", "AEAT_BROWSER_FORM"],
    ["793", "AEAT_BROWSER_FORM"],
    ["795", "AEAT_HISTORICAL_PROCEDURE"],
    ["796", "AEAT_HISTORICAL_PROCEDURE"],
    ["797", "AEAT_HISTORICAL_PROCEDURE"],
  ] as const)(
    "uses the source-backed Batch 17 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["347", "AEAT_FORM_AND_FILE"],
    ["349", "AEAT_FORM_AND_FILE"],
    ["353", "AEAT_FORM_AND_FILE"],
    ["360", "AEAT_FORM_AND_FILE"],
    ["361", "AEAT_FORM_AND_FILE"],
    ["364", "AEAT_BROWSER_FORM"],
    ["365", "AEAT_BROWSER_FORM"],
    ["368", "AEAT_ELECTRONIC_OFFICE"],
    ["369", "AEAT_FORM_AND_FILE"],
    ["379", "AEAT_FILE_AND_WEB_SERVICE"],
  ] as const)(
    "uses the source-backed Batch 12 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["380", "AEAT_BROWSER_FORM"],
    ["381", "AEAT_BROWSER_FORM"],
    ["410", "AEAT_BROWSER_FORM"],
    ["430", "AEAT_BROWSER_FORM"],
    ["480", "AEAT_BROWSER_FORM"],
    ["504", "AEAT_BROWSER_FORM"],
    ["505", "AEAT_ELECTRONIC_OFFICE"],
  ] as const)(
    "uses the source-backed Batch 13 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["507", "AEAT_BROWSER_FORM"],
    ["510", "AEAT_FORM_AND_FILE"],
    ["515", "AEAT_BROWSER_FORM"],
    ["517", "AEAT_BROWSER_FORM"],
    ["519", "AEAT_BROWSER_FORM"],
    ["520", "AEAT_BROWSER_FORM"],
  ] as const)(
    "uses the source-backed Batch 14 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["521", "AEAT_BROWSER_FORM"],
    ["522", "AEAT_FORM_AND_FILE"],
    ["523", "AEAT_ELECTRONIC_OFFICE"],
    ["524", "AEAT_BROWSER_FORM"],
    ["544", "AEAT_FILE_UPLOAD"],
    ["545", "AEAT_FILE_UPLOAD"],
    ["547", "AEAT_FORM_AND_FILE"],
    ["548", "AEAT_FORM_AND_FILE"],
  ] as const)(
    "uses the source-backed Batch 15 visual for Model %s",
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
    ["270", "AEAT_FILE_UPLOAD"],
    ["280", "AEAT_FILE_UPLOAD"],
    ["281", "AEAT_FORM_AND_FILE"],
    ["282", "AEAT_FORM_AND_FILE"],
    ["283", "AEAT_FORM_AND_FILE"],
    ["289", "AEAT_FORM_AND_WEB_SERVICE"],
    ["290", "AEAT_WEB_SERVICE"],
    ["291", "AEAT_FILE_UPLOAD"],
    ["294", "AEAT_FILE_UPLOAD"],
    ["295", "AEAT_FILE_UPLOAD"],
  ] as const)(
    "uses the source-backed Batch 10 visual for Model %s",
    (code, mode) => {
      expect(resolveFiscalModelOfficialVisualMode(officialContent(code))).toBe(
        mode,
      );
    },
  );

  it.each([
    ["296", "AEAT_FORM_AND_FILE"],
    ["303", "AEAT_BROWSER_FORM"],
    ["308", "AEAT_FORM_AND_FILE"],
    ["309", "AEAT_FORM_AND_FILE"],
    ["318", "AEAT_BROWSER_FORM"],
    ["319", "AEAT_BROWSER_FORM"],
    ["322", "AEAT_FORM_AND_FILE"],
    ["341", "AEAT_BROWSER_FORM"],
    ["345", "AEAT_FORM_AND_FILE"],
    ["346", "AEAT_FILE_UPLOAD"],
  ] as const)(
    "uses the source-backed Batch 11 visual for Model %s",
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
      ["FILE_UPLOAD", "WEB_SERVICE"],
      "SOURCE_DESCRIBED",
      "AEAT_FILE_AND_WEB_SERVICE",
    ],
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
          methods: ["FILE_UPLOAD", "ADMINISTRATIVE_TRANSFER"],
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
