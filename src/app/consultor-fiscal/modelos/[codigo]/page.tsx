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
        "04": "Modelo 04 AEAT: IVA del 4 % para vehículos y movilidad reducida",
        "05": "Modelo 05 AEAT: beneficios en el impuesto de matriculación",
        "06": "Modelo 06 AEAT: exenciones del impuesto de matriculación",
        "100": "Modelo 100 AEAT: declaración de la Renta del autónomo",
        "111": "Modelo 111 AEAT: retenciones de nóminas y profesionales",
        "115": "Modelo 115 AEAT: retención del alquiler de un local",
        "123": "Modelo 123 AEAT: retenciones sobre dividendos e intereses",
        "130": "Modelo 130 AEAT: pago trimestral del IRPF",
        "131": "Modelo 131 AEAT: pago trimestral por módulos",
        "145": "Modelo 145 AEAT: datos para calcular la retención de la nómina",
        "180": "Modelo 180 AEAT: resumen anual de alquileres",
        "184": "Modelo 184 AEAT: comunidades de bienes y rentas atribuidas",
        "190": "Modelo 190 AEAT: resumen anual de retenciones",
        "193": "Modelo 193 AEAT: resumen anual de dividendos e intereses",
        "200": "Modelo 200 AEAT: Impuesto sobre Sociedades",
        "202": "Modelo 202 AEAT: pagos a cuenta de Sociedades",
        "216": "Modelo 216 AEAT: retenciones por pagos a no residentes",
        "232": "Modelo 232 AEAT: operaciones vinculadas",
        "296": "Modelo 296 AEAT: resumen anual de pagos a no residentes",
        "303": "Modelo 303 AEAT: declaración trimestral del IVA",
        "309": "Modelo 309 AEAT: IVA no periódico",
        "347": "Modelo 347 AEAT: operaciones con clientes y proveedores",
        "349": "Modelo 349 AEAT: operaciones intracomunitarias",
        "360": "Modelo 360 AEAT: devolución del IVA soportado en la UE",
        "361":
          "Modelo 361 AEAT: devolución del IVA a empresas de fuera de la UE",
        "369": "Modelo 369 AEAT: declaración de IVA OSS e IOSS",
        "390": "Modelo 390 AEAT: resumen anual del IVA",
        "840": "Modelo 840 AEAT: alta, variación y baja en el IAE",
      }[codigo]
    : undefined;
  const modelTitle =
    dedicatedSeoTitle ?? "Modelo " + result.data.code + " · Modelos AEAT";
  const dedicatedSeoDescription = isOfficialInformation
    ? {
        "035":
          "Guía sencilla del Formulario 035: régimen de la Unión, régimen exterior, IOSS, límite de 10.000 euros, alta, cambios y cese.",
        "100":
          "Guía sencilla del Modelo 100 para autónomos: obligación de declarar, ingresos, gastos, pagos trimestrales, retenciones, resultado y Renta WEB.",
        "111":
          "Guía sencilla del Modelo 111: quién debe presentarlo, retenciones de empleados y facturas profesionales, tipos, plazos, pago y corrección de errores.",
        "115":
          "Guía sencilla del Modelo 115: quién debe presentarlo, alquileres sujetos, excepciones, base, tipo del 19 %, plazos y pago.",
        "123":
          "Guía sencilla del Modelo 123: quién debe presentarlo, dividendos, préstamos de socios, otras rentas del capital, tipos, plazos y pago.",
        "130":
          "Guía sencilla del Modelo 130: quién debe presentarlo, regla del 70 %, cálculo acumulado, gastos, retenciones, plazos y presentación.",
        "131":
          "Guía sencilla del Modelo 131: quién puede tributar por módulos, cálculo, límites de 2026, porcentajes, plazos y presentación.",
        "145":
          "Guía sencilla del Modelo 145: quién lo rellena, a quién se entrega, datos familiares, cambios, conservación y relación con los Modelos 111 y 190.",
        "180":
          "Guía sencilla del Modelo 180: arrendadores, referencias catastrales, relación con el Modelo 115, certificados, correcciones y presentación.",
        "184":
          "Guía sencilla del Modelo 184: quién debe presentarlo, límite de 3.000 euros, socios, reparto de rentas, plazo y relación con el Modelo 100.",
        "190":
          "Guía sencilla del Modelo 190: trabajadores, profesionales, claves, relación con el Modelo 111, certificados, correcciones y presentación.",
        "193":
          "Guía sencilla del Modelo 193: perceptores, dividendos, intereses, claves, relación con el Modelo 123, plazo, presentación y correcciones.",
        "200":
          "Guía del Modelo 200: quién lo presenta, resultado contable, ajustes fiscales, tipos del ejercicio 2025, plazos, Sociedades WEB y correcciones.",
        "202":
          "Guía del Modelo 202: pagos fraccionados, modalidades de cálculo, periodos de abril, octubre y diciembre, plazos y relación con el Modelo 200.",
        "216":
          "Guía sencilla del Modelo 216: quién debe presentarlo, alquileres y profesionales no residentes, convenios, certificado de residencia, plazos y pago.",
        "232":
          "Guía del Modelo 232: operaciones vinculadas, valoración de mercado, límites, documentación, plazo y corrección de la declaración.",
        "296":
          "Guía sencilla del Modelo 296: perceptores no residentes, rentas exentas, TIN, relación con el Modelo 216, plazo, presentación y correcciones.",
        "303":
          "Guía sencilla del Modelo 303: quién debe presentarlo, IVA repercutido y deducible, resultados, plazos, Pre303 y corrección de errores.",
        "309":
          "Guía sencilla del Modelo 309: quién debe presentarlo, recargo de equivalencia, actividades exentas, adquisiciones intracomunitarias, plazos y pago.",
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
