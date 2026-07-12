import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelCatalogView } from "@/components/fiscal-models/FiscalModelCatalogView";
import { searchFiscalModelReviewPageViewsV1 } from "@/lib/fiscal-models/model-pages/review-view-model.v1";

export const metadata: Metadata = {
  title: "Modelos AEAT · Información en revisión",
  description:
    "Catálogo informativo de modelos AEAT con fuentes, procedencia y estado de revisión visibles.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

interface FiscalModelCatalogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FiscalModelCatalogPage({
  searchParams,
}: FiscalModelCatalogPageProps) {
  const result = searchFiscalModelReviewPageViewsV1(await searchParams);
  if (result.status === "BLOCKED" && result.reason !== "INVALID_INPUT") {
    notFound();
  }

  return <FiscalModelCatalogView result={result} />;
}
