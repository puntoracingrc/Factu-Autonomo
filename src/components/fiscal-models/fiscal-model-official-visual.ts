import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";

export type FiscalModelOfficialVisualMode =
  | "OFFICIAL_DOCUMENT_PREVIEW"
  | "AEAT_ELECTRONIC_OFFICE"
  | "AEAT_OFFICIAL_INFORMATION";

export function resolveFiscalModelOfficialVisualMode(
  content: PublicAeatOfficialModelContentV1,
): FiscalModelOfficialVisualMode {
  if (content.thumbnail) return "OFFICIAL_DOCUMENT_PREVIEW";

  const sourceById = new Map(
    content.sources.map((source) => [source.id, source] as const),
  );
  const hasVerifiedAeatProcedure = content.links.some((link) => {
    if (link.category !== "PROCEDURE") return false;
    const source = sourceById.get(link.sourceId);
    return (
      source?.authority === "AEAT" &&
      (source.kind === "PROCEDURE_HOME" ||
        source.kind === "PROCEDURE_RECORD")
    );
  });

  return hasVerifiedAeatProcedure
    ? "AEAT_ELECTRONIC_OFFICE"
    : "AEAT_OFFICIAL_INFORMATION";
}
