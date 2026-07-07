import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SROIE_FAILURE_CATEGORIES = [
  "sroie_bbox_parse_failed",
  "sroie_metadata_missing",
  "sroie_company_mismatch",
  "sroie_date_mismatch",
  "sroie_total_mismatch",
  "sroie_receipt_not_invoice",
  "sroie_ocr_required",
];

export function buildSroieOracleDocument({ imagePath, bboxPath, metadataPath, salt }) {
  const documentId = hashDocumentId({ imagePath, salt });
  const ocrWords = bboxPath && fs.existsSync(bboxPath) ? parseSroieBboxFile(bboxPath) : [];
  const expectedPartial = metadataPath && fs.existsSync(metadataPath)
    ? parseSroieMetadata(metadataPath)
    : {};
  return {
    documentId,
    source: "sroie",
    suite: "external_sroie_holdout",
    mode: "oracle_ocr",
    imagePresent: Boolean(imagePath && fs.existsSync(imagePath)),
    annotationPresent: Boolean(bboxPath && fs.existsSync(bboxPath)),
    metadataPresent: Object.keys(expectedPartial).length > 0,
    ocrWords,
    expectedPartial,
  };
}

export function evaluateSroieDocument(document) {
  const categories = new Set();
  if (!document.imagePresent) categories.add("external_image_missing");
  if (!document.annotationPresent && !document.metadataPresent) {
    categories.add("external_annotation_missing");
  }
  if (!document.ocrWords.length && document.annotationPresent) {
    categories.add("sroie_bbox_parse_failed");
  }
  if (!document.metadataPresent) categories.add("sroie_metadata_missing");
  const reconstructed = reconstructText(document.ocrWords);
  const expected = document.expectedPartial;
  const metrics = document.ocrWords.length
    ? {
        company: compareTextPresence(reconstructed, expected.company),
        date: compareDatePresence(reconstructed, expected.date),
        total: compareTotalPresence(reconstructed, expected.total),
        address: expected.address ? "redacted_not_hard_validated" : "missing_ground_truth",
      }
    : {
        company: expected.company ? "ocr_required" : "missing_ground_truth",
        date: expected.date ? "ocr_required" : "missing_ground_truth",
        total: expected.total ? "ocr_required" : "missing_ground_truth",
        address: expected.address ? "ocr_required_redacted" : "missing_ground_truth",
      };
  if (metrics.company === "mismatch") categories.add("sroie_company_mismatch");
  if (metrics.date === "mismatch") categories.add("sroie_date_mismatch");
  if (metrics.total === "mismatch") categories.add("sroie_total_mismatch");
  if (!document.ocrWords.length && document.imagePresent) categories.add("sroie_ocr_required");
  const partialFields = Object.values(metrics).filter((value) => value === "match").length;
  const status =
    categories.has("external_image_missing") || categories.has("sroie_bbox_parse_failed")
      ? "failed"
      : !document.ocrWords.length && document.imagePresent
        ? "skipped"
      : partialFields > 0 && [...categories].every((category) => category === "sroie_metadata_missing")
        ? "pass_with_partial_ground_truth"
        : partialFields > 0 && !hasMismatch(categories)
          ? "pass_with_partial_ground_truth"
          : document.ocrWords.length
            ? "needs_manual_review"
            : "skipped";
  return {
    documentId: document.documentId,
    source: "sroie",
    suite: "external_sroie_holdout",
    mode: document.mode,
    status,
    pages: 1,
    ocrWordCount: document.ocrWords.length,
    expectedPartialPresent: {
      company: Boolean(expected.company),
      address: Boolean(expected.address),
      date: Boolean(expected.date),
      total: Boolean(expected.total),
    },
    metrics,
    confidence: {
      company: metrics.company === "match" ? 0.95 : document.ocrWords.length ? 0.45 : 0,
      date: metrics.date === "match" ? 0.95 : document.ocrWords.length ? 0.45 : 0,
      total: metrics.total === "match" ? 0.95 : document.ocrWords.length ? 0.45 : 0,
      ocr: document.ocrWords.length ? 1 : 0,
    },
    failureCategories: [...categories].sort(),
    aiUsed: false,
    needsManualReview: !["pass_with_partial_ground_truth"].includes(status),
  };
}

export function parseSroieBboxFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => parseSroieBboxLine(line))
    .filter(Boolean);
}

function parseSroieBboxLine(line) {
  const parts = String(line ?? "").split(",");
  if (parts.length < 9) return null;
  const coords = parts.slice(0, 8).map((value) => Number(value.trim()));
  if (coords.some((value) => !Number.isFinite(value))) return null;
  const text = parts.slice(8).join(",").trim();
  if (!text) return null;
  return {
    text,
    x1: coords[0],
    y1: coords[1],
    x2: coords[2],
    y2: coords[3],
    x3: coords[4],
    y3: coords[5],
    x4: coords[6],
    y4: coords[7],
    confidence: 1,
    source: "sroie_bbox",
  };
}

function parseSroieMetadata(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  try {
    const raw = JSON.parse(text);
    return {
      company: firstString(raw.company, raw.merchant, raw.seller, raw.supplier),
      address: firstString(raw.address),
      date: firstString(raw.date),
      total: firstString(raw.total),
    };
  } catch {
    // Some SROIE variants use plain key/value text instead of JSON.
  }
  const output = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*"?([a-zA-Z_ ]+)"?\s*[:\t]\s*"?(.+?)"?\s*,?\s*$/);
    if (!match) continue;
    const key = normalizeKey(match[1]);
    if (key.includes("company")) output.company = match[2];
    if (key.includes("address")) output.address = match[2];
    if (key.includes("date")) output.date = match[2];
    if (key.includes("total")) output.total = match[2];
  }
  return output;
}

function reconstructText(words) {
  return words
    .slice()
    .sort((a, b) => a.y1 - b.y1 || a.x1 - b.x1)
    .map((word) => word.text)
    .join(" ");
}

function compareTextPresence(haystack, expected) {
  if (!expected) return "missing_ground_truth";
  return normalizeText(haystack).includes(normalizeText(expected)) ? "match" : "mismatch";
}

function compareDatePresence(haystack, expected) {
  if (!expected) return "missing_ground_truth";
  const normalizedExpected = normalizeDateText(expected);
  const normalizedHaystack = normalizeDateText(haystack);
  return normalizedHaystack.includes(normalizedExpected) ? "match" : "mismatch";
}

function compareTotalPresence(haystack, expected) {
  if (!expected) return "missing_ground_truth";
  const expectedAmount = normalizeAmount(expected);
  if (!expectedAmount) return "missing_ground_truth";
  return amountCandidates(haystack).includes(expectedAmount) ? "match" : "mismatch";
}

function amountCandidates(value) {
  return String(value ?? "")
    .match(/\d[\d.,]*/g)
    ?.map(normalizeAmount)
    .filter(Boolean) ?? [];
}

function normalizeAmount(value) {
  const text = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!text) return "";
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "";
}

function normalizeDateText(value) {
  return String(value ?? "").replace(/[^\d]/g, "");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeKey(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_");
}

function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim());
}

function hasMismatch(categories) {
  return [...categories].some((category) => category.endsWith("_mismatch"));
}

function hashDocumentId({ imagePath, salt }) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${path.basename(imagePath ?? "missing")}`)
    .digest("hex")
    .slice(0, 24);
}
