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

  const index = manualSections.findIndex((item) => item.slug === slug);
  const previous = index > 0 ? manualSections[index - 1] : undefined;
  const next =
    index >= 0 && index < manualSections.length - 1
      ? manualSections[index + 1]
      : undefined;
  const publicSections = manualSections.filter(
    (item) => !isPrivatePreviewManualSlug(item.slug),
  );
  const publicIndex = publicSections.findIndex((item) => item.slug === slug);
  const publicPrevious =
    publicIndex > 0 ? publicSections[publicIndex - 1] : undefined;
  const publicNext =
    publicIndex >= 0 && publicIndex < publicSections.length - 1
      ? publicSections[publicIndex + 1]
      : undefined;

  const content = (
    <ManualSectionView
      section={section}
      previous={previous}
      next={next}
      publicPrevious={publicPrevious}
      publicNext={publicNext}
      returnTo={returnTo}
    />
  );

  return isPrivatePreviewManualSlug(slug) ? (
    <PrivatePreviewAccessGate>{content}</PrivatePreviewAccessGate>
  ) : (
    content
  );
}
