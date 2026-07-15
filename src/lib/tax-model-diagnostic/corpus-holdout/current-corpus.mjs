import { createHash } from "node:crypto";
import { readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { TAX_CORPUS_FAMILIES } from "./runtime.mjs";

export const REQUIRED_TAX_CORPUS_FAMILIES = TAX_CORPUS_FAMILIES;

const PENDING29_FAMILY_MAP = new Map([
  ["AEAT_FORM_035", "MODEL_035"],
  ...[
    "100",
    "123",
    "131",
    "151",
    "180",
    "184",
    "190",
    "193",
    "200",
    "202",
    "216",
    "296",
    "308",
    "309",
    "341",
    "347",
    "349",
    "369",
    "714",
    "720",
    "721",
    "840",
  ].map((code) => [`AEAT_MODEL_${code}`, `MODEL_${code}`]),
  ["AEAT_CERT_CURRENT_CENSUS_STATUS", "CURRENT_CENSUS_CERTIFICATE"],
  ["TGSS_REPORT_CURRENT_STATUS", "TGSS_CURRENT_STATUS_REPORT"],
  ["TGSS_REPORT_EMPLOYMENT_HISTORY", "TGSS_EMPLOYMENT_HISTORY"],
  ["TGSS_REPORT_SELF_EMPLOYED_ACTIVITIES", "TGSS_SELF_EMPLOYED_ACTIVITIES"],
  ["AEAT_CERT_ROI", "ROI_CERTIFICATE"],
  [
    "AEAT_CERT_LANDLORD_WITHHOLDING_EXEMPTION",
    "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
  ],
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function filesBelow(root, suffix) {
  const output = [];
  const visit = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error("CORPUS_SYMLINK_FORBIDDEN");
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && entry.name.endsWith(suffix)) output.push(path);
    }
  };
  await visit(root);
  return output.sort();
}

function expectedFieldsFromCurrent(manifest) {
  return manifest.expectedFields.map((field) => ({
    fieldId: field.factType,
    expectedValue: field.normalizedValue,
  }));
}

function expectedFieldsFromPending(manifest) {
  return Object.entries(manifest.expectedFields).map(
    ([fieldId, expectedValue]) => ({
      fieldId,
      expectedValue,
    }),
  );
}

function explicitMissingFields(incomplete, missingFields) {
  if (!incomplete) return [];
  const normalized = [...new Set(missingFields.filter(Boolean))];
  return normalized.length > 0
    ? normalized
    : ["UNKNOWN_FIELDS_OUTSIDE_DOCUMENT_SCOPE"];
}

function syntheticVerificationEvidence() {
  return {
    consentRecorded: null,
    provenanceRecorded: null,
    officialGenerationVerified: null,
    visibleLayerChecked: null,
    hiddenTextChecked: null,
    acroFormChecked: null,
    xfaChecked: null,
    metadataChecked: null,
    annotationsChecked: null,
    optionalLayersChecked: null,
    attachmentsChecked: null,
    scriptsChecked: null,
    qrChecked: null,
    barcodeChecked: null,
    fileNameChecked: null,
    piiScanPassed: null,
    anonymizationReviewPassed: null,
    layoutClassified: null,
    automatedScanPassed: null,
    humanReviewCompleted: null,
    reviewerId: null,
    reviewedAt: null,
  };
}

function syntheticManifest({
  fixtureId,
  family,
  fiscalYear,
  period,
  layoutVersion,
  fields,
  prohibitedInferences,
  sourceSha256,
  incomplete,
  deliveryMode,
  assetFile,
  missingFields,
  createdAt,
}) {
  return {
    manifestVersion: "tax-corpus-document.2026-07.v2",
    fixtureId,
    family,
    documentType: family,
    fiscalYear,
    period: period ?? null,
    layoutVersion,
    generationChannel: "SYNTHETIC_FIXTURE",
    sourceClass: "SYNTHETIC",
    extractionExpected: {
      classification: family,
      deliveryMode,
      fields,
      missingFields: explicitMissingFields(incomplete, missingFields),
    },
    prohibitedInferences,
    expectedDecision: incomplete ? "MANUAL_REVIEW" : "ADMIT",
    sha256: sourceSha256,
    admitted: true,
    incomplete,
    holdout: false,
    anonymizationVerified: false,
    verificationEvidence: syntheticVerificationEvidence(),
    duplicateOf: null,
    createdAt,
    admittedAt: null,
    assetFile,
    containsRealPersonalData: false,
  };
}

