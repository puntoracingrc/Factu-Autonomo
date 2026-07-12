import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelDetailView } from "@/components/fiscal-models/FiscalModelDetailView";
import {
  getFiscalModelReviewPageViewV1,
  listFiscalModelReviewPageViewsV1,
} from "@/lib/fiscal-models/model-pages/review-view-model.v1";

export const dynamicParams = false;

interface FiscalModelDetailPageProps {
  params: Promise<{ codigo: string }>;
}

export function generateStaticParams() {
  const catalog = listFiscalModelReviewPageViewsV1();
  if (catalog.status === "BLOCKED") return [];
  return catalog.data.map((page) => ({ codigo: page.code }));
}

export async function generateMetadata({
  params,
}: FiscalModelDetailPageProps): Promise<Metadata> {
  const { codigo } = await params;
  const result = getFiscalModelReviewPageViewV1({ code: codigo });
  if (result.status === "BLOCKED") {
    return {
      title: "Ficha de modelo no disponible",
      robots: { index: false, follow: false, noarchive: true },
    };
  }

  return {
    title: `Modelo ${result.data.code} · Información en revisión`,
    description: result.data.summary,
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function FiscalModelDetailPage({
  params,
}: FiscalModelDetailPageProps) {
  const { codigo } = await params;
  const result = getFiscalModelReviewPageViewV1({ code: codigo });
  if (result.status === "BLOCKED") notFound();

  return <FiscalModelDetailView page={result.data} />;
}
