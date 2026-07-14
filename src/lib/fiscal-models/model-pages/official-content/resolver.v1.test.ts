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
  "798",
  "840",
  "848",
  "901",
  "933",
  "952",
  "980",
  "981",
  "990",
  "991",
  "992",
  "993",
  "995",
  "996",
  "997",
  "A22",
  "A23",
  "A24",
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

const EXPECTED_BATCH_15_NAMES = {
  "521": "II. EE. Relación trimestral de primeras materias entregadas.",
  "522":
    "II. EE. Parte trimestral de productos a que se refiere el artículo 108 ter del Reglamento de los Impuestos Especiales.",
  "523":
    "Aplicación del beneficio de devolución de los IIEE sobre el alcohol y bebidas alcohólicas.",
  "524":
    "II. EE. Solicitud de devolución sobre el alcohol y las bebidas alcohólicas.",
  "544":
    "II. EE. Pagos efectuados mediante cheque o tarjetas de gasóleo bonificado.",
  "545":
    "II. EE. Suministros de carburantes para relaciones internacionales con devolución del impuesto sobre hidrocarburos.",
  "546":
    "II. EE. Avituallamiento de gasóleo a embarcaciones con derecho a la devolución del impuesto sobre hidrocarburos.",
  "547":
    "II. EE. Relación de abonos realizados a detallistas de gasóleo bonificado.",
  "548": "Declaración informativa de cuotas repercutidas.",
  "553":
    "II. EE. Declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas.",
} as const;

const EXPECTED_BATCH_16_NAMES = {
  "559":
    "II. EE. Impuesto sobre el alcohol y bebidas derivadas. Regímenes de destilación artesanal y de cosechero.",
  "560": "II. EE. Impuesto sobre la electricidad.",
  "561": "II. EE. Impuesto sobre la cerveza.",
  "562": "II. EE. Impuesto sobre productos intermedios.",
  "563": "II. EE. Impuesto sobre el alcohol y bebidas derivadas",
  "566": "II. EE. Impuesto sobre las labores del tabaco.",
  "568":
    "Impuesto Especial sobre Determinados Medios de Transporte. Solicitud de devolución por reventa y envío de medios de transporte fuera del territorio.",
  "571":
    "II. EE. Modelo 571. Aplicación del beneficio devolución de los impuestos especiales hidrocarburos.",
  "572": "II. EE. Solicitud de devolución del Impuesto sobre Hidrocarburos.",
  "573":
    "II. EE. Impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco",
  "576":
    "Impuesto Especial sobre Determinados Medios de Transporte. Autoliquidación",
  "581": "Impuesto sobre Hidrocarburos. Declaración-liquidación.",
  "582":
    "Impuesto sobre Hidrocarburos. Regularización por reexpedición de productos a otra Comunidad Autónoma.",
  "583":
    "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación y Pagos Fraccionados.",
  "584":
    "Impuesto sobre la producción de combustible nuclear gastado y residuos radioactivos resultantes de la generación de energía nucleoeléctrica. Autoliquidación y pagos fraccionados.",
  "585":
    "Impuesto sobre el almacenamiento de combustible nuclear gastado y residuos radioactivos en instalaciones centralizadas. Autoliquidación y pagos fraccionados.",
  "586": "Declaración Informativa. Gases Fluorados",
  "587": "Declaración-Liquidación Gases Fluorados Efecto Invernadero.",
  "588":
    "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación por cese de actividad de enero a octubre",
  "589":
    "Impuesto sobre el valor de la extracción de gas, petróleo y condensación. Autoliquidación y pago fraccionado.",
  "590": "IIEE. Solicitud de devolución por exportación o expedición.",
  "591":
    "Impuesto sobre el valor de la producción de la energía eléctrica. Declaración anual de operaciones.",
  "592":
    "Declaración-Liquidación Impuesto especial sobre los envases de plástico no reutilizables. Autoliquidación",
  "593":
    "Impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración de residuos. Autoliquidación.",
  "595": "II. EE. Impuesto sobre el carbón.",
  "596":
    "II. EE. Declaración anual de operaciones realizadas. Impuesto sobre el carbón.",
  "600":
    "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
  "610":
    "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
  "615":
    "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
  "620":
    "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
} as const;

