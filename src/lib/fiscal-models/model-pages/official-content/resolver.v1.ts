import type {
  PublicAeatOfficialContentListResultV1,
  PublicAeatOfficialContentResolveResultV1,
  PublicAeatOfficialModelContentV1,
} from "./contracts.v1";
import { PUBLIC_AEAT_MODEL_01_OFFICIAL_CONTENT_V1 } from "./model-01.release.v1";
import { PUBLIC_AEAT_BATCH_01_EARLY_CONTENT_V1 } from "./batch-01-early.release.v1";
import { PUBLIC_AEAT_BATCH_01_CENSUS_CONTENT_V1 } from "./batch-01-census.release.v1";
import { PUBLIC_AEAT_BATCH_01_LATE_CONTENT_V1 } from "./batch-01-late.release.v1";
import { PUBLIC_AEAT_BATCH_02_GAMES_CONTENT_V1 } from "./batch-02-games.release.v1";
import { PUBLIC_AEAT_BATCH_02_IRPF_CONTENT_V1 } from "./batch-02-irpf.release.v1";
import { PUBLIC_AEAT_BATCH_02_WITHHOLDING_CONTENT_V1 } from "./batch-02-withholding.release.v1";
import { PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_CONTENT_V1 } from "./batch-03-capital-withholding.release.v1";
import { PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_CONTENT_V1 } from "./batch-03-irpf-benefits.release.v1";
import { PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_CONTENT_V1 } from "./batch-03-irpf-declarations.release.v1";
import { PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_CONTENT_V1 } from "./batch-04-displaced-workers.release.v1";
import { PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_CONTENT_V1 } from "./batch-04-information-returns.release.v1";
import { PUBLIC_AEAT_BATCH_04_WORK_RETENTIONS_CONTENT_V1 } from "./batch-04-work-retentions.release.v1";
import { PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_CONTENT_V1 } from "./batch-05-financial-channels.release.v1";
import { PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_CONTENT_V1 } from "./batch-05-annual-information.release.v1";
import { PUBLIC_AEAT_BATCH_05_PROPERTY_INFORMATION_CONTENT_V1 } from "./batch-05-property-information.release.v1";
import { PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_CONTENT_V1 } from "./batch-06-declarations-186-189.release.v1";
import { PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_CONTENT_V1 } from "./batch-06-declarations-190-193.release.v1";
import { PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_CONTENT_V1 } from "./batch-06-declarations-194-196.release.v1";
import { PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_CONTENT_V1 } from "./batch-07-declarations-037-199.release.v1";
import { PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_CONTENT_V1 } from "./batch-07-corporate-tax-200-206.release.v1";
import { PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_CONTENT_V1 } from "./batch-07-non-resident-tax-210-216.release.v1";
import { PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_CONTENT_V1 } from "./batch-08-corporate-tax-217-222.release.v1";
import { PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_CONTENT_V1 } from "./batch-08-nonresident-lottery-226-230.release.v1";
import { PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_CONTENT_V1 } from "./batch-08-information-returns-231-233.release.v1";
import { PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_CONTENT_V1 } from "./batch-09-cross-border-mechanisms-234-236.release.v1";
import { PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_CONTENT_V1 } from "./batch-09-socimi-platform-amac-237-239.release.v1";
import { PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_CONTENT_V1 } from "./batch-09-complementary-tax-irnr-240-247.release.v1";
import { PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_CONTENT_V1 } from "./batch-10-lottery-savings-270-280.release.v1";
import { PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_CONTENT_V1 } from "./batch-10-regional-aid-281-283.release.v1";
import { PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_CONTENT_V1 } from "./batch-10-financial-information-289-295.release.v1";
import { PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_CONTENT_V1 } from "./batch-11-information-returns-296-346.release.v1";
import { PUBLIC_AEAT_BATCH_11_VAT_303_309_CONTENT_V1 } from "./batch-11-vat-303-309.release.v1";
import { PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_CONTENT_V1 } from "./batch-11-vat-special-318-341.release.v1";

