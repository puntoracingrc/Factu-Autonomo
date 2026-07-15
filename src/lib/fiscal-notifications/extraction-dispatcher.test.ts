import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";

function documentWith(...pageTexts: string[]) {
  return Object.freeze({
    ownerScope: "user:synthetic",
    documentId: "document-synthetic-dispatch",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.trim().length === 0,
        }),
      ),
    ),
  });
}

const ENFORCEMENT =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "PROVIDENCIA DE APREMIO\n" +
  "IDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA";
const HISTORICAL_ENFORCEMENT =
  "Agencia Tributaria\nwww.agenciatributaria.es\n" +
  "NOTIFICACIÓN DE PROVIDENCIA DE APREMIO\n" +
  "IDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA";
const DEFERRAL =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "CONCESIÓN DEL APLAZAMIENTO / FRACCIONAMIENTO DE DEUDAS SIN GARANTÍA\n" +
  "ANEXO I\nCÁLCULO DE INTERESES";
const OFFSET_AGREEMENT =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "ACUERDO DE COMPENSACIÓN DE OFICIO\n" +
  "CRÉDITO Y DEUDAS COMPENSADAS DE OFICIO\n" +
  "NÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0001";
const REAL_ESTATE_SEIZURE =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "DILIGENCIA DE EMBARGO DE BIENES INMUEBLES";
const FORMAL_FILING_REQUIREMENT =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES\n" +
  "Declaraciones o autoliquidaciones no presentadas";
const DOCUMENTATION_REQUIREMENT =
  "Agencia Tributaria\nwww.agenciatributaria.gob.es\n" +
  "REQUERIMIENTO\nIDENTIFICACIÓN DEL DOCUMENTO\nACUERDO\n" +
  "Deberá aportar la documentación justificativa que se indica a continuación\n" +
  "PLAZO\nDiez días hábiles";
const ROI_REGISTRATION =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "ACUERDO DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS";

