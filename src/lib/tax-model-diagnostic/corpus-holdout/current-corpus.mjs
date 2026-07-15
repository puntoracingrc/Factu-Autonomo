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
  return Object.entries(manifest.expectedFields).map(([fieldId, expectedValue]) => ({
    fieldId,
    expectedValue,
  }));
}

function explicitMissingFields(completeDocument, missingFields) {
  if (completeDocument) return [];
  const normalized = [...new Set(missingFields.filter(Boolean))];
  return normalized.length > 0
    ? normalized
    : ["UNKNOWN_FIELDS_OUTSIDE_DOCUMENT_SCOPE"];
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
      const completeDocument = source.expectedEnvelope.isComplete === true;
      const manifest = {
        manifestVersion: "tax-corpus-document.2026-07.v1",
        fixtureId: source.fixtureId,
        family: source.documentType,
        fiscalYear: source.fiscalYear,
        layoutVersion: source.formVersion,
        sourceClass: "SYNTHETIC",
        expectedFields: expectedFieldsFromCurrent(source),
        forbiddenInferences: source.mustNotInfer.map((inference) => inference.code),
        sha256: source.source.sha256,
        admissionStatus: "ADMITTED",
        anonymizationVerified: false,
        holdoutMembership: false,
        completeDocument,
        deliveryMode: "NATIVE",
        assetFile: basename(assetPath),
        containsRealPersonalData: false,
        authorizationRecorded: false,
        officialGenerationVerified: false,
        anonymizationReview: null,
        missingFields: explicitMissingFields(completeDocument, []),
      };
      return { manifest, storageScope: "PUBLIC", actualSha256: sha256(bytes) };
    }),
  );
}

async function pending29Records(repositoryRoot) {
  const root = join(
    repositoryRoot,
    "test/fixtures/tax-model-diagnostic/pending29-v1",
  );
  const paths = await filesBelow(join(root, "manifests"), ".json");
  return Promise.all(
    paths.map(async (path) => {
      const source = await json(path);
      const family = PENDING29_FAMILY_MAP.get(source.documentType);
      if (!family) throw new Error("PENDING29_FAMILY_NOT_MAPPED");
      const assetPath = join(root, source.pdfFile);
      const bytes = await readFile(assetPath);
      const completeDocument = source.completeDocument === true;
      const manifest = {
        manifestVersion: "tax-corpus-document.2026-07.v1",
        fixtureId: source.fixtureId,
        family,
        fiscalYear: source.fiscalYear,
        layoutVersion: `SYNTHETIC_PENDING29_2_0_${source.fiscalYear}`,
        sourceClass: "SYNTHETIC",
        expectedFields: expectedFieldsFromPending(source),
        forbiddenInferences: [...source.mustNotInfer],
        sha256: source.sha256,
        admissionStatus: "ADMITTED",
        anonymizationVerified: false,
        holdoutMembership: false,
        completeDocument,
        deliveryMode:
          source.visualVariant === "NATIVE_TEXT_PDF" ? "NATIVE" : "OCR",
        assetFile: basename(assetPath),
        containsRealPersonalData: false,
        authorizationRecorded: false,
        officialGenerationVerified: false,
        anonymizationReview: null,
        missingFields: explicitMissingFields(
          completeDocument,
          source.missingOrAmbiguousFields ?? [],
        ),
      };
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
    "test/fixtures/tax-model-diagnostic/corpus-holdout-v1/public",
  );
  return [
    ...(await currentCorpusRecords(root)),
    ...(await pending29Records(root)),
    ...(await explicitRecords(admittedPublicRoot, "PUBLIC")),
  ];
}

export async function loadPrivateHoldoutCorpus(holdoutRoot) {
  return explicitRecords(resolve(holdoutRoot), "PRIVATE_HOLDOUT");
}
