import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelCatalogView } from "@/components/fiscal-models/FiscalModelCatalogView";
import {
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelCalendarCatalogContextV1,
  searchPublicAeatModelReviewPagesV2,
} from "@/lib/fiscal-models/model-pages";

export const metadata: Metadata = {
  title: "Modelos AEAT",
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
  const requestSearchParams = await searchParams;
  const catalog = listPublicAeatModelReviewPagesV1();
  if (catalog.status === "BLOCKED") notFound();
  const result = searchPublicAeatModelReviewPagesV2(requestSearchParams);
  if (result.status === "BLOCKED") notFound();
  const calendarContext = resolvePublicAeatModelCalendarCatalogContextV1(
    requestSearchParams,
  );

  return (
    <FiscalModelCatalogView
      result={result}
      pages={catalog.data}
      calendarContext={calendarContext}
    />
  );
}