describe("fiscal notification extraction dispatcher", () => {
  it.each([
    [ENFORCEMENT, "AEAT_ENFORCEMENT_ORDER_CANDIDATE"],
    [HISTORICAL_ENFORCEMENT, "AEAT_ENFORCEMENT_ORDER_CANDIDATE"],
    [DEFERRAL, "AEAT_DEFERRAL_GRANT_CANDIDATE"],
    [OFFSET_AGREEMENT, "AEAT_OFFSET_AGREEMENT_CANDIDATE"],
    [REAL_ESTATE_SEIZURE, "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE"],
    [FORMAL_FILING_REQUIREMENT, "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE"],
    [DOCUMENTATION_REQUIREMENT, "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE"],
    [ROI_REGISTRATION, "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE"],
  ])("returns a review-only candidate for a complete supported family", (text, familyId) => {
    const result = extractFiscalNotificationCandidates(documentWith(text));

      expect(result).toMatchObject({
        engineVersion: "1.5.0",
        status: "REVIEW_REQUIRED",
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        selectedFamilyId: null,
        materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
        requiresHumanReview: true,
        retainedSourceContent: "NONE",
      });
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]?.familyId).toBe(familyId);
      expect(result.candidates[0]?.segmentationVersion).toBe("1.1.0");
      expect(JSON.stringify(result)).not.toContain(text);
    },
  );

  it.each([
    [
      "PROVIDENCIA DE APREMIO\nIDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA",
      "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
    ],
    [
      "CONCESIÓN DEL APLAZAMIENTO / FRACCIONAMIENTO DE DEUDAS SIN GARANTÍA\nANEXO I\nCÁLCULO DE INTERESES",
      "AEAT_DEFERRAL_GRANT_CANDIDATE",
    ],
    [
      "ACUERDO DE COMPENSACIÓN DE OFICIO\nCRÉDITO Y DEUDAS COMPENSADAS DE OFICIO\nNÚMERO DE ACUERDO DE COMPENSACIÓN: ACUERDO-0001",
      "AEAT_OFFSET_AGREEMENT_CANDIDATE",
    ],
    [
      "DILIGENCIA DE EMBARGO DE BIENES INMUEBLES\nIDENTIFICACIÓN DEL DOCUMENTO",
      "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
    ],
    [
      "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES\nDeclaraciones o autoliquidaciones no presentadas",
      "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
    ],
    [
      "REQUERIMIENTO\nIDENTIFICACIÓN DEL DOCUMENTO\nACUERDO\nDocumentación justificativa\nPLAZO",
      "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE",
    ],
    [
      "ACUERDO DE ALTA EN EL REGISTRO DE OPERADORES INTRACOMUNITARIOS\nIDENTIFICACIÓN DEL DOCUMENTO",
      "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
    ],
  ])(
    "recognizes the closed primary-act structure without inferring authority: %s",
    (text, familyId) => {
      const result = extractFiscalNotificationCandidates(documentWith(text));
      expect(result).toMatchObject({
        engineVersion: "1.5.0",
        status: "REVIEW_REQUIRED",
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          expect.objectContaining({
            familyId,
            authoritySignal: "AEAT_UNVERIFIED",
            missingRequiredAnchorIds: [],
            conflictingAnchorIds: [],
          }),
        ],
      });
      expect(result.candidates[0]?.matchedAnchors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            anchorId: "STRUCTURAL_PRIMARY_ACT_HEADER",
            pageNumbers: [1],
          }),
        ]),
      );
      expect(result.candidates[0]?.matchedAnchors).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL" }),
        ]),
      );
    },
  );

  it("requires the closed omitted-returns marker for the formal filing family", () => {
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          FORMAL_FILING_REQUIREMENT.replace(
            "Declaraciones o autoliquidaciones no presentadas",
            "Información sintética sin el marcador requerido",
          ),
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
          missingRequiredAnchorIds: [
            "FORMAL_FILING_OMITTED_RETURNS_MARKER",
          ],
        }),
      ],
    });
  });

  it("keeps historical compensation Annex I and II in the same reviewed act", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        [
          "Agencia Tributaria",
          "www.agenciatributaria.es",
          "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
          "IDENTIFICACIÓN DEL DOCUMENTO",
          "Número de acuerdo de compensación: ACUERDO-SINTETICO-1",
        ].join("\n"),
        "RECURSOS Y RECLAMACIONES",
        [
          "ANEXO I",
          "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
          "CRÉDITO Y DEUDAS",
        ].join("\n"),
        "Continuación de la tabla sintética",
        [
          "ANEXO II",
          "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
          "DETALLE DE EFECTOS",
        ].join("\n"),
      ),
    );

    expect(result).toMatchObject({
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        {
          familyId: "AEAT_OFFSET_AGREEMENT_CANDIDATE",
          handlerVersion: "1.1.0",
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: [],
        },
      ],
    });
    expect(result.candidates[0]?.matchedAnchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anchorId: "OFFSET_CREDIT_AND_DEBT_ANNEX",
          pageNumbers: [3],
        }),
      ]),
    );
  });

  it("does not cross a repeated compensation title without an exact annex heading", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        [
          "Agencia Tributaria",
          "www.agenciatributaria.es",
          "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
          "Número de acuerdo de compensación: ACUERDO-SINTETICO-2",
        ].join("\n"),
        [
          "ACUERDO DE COMPENSACIÓN A INSTANCIA DEL OBLIGADO AL PAGO",
          "CRÉDITO Y DEUDAS",
        ].join("\n"),
      ),
    );

    expect(result).toMatchObject({
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          handlerVersion: "1.1.0",
          missingRequiredAnchorIds: ["OFFSET_CREDIT_AND_DEBT_ANNEX"],
        }),
      ],
    });
  });

  it("does not borrow the formal-filing marker from another page", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "REQUERIMIENTO DE PRESENTACIÓN DE DECLARACIONES O AUTOLIQUIDACIONES",
        ].join("\n"),
        "Declaraciones o autoliquidaciones no presentadas",
      ),
    );
    expect(result).toMatchObject({
      engineVersion: "1.5.0",
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
          segmentationVersion: "1.1.0",
          missingRequiredAnchorIds: [
            "FORMAL_FILING_OMITTED_RETURNS_MARKER",
          ],
        }),
      ],
    });
    expect(result.candidates[0]?.matchedAnchors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anchorId: "FORMAL_FILING_OMITTED_RETURNS_MARKER",
        }),
      ]),
    );
  });

  it.each([
    "sede.agenciatributaria.gob.es",
    "https://sede.agenciatributaria.gob.es",
    "www.agenciatributaria.es",
    "http://www.agenciatributaria.es",
    "https://www.agenciatributaria.es",
  ])("accepts only the explicit normalized official host line: %s", (hostLine) => {
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          ENFORCEMENT.replace("sede.agenciatributaria.gob.es", hostLine),
        ),
      ),
    ).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
    });
  });

  it.each([
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G123.shtml",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/?x=1#inicio",
    "Consulta https://sede.agenciatributaria.gob.es/Sede/procedimientos/G123.shtml",
    "sede.agenciatributaria.gob.es / ayuda",
    "HTTPS://SEDE.AGENCIATRIBUTARIA.GOB.ES/Sede/ayuda",
  ])("keeps a legitimate official URL or narrative neutral: %s", (hostLine) => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        ENFORCEMENT.replace("sede.agenciatributaria.gob.es", hostLine),
      ),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: [],
          conflictingAnchorIds: [],
        }),
      ],
    });
    expect(result.candidates[0]?.matchedAnchors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ anchorId: "AEAT_OFFICIAL_DOMAIN_LABEL" }),
        expect.objectContaining({ anchorId: "CONFLICTING_AEAT_HOST_LINE" }),
      ]),
    );
  });

  it.each([
    "https://sede.agenciatributaria.gob.es.example/ruta",
    "https://mirror.sede.agenciatributaria.gob.es.example/ruta",
    "https://sede.agenciatributaria.gob.es@evil.example/ruta",
    "https://user:sede.agenciatributaria.gob.es@evil.example/ruta",
    "https://sede%2Eagenciatributaria%2Egob%2Ees@evil.example/ruta",
    "sede.agenciatributaria.gob.es.example/ruta",
  ])("blocks a reliably parsed AEAT hostname lookalike: %s", (hostLine) => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        ENFORCEMENT.replace("sede.agenciatributaria.gob.es", hostLine),
      ),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_AUTHORITY_OR_TERRITORY",
      candidates: [
        expect.objectContaining({
          signalStatus: "CONFLICTING_AUTHORITY_OR_TERRITORY",
          missingRequiredAnchorIds: [],
          conflictingAnchorIds: ["CONFLICTING_AEAT_HOST_LINE"],
        }),
      ],
    });
  });

  it.each([
    "mirror sede.agenciatributaria.gob.es",
    "https://evil.example/?next=https://sede.agenciatributaria.gob.es/ruta",
    "sub.sede.agenciatributaria.gob.es/ruta",
  ])("does not invent a host conflict from ambiguous or controlled text: %s", (hostLine) => {
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          ENFORCEMENT.replace("sede.agenciatributaria.gob.es", hostLine),
        ),
      ),
    ).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          conflictingAnchorIds: [],
          authoritySignal: "AEAT_UNVERIFIED",
        }),
      ],
    });
  });

  it("keeps the generic requerimiento title incomplete without its closed structure", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "REQUERIMIENTO POR DECLARACIONES O AUTOLIQUIDACIONES NO PRESENTADAS",
        ].join("\n"),
      ),
    );
    expect(result).toMatchObject({
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE",
        }),
      ],
    });
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          "Agencia Tributaria\nsede.agenciatributaria.gob.es\nREQUERIMIENTO",
        ),
      ),
    ).toMatchObject({
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE",
          missingRequiredAnchorIds: expect.arrayContaining([
            "DOCUMENT_IDENTIFICATION_SECTION",
            "DOCUMENTATION_REQUIREMENT_AGREEMENT_SECTION",
            "DOCUMENTATION_REQUIREMENT_DEADLINE_SECTION",
            "DOCUMENTATION_REQUIREMENT_BODY_MARKER",
          ]),
        }),
      ],
    });
  });

  it("does not recognize a documentation requirement without a literal request for documents", () => {
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          [
            "Agencia Tributaria",
            "www.agenciatributaria.gob.es",
            "REQUERIMIENTO",
            "IDENTIFICACIÓN DEL DOCUMENTO",
            "ACUERDO",
            "PLAZO",
          ].join("\n"),
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE",
          missingRequiredAnchorIds: ["DOCUMENTATION_REQUIREMENT_BODY_MARKER"],
        }),
      ],
    });
  });

  it("does not let a bundled page-two enforcement order alter a page-one real-estate seizure", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(REAL_ESTATE_SEIZURE, ENFORCEMENT),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
          documentType: "AEAT_SEIZURE_ORDER",
        }),
      ],
    });
  });

  it.each([
    [REAL_ESTATE_SEIZURE, "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE"],
    [FORMAL_FILING_REQUIREMENT, "AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE"],
    [ROI_REGISTRATION, "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE"],
  ])("keeps an attached R1 act partial: %s", (text, familyId) => {
    const result = extractFiscalNotificationCandidates(
      documentWith("Wrapper sintético", "Continuación", text),
    );
    expect(result).toMatchObject({
      engineVersion: "1.5.0",
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId,
          missingRequiredAnchorIds: ["STRUCTURAL_FIRST_PAGE_HEADER"],
        }),
      ],
    });
  });

  it.each([
    [REAL_ESTATE_SEIZURE, "Tesorería General de la Seguridad Social"],
    [FORMAL_FILING_REQUIREMENT, "Agencia Tributaria Canaria"],
    [ROI_REGISTRATION, "Diputación Foral de Bizkaia"],
  ])("fails closed when an R1 title conflicts with authority: %s", (text, conflict) => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${conflict}\n${text}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_AUTHORITY_OR_TERRITORY",
      candidates: [
        expect.objectContaining({
          signalStatus: "CONFLICTING_AUTHORITY_OR_TERRITORY",
        }),
      ],
      selectedFamilyId: null,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  });

  it.each([REAL_ESTATE_SEIZURE, FORMAL_FILING_REQUIREMENT, ROI_REGISTRATION])(
    "rejects an R1 title after the first forty normalized lines",
    (text) => {
      expect(
        extractFiscalNotificationCandidates(
          documentWith(
            [
              ...Array.from({ length: 40 }, () => "cabecera sintetica"),
              text,
            ].join("\n"),
          ),
        ),
      ).toMatchObject({
        status: "INFORMATION_PENDING",
        reason: "NO_SUPPORTED_FAMILY_SIGNAL",
        candidates: [],
      });
    },
  );

  it.each([
    `Manual para interpretar\n${REAL_ESTATE_SEIZURE}`,
    `Guía de ejemplo\n${FORMAL_FILING_REQUIREMENT}`,
    `Instrucciones para consultar el censo\n${ROI_REGISTRATION}`,
  ])("marks an R1 manual as a document conflict", (text) => {
    expect(extractFiscalNotificationCandidates(documentWith(text))).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_DOCUMENT_SIGNAL",
      candidates: [
        expect.objectContaining({
          signalStatus: "CONFLICTING_DOCUMENT_SIGNAL",
          conflictingAnchorIds: ["CONFLICTING_NON_DOCUMENT_GUIDE"],
        }),
      ],
    });
  });

  it.each([
    "Este texto comenta un requerimiento formal de presentación",
    "Descripción de una diligencia de embargo sobre un inmueble",
    "Información general acerca del registro de operadores intracomunitarios",
  ])("does not classify an R1 narrative mention: %s", (text) => {
    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          `Agencia Tributaria\nsede.agenciatributaria.gob.es\n${text}`,
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
  });

  it("keeps two closed R1 titles ambiguous", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${REAL_ESTATE_SEIZURE}\n${ROI_REGISTRATION}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
      selectedFamilyId: null,
    });
    expect(result.candidates.map((candidate) => candidate.familyId)).toEqual([
      "AEAT_REAL_ESTATE_SEIZURE_CANDIDATE",
      "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
    ]);
  });

  it("keeps ROI classification literal and emits no current-registration claim", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ROI_REGISTRATION}\nDatos identificativos`),
    );
    expect(result.candidates[0]).toMatchObject({
      familyId: "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE",
      documentType: "GENERIC_ADMINISTRATIVE_NOTICE",
      requiresHumanReview: true,
    });
    expect(JSON.stringify(result)).not.toMatch(/VIES|vigente|alta actual/iu);
  });

  it("does not turn absent information into a negative conclusion", () => {
    expect(
      extractFiscalNotificationCandidates(documentWith("Comunicación sintética")),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
    expect(extractFiscalNotificationCandidates(documentWith("   "))).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_EXTRACTABLE_TEXT",
      candidates: [],
    });
  });

  it("does not choose when both supported family titles appear", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\n${DEFERRAL}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
      selectedFamilyId: null,
    });
    expect(result.candidates).toHaveLength(2);
  });

  it.each([
    "Agència Tributària de Catalunya",
    "Agencia Tributaria de Andalucía",
    "Axencia Tributaria de Galicia",
    "Agència Tributària de les Illes Balears",
    "Agencia Tributaria Canaria",
    "IGIC",
    "IPSI Ciudad Autónoma de Ceuta",
    "Hacienda Tributaria de Navarra",
    "Diputación Foral de Bizkaia",
  ])("fails closed on unsupported authority or territory signal: %s", (signal) => {
    const withoutGenericAuthority = ENFORCEMENT.replace("Agencia Tributaria\n", "");
    const result = extractFiscalNotificationCandidates(
      documentWith(`${signal}\n${withoutGenericAuthority}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_AUTHORITY_OR_TERRITORY",
      selectedFamilyId: null,
    });
    expect(result.candidates[0]?.signalStatus).toBe(
      "CONFLICTING_AUTHORITY_OR_TERRITORY",
    );
  });

  it("does not confuse a recipient location with a territorial issuer", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        `${ENFORCEMENT}\nDomicilio sintético: Bizkaia, Ciudad Autónoma de Ceuta`,
      ),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
    });
    expect(result.candidates[0]?.conflictingAnchorIds).toEqual([]);
  });

  it.each([
    "Manual: Agencia Tributaria PROVIDENCIA DE APREMIO IDENTIFICACIÓN DEL DOCUMENTO IMPORTE DE LA DEUDA",
    "Ejemplo citado: concesión del aplazamiento fraccionamiento de deudas sin garantía, anexo I y cálculo de intereses",
  ])("does not classify anchors quoted inside narrative text", (text) => {
    expect(extractFiscalNotificationCandidates(documentWith(text))).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
  });

  it.each([
    "Manual de ejemplo",
    "Guía para envío de PDF de providencia de apremio AEAT",
    "Instrucciones para interpretar una providencia",
    "Especificación de una plantilla administrativa",
  ])("marks a multiline guide as a non-document conflict: %s", (heading) => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${heading}\n${ENFORCEMENT}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_DOCUMENT_SIGNAL",
      selectedFamilyId: null,
      candidates: [
        expect.objectContaining({
          signalStatus: "CONFLICTING_DOCUMENT_SIGNAL",
          conflictingAnchorIds: ["CONFLICTING_NON_DOCUMENT_GUIDE"],
        }),
      ],
    });
  });

  it.each([13, 39])(
    "detects a guide heading on allowed header line %i",
    (guideLine) => {
      const lines = Array.from(
        { length: guideLine - 1 },
        () => "cabecera sintética",
      );
      lines.push("Manual de ejemplo");
      lines.push("PROVIDENCIA DE APREMIO");
      lines.push("Agencia Tributaria");
      lines.push("sede.agenciatributaria.gob.es");
      lines.push("IDENTIFICACIÓN DEL DOCUMENTO");
      lines.push("IMPORTE DE LA DEUDA");

      expect(
        extractFiscalNotificationCandidates(documentWith(lines.join("\n"))),
      ).toMatchObject({
        status: "REVIEW_REQUIRED",
        reason: "CONFLICTING_DOCUMENT_SIGNAL",
        candidates: [
          expect.objectContaining({
            conflictingAnchorIds: ["CONFLICTING_NON_DOCUMENT_GUIDE"],
          }),
        ],
      });
    },
  );

  it("recognizes a complete closed structural signature without a URL", () => {
    const withoutOfficialDomain = ENFORCEMENT.replace(
      "sede.agenciatributaria.gob.es\n",
      "",
    );
    expect(
      extractFiscalNotificationCandidates(documentWith(withoutOfficialDomain)),
    ).toMatchObject({
      engineVersion: "1.5.0",
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          signalStatus: "COMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: [],
          conflictingAnchorIds: [],
        }),
      ],
    });

    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          "PROVIDENCIA DE APREMIO\nIDENTIFICACIÓN DEL DOCUMENTO",
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          missingRequiredAnchorIds: ["ENFORCEMENT_DEBT_AMOUNT_SECTION"],
        }),
      ],
    });

    expect(
      extractFiscalNotificationCandidates(
        documentWith(DEFERRAL.replace("ANEXO I", "ANEXO II")),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          missingRequiredAnchorIds: expect.arrayContaining([
            "DEFERRAL_INSTALLMENT_ANNEX",
          ]),
        }),
      ],
    });

    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          "sede.agenciatributaria.gob.es",
          "PROVIDENCIA DE APREMIO\nIDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA",
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: ["STRUCTURAL_PRIMARY_ACT_HEADER"],
        }),
      ],
    });
  });

  it("evaluates the first attached act from its own header without making it complete", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        "Wrapper sintético\nsede.agenciatributaria.gob.es\nIMPORTE DE LA DEUDA",
        "Continuación del wrapper\nIDENTIFICACIÓN DEL DOCUMENTO",
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "PROVIDENCIA DE APREMIO",
          "IDENTIFICACIÓN DEL DOCUMENTO",
        ].join("\n"),
        "IMPORTE DE LA DEUDA",
      ),
    );

    expect(result).toMatchObject({
      engineVersion: "1.5.0",
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      selectedFamilyId: null,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      retainedSourceContent: "NONE",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: ["STRUCTURAL_FIRST_PAGE_HEADER"],
        }),
      ],
    });
    const pagesByAnchor = new Map(
      result.candidates[0]?.matchedAnchors.map((anchor) => [
        anchor.anchorId,
        anchor.pageNumbers,
      ]),
    );
    expect(pagesByAnchor.get("AEAT_OFFICIAL_DOMAIN_LABEL")).toEqual([3]);
    expect(pagesByAnchor.get("ENFORCEMENT_ORDER_TITLE")).toEqual([3]);
    expect(
      pagesByAnchor.get("ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION"),
    ).toEqual([3]);
    expect(pagesByAnchor.get("ENFORCEMENT_DEBT_AMOUNT_SECTION")).toEqual([4]);
    expect(pagesByAnchor.has("STRUCTURAL_FIRST_PAGE_HEADER")).toBe(false);
  });

  it("does not borrow required anchors printed before an attached title", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        "Wrapper\nsede.agenciatributaria.gob.es\nIMPORTE DE LA DEUDA",
        "IDENTIFICACIÓN DEL DOCUMENTO",
        "PROVIDENCIA DE APREMIO",
      ),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          missingRequiredAnchorIds: [
            "ENFORCEMENT_DOCUMENT_IDENTIFICATION_SECTION",
            "ENFORCEMENT_DEBT_AMOUNT_SECTION",
            "STRUCTURAL_PRIMARY_ACT_HEADER",
          ],
        }),
      ],
    });
  });

  it("keeps two titles on the first attached page ambiguous", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith("Wrapper", "Wrapper continuation", `${ENFORCEMENT}\n${DEFERRAL}`),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
      selectedFamilyId: null,
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: ["STRUCTURAL_FIRST_PAGE_HEADER"],
        }),
        expect.objectContaining({
          familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE",
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: ["STRUCTURAL_FIRST_PAGE_HEADER"],
        }),
      ],
    });
  });

  it("never retains wrapper or attached-act text", () => {
    const sentinel = "PRIVATE_ATTACHED_ACT_SENTINEL";
    const result = extractFiscalNotificationCandidates(
      documentWith(
        `Wrapper ${sentinel}`,
        "Wrapper continuation",
        `${ENFORCEMENT}\n${sentinel}`,
      ),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain(sentinel);
  });

  it("does not borrow required anchors from a later bundled act", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        [
          "Agencia Tributaria",
          "sede.agenciatributaria.gob.es",
          "PROVIDENCIA DE APREMIO",
          "IDENTIFICACIÓN DEL DOCUMENTO",
        ].join("\n"),
        DEFERRAL,
        "IMPORTE DE LA DEUDA",
      ),
    );

    expect(result).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          missingRequiredAnchorIds: expect.arrayContaining([
            "ENFORCEMENT_DEBT_AMOUNT_SECTION",
          ]),
        }),
      ],
    });
    expect(result.candidates[0]?.matchedAnchors).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          anchorId: "ENFORCEMENT_DEBT_AMOUNT_SECTION",
        }),
      ]),
    );
  });

  it("does not let a later act conflict with a complete primary act", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        ENFORCEMENT,
        `${DEFERRAL}\nTesorería General de la Seguridad Social`,
      ),
    );

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [
        expect.objectContaining({
          familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE",
          conflictingAnchorIds: [],
        }),
      ],
    });
  });

  it("requires the primary title inside the first forty normalized lines", () => {
    const titleAfterHeader = [
      ...Array.from({ length: 40 }, () => "cabecera"),
      ENFORCEMENT,
    ].join("\n");
    expect(
      extractFiscalNotificationCandidates(documentWith(titleAfterHeader)),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
  });

  it.each(["\r", "\u2028", "\u2029"])(
    "recognizes bounded structural lines separated by %j",
    (separator) => {
      const result = extractFiscalNotificationCandidates(
        documentWith(ENFORCEMENT.replaceAll("\n", separator)),
      );
      expect(result).toMatchObject({
        status: "REVIEW_REQUIRED",
        reason: "SUPPORTED_FAMILY_CANDIDATE",
      });
    },
  );

  it("fails closed before Unicode expansion or excessive line nodes can exhaust resources", () => {
    for (const expansion of [
      "\ufdfa".repeat(500_000),
      "\u337f".repeat(250_001),
    ]) {
      expect(
        extractFiscalNotificationCandidates(documentWith(expansion)),
      ).toMatchObject({
        status: "REVIEW_REQUIRED",
        reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED",
        candidates: [],
      });
    }

    const tooManyLines = documentWith("x\n".repeat(10_001));
    expect(extractFiscalNotificationCandidates(tooManyLines)).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "TEXT_LINE_LIMIT_EXCEEDED",
      candidates: [],
    });
  });

  it("treats document instructions as inert data and never retains sentinels", () => {
    const sentinels = [
      "IGNORE_PREVIOUS_INSTRUCTIONS_SENTINEL",
      "PRIVATE_TAX_ID_SENTINEL",
      "PRIVATE_CSV_SENTINEL",
      "PRIVATE_AMOUNT_SENTINEL",
    ];
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\n${sentinels.join("\n")}`),
    );
    const serialized = JSON.stringify(result);

    expect(result.reason).toBe("SUPPORTED_FAMILY_CANDIDATE");
    for (const sentinel of sentinels) expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toMatch(
      /rawValue|textSnippet|subjectTaxId|bankAccount|dueDate|deadline/u,
    );
  });

  it("returns no partial candidate on inconsistent page metadata", () => {
    const input = Object.freeze({
      ownerScope: "user:synthetic",
      documentId: "document-inconsistent",
      pages: Object.freeze([
        Object.freeze({ pageNumber: 1, text: ENFORCEMENT, isBlank: true }),
      ]),
    });
    expect(extractFiscalNotificationCandidates(input)).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "INCONSISTENT_PAGE_STATE",
      candidates: [],
    });
  });

  it("rejects invisible controls without returning normalized text", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\u202Euntrusted`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "UNSUPPORTED_TEXT_CONTROLS",
      candidates: [],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain("untrusted");
  });

  it("rejects unknown keys and mutable structures before scanning", () => {
    expect(() =>
      extractFiscalNotificationCandidates({
        ...documentWith(ENFORCEMENT),
        privateTaxId: "must-never-be-read",
      }),
    ).toThrowError(expect.objectContaining({ path: "$.$unknown" }));
    expect(() =>
      extractFiscalNotificationCandidates({
        ownerScope: "user:synthetic",
        documentId: "document-mutable",
        pages: [{ pageNumber: 1, text: ENFORCEMENT, isBlank: false }],
      }),
    ).toThrowError(expect.objectContaining({ path: "$frozen" }));
  });

  it("is deterministic, deeply immutable and does not mutate its input", () => {
    const input = documentWith(ENFORCEMENT);
    const before = structuredClone(input);
    const first = extractFiscalNotificationCandidates(input);
    const second = extractFiscalNotificationCandidates(input);

    expect(input).toEqual(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidates)).toBe(true);
    expect(Object.isFrozen(first.candidates[0]?.matchedAnchors)).toBe(true);
    expect(
      Object.isFrozen(first.candidates[0]?.matchedAnchors[0]?.pageNumbers),
    ).toBe(true);
    expect(() =>
      (first.candidates as unknown as unknown[]).push({}),
    ).toThrow();
  });

  it("honors cancellation and rejects oversized page collections before handlers", () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = Object.freeze({
      ...documentWith(ENFORCEMENT),
      signal: controller.signal,
    });
    expect(() => extractFiscalNotificationCandidates(aborted)).toThrowError(
      expect.objectContaining({ code: "ABORTED" }),
    );

    const pages = Array.from(
      { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages + 1 },
      (_, index) =>
        Object.freeze({ pageNumber: index + 1, text: "x", isBlank: false }),
    );
    expect(() =>
      extractFiscalNotificationCandidates(
        Object.freeze({
          ownerScope: "user:synthetic",
          documentId: "document-too-large",
          pages: Object.freeze(pages),
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "TOO_MANY_PAGES" }));
  });

  it("preserves owner isolation without trimming or coercion", () => {
    expect(() =>
      extractFiscalNotificationCandidates(
        Object.freeze({
          ...documentWith(ENFORCEMENT),
          ownerScope: " user:synthetic",
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "OWNER_SCOPE_REQUIRED" }));
    expect(extractFiscalNotificationCandidates(documentWith(ENFORCEMENT))).toMatchObject(
      {
        ownerScope: "user:synthetic",
        documentId: "document-synthetic-dispatch",
      },
    );
  });
});
