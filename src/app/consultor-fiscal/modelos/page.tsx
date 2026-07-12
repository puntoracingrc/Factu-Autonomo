import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FiscalModelCatalogView } from "@/components/fiscal-models/FiscalModelCatalogView";
import {
  listPublicAeatOfficialModelContentsV1,
  listPublicAeatModelReviewPagesV1,
  resolvePublicAeatModelCalendarCatalogContextV1,
  searchPublicAeatModelReviewPagesV2,
} from "@/lib/fiscal-models/model-pages";

export const metadata: Metadata = {
  title: "Modelos AEAT",
  description:
    "Consulta y busca modelos de la AEAT por código, nombre o concepto, con información y enlaces a fuentes oficiales.",
  alternates: { canonical: "/consultor-fiscal/modelos" },
  openGraph: {
    title: "Modelos AEAT",
    description:
      "Catálogo buscable de modelos de la AEAT con información contrastada y enlaces a fuentes oficiales.",
    url: "/consultor-fiscal/modelos",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
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
  const officialContents = listPublicAeatOfficialModelContentsV1();
  if (officialContents.status === "BLOCKED") notFound();

  return (
    <FiscalModelCatalogView
      result={result}
      pages={catalog.data}
      calendarContext={calendarContext}
      officialContents={officialContents.data}
    />
  );
}
