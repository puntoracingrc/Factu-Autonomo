import { describe, expect, it } from "vitest";
import {
  addDocumentPhrase,
  defaultPhraseForType,
  normalizeDocumentPhrases,
  phrasesForType,
  removeDocumentPhrase,
  saveDocumentPhraseForFutureUse,
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

  it("mantiene borradores vacios en ajustes y los limpia al guardar", () => {
    let settings = normalizeDocumentPhrases();
    settings = addDocumentPhrase(settings, "factura");

    expect(normalizeDocumentPhrases(settings, { keepEmpty: true }).phrases).toHaveLength(1);
    expect(normalizeDocumentPhrases(settings).phrases).toHaveLength(0);
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

  it("guarda una frase para usos futuros sin hacerla predeterminada", () => {
    const settings = saveDocumentPhraseForFutureUse(
      normalizeDocumentPhrases(),
      "recibo",
      "  Entregado a cuenta.  ",
    );

    expect(phrasesForType(settings, "recibo")).toMatchObject([
      { text: "Entregado a cuenta.", documentType: "recibo" },
    ]);
    expect(defaultPhraseForType(settings, "recibo")).toBeUndefined();
  });

  it("evita duplicados y puede dejar la frase existente como predeterminada", () => {
    let settings = saveDocumentPhraseForFutureUse(
      normalizeDocumentPhrases(),
      "presupuesto",
      "Validez de 30 días.",
    );
    settings = saveDocumentPhraseForFutureUse(
      settings,
      "presupuesto",
      " Validez de 30 días. ",
      true,
    );

    expect(phrasesForType(settings, "presupuesto")).toHaveLength(1);
    expect(defaultPhraseForType(settings, "presupuesto")?.text).toBe(
      "Validez de 30 días.",
    );
  });

  it("ignora frases vacías", () => {
    const settings = saveDocumentPhraseForFutureUse(
      normalizeDocumentPhrases(),
      "factura",
      "   ",
      true,
    );

    expect(settings).toEqual({ phrases: [], defaultPhraseId: {} });
  });
});