const EXPECTED_CODES = Object.freeze([
  "01",
  "01C",
  "04",
  "05",
  "06",
  "030",
  "035",
  "036",
  "037",
  "038",
  "039",
  "040",
  "043",
  "044",
  "045",
  "100",
  "102",
  "111",
  "113",
  "115",
  "117",
  "121",
  "122",
  "123",
  "124",
  "126",
  "128",
  "130",
  "131",
  "136",
  "140",
  "143",
  "145",
  "146",
  "147",
  "149",
  "150",
  "151",
  "156",
  "159",
  "165",
  "170",
  "171",
  "172",
  "173",
  "174",
  "179",
  "180",
  "181",
  "182",
  "184",
  "185",
  "186",
  "187",
  "188",
  "189",
  "190",
  "192",
  "193",
  "194",
  "195",
  "196",
  "198",
  "199",
  "200",
  "202",
  "206",
  "210",
  "211",
  "213",
  "216",
  "217",
  "220",
  "221",
  "222",
  "226",
  "228",
  "230",
  "231",
  "232",
  "233",
  "234",
  "235",
  "236",
  "237",
  "238",
  "239",
  "240",
  "241",
  "242",
  "247",
  "270",
  "280",
  "281",
  "282",
  "283",
  "289",
  "290",
  "291",
  "294",
  "295",
  "296",
  "303",
  "308",
  "309",
  "318",
  "319",
  "322",
  "341",
  "345",
  "346",
] as const);
const EXPECTED_HISTORICAL_CODES = new Set(["037", "150", "179"]);
const OFFICIAL_CODE = /^(?:\d{2,3}|\d{2}[A-Z]|[A-Z]\d{2})$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ACCESS_METHODS = new Set([
  "BROWSER_FORM",
  "FILE_UPLOAD",
  "WEB_SERVICE",
  "ADMINISTRATIVE_TRANSFER",
]);
const ACCESS_METHOD_STATUSES = new Set([
  "SOURCE_DESCRIBED",
  "SOURCE_DESCRIBED_FUTURE",
  "SOURCE_DESCRIBED_HISTORICAL",
]);
const ALLOWED_HOSTS = new Set(["sede.agenciatributaria.gob.es", "www.boe.es"]);

type ParsedObject = Record<string, unknown>;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function parseExactCode(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const parsed: ParsedObject = Object.create(null) as ParsedObject;
    for (const key of Reflect.ownKeys(input)) {
      if (key !== "code") return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) {
        return null;
      }
      parsed.code = descriptor.value;
    }
    return typeof parsed.code === "string" ? parsed.code : null;
  } catch {
    return null;
  }
}

