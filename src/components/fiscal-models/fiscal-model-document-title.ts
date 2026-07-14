const DOCUMENT_TYPE_BY_CODE: Readonly<Record<string, "Formulario" | "Modelo">> =
  Object.freeze({
    "035": "Formulario",
  });

export function getFiscalModelDocumentType(
  code: string,
): "Formulario" | "Modelo" {
  return DOCUMENT_TYPE_BY_CODE[code] ?? "Modelo";
}

export function getFiscalModelDocumentTitle(code: string): string {
  return `${getFiscalModelDocumentType(code)} ${code}`;
}
