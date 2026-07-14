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
        "036": "Modelo 036 AEAT: alta, modificación y baja censal",
        "037": "Modelo 037 AEAT: modelo histórico sustituido por el 036",
        "04": "Modelo 04 AEAT: IVA del 4 % para vehículos y movilidad reducida",
        "05": "Modelo 05 AEAT: beneficios en el impuesto de matriculación",
        "06": "Modelo 06 AEAT: exenciones del impuesto de matriculación",
        "130": "Modelo 130 AEAT: pago trimestral del IRPF",
        "131": "Modelo 131 AEAT: pago trimestral por módulos",
        "303": "Modelo 303 AEAT: declaración trimestral del IVA",
        "390": "Modelo 390 AEAT: resumen anual del IVA",
      }[codigo]
    : undefined;
  const modelTitle =
    dedicatedSeoTitle ?? "Modelo " + result.data.code + " · Modelos AEAT";
  const dedicatedSeoDescription = isOfficialInformation
    ? {
        "130": "Guía sencilla del Modelo 130: quién debe presentarlo, regla del 70 %, cálculo acumulado, gastos, retenciones, plazos y presentación.",
        "131": "Guía sencilla del Modelo 131: quién puede tributar por módulos, cálculo, límites de 2026, porcentajes, plazos y presentación.",
        "303": "Guía sencilla del Modelo 303: quién debe presentarlo, IVA repercutido y deducible, resultados, plazos, Pre303 y corrección de errores.",
        "390": "Guía sencilla del Modelo 390: quién debe presentarlo, exoneraciones, relación con el Modelo 303, plazo, comprobaciones y trámite oficial.",
      }[codigo]
    : undefined;
  const modelDescription = dedicatedSeoDescription ??
    (isOfficialInformation ? officialContent.data.summary : result.data.summary);

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
