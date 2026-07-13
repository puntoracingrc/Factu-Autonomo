import { describe, expect, it } from "vitest";
import { segmentFiscalNotificationPrimaryActsV1 } from "./primary-act-segmentation.v1";

function page(pageNumber: number, ...normalizedLines: string[]) {
  return Object.freeze({
    pageNumber,
    normalizedLines: Object.freeze(normalizedLines),
  });
}

describe("fiscal notification primary-act segmentation v1", () => {
  it("starts only from a closed title in the first forty lines of page one", () => {
    expect(
      segmentFiscalNotificationPrimaryActsV1([
        page(1, "sede agenciatributaria gob es", "providencia de apremio"),
      ]),
    ).toMatchObject({
      outcome: "PRIMARY_TITLE",
      segments: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          titleAnchorId: "ENFORCEMENT_ORDER_TITLE",
          origin: "DOCUMENT_PRIMARY",
          startPageNumber: 1,
          pageNumbers: [1],
          boundaryPageNumber: null,
        },
      ],
      retainedSourceContent: "NONE",
    });

    expect(
      segmentFiscalNotificationPrimaryActsV1([
        page(1, ...Array.from({ length: 40 }, () => "cabecera"), "providencia de apremio"),
      ]),
    ).toMatchObject({ outcome: "NO_REGISTERED_TITLE", segments: [] });
  });

  it("starts an attached segment at the first later registered title", () => {
    expect(
      segmentFiscalNotificationPrimaryActsV1([
        page(1, "sede agenciatributaria gob es"),
        page(2, "providencia de apremio"),
      ]),
    ).toMatchObject({
      outcome: "ATTACHED_TITLE",
      segments: [
        {
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          origin: "ATTACHED_ACT",
          startPageNumber: 2,
          pageNumbers: [2],
        },
      ],
    });
  });

  it("stops before the first later page headed by any registered title", () => {
    const result = segmentFiscalNotificationPrimaryActsV1([
      page(1, "providencia de apremio"),
      page(2, "continuacion"),
      page(3, "concesion de aplazamiento o fraccionamiento de deudas"),
      page(4, "anexo i"),
    ]);

    expect(result.segments).toEqual([
      {
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        titleAnchorId: "ENFORCEMENT_ORDER_TITLE",
        origin: "DOCUMENT_PRIMARY",
        startPageNumber: 1,
        pageNumbers: [1, 2],
        boundaryPageNumber: 3,
      },
    ]);
    expect(JSON.stringify(result)).not.toContain("continuacion");

    expect(
      segmentFiscalNotificationPrimaryActsV1([
        page(1, "providencia de apremio"),
        page(2, "providencia de apremio"),
        page(3, "importe de la deuda"),
      ]).segments[0],
    ).toMatchObject({ pageNumbers: [1], boundaryPageNumber: 2 });
  });

  it("reports two page-one titles as ambiguous without selecting either", () => {
    const result = segmentFiscalNotificationPrimaryActsV1([
      page(
        1,
        "providencia de apremio",
        "concesion del aplazamiento o fraccionamiento",
      ),
      page(2, "continuacion"),
    ]);

    expect(result.outcome).toBe("AMBIGUOUS_PRIMARY_TITLES");
    expect(result.segments.map((segment) => segment.familyId)).toEqual([
      "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
      "AEAT_DEFERRAL_GRANT_CANDIDATE",
    ]);
  });

  it("reports two titles on the first attached page as ambiguous", () => {
    const result = segmentFiscalNotificationPrimaryActsV1([
      page(1, "wrapper"),
      page(2, "wrapper continuation"),
      page(
        3,
        "providencia de apremio",
        "concesion del aplazamiento o fraccionamiento",
      ),
      page(4, "continuacion"),
    ]);

    expect(result.outcome).toBe("AMBIGUOUS_ATTACHED_TITLES");
    expect(result.segments).toEqual([
      expect.objectContaining({
        familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
        origin: "ATTACHED_ACT",
        startPageNumber: 3,
        pageNumbers: [3, 4],
      }),
      expect.objectContaining({
        familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
        origin: "ATTACHED_ACT",
        startPageNumber: 3,
        pageNumbers: [3, 4],
      }),
    ]);
  });

  it("is deterministic, deeply immutable and cancellation-aware", () => {
    const pages = Object.freeze([page(1, "providencia de apremio")]);
    const first = segmentFiscalNotificationPrimaryActsV1(pages);
    const second = segmentFiscalNotificationPrimaryActsV1(pages);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.segments)).toBe(true);
    expect(Object.isFrozen(first.segments[0]?.pageNumbers)).toBe(true);

    const controller = new AbortController();
    controller.abort();
    expect(() =>
      segmentFiscalNotificationPrimaryActsV1(pages, controller.signal),
    ).toThrowError(expect.objectContaining({ code: "ABORTED" }));
  });
});
