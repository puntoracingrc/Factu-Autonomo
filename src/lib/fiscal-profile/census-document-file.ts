export const MAX_CENSUS_DOCUMENT_BYTES = 4 * 1024 * 1024;
const MAX_CENSUS_DOCUMENT_PAGES = 80;
const MAX_CENSUS_DOCUMENT_TEXT_CHARS = 250_000;

type PdfjsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: unknown;
};

export type CensusDocumentFileErrorCode =
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_PDF"
  | "TOO_MANY_PAGES"
  | "NO_READABLE_TEXT";

export class CensusDocumentFileError extends Error {
  constructor(
    readonly code: CensusDocumentFileErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CensusDocumentFileError";
  }
}

function isPdf(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

async function hasPdfMagicBytes(file: File): Promise<boolean> {
  const prefix = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...prefix) === "%PDF-";
}

export async function readCensusDocumentText(file: File): Promise<string> {
  if (!isPdf(file)) {
    throw new CensusDocumentFileError(
      "UNSUPPORTED_FILE",
      "Selecciona un certificado censal en formato PDF.",
    );
  }
  if (file.size > MAX_CENSUS_DOCUMENT_BYTES) {
    throw new CensusDocumentFileError(
      "FILE_TOO_LARGE",
      "El PDF supera el límite de 4 MB.",
    );
  }
  if (!(await hasPdfMagicBytes(file))) {
    throw new CensusDocumentFileError(
      "INVALID_PDF",
      "El archivo seleccionado no es un PDF válido.",
    );
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as PdfjsWorkerGlobal).pdfjsWorker ??= pdfjsWorker;

  let document: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
  try {
    document = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      isEvalSupported: false,
    }).promise;
  } catch {
    throw new CensusDocumentFileError(
      "INVALID_PDF",
      "No se ha podido abrir el PDF. Puede estar dañado o protegido.",
    );
  }

  try {
    if (document.numPages > MAX_CENSUS_DOCUMENT_PAGES) {
      throw new CensusDocumentFileError(
        "TOO_MANY_PAGES",
        `El PDF supera el límite de ${MAX_CENSUS_DOCUMENT_PAGES} páginas.`,
      );
    }
    const parts: string[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        characters += item.str.length + 1;
        if (characters > MAX_CENSUS_DOCUMENT_TEXT_CHARS) {
          throw new CensusDocumentFileError(
            "INVALID_PDF",
            "El PDF contiene demasiado texto para procesarlo con seguridad.",
          );
        }
        parts.push(item.str);
      }
    }
    const text = parts.join("\n").trim();
    if (!text) {
      throw new CensusDocumentFileError(
        "NO_READABLE_TEXT",
        "El PDF parece escaneado y no contiene texto seleccionable. Puedes completar los datos manualmente.",
      );
    }
    return text;
  } finally {
    await document.destroy();
  }
}
