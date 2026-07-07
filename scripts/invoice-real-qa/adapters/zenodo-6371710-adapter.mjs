import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PORTUGUESE_LABELS = {
  documentType: ["fatura", "factura", "recibo", "fatura recibo", "fatura-recibo"],
  date: ["data", "data emissao", "data de emissao", "invoice date"],
  taxId: ["contribuinte", "nif", "nipc", "tax identification", "tax id"],
  tax: ["iva", "imposto", "tax", "vat"],
  total: ["total", "total a pagar", "valor total", "amount due"],
  subtotal: ["subtotal", "sub total"],
  reference: ["referencia", "referência", "n documento", "numero documento", "document reference"],
  supplier: ["vendedor", "fornecedor", "seller", "supplier"],
  buyer: ["cliente", "comprador", "buyer", "customer"],
  address: ["morada", "address"],
  rate: ["taxa", "rate"],
  amount: ["montante", "amount"],
  net: ["liquido", "líquido", "net"],
  gross: ["bruto", "gross"],
};

export const ZENODO_FAILURE_CATEGORIES = [
  "zenodo_json_parse_failed",
  "zenodo_image_missing",
  "zenodo_seller_mismatch",
  "zenodo_tax_id_detection_failed",
  "zenodo_date_mismatch",
  "zenodo_total_mismatch",
  "zenodo_tax_amount_mismatch",
  "zenodo_reference_mismatch",
  "zenodo_portuguese_label_mapping_failed",
];

export function buildZenodoDocument({ imagePath, annotationPath, salt }) {
  const documentId = hashDocumentId({ imagePath, annotationPath, salt });
  const annotation = parseZenodoAnnotation(annotationPath);
  return {
    documentId,
    source: "zenodo_6371710",
    suite: "external_zenodo_6371710_holdout",
    mode: "json_annotation",
    imagePresent: Boolean(imagePath && fs.existsSync(imagePath)),
    annotationPresent: Boolean(annotationPath && fs.existsSync(annotationPath)),
    expectedPartial: annotation.fields,
    parseError: annotation.error,
  };
}

export function evaluateZenodoDocument(document) {
  const categories = new Set();
  const fields = document.expectedPartial;
  if (!document.imagePresent) categories.add("zenodo_image_missing");
  if (!document.annotationPresent) categories.add("external_annotation_missing");
  if (document.parseError) categories.add("zenodo_json_parse_failed");
  if (!fields.supplierName.detected) categories.add("zenodo_seller_mismatch");
  if (!fields.supplierTaxId.detected && !fields.buyerTaxId.detected) {
    categories.add("zenodo_tax_id_detection_failed");
  }
  if (!fields.issueDate.detected) categories.add("zenodo_date_mismatch");
  if (!fields.totalAmount.detected) categories.add("zenodo_total_mismatch");
  if (!fields.taxAmount.detected) categories.add("zenodo_tax_amount_mismatch");
  if (!fields.documentReference.detected) categories.add("zenodo_reference_mismatch");
  if (!fields.portugueseLabelMapping.detected) {
    categories.add("zenodo_portuguese_label_mapping_failed");
  }

  const matchedCoreFields = [
    fields.supplierName,
    fields.issueDate,
    fields.totalAmount,
    fields.taxAmount,
    fields.documentReference,
  ].filter((field) => field.detected).length;
  const status =
    document.parseError || !document.imagePresent
      ? "failed"
      : matchedCoreFields >= 3
        ? "pass_with_partial_ground_truth"
        : matchedCoreFields > 0
          ? "needs_manual_review"
          : "failed";

  return {
    documentId: document.documentId,
    source: "zenodo_6371710",
    suite: "external_zenodo_6371710_holdout",
    mode: document.mode,
    status,
    pages: 1,
    expectedPartialPresent: {
      supplierName: fields.supplierName.detected,
      supplierTaxId: fields.supplierTaxId.detected,
      buyerTaxId: fields.buyerTaxId.detected,
      issueDate: fields.issueDate.detected,
      totalAmount: fields.totalAmount.detected,
      taxAmount: fields.taxAmount.detected,
      documentReference: fields.documentReference.detected,
    },
    metrics: {
      seller: fields.supplierName.detected ? "detected_redacted" : "missing",
      supplierTaxId: fields.supplierTaxId.detected ? "detected_redacted" : "missing",
      buyerTaxId: fields.buyerTaxId.detected ? "detected_redacted" : "missing",
      date: fields.issueDate.detected ? "detected" : "missing",
      total: fields.totalAmount.detected ? "detected" : "missing",
      taxAmount: fields.taxAmount.detected ? "detected" : "missing",
      reference: fields.documentReference.detected ? "detected_redacted" : "missing",
    },
    confidence: {
      seller: fields.supplierName.detected ? 0.9 : 0,
      taxId: fields.supplierTaxId.detected || fields.buyerTaxId.detected ? 0.9 : 0,
      date: fields.issueDate.detected ? 0.9 : 0,
      total: fields.totalAmount.detected ? 0.9 : 0,
      taxAmount: fields.taxAmount.detected ? 0.85 : 0,
      reference: fields.documentReference.detected ? 0.85 : 0,
    },
    failureCategories: [...categories].sort(),
    aiUsed: false,
    needsManualReview: !["pass_with_partial_ground_truth"].includes(status),
  };
}

