import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";

export type FiscalModelOfficialVisualMode =
  | "OFFICIAL_DOCUMENT_PREVIEW"
  | "AEAT_BROWSER_FORM"
  | "AEAT_FILE_UPLOAD"
  | "AEAT_WEB_SERVICE"
  | "AEAT_ADMINISTRATIVE_TRANSFER"
  | "AEAT_FORM_AND_FILE"
  | "AEAT_FUTURE_CHANNEL"
  | "AEAT_HISTORICAL_PROCEDURE"
  | "AEAT_ELECTRONIC_OFFICE"
  | "AEAT_OFFICIAL_INFORMATION";

export function resolveFiscalModelOfficialVisualMode(
  content: PublicAeatOfficialModelContentV1,
): FiscalModelOfficialVisualMode {
  if (content.thumbnail) return "OFFICIAL_DOCUMENT_PREVIEW";

  if (content.accessMethods) {
    const methods = new Set(content.accessMethods.methods);
    if (content.accessMethods.status === "SOURCE_DESCRIBED_HISTORICAL") {
      return "AEAT_HISTORICAL_PROCEDURE";
    }
    if (content.accessMethods.status === "SOURCE_DESCRIBED_FUTURE") {
      return "AEAT_FUTURE_CHANNEL";
    }
    if (
      methods.size === 2 &&
      methods.has("BROWSER_FORM") &&
      methods.has("FILE_UPLOAD")
    ) {
      return "AEAT_FORM_AND_FILE";
    }
    if (methods.size === 1 && methods.has("BROWSER_FORM")) {
      return "AEAT_BROWSER_FORM";
    }
    if (methods.size === 1 && methods.has("FILE_UPLOAD")) {
      return "AEAT_FILE_UPLOAD";
    }
    if (methods.size === 1 && methods.has("WEB_SERVICE")) {
      return "AEAT_WEB_SERVICE";
    }
    if (methods.size === 1 && methods.has("ADMINISTRATIVE_TRANSFER")) {
      return "AEAT_ADMINISTRATIVE_TRANSFER";
    }
  }

  const sourceById = new Map(
    content.sources.map((source) => [source.id, source] as const),
  );
  const hasVerifiedAeatProcedure = content.links.some((link) => {
    if (link.category !== "PROCEDURE") return false;
    const source = sourceById.get(link.sourceId);
    return (
      source?.authority === "AEAT" &&
      (source.kind === "PROCEDURE_HOME" || source.kind === "PROCEDURE_RECORD")
    );
  });

  return hasVerifiedAeatProcedure
    ? "AEAT_ELECTRONIC_OFFICE"
    : "AEAT_OFFICIAL_INFORMATION";
}
