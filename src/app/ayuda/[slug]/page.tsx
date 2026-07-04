import { notFound } from "next/navigation";
import { ManualSectionView } from "@/components/manual/ManualSectionView";
import { APP_BRAND_NAME } from "@/lib/brand";
import {
  getManualSection,
  getManualSlugs,
  manualSections,
} from "@/lib/manual/sections";
import { sanitizeReturnPath } from "@/lib/manual/return-url";

interface ManualSectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export function generateStaticParams() {
  return getManualSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ManualSectionPageProps) {
  const { slug } = await params;
  const section = getManualSection(slug);
  if (!section) return { title: "Manual no encontrado" };

  return {
    title: `${section.title} — Manual ${APP_BRAND_NAME}`,
    description: section.summary,
  };
}

export default async function ManualSectionPage({
  params,
  searchParams,
}: ManualSectionPageProps) {
  const { slug } = await params;
  const section = getManualSection(slug);
  if (!section) notFound();

  const returnTo = sanitizeReturnPath((await searchParams).from);

  const index = manualSections.findIndex((item) => item.slug === slug);
  const previous = index > 0 ? manualSections[index - 1] : undefined;
  const next =
    index >= 0 && index < manualSections.length - 1
      ? manualSections[index + 1]
      : undefined;

  return (
    <ManualSectionView
      section={section}
      previous={previous}
      next={next}
      returnTo={returnTo}
    />
  );
}
