import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelStructuralDetailView } from "@/components/fiscal-models/FiscalModelStructuralDetailView";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages";

export const dynamicParams = false;

interface FiscalModelDetailPageProps {
  params: Promise<{ codigo: string }>;
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

  return {
    title: "Modelo " + result.data.code + " · Información en revisión",
    description: result.data.summary,
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function FiscalModelDetailPage({
  params,
}: FiscalModelDetailPageProps) {
  const { codigo } = await params;
  const result = resolvePublicAeatModelReviewPageV1({ code: codigo });
  if (result.status === "BLOCKED") notFound();

  return <FiscalModelStructuralDetailView page={result.data} />;
}
