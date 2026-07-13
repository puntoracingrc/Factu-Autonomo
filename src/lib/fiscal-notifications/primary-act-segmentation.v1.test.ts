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
      segmentationVersion: "1.1.0",
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

  it.each([
    [
      "diligencia de embargo de bienes inmuebles",
      "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
      "REAL_ESTATE_SEIZURE_TITLE",
    ],
    [
      "requerimiento de presentacion de declaraciones o autoliquidaciones",
      "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
      "FORMAL_FILING_REQUIREMENT_TITLE",
    ],
    [
      "acuerdo de alta en el registro de operadores intracomunitarios",
      "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
      "ROI_REGISTRATION_AGREEMENT_TITLE",
    ],
  ])("registers the closed R1 title %s", (title, familyId, titleAnchorId) => {
    expect(segmentFiscalNotificationPrimaryActsV1([page(1, title)])).toMatchObject({
      outcome: "PRIMARY_TITLE",
      segments: [{ familyId, titleAnchorId, origin: "DOCUMENT_PRIMARY" }],
    });
  });

  it("keeps a page-one real-estate seizure primary when an enforcement order starts on page two", () => {
    expect(
      segmentFiscalNotificationPrimaryActsV1([
        page(1, "diligencia de embargo de bienes inmuebles"),
        page(2, "providencia de apremio"),
        page(3, "importe de la deuda"),
      ]),
    ).toMatchObject({
      outcome: "PRIMARY_TITLE",
      segments: [
        {
          familyId: "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
          pageNumbers: [1],
          boundaryPageNumber: 2,
        },
      ],
    });
  });

  it("does not register a broad requerimiento or a narrative mention", () => {
    for (const title of [
      "requerimiento",
      "este texto explica un requerimiento de presentacion de declaraciones o autoliquidaciones",
      "acuerdo relativo al registro de operadores intracomunitarios",
    ]) {
      expect(
        segmentFiscalNotificationPrimaryActsV1([page(1, title)]),
      ).toMatchObject({ outcome: "NO_REGISTERED_TITLE", segments: [] });
    }
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
    expect(first.segmentationVersion).toBe("1.1.0");
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
