import { describe, expect, it } from "vitest";
import {
  FISCAL_ENTITY_RELATION_CATALOG,
  automatedStatusForRelation,
  getFiscalEntityRelationCatalogEntry,
} from "./relation-types";

describe("fiscal notification relation catalog", () => {
  it("keeps the versioned corpus catalog complete and non-legal", () => {
    expect(FISCAL_ENTITY_RELATION_CATALOG).toHaveLength(28);
    expect(
      new Set(FISCAL_ENTITY_RELATION_CATALOG.map((item) => item.type)).size,
    ).toBe(28);
    expect(
      FISCAL_ENTITY_RELATION_CATALOG.every(
        (item) =>
          item.catalogSource === "ANONYMIZED_CORPUS_SEED" &&
          item.catalogVersion === 1 &&
          Object.isFrozen(item),
      ),
    ).toBe(true);
  });

  it("activates only exact identity and generic explicit suggestions", () => {
    expect(
      FISCAL_ENTITY_RELATION_CATALOG.filter((item) =>
        item.activation.startsWith("ACTIVE_"),
      ).map((item) => item.type),
    ).toEqual(["EXACT_FILE_DUPLICATE", "POSSIBLY_RELATED"]);
    expect(
      automatedStatusForRelation("EXACT_FILE_DUPLICATE", "EXACT_FILE_HASH"),
    ).toBe("SYSTEM_CONFIRMED_EXACT");
    expect(
      automatedStatusForRelation("POSSIBLY_RELATED", "EXPLICIT_REFERENCE"),
    ).toBe("SUGGESTED");
    expect(() =>
      automatedStatusForRelation("SAME_CASE", "EXPLICIT_REFERENCE"),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_NOT_ACTIVE");
  });

  it("keeps inactive and human-only semantics fail closed", () => {
    expect(() =>
      automatedStatusForRelation("SEIZURE_FOR_DEBT", "EXPLICIT_REFERENCE"),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_NOT_ACTIVE");
    expect(() =>
      automatedStatusForRelation(
        "USER_CONFIRMED_RELATION",
        "EXPLICIT_PARENT_ID",
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_RELATION_REQUIRES_HUMAN_ACTION");
    expect(() =>
      automatedStatusForRelation("EXACT_FILE_DUPLICATE", "EXPLICIT_REFERENCE"),
    ).toThrow("FISCAL_NOTIFICATIONS_EXACT_RELATION_BASIS_REQUIRED");
    expect(() =>
      automatedStatusForRelation(
        "POSSIBLY_RELATED",
        "BOGUS" as never,
      ),
    ).toThrow("FISCAL_NOTIFICATIONS_INVALID_RELATION_BASIS");
    expect(getFiscalEntityRelationCatalogEntry("TEMPLATE_LINEAGE").activation).toBe(
      "CATALOG_ONLY_REVIEW_REQUIRED",
    );
  });
});
