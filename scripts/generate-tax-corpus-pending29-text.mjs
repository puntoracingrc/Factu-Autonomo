#!/usr/bin/env node

/**
 * Generate reproducible native/OCR transcripts for the 29-family synthetic
 * corpus. Raster variants are read exactly like the browser reader: locally,
 * page by page, with pdf.js + Tesseract and automatic orientation detection.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import { createWorker, OEM, PSM } from "tesseract.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = join(
  repositoryRoot,
  "test/fixtures/tax-model-diagnostic/pending29-v1",
);
const index = JSON.parse(
  readFileSync(join(corpusRoot, "corpus-manifest.json"), "utf8"),
);
const force = process.argv.includes("--force");
const sparseMerge = process.argv.includes("--sparse-merge");
const nativeOnly = process.argv.includes("--native-only");
const rasterOnly = process.argv.includes("--raster-only");

globalThis.DOMMatrix ??= DOMMatrix;
globalThis.ImageData ??= ImageData;
globalThis.Path2D ??= Path2D;
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

let worker = null;
if (!nativeOnly) {
  worker = await createWorker("spa", OEM.LSTM_ONLY, {
    workerPath: resolve(
      repositoryRoot,
      "node_modules/tesseract.js/src/worker-script/node/index.js",
    ),
    corePath: resolve(
      repositoryRoot,
      "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
    ),
    langPath: join(repositoryRoot, "public/ocr/lang"),
    cacheMethod: "none",
  });
  await worker.setParameters({
    tessedit_pageseg_mode: sparseMerge ? PSM.SPARSE_TEXT : PSM.AUTO,
    preserve_interword_spaces: "1",
    user_defined_dpi: "300",
  });
}

function outputPath(fixture) {
  const variant = {
    NATIVE_TEXT_PDF: "native",
    RASTER_SCAN_COMPRESSED: "scan_compressed",
    RASTER_ROTATED_CAPTURE: "rotated_capture",
  }[fixture.visualVariant];
  if (!variant) throw new Error(`Variante no soportada: ${fixture.visualVariant}`);
  return join(corpusRoot, "text", variant, `${fixture.fixtureId}.txt`);
}

async function nativePageText(page) {
  const content = await page.getTextContent();
  return content.items
    .map((item) => ("str" in item ? item.str : ""))
    .filter(Boolean)
    .join("\n");
}

async function ocrPageText(page) {
  const unitViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    4,
    3_600 / Math.max(unitViewport.width, unitViewport.height),
  );
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
  }).promise;
  const recognized = await worker.recognize(
    await canvas.encode("png"),
    { rotateAuto: true },
    { text: true },
  );
  return recognized.data.text.trim();
}

const selected = index.fixtures.filter((fixture) =>
  nativeOnly
    ? fixture.visualVariant === "NATIVE_TEXT_PDF"
    : rasterOnly
      ? fixture.visualVariant !== "NATIVE_TEXT_PDF"
      : true,
);
let generated = 0;
let skipped = 0;
try {
  for (const [fixtureIndex, fixture] of selected.entries()) {
    const destination = outputPath(fixture);
    if (!force && !sparseMerge && existsSync(destination)) {
      skipped += 1;
      continue;
    }
    const document = await pdfjs.getDocument({
      data: new Uint8Array(readFileSync(join(corpusRoot, fixture.pdf))),
      isEvalSupported: false,
      disableWorker: true,
      standardFontDataUrl: `${join(
        repositoryRoot,
        "node_modules/pdfjs-dist/standard_fonts",
      )}/`,
    }).promise;
    try {
      const pages = [];
      const existingPages =
        sparseMerge && existsSync(destination)
          ? readFileSync(destination, "utf8").split("\f")
          : [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const extracted =
          fixture.visualVariant === "NATIVE_TEXT_PDF"
            ? await nativePageText(page)
            : await ocrPageText(page);
        pages.push(
          sparseMerge
            ? [existingPages[pageNumber - 1]?.trim(), extracted]
                .filter(Boolean)
                .join("\n")
            : extracted,
        );
      }
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, `${pages.join("\n\f\n").trim()}\n`, "utf8");
      generated += 1;
      if ((fixtureIndex + 1) % 10 === 0 || fixtureIndex + 1 === selected.length) {
        process.stdout.write(
          `Corpus pending29: ${fixtureIndex + 1}/${selected.length} procesados.\n`,
        );
      }
    } finally {
      await document.destroy();
    }
  }
} finally {
  if (worker) await worker.terminate();
}

process.stdout.write(
  `Transcripciones generadas: ${generated}; existentes omitidas: ${skipped}.\n`,
);