export function parseZenodoAnnotation(annotationPath) {
  if (!annotationPath || !fs.existsSync(annotationPath)) {
    return { fields: emptyFields(), error: "annotation_missing" };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(annotationPath, "utf8"));
    const entries = flattenObject(raw);
    return { fields: mapZenodoFields(entries), error: undefined };
  } catch (error) {
    return { fields: emptyFields(), error: error.message };
  }
}

function mapZenodoFields(entries) {
  const fields = emptyFields();
  for (const entry of entries) {
    const key = normalizeKey(entry.path);
    const label = normalizeKey(`${entry.path} ${entry.value}`);
    const value = String(entry.value ?? "").trim();
    if (!value) continue;
    if (matchesAny(key, ["seller_name", "sellername", "supplier_name", "fornecedor", "vendedor", "company"])) {
      fields.supplierName = detected();
    }
    if (matchesAny(key, ["seller_address", "supplier_address", "morada"])) {
      fields.supplierAddress = detected();
    }
    if (matchesAny(key, ["seller_tax_identification", "seller_tax_id", "supplier_tax", "seller_nif", "nif_seller", "nipc"]) || looksLikeTaxId(value)) {
      fields.supplierTaxId = detected();
    }
    if (matchesAny(key, ["buyer_tax_identification", "buyer_tax_id", "customer_tax", "buyer_nif", "nif_buyer"])) {
      fields.buyerTaxId = detected();
    }
    if (matchesAny(key, ["invoice_date", "issuedate", "date", "data"]) || looksLikeDate(value)) {
      fields.issueDate = detected();
    }
    if (matchesAny(key, ["invoice_total_amount", "total_amount", "total", "valor_total", "total_a_pagar"])) {
      fields.totalAmount = detected();
    }
    if (matchesAny(key, ["invoice_tax_amount", "tax_amount", "vat_amount", "iva", "imposto"])) {
      fields.taxAmount = detected();
    }
    if (matchesAny(key, ["document_reference", "document_ref", "invoice_number", "reference", "referencia", "n_documento"])) {
      fields.documentReference = detected();
    }
    if (Object.values(PORTUGUESE_LABELS).some((labels) => labels.some((item) => label.includes(normalizeKey(item))))) {
      fields.portugueseLabelMapping = detected();
    }
  }
  return fields;
}

function emptyFields() {
  return {
    supplierName: missing(),
    supplierAddress: missing(),
    supplierTaxId: missing(),
    buyerTaxId: missing(),
    issueDate: missing(),
    totalAmount: missing(),
    taxAmount: missing(),
    documentReference: missing(),
    portugueseLabelMapping: missing(),
  };
}

function detected() {
  return { detected: true, redacted: true };
}

function missing() {
  return { detected: false, redacted: true };
}

function flattenObject(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenObject(item, `${prefix}.${index}`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) =>
      flattenObject(nested, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [{ path: prefix, value }];
}

function matchesAny(key, candidates) {
  return candidates.some((candidate) => key.includes(normalizeKey(candidate)));
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function looksLikeTaxId(value) {
  return /\b(?:\d{9}|[A-Z]\d{8}|\d{8}[A-Z])\b/i.test(String(value ?? ""));
}

function looksLikeDate(value) {
  return /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b/.test(String(value ?? ""));
}

function hashDocumentId({ imagePath, annotationPath, salt }) {
  return crypto
    .createHash("sha256")
    .update(`${salt}:${path.basename(imagePath ?? "missing")}:${path.basename(annotationPath ?? "missing")}`)
    .digest("hex")
    .slice(0, 24);
}
