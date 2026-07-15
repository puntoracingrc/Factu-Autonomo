export const MAX_CENSUS_DOCUMENT_BYTES = 8 * 1024 * 1024;
const MAX_CENSUS_DOCUMENT_PAGES = 80;
const MAX_CENSUS_DOCUMENT_TEXT_CHARS = 250_000;
const MAX_CENSUS_DOCUMENT_OCR_PAGES = 12;
const MAX_CENSUS_DOCUMENT_CANVAS_EDGE = 2_200;

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

export interface CensusDocumentPageText {
  page: number;
  text: string;
}

export interface CensusDocumentTextResult {
  text: string;
  totalPages: number;
  pages: readonly CensusDocumentPageText[];
  extractionMethod: "PDF_NATIVE_TEXT" | "OCR_LOCAL";
}

export interface CensusDocumentReadProgress {
  fileIndex: number;
  fileCount: number;
  progress: number;
  status: string;
}

export interface CensusDocumentReadOptions {
  /**
   * Renderiza y lee visualmente el PDF aunque ya exista una capa de texto.
   * Es necesario para impresos híbridos cuyo fondo contiene las etiquetas y
   * cuya capa seleccionable solo contiene los valores cumplimentados.
   */
  forceLocalOcr?: boolean;
  /** Conserva los valores nativos junto al OCR del impreso. */
  mergeNativeText?: boolean;
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

export async function readCensusDocumentPages(
  file: File,
  onProgress?: (progress: CensusDocumentReadProgress) => void,
  options: CensusDocumentReadOptions = {},
): Promise<CensusDocumentTextResult> {
  if (!isPdf(file)) {
    throw new CensusDocumentFileError(
      "UNSUPPORTED_FILE",
      "Selecciona un certificado censal en formato PDF.",
    );
  }
  if (file.size > MAX_CENSUS_DOCUMENT_BYTES) {
    throw new CensusDocumentFileError(
      "FILE_TOO_LARGE",
      "El PDF supera el límite de 8 MB.",
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
    const pages: CensusDocumentPageText[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const annotations = await page.getAnnotations({ intent: "display" });
      const content = await page.getTextContent();
      const pageParts: string[] = [];
      for (const annotation of annotations) {
        const fieldName =
          typeof annotation.fieldName === "string"
            ? annotation.fieldName.trim()
            : "";
        const rawValue = annotation.fieldValue;
        const fieldValue = Array.isArray(rawValue)
          ? rawValue.filter((value) => typeof value === "string").join(", ")
          : typeof rawValue === "string" || typeof rawValue === "number"
            ? String(rawValue)
            : "";
        if (!fieldName || !fieldValue.trim()) continue;
        const fieldText = `${fieldName}: ${fieldValue.trim()}`;
        characters += fieldText.length + 1;
        if (characters > MAX_CENSUS_DOCUMENT_TEXT_CHARS) {
          throw new CensusDocumentFileError(
            "INVALID_PDF",
            "El PDF contiene demasiado texto para procesarlo con seguridad.",
          );
        }
        parts.push(fieldText);
        pageParts.push(fieldText);
      }
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
        pageParts.push(item.str);
      }
      pages.push({ page: pageNumber, text: pageParts.join("\n").trim() });
    }
    const text = parts.join("\n").trim();
    if (text && !options.forceLocalOcr) {
      return {
        text,
        totalPages: document.numPages,
        pages,
        extractionMethod: "PDF_NATIVE_TEXT",
      };
    }

    if (
      typeof window === "undefined" ||
      typeof window.document === "undefined" ||
      document.numPages > MAX_CENSUS_DOCUMENT_OCR_PAGES
    ) {
      throw new CensusDocumentFileError(
        "NO_READABLE_TEXT",
        document.numPages > MAX_CENSUS_DOCUMENT_OCR_PAGES
          ? `El PDF escaneado supera el límite de ${MAX_CENSUS_DOCUMENT_OCR_PAGES} páginas para OCR local. Añade capturas de las páginas relevantes.`
          : "El PDF parece escaneado y no contiene texto seleccionable. Puedes añadir capturas de sus páginas.",
      );
    }

    let worker: Awaited<
      ReturnType<(typeof import("tesseract.js"))["createWorker"]>
    > | null = null;
    try {
      const { createWorker, OEM, PSM } = await import("tesseract.js");
      let activePage = 0;
      worker = await createWorker("spa", OEM.LSTM_ONLY, {
        workerPath: "/ocr/tesseract-worker.min.js",
        corePath: "/ocr/tesseract-core-lstm.wasm.js",
        langPath: "/ocr/lang",
        logger: (message) =>
          onProgress?.({
            fileIndex: activePage,
            fileCount: document.numPages,
            progress: Math.max(0, Math.min(1, message.progress || 0)),
            status:
              message.status === "recognizing text"
                ? "Leyendo una página escaneada"
                : "Preparando el lector local",
          }),
      });
      await worker.setParameters({
        tessedit_pageseg_mode: options.forceLocalOcr
          ? PSM.SPARSE_TEXT
          : PSM.AUTO,
        preserve_interword_spaces: "1",
        user_defined_dpi: "180",
      });

      const ocrPages: CensusDocumentPageText[] = [];
      let ocrCharacters = 0;
      for (
        let pageNumber = 1;
        pageNumber <= document.numPages;
        pageNumber += 1
      ) {
        activePage = pageNumber - 1;
        const page = await document.getPage(pageNumber);
        const unitViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          2,
          MAX_CENSUS_DOCUMENT_CANVAS_EDGE /
            Math.max(unitViewport.width, unitViewport.height),
        );
        const viewport = page.getViewport({ scale });
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", {
          alpha: false,
          willReadFrequently: true,
        });
        if (!context) {
          throw new CensusDocumentFileError(
            "NO_READABLE_TEXT",
            "Este navegador no puede preparar las páginas del PDF para su lectura local.",
          );
        }
        await page.render({ canvasContext: context, viewport }).promise;
        const recognized = await worker.recognize(
          canvas,
          { rotateAuto: false },
          { text: true },
        );
        const pageText = recognized.data.text.trim();
        ocrCharacters += pageText.length + 1;
        if (ocrCharacters > MAX_CENSUS_DOCUMENT_TEXT_CHARS) {
          throw new CensusDocumentFileError(
            "INVALID_PDF",
            "El PDF contiene demasiado texto para procesarlo con seguridad.",
          );
        }
        const nativePageText = options.mergeNativeText
          ? (pages[pageNumber - 1]?.text ?? "")
          : "";
        ocrPages.push({
          page: pageNumber,
          text: [pageText, nativePageText].filter(Boolean).join("\n"),
        });
        canvas.width = 0;
        canvas.height = 0;
      }
      const ocrText = ocrPages
        .map((page) => page.text)
        .filter(Boolean)
        .join("\n")
        .trim();
      if (!ocrText) {
        throw new CensusDocumentFileError(
          "NO_READABLE_TEXT",
          "No se ha encontrado texto legible en las páginas escaneadas.",
        );
      }
      return {
        text: ocrText,
        totalPages: document.numPages,
        pages: ocrPages,
        extractionMethod: "OCR_LOCAL",
      };
    } catch (error) {
      if (error instanceof CensusDocumentFileError) throw error;
      throw new CensusDocumentFileError(
        "NO_READABLE_TEXT",
        "No se ha podido leer localmente el PDF escaneado. Puedes añadir capturas de sus páginas.",
      );
    } finally {
      await worker?.terminate();
    }
  } finally {
    await document.destroy();
  }
}

export async function readCensusDocumentText(file: File): Promise<string> {
  return (await readCensusDocumentPages(file)).text;
}