const EXPECTED_BATCH_16_CODES = new Set(Object.keys(EXPECTED_BATCH_16_NAMES));

const EXPECTED_BATCH_17_NAMES = {
  "630":
    "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
  "602": "Tasa por la gestión administrativa del juego.",
  "604": "Impuesto sobre las Transacciones Financieras. Autoliquidación",
  "611":
    "Declaración Informativa. Pagos en metálico del impuesto que grava los documentos negociados por Entidades Colaboradoras. Declaración Resumen Anual.",
  "616":
    "Declaración Informativa. Pagos en metálico del impuesto que grava la emisión de documentos que lleven aparejada acción cambiaria o sean endosables a la orden. Declaración Resumen Anual.",
  "650":
    "Impuesto sobre Sucesiones y Donaciones. Autoliquidación adquisición “mortis causa”.",
  "651":
    "Impuesto sobre Sucesiones y Donaciones. Autoliquidación adquisición “inter vivos”.",
  "655":
    "Impuesto sobre Sucesiones y Donaciones. Consolidación de dominio por extinción de usufructo.",
  "681":
    "Tasa por la prestación de servicios de gestión de residuos radiactivos a que se refiere el apartado 3 de la disposición adicional sexta de la Ley 54/1997.",
  "682":
    "Tasa por la prestación de servicios de gestión de residuos radiactivos a que se refiere el apartado 3 de la disposición adicional sexta de la Ley 54/1997.",
  "683":
    "Tasa por la prestación de servicios de gestión de residuos radiactivos derivados de la fabricación de elementos combustibles, incluido desmantelamiento de instalaciones de fabricación.",
  "684":
    "Tasa por la prestación de servicios de gestión de residuos radiactivos generados en otras instalaciones.",
  "685": "Tasa sobre apuestas y combinaciones aleatorias, autoliquidación.",
  "695": "Solicitud de devolución tasa judicial.",
  "696":
    "Tasa por el Ejercicio de la Potestad Jurisdiccional en los Órdenes Civil y Contencioso-Administrativo.",
  "714": "Impuesto sobre el Patrimonio",
  "718": "Impuesto temporal de Solidaridad de las Grandes Fortunas.",
  "720":
    "Declaración informativa sobre bienes y derechos situados en el extranjero.",
  "721":
    "Declaración informativa sobre monedas virtuales situadas en el extranjero",
  "763":
    "Autoliquidación del Impuesto sobre actividades de juego en los supuestos de actividades anuales o plurianuales.",
  "770":
    "Autoliquidación de intereses de demora y recargos para la regularización voluntaria prevista en el artículo 252 de la Ley General Tributaria",
  "771":
    "Autoliquidación de cuotas de conceptos y ejercicios sin modelo disponible en la Sede electrónica de la AEAT para la regularización voluntaria prevista en el artículo 252 de la Ley General Tributaria",
  "780":
    "Impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras. Autoliquidación",
  "781":
    "Impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras. Pago fraccionado.",
  "791": "Empleo Público. Presentación instancias oposiciones.",
  "792":
    "Autoliquidación de la aportación a realizar por los prestadores del servicio de comunicación audiovisual televisivo y por los prestadores del servicio de intercambio de vídeos a través de plataforma de ámbito geográfico estatal o superior al de una Comunidad Autónoma.",
  "793":
    "Pagos a cuenta de la aportación a realizar por los prestadores del servicio de comunicación audiovisual televisivo y por los prestadores del servicio de intercambio de vídeos a través de plataforma de ámbito geográfico estatal o superior al de una Comunidad Autónoma.",
  "795":
    "Gravamen temporal energético. Declaración del ingreso de la prestación",
  "796": "Gravamen temporal energético. Pago anticipado",
  "797":
    "Gravamen temporal de entidades de crédito y establecimientos financieros de crédito. Declaración del ingreso de la prestación.",
} as const;

