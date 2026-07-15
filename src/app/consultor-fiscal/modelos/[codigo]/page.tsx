import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelStructuralDetailView } from "@/components/fiscal-models/FiscalModelStructuralDetailView";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelCalendarDetailContextV1,
  resolvePublicAeatOfficialModelContentV1,
  resolvePublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages";

export const dynamicParams = false;

interface FiscalModelDetailPageProps {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateStaticParams() {
  const catalog = listPublicAeatModelReviewPagesV1();
  if (catalog.status === "BLOCKED" || catalog.data.length !== 229) {
    throw new Error("Inconsistent public AEAT model review catalog");
  }
  return catalog.data.map((page) => ({ codigo: page.code }));
}

export async function generateMetadata({
  params,
}: FiscalModelDetailPageProps): Promise<Metadata> {
  const { codigo } = await params;
  const result = resolvePublicAeatModelReviewPageV1({ code: codigo });
  if (result.status === "BLOCKED") notFound();
  const officialContent = resolvePublicAeatOfficialModelContentV1({
    code: codigo,
  });
  const isOfficialInformation =
    officialContent.status === "OFFICIAL_INFORMATION";
  const dedicatedSeoTitle = isOfficialInformation
    ? {
        "01": "Modelo 01 AEAT: solicitud de certificados tributarios",
        "01C": "Modelo 01C AEAT: certificado de contratistas y subcontratistas",
        "030": "Modelo 030 AEAT: domicilio y datos personales",
        "035": "Formulario 035 AEAT: alta en OSS e IOSS",
        "036": "Modelo 036 AEAT: alta, modificación y baja censal",
        "037": "Modelo 037 AEAT: modelo histórico sustituido por el 036",
        "038": "Modelo 038 AEAT: operaciones de entidades inscritas en Registros públicos",
        "039": "Modelo 039 AEAT: grupo de entidades de IVA",
        "040": "Modelo 040 AEAT: registro de operadores de plataformas",
        "043": "Modelo 043 AEAT: tasa sobre el juego del bingo",
        "044": "Modelo 044 AEAT: tasa sobre casinos de juego",
        "045": "Modelo 045 AEAT: tasa sobre máquinas de juego",
        "04": "Modelo 04 AEAT: IVA del 4 % para vehículos y movilidad reducida",
        "05": "Modelo 05 AEAT: beneficios en el impuesto de matriculación",
        "06": "Modelo 06 AEAT: exenciones del impuesto de matriculación",
        "100": "Modelo 100 AEAT: declaración de la Renta del autónomo",
        "102": "Modelo 102 AEAT: segundo plazo de la Renta",
        "111": "Modelo 111 AEAT: retenciones de nóminas y profesionales",
        "113": "Modelo 113 AEAT: impuesto de salida a la UE o al EEE",
        "115": "Modelo 115 AEAT: retención del alquiler de un local",
        "117": "Modelo 117 AEAT: retenciones sobre fondos de inversión",
        "121": "Modelo 121 AEAT: cesión de deducciones familiares",
        "122": "Modelo 122 AEAT: regularización de deducciones familiares",
        "123": "Modelo 123 AEAT: retenciones sobre dividendos e intereses",
        "124": "Modelo 124 AEAT: retenciones sobre activos de deuda",
        "126": "Modelo 126 AEAT: retenciones sobre cuentas financieras",
        "128": "Modelo 128 AEAT: retenciones sobre seguros y capitalización",
        "130": "Modelo 130 AEAT: pago trimestral del IRPF",
        "131": "Modelo 131 AEAT: pago trimestral por módulos",
        "136": "Modelo 136 AEAT: premios de loterías sin retención",
        "140": "Modelo 140 AEAT: abono anticipado por maternidad",
        "143": "Modelo 143 AEAT: abono anticipado de deducciones familiares",
        "145": "Modelo 145 AEAT: datos para calcular la retención de la nómina",
        "146": "Modelo 146 AEAT: pensionistas con varios pagadores",
        "147": "Modelo 147 AEAT: trabajador desplazado y retenciones",
        "149": "Modelo 149 AEAT: opción por el régimen de desplazados",
        "150": "Modelo 150 AEAT histórico: régimen de desplazados anterior a 2015",
        "151": "Modelo 151 AEAT: declaración de trabajadores desplazados",
        "156": "Modelo 156 AEAT: resumen anual de cotizaciones",
        "159": "Modelo 159 AEAT: consumo anual de energía eléctrica",
        "165": "Modelo 165 AEAT: inversión en empresas nuevas",
        "170": "Modelo 170 AEAT: cobros con tarjeta y móvil desde 2026",
        "171": "Modelo 171 AEAT: operaciones de efectivo informadas",
        "174": "Modelo 174 AEAT: tarjetas y primera presentación en 2027",
        "172": "Modelo 172 AEAT: saldos en monedas virtuales",
        "173": "Modelo 173 AEAT: operaciones con monedas virtuales",
        "179": "Modelo 179 AEAT: histórico de alquileres turísticos",
        "180": "Modelo 180 AEAT: resumen anual de alquileres",
        "181": "Modelo 181 AEAT: préstamos e hipotecas informados",
        "182": "Modelo 182 AEAT: donativos y aportaciones recibidas",
        "184": "Modelo 184 AEAT: comunidades de bienes y rentas atribuidas",
        "185": "Modelo 185 AEAT: cotizaciones mensuales desde 2026",
        "186": "Modelo 186 AEAT: nacimientos y defunciones",
        "187": "Modelo 187 AEAT: operaciones con fondos de inversión",
        "188": "Modelo 188 AEAT: resumen anual de seguros y capitalización",
        "189": "Modelo 189 AEAT: valores, seguros y rentas",
        "190": "Modelo 190 AEAT: resumen anual de retenciones",
        "193": "Modelo 193 AEAT: resumen anual de dividendos e intereses",
        "194": "Modelo 194 AEAT: resumen anual de activos de deuda",
        "192": "Modelo 192 AEAT: operaciones con Letras del Tesoro",
        "195": "Modelo 195 AEAT: cuentas sin NIF comunicado",
        "196": "Modelo 196 AEAT: información mensual de cuentas financieras",
        "198": "Modelo 198 AEAT: operaciones con activos financieros",
        "199": "Modelo 199 AEAT: operaciones con cheques",
        "200": "Modelo 200 AEAT: Impuesto sobre Sociedades",
        "202": "Modelo 202 AEAT: pagos a cuenta de Sociedades",
        "206": "Modelo 206 AEAT: documento auxiliar del Modelo 200",
        "210": "Modelo 210 AEAT: declaración de no residentes",
        "211": "Modelo 211 AEAT: retención en la compra a no residentes",
        "213": "Modelo 213 AEAT: gravamen sobre inmuebles de no residentes",
        "216": "Modelo 216 AEAT: retenciones por pagos a no residentes",
        "217": "Modelo 217 AEAT: gravamen especial SOCIMI del 19 %",
        "220": "Modelo 220 AEAT: consolidación fiscal de Sociedades",
        "232": "Modelo 232 AEAT: operaciones vinculadas",
        "233": "Modelo 233 AEAT: gastos de guarderías y centros infantiles",
        "238": "Modelo 238 AEAT: información de operadores de plataformas",
        "296": "Modelo 296 AEAT: resumen anual de pagos a no residentes",
        "303": "Modelo 303 AEAT: declaración trimestral del IVA",
        "308": "Modelo 308 AEAT: devolución de IVA en casos especiales",
        "309": "Modelo 309 AEAT: IVA no periódico",
        "341": "Modelo 341 AEAT: compensaciones del régimen agrario",
        "347": "Modelo 347 AEAT: operaciones con clientes y proveedores",
        "349": "Modelo 349 AEAT: operaciones intracomunitarias",
        "360": "Modelo 360 AEAT: devolución del IVA soportado en la UE",
        "361":
          "Modelo 361 AEAT: devolución del IVA a empresas de fuera de la UE",
        "369": "Modelo 369 AEAT: declaración de IVA OSS e IOSS",
        "390": "Modelo 390 AEAT: resumen anual del IVA",
        "714": "Modelo 714 AEAT: Impuesto sobre el Patrimonio",
        "718": "Modelo 718 AEAT: Impuesto de Grandes Fortunas",
        "720": "Modelo 720 AEAT: bienes y derechos en el extranjero",
        "721": "Modelo 721 AEAT: criptomonedas en el extranjero",
        "840": "Modelo 840 AEAT: alta, variación y baja en el IAE",
      }[codigo]
    : undefined;
  const modelTitle =
    dedicatedSeoTitle ?? "Modelo " + result.data.code + " · Modelos AEAT";
  const dedicatedSeoDescription = isOfficialInformation
    ? {
        "035":
          "Guía sencilla del Formulario 035: régimen de la Unión, régimen exterior, IOSS, límite de 10.000 euros, alta, cambios y cese.",
        "038":
          "Guía del Modelo 038: quién lo presenta, inscripciones del mes anterior, fichero, correcciones y extensión técnica excepcional.",
        "039":
          "Guía del Modelo 039: grupo de entidades de IVA, dominante, dependientes, modalidades, cambios y relación con los Modelos 322 y 353.",
        "040":
          "Guía del Modelo 040: quién es operador de plataforma, sus dos registros, alta, cambios, baja, plazos y relación con el Modelo 238.",
        "043":
          "Guía del Modelo 043: tasa estatal sobre bingo, sujeto pasivo, competencia territorial, cartones, devengo y correcciones.",
        "044":
          "Guía del Modelo 044: tasa sobre casinos, base, premios pagados, competencia territorial, plazo y rectificación.",
        "045":
          "Guía del Modelo 045: máquinas recreativas y de azar, autorización, cuota, altas, traslados, bajas y competencia territorial.",
        "100":
          "Guía sencilla del Modelo 100 para autónomos: obligación de declarar, ingresos, gastos, pagos trimestrales, retenciones, resultado y Renta WEB.",
        "102":
          "Guía del Modelo 102: segundo 40 % de la Renta, domiciliación, fecha de campaña, pago y diferencias con la declaración del Modelo 100.",
        "111":
          "Guía sencilla del Modelo 111: quién debe presentarlo, retenciones de empleados y facturas profesionales, tipos, plazos, pago y corrección de errores.",
        "113":
          "Guía del Modelo 113: impuesto de salida, residencia previa, umbrales, traslado a la UE o EEE y hechos posteriores que deben comunicarse.",
        "115":
          "Guía sencilla del Modelo 115: quién debe presentarlo, alquileres sujetos, excepciones, base, tipo del 19 %, plazos y pago.",
        "117":
          "Guía del Modelo 117: quién retiene en fondos de inversión, transmisiones, reembolsos, tipo orientativo de 2026, plazos y relación con el Modelo 187.",
        "121":
          "Guía del Modelo 121: quién puede ceder determinadas deducciones familiares, requisitos para no declarantes, plazo, presentación y relación con Renta.",
        "122":
          "Guía del Modelo 122: regularización de deducciones familiares cobradas en exceso por no declarantes, cálculo, plazo, pago y relación con Renta.",
        "123":
          "Guía sencilla del Modelo 123: quién debe presentarlo, dividendos, préstamos de socios, otras rentas del capital, tipos, plazos y pago.",
        "124":
          "Guía del Modelo 124: retenciones sobre transmisión, amortización, reembolso, canje o conversión de activos de deuda y relación con el Modelo 194.",
        "126":
          "Guía del Modelo 126: quién presenta las retenciones sobre rendimientos de cuentas financieras, periodicidad y relación con el Modelo 196.",
        "128":
          "Guía del Modelo 128: retenciones sobre operaciones de capitalización y seguros de vida o invalidez, plazos y relación con el Modelo 188.",
        "130":
          "Guía sencilla del Modelo 130: quién debe presentarlo, regla del 70 %, cálculo acumulado, gastos, retenciones, plazos y presentación.",
        "131":
          "Guía sencilla del Modelo 131: quién puede tributar por módulos, cálculo, límites de 2026, porcentajes, plazos y presentación.",
        "136":
          "Guía del Modelo 136: premios sujetos sin retención, parte exenta, 20 %, premios compartidos, plazos y relación con 230 y 270.",
        "140":
          "Guía del Modelo 140: abono anticipado por maternidad, requisitos, cuantía, variaciones, guardería y relación con los Modelos 100 y 233.",
        "143":
          "Guía del Modelo 143: abono anticipado de deducciones familiares, requisitos, cuantías, solicitud individual o colectiva y variaciones.",
        "145":
          "Guía sencilla del Modelo 145: quién lo rellena, a quién se entrega, datos familiares, cambios, conservación y relación con los Modelos 111 y 190.",
        "146":
          "Guía del Modelo 146: pensionistas con dos o más pagadores, tipo conjunto, datos familiares, vigencia y relación con el Modelo 145.",
        "147":
          "Guía del Modelo 147: trabajador desplazado, previsión de 183 días, certificado del empleador, documento de la AEAT y retenciones.",
        "149":
          "Guía del Modelo 149: quién puede optar por el régimen de desplazados, comunicaciones, documentación, plazos y relación con el Modelo 151.",
        "150":
          "Guía histórica del Modelo 150 para el régimen de desplazados anterior a 2015: consultas, rectificaciones y modelos actuales 149 y 151.",
        "151":
          "Guía del Modelo 151: declaración anual del régimen de desplazados, rentas, tipos, deducciones, patrimonio y presentación.",
        "156":
          "Guía del Modelo 156: cotizaciones anuales informadas por Seguridad Social y mutualidades para comprobar la deducción por maternidad.",
        "159":
          "Guía del Modelo 159: contratos, CUPS, inmuebles, consumos e importes informados anualmente por entidades eléctricas.",
        "165":
          "Guía del Modelo 165: certificados de inversión en empresas nuevas, quién lo presenta, requisitos, plazo y correcciones.",
        "170":
          "Guía del Modelo 170 mensual desde 2026: entidades de pago, cobros con tarjeta y móvil, servicio web, plazo y correcciones.",
        "171":
          "Guía del Modelo 171: imposiciones, retiradas y cobros de documentos informados anualmente por entidades financieras.",
        "174":
          "Guía del Modelo 174: tarjetas, titulares, autorizados y operaciones de 2026 con primera presentación en enero de 2027.",
        "172":
          "Guía del Modelo 172: quién lo presenta, saldos de criptomonedas, moneda fiduciaria, valoración, XML, plazo y relación con el Modelo 721.",
        "173":
          "Guía del Modelo 173: quién lo presenta, operaciones individuales, permutas, transferencias, valoración, XML y plazo.",
        "179":
          "Guía histórica del Modelo 179: último ejercicio 2023, supresión desde 2024, consultas antiguas y relación con el Modelo 238.",
        "180":
          "Guía sencilla del Modelo 180: arrendadores, referencias catastrales, relación con el Modelo 115, certificados, correcciones y presentación.",
        "181":
          "Guía del Modelo 181: préstamos, hipotecas, inmuebles, saldos e intereses informados anualmente por entidades financieras.",
        "182":
          "Guía del Modelo 182: donativos y aportaciones, certificados, recurrencia, devoluciones, plazo y correcciones.",
        "184":
          "Guía sencilla del Modelo 184: quién debe presentarlo, límite de 3.000 euros, socios, reparto de rentas, plazo y relación con el Modelo 100.",
        "185":
          "Guía del Modelo 185 mensual y electrónico desde 2026: organismos obligados, cotizaciones, plazo de diez días y correcciones.",
        "186":
          "Guía del Modelo 186: nacimientos y defunciones suministrados mensualmente por el Registro Civil, sin formulario ciudadano.",
        "187":
          "Guía del Modelo 187: quién informa sobre fondos de inversión, operaciones, perceptores, plazo anual y conciliación con el Modelo 117.",
        "188":
          "Guía del Modelo 188: resumen anual de capitalización y seguros de vida o invalidez, perceptores, plazo y relación con el Modelo 128.",
        "189":
          "Guía del Modelo 189: valores, seguros y rentas a 31 de diciembre, obligados, valoración y diferencias con 188 y 198.",
        "190":
          "Guía sencilla del Modelo 190: trabajadores, profesionales, claves, relación con el Modelo 111, certificados, correcciones y presentación.",
        "193":
          "Guía sencilla del Modelo 193: perceptores, dividendos, intereses, claves, relación con el Modelo 123, plazo, presentación y correcciones.",
        "194":
          "Guía del Modelo 194: resumen anual de operaciones con activos de deuda, perceptores, plazo, presentación y relación con el Modelo 124.",
        "192":
          "Guía del Modelo 192: adquisiciones, transmisiones y amortizaciones de Letras del Tesoro comunicadas por intermediarios.",
        "195":
          "Guía del Modelo 195 trimestral: cuentas cuyos titulares no facilitaron el NIF en plazo, actualización y relación con el 196.",
        "196":
          "Guía del Modelo 196: declaración mensual de cuentas desde 2026, entidades obligadas, contenido de diciembre, A0, A1, A2 y servicio web.",
        "198":
          "Guía del Modelo 198: operaciones con activos financieros, claves, formulario o fichero, parciales y correcciones.",
        "199":
          "Guía del Modelo 199: cheques, intervinientes, cuentas e importes informados anualmente por entidades de crédito.",
        "200":
          "Guía del Modelo 200: quién lo presenta, resultado contable, ajustes fiscales, tipos del ejercicio 2025, plazos, Sociedades WEB y correcciones.",
        "202":
          "Guía del Modelo 202: pagos fraccionados, modalidades de cálculo, periodos de abril, octubre y diciembre, plazos y relación con el Modelo 200.",
        "206":
          "Guía del Modelo 206 como documento auxiliar de ingreso o devolución generado dentro del Modelo 200 para determinados contribuyentes del IRNR.",
        "210":
          "Guía del Modelo 210: rentas de no residentes, inmuebles, alquileres, transmisiones, tipos, plazos de 2026 y presentación.",
        "211":
          "Guía del Modelo 211: retención del 3 % al comprar un inmueble a una persona no residente, plazo, justificante y relación con el Modelo 210.",
        "213":
          "Guía del Modelo 213: entidades de jurisdicciones no cooperativas con inmuebles en España, tipo del 3 %, exenciones y plazo de enero.",
        "216":
          "Guía sencilla del Modelo 216: quién debe presentarlo, alquileres y profesionales no residentes, convenios, certificado de residencia, plazos y pago.",
        "217":
          "Guía del Modelo 217: gravamen especial SOCIMI del 19 %, acuerdo de distribución, perceptores y plazo de dos meses.",
        "220":
          "Guía del Modelo 220: grupo fiscal, entidad representante, eliminaciones, incorporaciones, pagos 222, Sociedades WEB y correcciones.",
        "232":
          "Guía del Modelo 232: operaciones vinculadas, valoración de mercado, límites, documentación, plazo y corrección de la declaración.",
        "233":
          "Guía sencilla del Modelo 233: quién lo presenta, autorizaciones, menores, meses completos, gastos, subvenciones, plazo y deducción por maternidad.",
        "238":
          "Guía del Modelo 238: operadores, actividades DAC7, vendedores excluidos, doble umbral, diligencia debida, datos, plazo y correcciones.",
        "296":
          "Guía sencilla del Modelo 296: perceptores no residentes, rentas exentas, TIN, relación con el Modelo 216, plazo, presentación y correcciones.",
        "303":
          "Guía sencilla del Modelo 303: quién debe presentarlo, IVA repercutido y deducible, resultados, plazos, Pre303 y corrección de errores.",
        "308":
          "Guía sencilla del Modelo 308: tax free y recargo de equivalencia, vehículos de transportistas, medios de transporte nuevos, plazos y presentación.",
        "309":
          "Guía sencilla del Modelo 309: quién debe presentarlo, recargo de equivalencia, actividades exentas, adquisiciones intracomunitarias, plazos y pago.",
        "341":
          "Guía sencilla del Modelo 341: quién puede solicitarlo, exportaciones, operaciones intracomunitarias, porcentajes del 12 % y 10,5 %, plazos y presentación.",
        "347":
          "Guía sencilla del Modelo 347: quién debe presentarlo, límite de 3.005,06 euros, operaciones incluidas y excluidas, trimestres y presentación.",
        "349":
          "Guía sencilla del Modelo 349: ROI, VIES, bienes y servicios con empresas de la UE, claves, periodicidad, plazos y presentación.",
        "360":
          "Guía sencilla del Modelo 360: quién puede solicitar IVA extranjero, periodos, importes mínimos, plazo del 30 de septiembre, facturas y procedimiento.",
        "361":
          "Guía sencilla del Modelo 361: quién puede solicitar IVA español, representante, reciprocidad, documentos, importes mínimos y plazo.",
        "369":
          "Guía sencilla del Modelo 369: quién lo presenta, periodos, países de consumo, tipos de IVA, declaraciones sin actividad, pago y correcciones.",
        "390":
          "Guía sencilla del Modelo 390: quién debe presentarlo, exoneraciones, relación con el Modelo 303, plazo, comprobaciones y trámite oficial.",
        "714":
          "Guía sencilla del Modelo 714: obligación de declarar, límite de dos millones, mínimo exento, vivienda, bienes empresariales y presentación.",
        "718":
          "Guía sencilla del Modelo 718: quién debe presentarlo, patrimonio superior a tres millones, mínimo exento, escala, Patrimonio y plazo.",
        "720":
          "Guía sencilla del Modelo 720: cuentas, inversiones e inmuebles en el extranjero, límite de 50.000 euros, nueva presentación y plazo.",
        "721":
          "Guía sencilla del Modelo 721: custodia extranjera, autocustodia, límite de 50.000 euros, valoración, nueva presentación y plazo.",
        "840":
          "Guía sencilla del Modelo 840: quién debe presentarlo, exención de autónomos, límite de un millón, epígrafes, plazos, pago y relación con el Modelo 036.",
      }[codigo]
    : undefined;
  const modelDescription =
    dedicatedSeoDescription ??
    (isOfficialInformation
      ? officialContent.data.summary
      : result.data.summary);

  return {
    title: dedicatedSeoTitle ? { absolute: modelTitle } : modelTitle,
    description: modelDescription,
    alternates: {
      canonical: result.data.href,
    },
    keywords: isOfficialInformation
      ? [...officialContent.data.searchTerms]
      : undefined,
    openGraph: isOfficialInformation
      ? {
          title: modelTitle,
          description: modelDescription,
          url: result.data.href,
          type: "article",
        }
      : undefined,
    robots: isOfficialInformation
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true },
  };
}

export default async function FiscalModelDetailPage({
  params,
  searchParams,
}: FiscalModelDetailPageProps) {
  const { codigo } = await params;
  const result = resolvePublicAeatModelReviewPageV1({ code: codigo });
  if (result.status === "BLOCKED") notFound();
  const calendarContext = resolvePublicAeatModelCalendarDetailContextV1({
    code: codigo,
    searchParams: await searchParams,
  });
  const enrichedContent = resolvePublicAeatOfficialModelContentV1({
    code: codigo,
  });

  return (
    <FiscalModelStructuralDetailView
      page={result.data}
      enrichedContent={
        enrichedContent.status === "OFFICIAL_INFORMATION"
          ? enrichedContent.data
          : null
      }
      calendarReturnHref={
        calendarContext.status === "FROM_CALENDAR"
          ? calendarContext.data.returnHref
          : null
      }
    />
  );
}
