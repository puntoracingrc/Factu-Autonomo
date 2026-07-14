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
  const isModel01 = codigo === "01" && isOfficialInformation;
  const modelTitle = isModel01
    ? "Modelo 01 AEAT: solicitud de certificados tributarios"
    : "Modelo " + result.data.code + " · Modelos AEAT";

  return {
    title: isModel01 ? { absolute: modelTitle } : modelTitle,
    description: isOfficialInformation
      ? officialContent.data.summary
      : result.data.summary,
    alternates: {
      canonical: result.data.href,
    },
    keywords: isOfficialInformation
      ? [...officialContent.data.searchTerms]
      : undefined,
    openGraph: isOfficialInformation
      ? {
          title: modelTitle,
          description: officialContent.data.summary,
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
