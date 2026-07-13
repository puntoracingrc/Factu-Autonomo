import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PublicAeatOfficialModelContentV1 } from "./contracts.v1";
import {
  listPublicAeatOfficialModelContentsV1,
  resolvePublicAeatOfficialModelContentV1,
} from "./resolver.v1";

const EXPECTED_CODES = [
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
];

const EXPECTED_BATCH_11_NAMES = {
  "296":
    "Declaración informativa. Retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes (sin establecimiento permanente). Resumen anual.",
  "303": "IVA. Autoliquidación.",
  "308":
    "IVA. Régimen Especial del Recargo Equivalencia, artículo 30 bis del Reglamento del IVA y sujetos pasivos ocasionales. Solicitud de devolución.",
  "309": "IVA. Declaración - Liquidación no periódica.",
  "318":
    "IVA. Regularización de las proporciones de tributación de los períodos de liquidación anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios.",
  "319":
    "Pago a cuenta del IVA correspondiente a las entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero",
  "322":
    "IVA. Grupos de entidades. Modelo individual. Autoliquidación mensual.",
  "341":
    "Solicitud de reintegro compensaciones en el Régimen especial de agricultura, ganadería y pesca.",
  "345":
    "Declaración Informativa. Planes, fondos de pensiones y sistemas alternativos. Mutualidades de Previsión Social, Planes de Previsión Asegurados, Planes individuales de Ahorro Sistemático, Planes de Previsión Social Empresarial y Seguros de Dependencia. Declaración anual partícipes y aportaciones.",
  "346":
    "IRPF. Declaración Informativa de Subvenciones e indemnizaciones satisfechas por Entidades Públicas/privadas a agricultores o ganaderos.",
} as const;

const EXPECTED_BATCH_12_NAMES = {
  "347": "Declaración Informativa anual de operaciones con terceras personas",
  "349": "IVA. Declaración recapitulativa de operaciones intracomunitarias.",
  "353": "IVA. Grupo de entidades. Modelo agregado. Autoliquidación mensual.",
  "360":
    "IVA. Gestión de devoluciones de IVA a empresarios o profesionales no establecidos en el territorio de aplicación del impuesto.",
  "361":
    "IVA. Gestión de devoluciones de IVA a empresarios o profesionales no establecidos en el territorio de aplicación del impuesto.",
  "364":
    "Impuesto sobre el Valor Añadido. Solicitud de reembolso de las cuotas tributarias soportadas relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
  "365":
    "Impuesto sobre el Valor Añadido. Solicitud de reconocimiento previo de las exenciones relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
  "368":
    "Declaración de IVA de los regímenes especiales de servicios de telecomunicaciones, de radiodifusión o de televisión o electrónicos",
  "369": "Declaraciones de IVA del régimen One Stop Shop (OSS)",
  "379": "Declaración informativa sobre pagos transfronterizos",
} as const;

const EXPECTED_BATCH_13_NAMES = {
  "380": "IVA. Operaciones asimiladas a las importaciones",
  "381":
    "IVA. Solicitud de reembolso de las cuotas tributarias relativas a las Fuerzas Armadas de cualquier Estado miembro distinto de España",
  "390": "IVA. Declaración Resumen Anual",
  "410":
    "Pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito",
  "411":
    "Impuesto sobre los Depósitos de las Entidades de Crédito. Autoliquidación",
  "430": "Primas de seguros. Declaración-liquidación.",
  "480": "Primas de seguros. Declaración Resumen anual.",
  "490": "Impuesto sobre Determinados Servicios Digitales. Autoliquidación",
  "504":
    "Solicitud de autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea",
  "505":
    "Autorización de expedición o recepción de productos objeto de los impuestos especiales de fabricación con destino a o procedentes del resto de la Unión Europea",
} as const;

const EXPECTED_BATCH_14_NAMES = {
  "506": "II. EE. Solicitud de devolución por introducción en depósito fiscal.",
  "507":
    "II. EE. Solicitud de devolución en el sistema de envíos garantizados.",
  "508":
    "II. EE. Solicitud de devolución por el sistema de ventas a distancia.",
  "510": "II. EE. Declaración de operaciones de recepción del resto de la UE.",
  "512": "II. EE. Destinatarios de productos de tarifa segunda.",
  "515": "Solicitud de entrega de marcas fiscales para las labores del tabaco.",
  "517":
    "Solicitud de marcas fiscales del Impuesto sobre el Alcohol y Bebidas Derivadas.",
  "518":
    "Impuesto sobre el Alcohol y Bebidas Derivadas. Declaración de Trabajo.",
  "519":
    "Impuesto sobre el Alcohol y Bebidas Derivadas. Parte de incidencias en operaciones de trabajo.",
  "520":
    "Impuesto sobre el Alcohol y Bebidas Derivadas. Parte de resultado en operaciones de trabajo.",
} as const;

