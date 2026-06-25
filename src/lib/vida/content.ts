import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";

export const VIDA_SITE_URL = "https://facturacion-autonomos.app";

export const vidaPages = [
  {
    id: "index",
    file: "index.md",
    route: "/vida-factura-electronica",
    label: "Guía ViDA",
  },
  {
    id: "autonomos",
    file: "autonomos.md",
    route: "/vida-factura-electronica/autonomos",
    label: "Autónomos",
  },
  {
    id: "calendario",
    file: "calendario.md",
    route: "/vida-factura-electronica/calendario",
    label: "Calendario",
  },
  {
    id: "vida-vs-verifactu",
    file: "vida-vs-verifactu.md",
    route: "/vida-factura-electronica/vida-vs-verifactu",
    label: "ViDA vs VeriFactu",
  },
  {
    id: "factura-estructurada",
    file: "factura-estructurada.md",
    route: "/vida-factura-electronica/factura-estructurada",
    label: "Factura estructurada",
  },
  {
    id: "preguntas-frecuentes",
    file: "preguntas-frecuentes.md",
    route: "/vida-factura-electronica/preguntas-frecuentes",
    label: "Preguntas",
  },
  {
    id: "observatorio",
    file: "observatorio.md",
    route: "/vida-factura-electronica/observatorio",
    label: "Novedades",
  },
] as const;

export type VidaPageId = (typeof vidaPages)[number]["id"];

export interface VidaPageContent {
  id: VidaPageId;
  file: string;
  route: string;
  label: string;
  metadata: Record<string, string>;
  body: string;
}

const contentRoot = path.join(process.cwd(), "src/content/vida");

function parsePage(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: markdown };
  }

  const metadata: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const value = field[2].trim().replace(/^"|"$/g, "");
    metadata[field[1]] = value;
  }

  return { metadata, body: match[2] };
}

export function getVidaPage(id: VidaPageId): VidaPageContent {
  const definition = vidaPages.find((page) => page.id === id);
  if (!definition) {
    throw new Error(`Unknown ViDA page: ${id}`);
  }

  const markdown = readFileSync(path.join(contentRoot, definition.file), "utf8");
  const parsed = parsePage(markdown);
  return { ...definition, ...parsed };
}

export function getVidaPageBySlug(slug: string): VidaPageContent | null {
  const page = vidaPages.find((item) => item.id === slug);
  return page ? getVidaPage(page.id) : null;
}

export function getVidaCanonical(route: string): string {
  return new URL(route, VIDA_SITE_URL).toString();
}

export function getVidaMetadata(id: VidaPageId): Metadata {
  const page = getVidaPage(id);
  const title = page.metadata.title || page.label;
  const description = page.metadata.description || "";
  const canonical = getVidaCanonical(page.route);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      siteName: "Factura Autónomo",
      locale: "es_ES",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "article:published_time": page.metadata.datePublished || "",
      "article:modified_time": page.metadata.dateModified || "",
    },
  };
}

export function getVidaJsonLd(page: VidaPageContent) {
  const canonical = getVidaCanonical(page.route);

  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: VIDA_SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "ViDA y factura electrónica",
          item: getVidaCanonical("/vida-factura-electronica"),
        },
        ...(page.id === "index"
          ? []
          : [
              {
                "@type": "ListItem",
                position: 3,
                name: page.label,
                item: canonical,
              },
            ]),
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": page.id === "index" ? "WebPage" : "Article",
      headline: page.metadata.h1 || page.metadata.title || page.label,
      description: page.metadata.description || "",
      datePublished: page.metadata.datePublished,
      dateModified: page.metadata.dateModified,
      author: {
        "@type": "Organization",
        name: "Factura Autónomo",
      },
      publisher: {
        "@type": "Organization",
        name: "Factura Autónomo",
      },
      mainEntityOfPage: canonical,
    },
  ];
}
