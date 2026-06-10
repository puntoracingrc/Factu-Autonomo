import { describe, expect, it } from "vitest";
import {
  addDocumentPhrase,
  defaultPhraseForType,
  normalizeDocumentPhrases,
  phrasesForType,
  removeDocumentPhrase,
  setDefaultDocumentPhrase,
  updateDocumentPhrase,
} from "./document-phrases";

describe("document-phrases", () => {
  it("normaliza frases vacías", () => {
    expect(normalizeDocumentPhrases()).toEqual({
      phrases: [],
      defaultPhraseId: {},
    });
  });

  it("filtra frases por tipo y predeterminada", () => {
    let settings = normalizeDocumentPhrases();
    settings = addDocumentPhrase(
      settings,
      "presupuesto",
      "Pago del 50% por anticipado, resto al finalizar la instalación.",
    );
    const phrase = phrasesForType(settings, "presupuesto")[0];
    settings = setDefaultDocumentPhrase(settings, "presupuesto", phrase.id);

    expect(phrasesForType(settings, "factura")).toHaveLength(0);
    expect(defaultPhraseForType(settings, "presupuesto")?.text).toContain("50%");
  });

  it("elimina la predeterminada al borrar la frase", () => {
    let settings = addDocumentPhrase(
      normalizeDocumentPhrases(),
      "factura",
      "Gracias por su confianza.",
    );
    const phrase = phrasesForType(settings, "factura")[0];
    settings = setDefaultDocumentPhrase(settings, "factura", phrase.id);
    settings = updateDocumentPhrase(settings, phrase.id, "Pago a 30 días.");
    settings = removeDocumentPhrase(settings, phrase.id);

    expect(settings.defaultPhraseId.factura).toBeUndefined();
    expect(phrasesForType(settings, "factura")).toHaveLength(0);
  });
});