const EXPECTED_BATCH_17_CODES = new Set(Object.keys(EXPECTED_BATCH_17_NAMES));
const EXPECTED_BATCH_18_NAMES = {
  "798":
    "Gravamen temporal de entidades de crédito y establecimientos financieros de crédito. Pago anticipado",
  "840":
    "IAE. Declaración de alta, variación o baja en el Impuesto sobre Actividades Económicas",
  "848": "IAE. Comunicación del importe neto de la cifra de negocios",
  "901":
    "Información de las CC. AA. sobre datos consignados en el certificado de eficiencia energética",
  "933":
    "Información de las CC. AA. sobre guarderías y centros de educación infantil autorizados",
  "952":
    "IVA. Comunicación de la modificación de la base imponible en supuestos de concurso y por crédito incobrable",
  "980":
    "Información de los intereses de demora pagados a los contribuyentes por las CC. AA.",
  "981":
    "Suministro de información sobre la prestación por maternidad/paternidad",
  "990":
    "Información mensual de las CC. AA. sobre familias numerosas o con personas con discapacidad a cargo",
  "991":
    "Declaración informativa de fianzas derivadas del arrendamiento de inmuebles",
  "992": "Tributos cedidos sobre el Juego de Comunidades Autónomas",
  "993": "Control de deducciones autonómicas",
  "995": "Cesión de Información Urbanística por Entidades Locales",
  "996": "Embargo de devoluciones gestionadas por la AEAT",
  "997": "Embargo de pagos presupuestarios de otras Administraciones Públicas",
  A22: "Impuesto especial sobre los envases de plástico no reutilizables. Solicitud de devolución",
  A23: "Impuesto sobre los Gases Fluorados de Efecto Invernadero. Solicitud de devolución",
  A24: "II. EE. Solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco",
} as const;
const EXPECTED_BATCH_18_CODES = new Set(Object.keys(EXPECTED_BATCH_18_NAMES));

