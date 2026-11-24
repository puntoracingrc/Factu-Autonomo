import { notFound } from "next/navigation";
import { PrivatePreviewAccessGate } from "@/components/access/PrivatePreviewAccessGate";
import { ManualSectionView } from "@/components/manual/ManualSectionView";
import { APP_BRAND_NAME } from "@/lib/brand";
import {
  getManualSection,
  getManualSlugs,
  manualSections,
} from "@/lib/manual/sections";
import { sanitizeReturnPath } from "@/lib/manual/return-url";
import { isPrivatePreviewManualSlug } from "@/lib/private-preview-access";

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
    ...(isPrivatePreviewManualSlug(slug)
      ? { robots: { index: false, follow: false, noarchive: true } }
      : {}),
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

  const content = (
    <ManualSectionView
      section={section}
      links={manualSections.map(({ slug, title }) => ({ slug, title }))}
      returnTo={returnTo}
    />
  );

  return isPrivatePreviewManualSlug(slug) ? (
    <PrivatePreviewAccessGate taxSummary={slug === "impuestos"}>{content}</PrivatePreviewAccessGate>
  ) : (
    content
  );
}
