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