function officialUrlIsAllowed(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      ALLOWED_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

function referencesAreKnown(
  content: PublicAeatOfficialModelContentV1,
  sourceIds: Set<string>,
): boolean {
  return (
    content.sections.every((section) =>
      section.items.every(
        (item) =>
          item.sourceIds.length > 0 &&
          item.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
      ),
    ) &&
    content.documents.every(
      (document) =>
        sourceIds.has(document.sourceId) &&
        (document.landingPageSourceId === null ||
          sourceIds.has(document.landingPageSourceId)) &&
        SHA256.test(document.sha256),
    ) &&
    (content.thumbnail === null ||
      (sourceIds.has(content.thumbnail.sourceId) &&
        SHA256.test(content.thumbnail.sha256) &&
        content.thumbnail.width === 640 &&
        content.thumbnail.height === 640)) &&
    content.links.every((link) => sourceIds.has(link.sourceId)) &&
    content.faq.every(
      (item) =>
        item.sourceIds.length > 0 &&
        item.sourceIds.every((sourceId) => sourceIds.has(sourceId)),
    ) &&
    (content.accessMethods === undefined ||
      (content.accessMethods.methods.length > 0 &&
        new Set(content.accessMethods.methods).size ===
          content.accessMethods.methods.length &&
        content.accessMethods.methods.every((method) =>
          ACCESS_METHODS.has(method),
        ) &&
        ACCESS_METHOD_STATUSES.has(content.accessMethods.status) &&
        content.accessMethods.sourceIds.length > 0 &&
        new Set(content.accessMethods.sourceIds).size ===
          content.accessMethods.sourceIds.length &&
        content.accessMethods.sourceIds.every((sourceId) =>
          sourceIds.has(sourceId),
        ) &&
        content.accessMethods.semantics === "OFFICIAL_INFORMATION_ONLY")) &&
    (content.externalNavigation === null ||
      sourceIds.has(content.externalNavigation.sourceId))
  );
}

function contentIsCoherent(content: PublicAeatOfficialModelContentV1): boolean {
  const sourceIds = new Set(content.sources.map((source) => source.id));
  const sourceById = new Map(
    content.sources.map((source) => [source.id, source] as const),
  );
  return (
    OFFICIAL_CODE.test(content.code) &&
    content.releaseId.length > 0 &&
    content.contentStatus === "OFFICIAL_INFORMATION" &&
    content.sourceVerificationStatus === "VERIFIED" &&
    content.applicabilityStatus === "NOT_EVALUATED" &&
    content.lifecycleStatus ===
      (EXPECTED_HISTORICAL_CODES.has(content.code)
        ? "HISTORICAL"
        : "UNDETERMINED") &&
    ISO_DATE.test(content.reviewedOn) &&
    content.canonicalName.length > 0 &&
    content.summary.length > 0 &&
    content.searchTerms.length > 0 &&
    content.sections.length > 0 &&
    content.sources.length > 0 &&
    sourceIds.size === content.sources.length &&
    content.sources.every(
      (source) =>
        source.id.length > 0 &&
        officialUrlIsAllowed(source.canonicalUrl) &&
        (source.officialUpdatedOn === null ||
          ISO_DATE.test(source.officialUpdatedOn)) &&
        ISO_DATE.test(source.capturedOn) &&
        SHA256.test(source.sourceSha256) &&
        source.verificationStatus === "SOURCE_HASH_CAPTURED",
    ) &&
    (content.accessMethods === undefined ||
      (content.accessMethods.sourceIds.every(
        (sourceId) => sourceById.get(sourceId)?.authority === "AEAT",
      ) &&
        (content.accessMethods.status !== "SOURCE_DESCRIBED_HISTORICAL" ||
          content.lifecycleStatus === "HISTORICAL") &&
        (content.accessMethods.status !== "SOURCE_DESCRIBED_FUTURE" ||
          content.lifecycleStatus === "UNDETERMINED"))) &&
    content.faq.length > 0 &&
    referencesAreKnown(content, sourceIds)
  );
}

function buildContentSnapshot():
  | Readonly<{
      status: "OFFICIAL_INFORMATION";
      data: readonly PublicAeatOfficialModelContentV1[];
    }>
  | Readonly<{ status: "BLOCKED"; reason: "INCONSISTENT_CONTENT" }> {
  const candidates = [
    PUBLIC_AEAT_MODEL_01_OFFICIAL_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_01_EARLY_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_01_CENSUS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_01_LATE_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_02_GAMES_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_02_IRPF_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_02_WITHHOLDING_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_03_IRPF_DECLARATIONS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_03_CAPITAL_WITHHOLDING_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_03_IRPF_BENEFITS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_04_WORK_RETENTIONS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_05_PROPERTY_INFORMATION_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_05_ANNUAL_INFORMATION_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_06_DECLARATIONS_186_189_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_06_DECLARATIONS_190_193_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_07_DECLARATIONS_037_199_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_07_CORPORATE_TAX_200_206_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_07_NON_RESIDENT_TAX_210_216_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_08_CORPORATE_TAX_217_222_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_08_NONRESIDENT_LOTTERY_226_230_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_08_INFORMATION_RETURNS_231_233_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_09_CROSS_BORDER_MECHANISMS_234_236_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_09_SOCIMI_PLATFORM_AMAC_237_239_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_09_COMPLEMENTARY_TAX_IRNR_240_247_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_10_LOTTERY_SAVINGS_270_280_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_10_REGIONAL_AID_281_283_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_10_FINANCIAL_INFORMATION_289_295_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_11_INFORMATION_RETURNS_296_346_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_11_VAT_303_309_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_11_VAT_SPECIAL_318_341_CONTENT_V1,
  ] as readonly PublicAeatOfficialModelContentV1[];
  const codes = candidates.map((entry) => entry.code);
  if (
    candidates.length !== EXPECTED_CODES.length ||
    new Set(codes).size !== candidates.length ||
    !EXPECTED_CODES.every((code) => codes.includes(code)) ||
    !candidates.every(contentIsCoherent)
  ) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "INCONSISTENT_CONTENT",
    });
  }
  const content = EXPECTED_CODES.map((code) =>
    candidates.find((entry) => entry.code === code)!,
  );
  return Object.freeze({
    status: "OFFICIAL_INFORMATION",
    data: deepFreeze([...content]),
  });
}

const CONTENT_SNAPSHOT = buildContentSnapshot();
const contentByCode =
  CONTENT_SNAPSHOT.status === "OFFICIAL_INFORMATION"
    ? new Map(
        CONTENT_SNAPSHOT.data.map((entry) => [entry.code, entry] as const),
      )
    : new Map<string, PublicAeatOfficialModelContentV1>();

export function resolvePublicAeatOfficialModelContentV1(
  input: unknown,
): PublicAeatOfficialContentResolveResultV1 {
  const code = parseExactCode(input);
  if (code === null || !OFFICIAL_CODE.test(code)) {
    return Object.freeze({ status: "BLOCKED", reason: "INVALID_INPUT" });
  }
  if (CONTENT_SNAPSHOT.status === "BLOCKED") return CONTENT_SNAPSHOT;
  const data = contentByCode.get(code);
  if (!data) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
  }
  return Object.freeze({ status: "OFFICIAL_INFORMATION", data });
}

export function listPublicAeatOfficialModelContentsV1(): PublicAeatOfficialContentListResultV1 {
  if (CONTENT_SNAPSHOT.status === "BLOCKED") return CONTENT_SNAPSHOT;
  return Object.freeze({
    status: "OFFICIAL_INFORMATION",
    data: CONTENT_SNAPSHOT.data,
  });
}