async function currentCorpusRecords(repositoryRoot) {
  const root = join(repositoryRoot, "test/fixtures/tax-model-diagnostic");
  const manifestRoot = join(root, "manifests");
  const paths = await filesBelow(manifestRoot, ".json");
  return Promise.all(
    paths.map(async (path) => {
      const source = await json(path);
      const assetPath = join(root, source.asset.pdfPath);
      const bytes = await readFile(assetPath);
      const incomplete = source.expectedEnvelope.isComplete !== true;
      const createdAt = source.source?.officialReference?.capturedOn;
      if (typeof createdAt !== "string")
        throw new Error("CORPUS_CREATED_AT_MISSING");
      const manifest = syntheticManifest({
        fixtureId: source.fixtureId,
        family: source.documentType,
        fiscalYear: source.fiscalYear,
        period: source.period,
        layoutVersion: source.formVersion,
        fields: expectedFieldsFromCurrent(source),
        prohibitedInferences: source.mustNotInfer.map(
          (inference) => inference.code,
        ),
        sourceSha256: source.source.sha256,
        incomplete,
        deliveryMode: "NATIVE",
        assetFile: basename(assetPath),
        missingFields: [],
        createdAt,
      });
      return { manifest, storageScope: "PUBLIC", actualSha256: sha256(bytes) };
    }),
  );
}

async function pending29Records(repositoryRoot) {
  const root = join(
    repositoryRoot,
    "test/fixtures/tax-model-diagnostic/pending29-v1",
  );
  const corpusManifest = await json(join(root, "corpus-manifest.json"));
  if (typeof corpusManifest.createdAt !== "string") {
    throw new Error("CORPUS_CREATED_AT_MISSING");
  }
  const paths = await filesBelow(join(root, "manifests"), ".json");
  return Promise.all(
    paths.map(async (path) => {
      const source = await json(path);
      const family = PENDING29_FAMILY_MAP.get(source.documentType);
      if (!family) throw new Error("PENDING29_FAMILY_NOT_MAPPED");
      const assetPath = join(root, source.pdfFile);
      const bytes = await readFile(assetPath);
      const incomplete = source.completeDocument !== true;
      const manifest = syntheticManifest({
        fixtureId: source.fixtureId,
        family,
        fiscalYear: source.fiscalYear,
        period: source.period,
        layoutVersion: `SYNTHETIC_PENDING29_2_0_${source.fiscalYear}`,
        fields: expectedFieldsFromPending(source),
        prohibitedInferences: [...source.mustNotInfer],
        sourceSha256: source.sha256,
        incomplete,
        deliveryMode:
          source.visualVariant === "NATIVE_TEXT_PDF" ? "NATIVE" : "OCR",
        assetFile: basename(assetPath),
        missingFields: source.missingOrAmbiguousFields ?? [],
        createdAt: corpusManifest.createdAt,
      });
      return { manifest, storageScope: "PUBLIC", actualSha256: sha256(bytes) };
    }),
  );
}

async function explicitRecords(root, storageScope) {
  let paths;
  try {
    paths = await filesBelow(root, ".manifest.json");
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    paths.map(async (path) => {
      const manifest = await json(path);
      const assetPath = join(dirname(path), manifest.assetFile);
      const canonicalRoot = await realpath(root);
      const canonicalAsset = await realpath(assetPath);
      if (relative(canonicalRoot, canonicalAsset).startsWith("..")) {
        throw new Error("CORPUS_ASSET_PATH_ESCAPE");
      }
      return {
        manifest,
        storageScope,
        actualSha256: sha256(await readFile(canonicalAsset)),
      };
    }),
  );
}

export async function loadPublicTaxCorpus(repositoryRoot = process.cwd()) {
  const root = resolve(repositoryRoot);
  const admittedPublicRoot = join(
    root,
    "test/fixtures/tax-model-diagnostic/corpus-holdout-v2/public",
  );
  return [
    ...(await currentCorpusRecords(root)),
    ...(await pending29Records(root)),
    ...(await explicitRecords(admittedPublicRoot, "PUBLIC")),
  ];
}

export async function loadEngineeringHoldoutCorpus(
  repositoryRoot = process.cwd(),
) {
  const root = join(
    resolve(repositoryRoot),
    "test/fixtures/tax-model-diagnostic/corpus-holdout-v2/engineering",
  );
  return explicitRecords(root, "ENGINEERING_HOLDOUT");
}

export async function loadIndependentHoldoutCorpus(holdoutRoot) {
  return explicitRecords(resolve(holdoutRoot), "PRIVATE_INDEPENDENT_HOLDOUT");
}
