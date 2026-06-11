import { notFound } from "next/navigation";
import { ManualSectionView } from "@/components/manual/ManualSectionView";
import {
  getManualSection,
  getManualSlugs,
  manualSections,
} from "@/lib/manual/sections";

interface ManualSectionPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getManualSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ManualSectionPageProps) {
  const { slug } = await params;
  const section = getManualSection(slug);
  if (!section) return { title: "Manual no encontrado" };

  return {
    title: `${section.title} — Manual Factura Autónomo`,
    description: section.summary,
  };
}

export default async function ManualSectionPage({ params }: ManualSectionPageProps) {
  const { slug } = await params;
  const section = getManualSection(slug);
  if (!section) notFound();

  const index = manualSections.findIndex((item) => item.slug === slug);
  const previous = index > 0 ? manualSections[index - 1] : undefined;
  const next =
    index >= 0 && index < manualSections.length - 1
      ? manualSections[index + 1]
      : undefined;

  return (
    <ManualSectionView section={section} previous={previous} next={next} />
  );
}
