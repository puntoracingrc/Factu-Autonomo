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
import { PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_CONTENT_V1 } from "./batch-12-information-returns-347-349.release.v1";
import { PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_CONTENT_V1 } from "./batch-12-vat-groups-refunds-exemptions-353-365.release.v1";
import { PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_CONTENT_V1 } from "./batch-12-vat-cross-border-regimes-368-379.release.v1";
import { PUBLIC_AEAT_BATCH_13_VAT_380_390_CONTENT_V1 } from "./batch-13-vat-380-390.release.v1";
import { PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_CONTENT_V1 } from "./batch-13-credit-deposits-410-411.release.v1";
import { PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_CONTENT_V1 } from "./batch-13-insurance-digital-430-490.release.v1";
import { PUBLIC_AEAT_BATCH_13_EXCISE_504_505_CONTENT_V1 } from "./batch-13-excise-504-505.release.v1";
import { PUBLIC_AEAT_BATCH_14_EXCISE_REFUNDS_506_512_CONTENT_V1 } from "./batch-14-excise-refunds-506-512.release.v1";
import { PUBLIC_AEAT_BATCH_14_EXCISE_MARKS_OPERATIONS_515_520_CONTENT_V1 } from "./batch-14-excise-marks-operations-515-520.release.v1";
import { PUBLIC_AEAT_BATCH_15_EXCISE_REPORTS_REFUNDS_521_524_CONTENT_V1 } from "./batch-15-excise-reports-refunds-521-524.release.v1";
import { PUBLIC_AEAT_BATCH_15_EXCISE_FUEL_WINE_544_553_CONTENT_V1 } from "./batch-15-excise-fuel-wine-544-553.release.v1";
import { PUBLIC_AEAT_BATCH_16_EXCISE_TOBACCO_ENVIRONMENT_559_563_CONTENT_V1 } from "./batch-16-excise-tobacco-environment-559-563.release.v1";
import { PUBLIC_AEAT_BATCH_16_EXCISE_COAL_ELECTRICITY_566_573_CONTENT_V1 } from "./batch-16-excise-coal-electricity-566-573.release.v1";
import { PUBLIC_AEAT_BATCH_16_LATE_EXCISE_576_589_CONTENT_V1 } from "./batch-16-late-excise-576-589.release.v1";
import { PUBLIC_AEAT_BATCH_16_LATE_EXCISE_CUSTOMS_590_620_CONTENT_V1 } from "./batch-16-late-excise-customs-590-620.release.v1";
import { PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_CONTENT_V1 } from "./batch-17-administrative-financial-602-630.release.v1";
import { PUBLIC_AEAT_BATCH_17_INHERITANCE_RADIOACTIVE_650_682_CONTENT_V1 } from "./batch-17-inheritance-radioactive-650-682.release.v1";
import { PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_CONTENT_V1 } from "./batch-17-radioactive-judicial-683-696.release.v1";
import { PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_CONTENT_V1 } from "./batch-17-wealth-overseas-game-714-763.release.v1";
import { PUBLIC_AEAT_BATCH_17_REGULARIZATION_FINANCIAL_770_791_CONTENT_V1 } from "./batch-17-regularization-financial-770-791.release.v1";
import { PUBLIC_AEAT_BATCH_17_AUDIOVISUAL_HISTORICAL_792_797_CONTENT_V1 } from "./batch-17-audiovisual-historical-792-797.release.v1";

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
  "347",
  "349",
  "353",
  "360",
  "361",
  "364",
  "365",
  "368",
  "369",
  "379",
  "380",
  "381",
  "390",
  "410",
  "411",
  "430",
  "480",
  "490",
  "504",
  "505",
  "506",
  "507",
  "508",
  "510",
  "512",
  "515",
  "517",
  "518",
  "519",
  "520",
  "521",
  "522",
  "523",
  "524",
  "544",
  "545",
  "546",
  "547",
  "548",
  "553",
  "559",
  "560",
  "561",
  "562",
  "563",
  "566",
  "568",
  "571",
  "572",
  "573",
  "576",
  "581",
  "582",
  "583",
  "584",
  "585",
  "586",
  "587",
  "588",
  "589",
  "590",
  "591",
  "592",
  "593",
  "595",
  "596",
  "600",
  "610",
  "615",
  "620",
  "630",
  "602",
  "604",
  "611",
  "616",
  "650",
  "651",
  "655",
  "681",
  "682",
  "683",
  "684",
  "685",
  "695",
  "696",
  "714",
  "718",
  "720",
  "721",
  "763",
  "770",
  "771",
  "780",
  "781",
  "791",
  "792",
  "793",
  "795",
  "796",
  "797",
] as const);
const EXPECTED_HISTORICAL_CODES = new Set([
  "037",
  "150",
  "179",
  "582",
  "586",
  "795",
  "796",
  "797",
]);
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
        source.capturedOn <= content.reviewedOn &&
        SHA256.test(source.sourceSha256) &&
        source.verificationStatus === "SOURCE_HASH_CAPTURED",
    ) &&
    (content.accessMethods === undefined ||
      (content.accessMethods.sourceIds.every(
        (sourceId) => {
          const source = sourceById.get(sourceId);
          return (
            source?.authority === "AEAT" ||
            (source?.authority === "BOE" && source.kind === "LEGAL_TEXT")
          );
        },
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
    ...PUBLIC_AEAT_BATCH_12_INFORMATION_RETURNS_347_349_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_12_VAT_GROUPS_REFUNDS_EXEMPTIONS_353_365_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_12_VAT_CROSS_BORDER_REGIMES_368_379_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_13_VAT_380_390_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_13_CREDIT_DEPOSITS_410_411_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_13_INSURANCE_DIGITAL_430_490_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_13_EXCISE_504_505_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_14_EXCISE_REFUNDS_506_512_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_14_EXCISE_MARKS_OPERATIONS_515_520_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_15_EXCISE_REPORTS_REFUNDS_521_524_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_15_EXCISE_FUEL_WINE_544_553_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_16_EXCISE_TOBACCO_ENVIRONMENT_559_563_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_16_EXCISE_COAL_ELECTRICITY_566_573_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_16_LATE_EXCISE_576_589_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_16_LATE_EXCISE_CUSTOMS_590_620_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_ADMINISTRATIVE_FINANCIAL_602_630_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_INHERITANCE_RADIOACTIVE_650_682_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_RADIOACTIVE_JUDICIAL_683_696_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_WEALTH_OVERSEAS_GAME_714_763_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_REGULARIZATION_FINANCIAL_770_791_CONTENT_V1,
    ...PUBLIC_AEAT_BATCH_17_AUDIOVISUAL_HISTORICAL_792_797_CONTENT_V1,
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
