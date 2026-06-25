import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VidaPage } from "@/components/vida/VidaPage";
import {
  getVidaMetadata,
  getVidaPageBySlug,
  vidaPages,
  type VidaPageId,
} from "@/lib/vida/content";

interface VidaSlugPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return vidaPages
    .filter((page) => page.id !== "index")
    .map((page) => ({ slug: page.id }));
}

export async function generateMetadata({
  params,
}: VidaSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getVidaPageBySlug(slug);

  if (!page) {
    return {};
  }

  return getVidaMetadata(page.id as VidaPageId);
}

export default async function VidaSlugPage({ params }: VidaSlugPageProps) {
  const { slug } = await params;
  const page = getVidaPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return <VidaPage page={page} />;
}