describe("public AEAT official model content v1", () => {
  it("publishes exactly the reviewed official-content catalog", () => {
    const result = listPublicAeatOfficialModelContentsV1();
    expect(result.status).toBe("OFFICIAL_INFORMATION");
    if (result.status !== "OFFICIAL_INFORMATION") return;
    expect(result.data.map((entry) => entry.code)).toEqual(EXPECTED_CODES);
    expect(new Set(result.data.map((entry) => entry.code)).size).toBe(229);
    for (const entry of result.data) {
      expect(entry).toMatchObject({
        contentStatus: "OFFICIAL_INFORMATION",
        sourceVerificationStatus: "VERIFIED",
        applicabilityStatus: "NOT_EVALUATED",
        lifecycleStatus:
          entry.code === "037" ||
          entry.code === "150" ||
          entry.code === "179" ||
          entry.code === "582" ||
          entry.code === "586" ||
          entry.code === "795" ||
          entry.code === "796" ||
          entry.code === "797"
            ? "HISTORICAL"
            : "UNDETERMINED",
        reviewedOn:
          entry.code === "01" ||
          entry.code === "05" ||
          entry.code === "06" ||
          EXPECTED_BATCH_16_CODES.has(entry.code) ||
          EXPECTED_BATCH_17_CODES.has(entry.code) ||
          EXPECTED_BATCH_18_CODES.has(entry.code)
            ? "2026-07-14"
            : "2026-07-13",
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

  it("keeps every Batch 15 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_15_NAMES,
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

  it("keeps every Batch 16 page useful and source-backed without evaluating applicability", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_16_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe(
        code === "582" || code === "586" ? "HISTORICAL" : "UNDETERMINED",
      );
      expect(result.data.externalNavigation, code).toBeNull();
      expect(result.data.thumbnail, code).toBeNull();
    }
  });

  it("keeps every Batch 17 page useful, source-backed and fail-closed", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_17_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.sections.length, code).toBeGreaterThanOrEqual(4);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe(
        code === "795" || code === "796" || code === "797"
          ? "HISTORICAL"
          : "UNDETERMINED",
      );
      expect(result.data.externalNavigation, code).toBeNull();
      expect(result.data.thumbnail, code).toBeNull();
      expect(result.data.documents, code).toEqual([]);
    }
  });

  it("preserves the audited Batch 17 distinctions and historical boundaries", () => {
    const model = (code: keyof typeof EXPECTED_BATCH_17_NAMES) => {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
      return result.data;
    };

    expect(model("630").accessMethods).toMatchObject({
      methods: ["ADMINISTRATIVE_TRANSFER"],
      status: "SOURCE_DESCRIBED",
    });
    expect(JSON.stringify(model("630"))).toMatch(/Ceuta y Melilla/i);
    for (const code of ["611", "616"] as const) {
      expect(model(code).accessMethods).toMatchObject({
        methods: ["FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      });
      expect(JSON.stringify(model(code))).toMatch(/anteriores a 2015/i);
    }
    for (const code of ["650", "651", "655"] as const) {
      expect(JSON.stringify(model(code))).toMatch(/no residentes/i);
      expect(JSON.stringify(model(code))).toMatch(/Ceuta y Melilla/i);
    }
    expect(JSON.stringify(model("682"))).toMatch(/apartado 3/i);
    expect(JSON.stringify(model("682"))).toMatch(/apartado 4/i);
    expect(model("681").sources[1].canonicalUrl).not.toBe(
      model("682").sources[1].canonicalUrl,
    );
    expect(JSON.stringify(model("696"))).toMatch(/divergencia|diferencia/i);
    expect(model("720").accessMethods?.methods).toEqual([
      "BROWSER_FORM",
      "FILE_UPLOAD",
    ]);
    expect(model("721").accessMethods?.methods).toEqual([
      "BROWSER_FORM",
      "WEB_SERVICE",
    ]);
    expect(JSON.stringify(model("791"))).toMatch(
      /no es una declaración fiscal/i,
    );
    for (const code of ["795", "796", "797"] as const) {
      expect(model(code).lifecycleStatus).toBe("HISTORICAL");
      expect(model(code).accessMethods?.status).toBe(
        "SOURCE_DESCRIBED_HISTORICAL",
      );
      expect(JSON.stringify(model(code))).toMatch(/2023 y 2024/i);
    }
    expect(JSON.stringify(model("797"))).toMatch(
      /no.*sustituci[oó]n autom[aá]tica/i,
    );
  });

  it("publishes the final 18 source-backed pages without evaluating obligations", () => {
    for (const [code, canonicalName] of Object.entries(
      EXPECTED_BATCH_18_NAMES,
    )) {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      expect(result.status, code).toBe("OFFICIAL_INFORMATION");
      if (result.status !== "OFFICIAL_INFORMATION") continue;
      expect(result.data.canonicalName, code).toBe(canonicalName);
      expect(result.data.faq.length, code).toBeGreaterThanOrEqual(6);
      expect(result.data.sections.length, code).toBe(4);
      expect(result.data.searchTerms.length, code).toBeGreaterThanOrEqual(3);
      expect(result.data.applicabilityStatus, code).toBe("NOT_EVALUATED");
      expect(result.data.lifecycleStatus, code).toBe("UNDETERMINED");
      expect(result.data.externalNavigation, code).toBeNull();
      expect(result.data.documents, code).toEqual([]);
    }

    const get = (code: keyof typeof EXPECTED_BATCH_18_NAMES) => {
      const result = resolvePublicAeatOfficialModelContentV1({ code });
      if (result.status !== "OFFICIAL_INFORMATION") throw new Error(code);
      return result.data;
    };
    expect(JSON.stringify(get("798"))).toMatch(/2023 y 2024/);
    expect(JSON.stringify(get("798"))).toMatch(/no infiere|no confirma/i);
    expect(get("840").canonicalName).not.toBe(get("848").canonicalName);
    expect(JSON.stringify(get("840"))).toMatch(/gesti[oó]n censal.*delegada/i);
    expect(get("995").accessMethods?.methods).toEqual([
      "BROWSER_FORM",
      "FILE_UPLOAD",
    ]);
    expect(get("997").accessMethods?.methods).toEqual(["FILE_UPLOAD"]);
    expect(get("A22").accessMethods?.methods).toEqual([
      "BROWSER_FORM",
      "FILE_UPLOAD",
    ]);
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
        expect(source.capturedOn <= entry.reviewedOn).toBe(true);
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
      "521": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "522": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "524": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "544": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "545": { methods: ["FILE_UPLOAD"], status: "SOURCE_DESCRIBED" },
      "546": {
        methods: ["BROWSER_FORM", "WEB_SERVICE"],
        status: "SOURCE_DESCRIBED",
      },
      "547": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "548": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "553": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "559": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "560": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "561": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "562": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "563": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "566": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "568": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "571": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "572": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "573": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "576": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "581": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "582": {
        methods: ["BROWSER_FORM"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
      "583": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "584": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "585": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "586": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED_HISTORICAL",
      },
      "587": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "588": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "589": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "590": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "591": {
        methods: ["BROWSER_FORM", "FILE_UPLOAD"],
        status: "SOURCE_DESCRIBED",
      },
      "592": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "593": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "595": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "596": { methods: ["BROWSER_FORM"], status: "SOURCE_DESCRIBED" },
      "600": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "610": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "615": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
      "620": {
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      },
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
    const model523 = resolvePublicAeatOfficialModelContentV1({ code: "523" });
    expect(model523.status).toBe("OFFICIAL_INFORMATION");
    if (model523.status === "OFFICIAL_INFORMATION") {
      expect(model523.data.accessMethods).toBeUndefined();
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

  it("keeps Batch 15 informational and preserves the source-backed channel and document distinctions", () => {
    const codes = [
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

    expect(models.get("524")?.documents).toHaveLength(2);
    expect(
      models
        .get("524")
        ?.documents.every(
          (document) =>
            document.freshnessStatus === "LEGACY_REFERENCES_DETECTED" &&
            document.previewSuitability === "NONE",
        ),
    ).toBe(true);
    expect(models.get("524")?.documents).toEqual([
      expect.objectContaining({
        id: "model-524-form-document",
        formStatus: "ACROFORM_METADATA_ONLY",
      }),
      expect.objectContaining({
        id: "model-524-instructions-document",
        formStatus: "NO_ACROFORM_DETECTED",
      }),
    ]);
    expect(models.get("524")?.thumbnail).toBeNull();

    for (const code of ["544", "545"] as const) {
      expect(
        models
          .get(code)
          ?.sources.some(
            (source) =>
              source.id === "boe.excise.resolution-2004-09-16.original" &&
              source.title === "Resolución de 16 de septiembre de 2004",
          ),
        code,
      ).toBe(true);
      expect(JSON.stringify(models.get(code)), code).not.toContain(
        "24 de septiembre de 2004",
      );
    }

    expect(models.get("546")?.documents).toEqual([
      expect.objectContaining({
        id: "model-546-siane-messages-document",
        pageCount: 7,
        landingPageSourceId: "aeat.model-546.siane-information.2024-12-23",
      }),
      expect.objectContaining({
        id: "model-546-delivery-receipt-document",
        pageCount: 7,
        landingPageSourceId: "aeat.model-546.siane-information.2024-12-23",
      }),
    ]);
    expect(models.get("546")?.thumbnail).toMatchObject({
      sourceId: "aeat.model-546.delivery-receipt-pdf.2026-07-13",
      publicHref:
        "/fiscal-models/modelo-546/recibo-entrega-avituallamiento-preview.png",
      pageNumber: 1,
      width: 640,
      height: 640,
      provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
    });
    const model546 = models.get("546");
    const sourceById546 = new Map(
      model546?.sources.map((source) => [source.id, source] as const),
    );
    expect(
      model546?.accessMethods?.sourceIds.map(
        (sourceId) => sourceById546.get(sourceId)?.authority,
      ),
    ).toEqual(["AEAT", "BOE"]);
    expect(
      model546?.accessMethods?.sourceIds
        .map((sourceId) => sourceById546.get(sourceId))
        .filter((source) => source?.authority === "BOE")
        .every((source) => source?.kind === "LEGAL_TEXT"),
    ).toBe(true);
    for (const code of codes.filter(
      (code) => code !== "546" && code !== "553",
    )) {
      expect(models.get(code)?.thumbnail, code).toBeNull();
    }

    expect(JSON.stringify(models.get("545"))).not.toMatch(/IVMDH/i);
    expect(JSON.stringify(models.get("546"))).toMatch(
      /SIANE[\s\S]*formulario web[\s\S]*servicio web/i,
    );
    expect(JSON.stringify(models.get("553"))).toMatch(
      /sin que esta ficha determine obligaciones concretas/i,
    );
    expect(models.get("553")?.documents).toEqual([
      expect.objectContaining({
        id: "model-553-form-document",
        previewSuitability: "FORM_PREVIEW",
        freshnessStatus: "CURRENTNESS_UNDETERMINED",
      }),
    ]);
    expect(resolvePublicAeatOfficialModelContentV1({ code: "551" })).toEqual({
      status: "BLOCKED",
      reason: "MODEL_CONTENT_NOT_FOUND",
    });
  });

  it("keeps Batch 16 informational and preserves the audited channels, legacy documents and BOE provenance", () => {
    const codes = [
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
      expect(result.data.externalNavigation, code).toBeNull();
      expect(result.data.accessMethods?.methods, code).not.toContain(
        "WEB_SERVICE",
      );
      expect(
        result.data.links.some((link) =>
          /firmar|pagar|enviar|iniciar tr[aá]mite/i.test(link.label),
        ),
        code,
      ).toBe(false);
    }

    for (const code of ["559", "568", "572", "573"] as const) {
      expect(models.get(code)?.documents.length, code).toBeGreaterThan(0);
      expect(
        models
          .get(code)
          ?.documents.every(
            (document) =>
              document.freshnessStatus === "LEGACY_REFERENCES_DETECTED" &&
              document.previewSuitability === "NONE" &&
              document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
          ),
        code,
      ).toBe(true);
    }

    expect(models.get("560")?.accessMethods?.methods).toEqual(["BROWSER_FORM"]);
    expect(models.get("560")?.summary).toMatch(/fichero auxiliar de desglose/i);
    expect(JSON.stringify(models.get("560"))).toMatch(
      /no un canal alternativo de presentaci[oó]n/i,
    );
    expect(
      models
        .get("560")
        ?.sources.find((source) =>
          source.id.startsWith("aeat.model-560.import-designs."),
        )?.officialUpdatedOn,
    ).toBe("2025-01-22");
    expect(models.get("560")?.documents).toEqual([
      expect.objectContaining({
        id: "model-560-import-guide-document",
        freshnessStatus: "CURRENTNESS_UNDETERMINED",
        previewSuitability: "NONE",
      }),
    ]);

    expect(models.get("568")?.accessMethods?.methods).toEqual([
      "BROWSER_FORM",
      "FILE_UPLOAD",
    ]);
    expect(JSON.stringify(models.get("568"))).toMatch(
      /un [uú]nico fichero que contiene todas las solicitudes/i,
    );
    expect(JSON.stringify(models.get("568"))).not.toMatch(
      /selecci[oó]n de directorios y ficheros/i,
    );
    expect(
      models
        .get("568")
        ?.sources.find((source) =>
          source.id.startsWith("aeat.model-568.download."),
        )?.officialUpdatedOn,
    ).toBe("2026-03-10");

    expect(JSON.stringify(models.get("582"))).toMatch(/2018 y anteriores/i);
    expect(models.get("582")?.lifecycleStatus).toBe("HISTORICAL");
    expect(JSON.stringify(models.get("586"))).toMatch(
      /31(?:-08-| de agosto de )2022|1 de septiembre de 2022/i,
    );
    expect(models.get("586")?.lifecycleStatus).toBe("HISTORICAL");

    expect(
      models
        .get("576")
        ?.sources.some((source) =>
          source.id.startsWith("aeat.model-576.information."),
        ),
    ).toBe(true);
    expect(
      models
        .get("583")
        ?.sources.some((source) =>
          source.id.startsWith("aeat.model-583.information-faq."),
        ),
    ).toBe(true);

    expect(models.get("585")?.documents).toHaveLength(2);
    expect(
      models
        .get("585")
        ?.documents.every(
          (document) =>
            document.freshnessStatus === "LEGACY_REFERENCES_DETECTED" &&
            document.previewSuitability === "NONE" &&
            document.usePolicy === "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
        ),
    ).toBe(true);
    expect(models.get("585")?.documents[0]).toMatchObject({
      id: "model-585-form-document",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
    });

    expect(models.get("587")?.documents).toEqual([
      expect.objectContaining({
        id: "model-587-faq-document",
        freshnessStatus: "CURRENTNESS_UNDETERMINED",
      }),
      expect.objectContaining({
        id: "model-587-form-document",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      }),
      expect.objectContaining({
        id: "model-587-instructions-document",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      }),
    ]);
    expect(models.get("588")?.documents).toEqual([
      expect.objectContaining({
        id: "model-588-form-document",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      }),
      expect.objectContaining({
        id: "model-588-instructions-document",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      }),
    ]);

    expect(models.get("590")?.documents).toEqual([
      expect.objectContaining({
        id: "model-590-form-document",
        freshnessStatus: "LEGACY_REFERENCES_DETECTED",
        previewSuitability: "NONE",
      }),
    ]);
    expect(models.get("591")?.documents).toHaveLength(2);
    expect(
      models
        .get("591")
        ?.documents.every(
          (document) =>
            document.freshnessStatus === "LEGACY_REFERENCES_DETECTED" &&
            document.previewSuitability === "NONE",
        ),
    ).toBe(true);
    expect(models.get("592")?.documents).toHaveLength(2);
    expect(models.get("593")?.documents).toHaveLength(2);
    for (const code of ["592", "593"] as const) {
      expect(
        models
          .get(code)
          ?.documents.every(
            (document) =>
              document.freshnessStatus === "CURRENTNESS_UNDETERMINED" &&
              document.previewSuitability === "NONE",
          ),
        code,
      ).toBe(true);
    }
    expect(JSON.stringify(models.get("592"))).toMatch(/no.*canal alternativo/i);
    expect(JSON.stringify(models.get("593"))).toMatch(
      /no calcula ni recomienda/i,
    );

    for (const code of ["600", "610", "615", "620"] as const) {
      expect(models.get(code)?.accessMethods).toMatchObject({
        methods: ["ADMINISTRATIVE_TRANSFER"],
        status: "SOURCE_DESCRIBED",
      });
      expect(JSON.stringify(models.get(code)), code).toMatch(
        /Ceuta y Melilla/i,
      );
      expect(JSON.stringify(models.get(code)), code).toMatch(
        /supuestos residuales|gesti[oó]n estatal acotada/i,
      );
      expect(models.get(code)?.documents).toEqual([
        expect.objectContaining({
          id: `model-${code}-form-document`,
          activeContentStatus: "JAVASCRIPT_PRESENT",
          formStatus: "ACROFORM_PRESENT",
          freshnessStatus: "LEGACY_REFERENCES_DETECTED",
          previewSuitability: "NONE",
        }),
      ]);
    }

    for (const model of models.values()) {
      const exciseLaw = model.sources.find((source) =>
        source.canonicalUrl.includes("BOE-A-1992-28741"),
      );
      if (exciseLaw) {
        expect(exciseLaw.sourceSha256).toBe(
          "14dd5b82352b18945ff58d20ee87d07a191e3a222fdc637e5fdaab3a5fd3ecad",
        );
        expect(exciseLaw.capturedOn).toBe("2026-07-14");
      }
      const exciseRegulation = model.sources.find((source) =>
        source.canonicalUrl.includes("BOE-A-1995-18266"),
      );
      if (exciseRegulation) {
        expect(exciseRegulation.sourceSha256).toBe(
          "c6533dc4fc4d888cb9db85aa8ad06f852924ddd1eacf82c5d46b5dc73a9a6a4a",
        );
        expect(exciseRegulation.capturedOn).toBe("2026-07-14");
      }
      expect(JSON.stringify(model), model.code).not.toMatch(
        /textos primarios consolidados|fuentes primarias consolidadas/i,
      );
    }
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
      "546",
      "553",
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
