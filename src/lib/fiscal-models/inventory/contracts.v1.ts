export const AEAT_MODEL_INVENTORY_SCHEMA_VERSION_V1 =
  "aeat-model-inventory.v1" as const;

export type AeatModelInventoryReviewStatusV1 = "PENDING_REVIEW";
export type AeatModelInventoryLifecycleStatusV1 = "UNDETERMINED";
export type AeatModelInventoryFieldStatusV1 =
  "SOURCE_CAPTURED" | "SOURCE_PENDING";

export interface AeatOfficialIndexSourceV1 {
  readonly id: "aeat.declarations-by-model.2026-07-08";
  readonly authority: "AEAT";
  readonly title: "Presentar y consultar declaraciones por modelo";
  readonly canonicalUrl: "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html";
  readonly sourceUpdatedOn: "2026-07-08";
  readonly verifiedOn: "2026-07-12";
  readonly sourceSha256: string;
  readonly reviewStatus: AeatModelInventoryReviewStatusV1;
}

export interface AeatOfficialIndexRowV1<Code extends string = string> {
  readonly sourceRowLabel: string;
  readonly codes: readonly [Code, ...Code[]];
  readonly officialName: string;
  readonly officialProcedureHref: string;
}

export interface AeatOfficialModelInventoryRecordV1<
  Code extends string = string,
> {
  readonly schemaVersion: typeof AEAT_MODEL_INVENTORY_SCHEMA_VERSION_V1;
  readonly releaseId: "aeat-declarations-by-model-2026-07-08.v1";
  readonly code: Code;
  readonly sourceRowLabel: string;
  readonly sourceGroupCodes: readonly [string, ...string[]];
  readonly officialName: string;
  readonly officialProcedureHref: string;
  readonly sourceId: AeatOfficialIndexSourceV1["id"];
  readonly identityStatus: "SOURCE_CAPTURED";
  readonly procedureHrefStatus: "SOURCE_CAPTURED";
  readonly validityStatus: "SOURCE_PENDING";
  readonly lifecycleStatus: AeatModelInventoryLifecycleStatusV1;
  readonly reviewStatus: AeatModelInventoryReviewStatusV1;
  readonly contentLevel: "STRUCTURAL_INDEX_ONLY";
}

export type AeatOfficialModelInventoryBlockReasonV1 =
  "INVALID_INPUT" | "MODEL_NOT_FOUND" | "INCONSISTENT_INVENTORY";

export type AeatOfficialModelInventoryResultV1<Code extends string = string> =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: AeatOfficialModelInventoryRecordV1<Code>;
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: AeatOfficialModelInventoryBlockReasonV1;
    }>;

export type AeatOfficialModelInventoryListResultV1<
  Code extends string = string,
> =
  | Readonly<{
      status: "REVIEW_ONLY";
      data: readonly AeatOfficialModelInventoryRecordV1<Code>[];
    }>
  | Readonly<{
      status: "BLOCKED";
      reason: "INCONSISTENT_INVENTORY";
    }>;