describe("public AEAT official model content v1", () => {
  it("publishes exactly the reviewed official-content catalog", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;
    expect(result.data.map((entry) => entry.code)).toEqual(EXPECTED_CODES);
    expect(new Set(result.data.map((entry) => entry.code)).size).toBe(141);
    for (const entry of result.data) {
      expect(entry).toMatchObject({
        contentStatus: "OFFICIAL_INFORMATION",
        sourceVerificationStatus: "VERIFIED",
        applicabilityStatus: "NOT_EVALUATED",
        lifecycleStatus:
          entry.code === "037" || entry.code === "150" || entry.code === "179"
            ? "HISTORICAL"
            : "UNDETERMINED",
        reviewedOn: "2026-07-13",
      });
      expect(entry.faq.length).toBeGreaterThanOrEqual(3);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.sources)).toBe(true);
      expect(Object.isFrozen(entry.faq)).toBe(true);
    }
  });

  it("rejects invalid, coerced, accessor and unknown inputs", () => {
    for (const input of [
      null,
      undefined,
      "01",
      { code: 1 },
      { code: "01", extra: true },
      { code: "01 " },
      { code: "01c" },
      { code: "1" },
      { code: "0001" },
      Object.create({ code: "01" }),
    ]) {
      expect(resolvePublicAeatOfficialModelContentV1(input)).toEqual({
        status: "BLOCKED",
        reason: "INVALID_INPUT",
      });
    }
    expect(
      resolvePublicAeatOfficialModelContentV1({
        get code() {
          return "01";
        },
      }),
    ).toEqual({ status: "BLOCKED", reason: "INVALID_INPUT" });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "521" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "191" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
    expect(resolvePublicAeatOfficialModelContentV1({ code: "999" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
  });

  it("keeps every Batch 9 page useful and source-backed without evaluating applicability", () => {
    for (const code of [
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
    ]) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
      expect(result.data.externalNavigation, code).toBeNull();
    }
  });

  it("keeps every Batch 10 page useful and source-backed without evaluating applicability", () => {
    for (const code of [
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
    ]) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
    }
  });

  it("keeps every Batch 11 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_11_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
    }
  });

  it("keeps every Batch 12 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_12_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
    }
  });

  it("keeps every Batch 13 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_13_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
      expect(result.data.externalNavigation, code).toBeNull();
    }
  });

  it("keeps every Batch 14 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_14_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
      expect(result.data.externalNavigation, code).toBeNull();
    }
  });

  it("keeps source provenance complete and internally referenced", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    if (result.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    for (const entry of result.data) {
      const sourceIds = new Set(entry.sources.map((source) => source.id));
      expect(sourceIds.size).toBe(entry.sources.length);
      for (const source of entry.sources) {
        const url = new URL(source.canonicalUrl);
        expect(url.protocol).toBe("https:");
        expect(["sede.agenciatributaria.gob.es", "www.boe.es"]).toContain(
          url.hostname,
        );
        expect(source.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(source.verificationStatus).toBe("SOURCE_HASH_CAPTURED");
      }
      for (const section of entry.sections) {
        for (const item of section.items) {
          expect(item.sourceIds.length).toBeGreaterThan(0);
          expect(new Set(item.sourceIds).size).toBe(item.sourceIds.length);
          expect(item.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
        }
      }
      for (const item of entry.faq) {
        expect(item.question.length).toBeGreaterThan(0);
        expect(item.answer.length).toBeGreaterThan(0);
        expect(new Set(item.sourceIds).size).toBe(item.sourceIds.length);
        expect(item.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
      }
      for (const document of entry.documents) {
        expect(sourceIds.has(document.sourceId), document.id).toBe(true);
        if (document.landingPageSourceId !== null) {
          expect(sourceIds.has(document.landingPageSourceId), document.id).toBe(
            true,
          );
        }
        expect(
          entry.sources.find((source) => source.id === document.sourceId)
            ?.sourceSha256,
          document.id,
        ).toBe(document.sha256);
      }
      for (const link of entry.links) {
        expect(sourceIds.has(link.sourceId), link.id).toBe(true);
      }
      if (entry.thumbnail) {
        expect(sourceIds.has(entry.thumbnail.sourceId), entry.code).toBe(true);
      }
      if (entry.accessMethods) {
        expect(entry.accessMethods.methods.length).toBeGreaterThan(0);
        expect(new Set(entry.accessMethods.methods).size).toBe(
          entry.accessMethods.methods.length,
        );
        expect(entry.accessMethods.sourceIds.length).toBeGreaterThan(0);
        expect(new Set(entry.accessMethods.sourceIds).size).toBe(
          entry.accessMethods.sourceIds.length,
        );
        expect(
          entry.accessMethods.sourceIds.every((id) => sourceIds.has(id)),
        ).toBe(true);
        expect(entry.accessMethods.semantics).toBe("OFFICIAL_INFORMATION_ONLY");
      }
    }
  });

  it("cannot be changed by a consumer mutation attempt", () => {
    const first = resolvePublicAeatOfficialModelContentV1({ code: "01" });
    if (first.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    const originalName = first.data.canonicalName;
    const originalQuestion = first.data.faq[0].question;
    expect(() => {
      (first.data as { canonicalName: string }).canonicalName = "mutado";
    }).toThrow();
    expect(() => {
      (first.data.faq[0] as { question: string }).question = "mutada";
    }).toThrow();
    const second = resolvePublicAeatOfficialModelContentV1({ code: "01" });
    expect(second.status).toBe("OFFICIAL_INFORMATION");
    if (second.status !== "OFFICIAL_INFORMATION") return;
    expect(second.data.canonicalName).toBe(originalName);
    expect(second.data.faq[0].question).toBe(originalQuestion);
  });

  it("keeps the source-backed access channels exact and immutable", () => {
    const expected = {
      "037": {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
      "171": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "172": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "173": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "174": {
        methods: ["WEB_SERVICE"],
        status: "SOURCE_DESCRIBED_FUTURE",
      },
      "179": {
        methods: ["BROWSER_FORM", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
      "180": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "181": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "182": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "184": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "185": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "186": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "187": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "188": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "189": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "190": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "192": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "193": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "194": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "195": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "196": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "198": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "199": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "200": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "202": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "206": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "210": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "211": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "213": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "216": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "217": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "220": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "221": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "222": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "226": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "228": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "230": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "231": {
        methods: ["WEB_SERVICE", "BROWSER_FORM"],
        status: "SOURCE_DESCRIBED",
      },
      "232": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "233": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "234": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "235": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "236": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "237": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "238": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "239": {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED_FUTURE",
      },
      "240": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "241": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "242": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "247": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "270": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "280": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "281": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "282": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "283": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "289": {
        methods: ["BROWSER_FORM", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "290": { methods: ["WEB_SERVICE"], status: "SOURCE_DESCRIBED" },
      "291": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "294": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "295": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "296": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "303": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "308": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "309": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "318": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "319": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "322": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "341": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "345": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "346": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "347": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "349": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "353": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "360": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "361": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "364": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "365": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "369": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "379": {
        methods: ["WEB_SERVICE", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "380": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "381": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "390": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "410": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "411": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "430": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "480": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "490": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "504": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "506": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "507": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "508": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "510": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "512": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "515": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "517": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "518": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "519": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "520": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
    } as const;

    for (const [code, access] of Object.entries(expected)) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.accessMethods).toMatchObject(access);
      expect(Object.isFrozen(result.data.accessMethods)).toBe(true);
      expect(Object.isFrozen(result.data.accessMethods?.methods)).toBe(true);
      expect(Object.isFrozen(result.data.accessMethods?.sourceIds)).toBe(true);
    }

    const model368 = resolvePublicAeatOfficialModelContentV1({ code: "368" });
    expect(model368.status).toBe("OFFICIAL_INFORMATION");
    if (model368.status === "OFFICIAL_INFORMATION") {
      expect(model368.data.accessMethods).toBeUndefined();
    }
    const model505 = resolvePublicAeatOfficialModelContentV1({ code: "505" });
    expect(model505.status).toBe("OFFICIAL_INFORMATION");
    if (model505.status === "OFFICIAL_INFORMATION") {
      expect(model505.data.accessMethods).toBeUndefined();
    }
  });

  it("preserves the source-backed Batch 6 distinctions", () => {
    const model187 = resolvePublicAeatOfficialModelContentV1({ code: "187" });
    const model194 = resolvePublicAeatOfficialModelContentV1({ code: "194" });
    const model196 = resolvePublicAeatOfficialModelContentV1({ code: "196" });
    expect(model187.status).toBe("OFFICIAL_INFORMATION");
    expect(model194.status).toBe("OFFICIAL_INFORMATION");
    expect(model196.status).toBe("OFFICIAL_INFORMATION");
    if (
      model187.status !== "OFFICIAL_INFORMATION" ||
      model194.status !== "OFFICIAL_INFORMATION" ||
      model196.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model187.data.canonicalName).toContain("derechos de suscripción");
    expect(
      model194.data.sources.map((source) => source.canonicalUrl),
    ).toContain("https://www.boe.es/buscar/act.php?id=BOE-A-1999-22309");
    expect(
      model194.data.sources.map((source) => source.canonicalUrl),
    ).not.toContain("https://www.boe.es/buscar/act.php?id=BOE-A-1999-22896");
    expect(model196.data.canonicalName).toContain(
      "Declaración Informativa mensual de cuentas",
    );
    expect(model196.data.sections.flatMap((section) => section.items)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("2026 y siguientes"),
        }),
      ]),
    );
    expect(model196.data.accessMethods).toMatchObject({
      methods: ["WEB_SERVICE"],
      status: "SOURCE_DESCRIBED",
    });
  });

  it("preserves the source-backed Batch 7 lifecycle and document distinctions", () => {
    const model037 = resolvePublicAeatOfficialModelContentV1({ code: "037" });
    const model200 = resolvePublicAeatOfficialModelContentV1({ code: "200" });
    const model202 = resolvePublicAeatOfficialModelContentV1({ code: "202" });
    const model206 = resolvePublicAeatOfficialModelContentV1({ code: "206" });
    expect(model037.status).toBe("OFFICIAL_INFORMATION");
    expect(model200.status).toBe("OFFICIAL_INFORMATION");
    expect(model202.status).toBe("OFFICIAL_INFORMATION");
    expect(model206.status).toBe("OFFICIAL_INFORMATION");
    if (
      model037.status !== "OFFICIAL_INFORMATION" ||
      model200.status !== "OFFICIAL_INFORMATION" ||
      model202.status !== "OFFICIAL_INFORMATION" ||
      model206.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model037.data.lifecycleStatus).toBe("HISTORICAL");
    expect(model037.data.accessMethods?.status).toBe(
      "SOURCE_DESCRIBED_HISTORICAL",
    );
    expect(JSON.stringify(model037.data)).not.toContain("036");
    expect(model037.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "FORM",
          pageCount: 19,
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        }),
      ]),
    );
    expect(model037.data.thumbnail).toMatchObject({ pageNumber: 17 });

    expect(model200.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model200.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
    expect(model202.data.thumbnail).toBeNull();
    expect(model206.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model206.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
  });

  it("preserves the source-backed Batch 8 document, channel and version distinctions", () => {
    const model220 = resolvePublicAeatOfficialModelContentV1({ code: "220" });
    const model222 = resolvePublicAeatOfficialModelContentV1({ code: "222" });
    const model226 = resolvePublicAeatOfficialModelContentV1({ code: "226" });
    const model231 = resolvePublicAeatOfficialModelContentV1({ code: "231" });
    expect(model220.status).toBe("OFFICIAL_INFORMATION");
    expect(model222.status).toBe("OFFICIAL_INFORMATION");
    expect(model226.status).toBe("OFFICIAL_INFORMATION");
    expect(model231.status).toBe("OFFICIAL_INFORMATION");
    if (
      model220.status !== "OFFICIAL_INFORMATION" ||
      model222.status !== "OFFICIAL_INFORMATION" ||
      model226.status !== "OFFICIAL_INFORMATION" ||
      model231.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model220.data.thumbnail).toMatchObject({ pageNumber: 1 });
    expect(model220.data.documents).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "FORM" })]),
    );
    const model222Text = model222.data.sections
      .flatMap((section) => section.items)
      .map((item) => item.text)
      .join(" ");
    expect(model222Text).toContain("gestiones y la ayuda técnica");
    expect(model222Text).toContain("2026 y siguientes");
    expect(model222Text).toContain("instrucciones");
    expect(model222Text).toContain("2025 y siguientes");
    expect(model226.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "INSTRUCTIONS",
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        }),
      ]),
    );
    expect(model226.data.thumbnail).toBeNull();
    expect(model231.data.accessMethods).toMatchObject({
      methods: ["WEB_SERVICE", "BROWSER_FORM"],
      status: "SOURCE_DESCRIBED",
    });
    expect(model231.data.thumbnail).toBeNull();
  });

  it("preserves the source-backed Batch 9 channel and document distinctions", () => {
    const model236 = resolvePublicAeatOfficialModelContentV1({ code: "236" });
    const model239 = resolvePublicAeatOfficialModelContentV1({ code: "239" });
    const model240 = resolvePublicAeatOfficialModelContentV1({ code: "240" });
    const model241 = resolvePublicAeatOfficialModelContentV1({ code: "241" });
    const model242 = resolvePublicAeatOfficialModelContentV1({ code: "242" });
    const model247 = resolvePublicAeatOfficialModelContentV1({ code: "247" });
    for (const result of [
      model236,
      model239,
      model240,
      model241,
      model242,
      model247,
    ]) {
      expect(result.status).toBe("OFFICIAL_INFORMATION");
    }
    if (
      model236.status !== "OFFICIAL_INFORMATION" ||
      model239.status !== "OFFICIAL_INFORMATION" ||
      model240.status !== "OFFICIAL_INFORMATION" ||
      model241.status !== "OFFICIAL_INFORMATION" ||
      model242.status !== "OFFICIAL_INFORMATION" ||
      model247.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }

    expect(model236.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM", "FILE_UPLOAD", "WEB_SERVICE"],
      status: "SOURCE_DESCRIBED",
    });
    const model236Text = JSON.stringify(model236.data);
    expect(model236Text).toContain("disposición adicional vigésima cuarta");
    expect(model236Text).toContain("disposición adicional vigésima tercera");
    expect(model236Text).toContain("no la resuelve");
    expect(
      model236.data.sources.find(
        (source) =>
          source.id ===
          "boe.models-234-236.order-hac-342-2021.consolidated-2024-03-22",
      )?.sourceSha256,
    ).toBe("e49ba193ee0b2fb71ed3d189905e4d8101e8879c828eacd64807980733b7b185");
    expect(
      model236.data.sources.find(
        (source) => source.id === "boe.cross-border-mechanisms.law-10-2020",
      )?.sourceSha256,
    ).toBe("022489ce1497e28d96b1766834694e350b8188ed753bbc3e912e1e17f7701362");
    expect(model239.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM"],
      status: "SOURCE_DESCRIBED_FUTURE",
    });
    expect(
      model239.data.sources.find(
        (source) =>
          source.id === "boe.model-239.royal-decree-1065-2007-article-49-ter",
      ),
    ).toMatchObject({
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984&p=20250402&tn=1#a4-4",
      officialUpdatedOn: "2025-04-02",
      sourceSha256:
        "34a9f6aa791b4b51089751a820cdf9fbb3eee1b51c065ccfef8172e3ea5a1c44",
    });
    expect(model239.data.links).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ label: expect.stringMatching(/presentar/i) }),
      ]),
    );
    expect(model240.data.documents).toHaveLength(2);
    expect(
      Object.fromEntries(
        model240.data.sources
          .filter((source) => source.authority === "BOE")
          .map((source) => [source.id, source.sourceSha256]),
      ),
    ).toMatchObject({
      "boe.complementary-tax.law-7-2024":
        "f18a569e552653c83ed9ff1111cf9fe30e98a1c4f3a13dd80ee3f96a66387d20",
      "boe.complementary-tax.royal-decree-252-2025":
        "96010894fc7db1b1d347fe263e52aeab7eec5dfe4de7355bee72cc7a91004d34",
      "boe.models-240-242.order-hac-1198-2025":
        "db4267865b9db046082376db5ccf9e7d0bf3cb7348f8989286c2d92c7364f30e",
    });
    expect(
      model240.data.sources.find(
        (source) => source.id === "boe.models-240-242.order-hac-1198-2025",
      ),
    ).toMatchObject({
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2025-21727&p=20260529&tn=1",
      officialUpdatedOn: "2026-05-29",
    });
    expect(model241.data.documents).toHaveLength(2);
    expect(
      model241.data.sources.some((source) =>
        source.canonicalUrl.includes("agenciatributaria.gob.aeat"),
      ),
    ).toBe(false);
    expect(model242.data.accessMethods).toMatchObject({
      methods: ["BROWSER_FORM"],
      status: "SOURCE_DESCRIBED",
    });
    expect(model247.data.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "FORM",
          activeContentStatus: "JAVASCRIPT_PRESENT",
          formStatus: "ACROFORM_PRESENT",
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
          previewSuitability: "FORM_PREVIEW",
          usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        }),
      ]),
    );
    expect(model247.data.thumbnail).toMatchObject({
      pageNumber: 1,
      provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
    });
  });

  it("preserves the source-backed Batch 10 channel, document and legal-source distinctions", () => {
    const codes = [
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
    ] as const;
    const models = new Map<
      (typeof codes)[number],
      PublicAeatOfficialModelContentV1
    >();

    for (const code of codes) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      models.set(code, result.data);
      expect(result.data.thumbnail, code).toBeNull();
      expect(
        result.data.sources
          .filter((source) => source.authority === "BOE")
          .every((source) => {
            const url = new URL(source.canonicalUrl);
            return (
              url.pathname === "/diario_boe/txt.php" &&
              url.searchParams.get("id")?.startsWith("BOE-A-") === true
            );
          }),
        code,
      ).toBe(true);
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|presentar declaraci[oó]n/i.test(link.label),
        ),
        code,
      ).toBe(false);
    }

    for (const code of [
      "270",
      "280",
      "281",
      "283",
      "291",
      "294",
      "295",
    ] as const) {
      expect(models.get(code)?.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "REGISTER_DESIGN",
            formStatus: "NO_ACROFORM_DETECTED",
            activeContentStatus: "NO_JAVASCRIPT_DETECTED",
            previewSuitability: "NONE",
          }),
        ]),
      );
    }
    expect(models.get("282")?.documents).toEqual([]);
    expect(
      models
        .get("282")
        ?.sources.some((source) => source.canonicalUrl.endsWith(".xlsx")),
    ).toBe(true);
    expect(models.get("289")?.documents).toHaveLength(3);
    expect(
      models
        .get("289")
        ?.documents.every((document) => document.kind === "GUIDE"),
    ).toBe(true);
    expect(models.get("290")?.documents).toHaveLength(2);
    expect(
      models
        .get("290")
        ?.documents.every((document) => document.kind === "GUIDE"),
    ).toBe(true);
    expect(models.get("270")?.externalNavigation).toMatchObject({
      kind: "AEAT_PERSONAL_AREA",
      policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
    });
    expect(models.get("280")?.externalNavigation).toMatchObject({
      kind: "AEAT_PERSONAL_AREA",
      policy: "EXTERNAL_INFORMATIONAL_NAVIGATION_ONLY",
    });
  });

  it("keeps Batch 11 informational, non-operational and tied to static official sources", () => {
    const codes = [
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
    ] as const;

    for (const code of codes) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;

      expect(result.data.thumbnail, code).toBeNull();
      expect(result.data.externalNavigation, code).toBeNull();
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|presentar declaraci[oó]n|iniciar tr[aá]mite/i.test(
            link.label,
          ),
        ),
        code,
      ).toBe(false);

      for (const source of result.data.sources) {
        const url = new URL(source.canonicalUrl);
        expect(
          ["sede.agenciatributaria.gob.es", "www.boe.es"],
          `${code}:${source.id}`,
        ).toContain(url.hostname);
        expect(
          [
            "www1.agenciatributaria.gob.es",
            "www2.agenciatributaria.gob.es",
            "www12.agenciatributaria.gob.es",
          ],
          `${code}:${source.id}`,
        ).not.toContain(url.hostname);
        if (source.authority === "BOE") {
          expect(url.pathname, `${code}:${source.id}`).toBe(
            "/diario_boe/txt.php",
          );
          expect(url.searchParams.get("id"), `${code}:${source.id}`).toMatch(
            /^BOE-A-\d{4}-\d+$/,
          );
        }
      }
    }

    for (const code of ["296", "308", "345", "346"] as const) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.documents.length, code).toBeGreaterThan(0);
      expect(
        result.data.documents.every(
          (document) => document.previewSuitability === "NONE",
        ),
        code,
      ).toBe(true);
    }

    const model308 = resolvePublicAeatOfficialModelContentV1({ code: "308" });
    expect(model308.status).toBe("OFFICIAL_INFORMATION");
    if (model308.status === "OFFICIAL_INFORMATION") {
      expect(
        model308.data.documents.every(
          (document) =>
            document.freshnessStatus === "LEGACY_REFERENCES_DETECTED",
        ),
      ).toBe(true);
    }
  });

  it("keeps Batch 12 informational, non-operational and tied to static official sources", () => {
    const codes = [
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
    ] as const;

    for (const code of codes) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;

      expect(result.data.thumbnail, code).toBeNull();
      expect(result.data.externalNavigation, code).toBeNull();
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|presentar declaraci[oó]n|iniciar tr[aá]mite/i.test(
            link.label,
          ),
        ),
        code,
      ).toBe(false);

      for (const source of result.data.sources) {
        const url = new URL(source.canonicalUrl);
        expect(
          ["sede.agenciatributaria.gob.es", "www.boe.es"],
          `${code}:${source.id}`,
        ).toContain(url.hostname);
        expect(
          [
            "www1.agenciatributaria.gob.es",
            "www2.agenciatributaria.gob.es",
            "www12.agenciatributaria.gob.es",
          ],
          `${code}:${source.id}`,
        ).not.toContain(url.hostname);
        if (source.authority === "BOE") {
          expect(url.pathname, `${code}:${source.id}`).toBe(
            "/diario_boe/txt.php",
          );
          expect(url.searchParams.get("id"), `${code}:${source.id}`).toMatch(
            /^BOE-A-\d{4}-\d+$/,
          );
        }
      }

      expect(
        result.data.documents.every(
          (document) =>
            document.activeContentStatus === "NO_JAVASCRIPT_DETECTED" &&
            document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        ),
        code,
      ).toBe(true);
    }

    const model368 = resolvePublicAeatOfficialModelContentV1({ code: "368" });
    expect(model368.status).toBe("OFFICIAL_INFORMATION");
    if (model368.status === "OFFICIAL_INFORMATION") {
      expect(model368.data.accessMethods).toBeUndefined();
      expect(model368.data.summary).toContain(
        "no ofrece un acceso de presentación",
      );
    }
  });

  it("keeps Batch 13 informational, non-operational and tied to coherent current sources", () => {
    const codes = [
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
    ] as const;

    for (const code of codes) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;

      expect(result.data.externalNavigation, code).toBeNull();
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|presentar declaraci[oó]n|iniciar tr[aá]mite/i.test(
            link.label,
          ),
        ),
        code,
      ).toBe(false);

      for (const source of result.data.sources) {
        const url = new URL(source.canonicalUrl);
        expect(
          ["sede.agenciatributaria.gob.es", "www.boe.es"],
          `${code}:${source.id}`,
        ).toContain(url.hostname);
        if (source.authority === "BOE") {
          expect(url.pathname, `${code}:${source.id}`).toBe(
            source.id.endsWith(".consolidated")
              ? "/buscar/act.php"
              : "/diario_boe/txt.php",
          );
          expect(url.searchParams.get("id"), `${code}:${source.id}`).toMatch(
            /^BOE-A-\d{4}-\d+$/,
          );
        }
      }

      expect(
        result.data.documents.every(
          (document) =>
            document.activeContentStatus === "NO_JAVASCRIPT_DETECTED" &&
            document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        ),
        code,
      ).toBe(true);
    }

    for (const code of ["390", "411", "490"] as const) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      if (result.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
      expect(result.data.documents.length, code).toBeGreaterThan(0);
      expect(result.data.thumbnail, code).toMatchObject({
        pageNumber: 1,
        width: 640,
        height: 640,
        provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
      });
    }

    const model381 = resolvePublicAeatOfficialModelContentV1({ code: "381" });
    const model411 = resolvePublicAeatOfficialModelContentV1({ code: "411" });
    const model430 = resolvePublicAeatOfficialModelContentV1({ code: "430" });
    const model504 = resolvePublicAeatOfficialModelContentV1({ code: "504" });
    const model505 = resolvePublicAeatOfficialModelContentV1({ code: "505" });
    for (const result of [model381, model411, model430, model504, model505]) {
      expect(result.status).toBe("OFFICIAL_INFORMATION");
    }
    if (
      model381.status !== "OFFICIAL_INFORMATION" ||
      model411.status !== "OFFICIAL_INFORMATION" ||
      model430.status !== "OFFICIAL_INFORMATION" ||
      model504.status !== "OFFICIAL_INFORMATION" ||
      model505.status !== "OFFICIAL_INFORMATION"
    ) {
      return;
    }
    expect(
      model381.data.sources.some(
        (source) => source.kind === "PROCEDURE_RECORD",
      ),
    ).toBe(false);
    expect(
      model411.data.sources.some(
        (source) => source.kind === "PROCEDURE_RECORD",
      ),
    ).toBe(false);
    expect(
      model430.data.sources.some((source) =>
        source.canonicalUrl.toLowerCase().endsWith(".xlsx"),
      ),
    ).toBe(false);
    expect(
      [...model504.data.sources, ...model505.data.sources].some((source) =>
        /(?:504|instr504)\.pdf$/i.test(source.canonicalUrl),
      ),
    ).toBe(false);
    expect(model505.data.accessMethods).toBeUndefined();
  });

  it("keeps Batch 14 informational and separates current sources from legacy forms", () => {
    const codes = [
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
    ] as const;

    const models = new Map<
      (typeof codes)[number],
      PublicAeatOfficialModelContentV1
    >();
    for (const code of codes) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      models.set(code, result.data);
      expect(result.data.externalNavigation, code).toBeNull();
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|presentar declaraci[oó]n|iniciar tr[aá]mite/i.test(
            link.label,
          ),
        ),
        code,
      ).toBe(false);
      expect(
        result.data.sources.every((source) =>
          ["sede.agenciatributaria.gob.es", "www.boe.es"].includes(
            new URL(source.canonicalUrl).hostname,
          ),
        ),
        code,
      ).toBe(true);
      expect(
        result.data.documents.every(
          (document) =>
            document.activeContentStatus === "NO_JAVASCRIPT_DETECTED" &&
            document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        ),
        code,
      ).toBe(true);
    }

    for (const code of ["506", "508", "512", "518"] as const) {
      expect(models.get(code)?.documents.length, code).toBeGreaterThanOrEqual(
        2,
      );
      expect(
        models
          .get(code)
          ?.documents.some((document) => document.kind === "INSTRUCTIONS"),
        code,
      ).toBe(true);
      expect(models.get(code)?.thumbnail, code).toMatchObject({
        pageNumber: 1,
        width: 640,
        height: 640,
        provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
      });
    }
    for (const code of ["507", "510", "515", "517", "519", "520"] as const) {
      expect(models.get(code)?.thumbnail, code).toBeNull();
    }

    for (const code of ["506", "508", "512", "518"] as const) {
      const model = models.get(code);
      const landingIds = new Set(
        model?.sources
          .filter((source) => source.kind === "DOWNLOAD_PAGE")
          .map((source) => source.id),
      );
      expect(landingIds.size, code).toBe(1);
      expect(
        model?.documents.every(
          (document) =>
            document.landingPageSourceId !== null &&
            landingIds.has(document.landingPageSourceId),
        ),
        code,
      ).toBe(true);
      if (code !== "518") {
        expect(
          model?.documents.find((document) => document.kind === "FORM")
            ?.formStatus,
          code,
        ).toBe("ACROFORM_METADATA_ONLY");
      }
    }

    expect(models.get("506")?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "aeat.model-506.download.2026-06-09",
          officialUpdatedOn: "2026-06-09",
        }),
      ]),
    );
    expect(models.get("508")?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "aeat.model-508.download.2026-06-09",
          officialUpdatedOn: "2026-06-09",
        }),
      ]),
    );
    expect(models.get("512")?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "aeat.model-512.download.2026-03-10",
          officialUpdatedOn: "2026-03-10",
        }),
      ]),
    );

    for (const code of ["507", "510"] as const) {
      const legacyDocuments = models
        .get(code)
        ?.documents.filter(
          (document) =>
            document.freshnessStatus === "LEGACY_REFERENCES_DETECTED",
        );
      expect(legacyDocuments?.length, code).toBe(2);
      expect(
        legacyDocuments?.every(
          (document) => document.previewSuitability === "NONE",
        ),
        code,
      ).toBe(true);
    }

    const model510 = models.get("510");
    expect(model510?.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "model-510-recipient-warning",
          kind: "GUIDE",
          freshnessStatus: "CURRENTNESS_UNDETERMINED",
          landingPageSourceId: "aeat.model-510.procedure-home.2026-06-09",
        }),
      ]),
    );
    expect(JSON.stringify(model510)).toMatch(
      /desde febrero de 2023[\s\S]*destinatarios certificados[\s\S]*destinatarios registrados[\s\S]*representantes fiscales/i,
    );

    expect(models.get("515")?.documents).toEqual([
      expect.objectContaining({
        kind: "GUIDE",
        pageCount: 4,
        landingPageSourceId: "aeat.model-515.marks-information.2024-04-11",
      }),
    ]);
    expect(models.get("517")?.documents).toEqual([
      expect.objectContaining({
        kind: "GUIDE",
        pageCount: 2,
        landingPageSourceId: "aeat.model-517.marks-information.2025-11-05",
      }),
      expect.objectContaining({
        kind: "GUIDE",
        pageCount: 2,
        landingPageSourceId: "aeat.model-517.marks-information.2025-11-05",
      }),
    ]);

    expect(JSON.stringify(models.get("507"))).not.toMatch(
      /receptores autorizados/i,
    );
    expect(JSON.stringify(models.get("510"))).not.toMatch(
      /operador registrado|operador no registrado|receptor autorizado/i,
    );
    expect(models.get("515")?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalUrl:
            "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1990",
        }),
      ]),
    );
    expect(models.get("517")?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalUrl:
            "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2019-18747",
        }),
        expect.objectContaining({
          canonicalUrl:
            "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2020-7507",
        }),
        expect.objectContaining({
          canonicalUrl:
            "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-1990",
        }),
      ]),
    );
    expect(models.get("520")?.canonicalName).toContain("Parte de resultado");
    expect(models.get("520")?.canonicalName).not.toContain("resultados");
  });

  it("keeps the Model 180 certificate with active content external-only", () => {
    const result = resolvePublicAeatOfficialModelContentV1({ code: "180" });
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;

    const certificate = result.data.documents.find(
      (document) => document.id === "model-180-certificate-form",
    );
    expect(certificate).toMatchObject({
      activeContentStatus: "JAVASCRIPT_PRESENT",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    });
  });

  it("keeps thumbnails tied to hashed official documents or images", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    if (result.status !== "OFFICIAL_INFORMATION") throw new Error("blocked");
    const thumbnailCodes = result.data
      .filter((entry) => entry.thumbnail !== null)
      .map((entry) => entry.code);
    expect(thumbnailCodes).toEqual([
      "01",
      "01C",
      "04",
      "06",
      "030",
      "035",
      "036",
      "037",
      "039",
      "043",
      "044",
      "045",
      "102",
      "145",
      "146",
      "147",
      "150",
      "200",
      "206",
      "220",
      "247",
      "390",
      "411",
      "490",
      "506",
      "508",
      "512",
      "518",
    ]);
    expect(
      result.data.find((entry) => entry.code === "038")?.thumbnail,
    ).toBeNull();
    expect(
      result.data.find((entry) => entry.code === "040")?.thumbnail,
    ).toBeNull();

    for (const entry of result.data) {
      if (!entry.thumbnail) continue;
      const file = readFileSync(
        new URL(
          `../../../../../public/${entry.thumbnail.publicHref.slice(1)}`,
          import.meta.url,
        ),
      );
      expect(createHash("sha256").update(file).digest("hex")).toBe(
        entry.thumbnail.sha256,
      );
    }
  });
});
