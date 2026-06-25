import type { MetadataRoute } from "next";
import { VIDA_SITE_URL, vidaPages } from "@/lib/vida/content";

const publicRoutes = [
  "/",
  "/precios",
  "/ayuda",
  "/legal/aviso-legal",
  "/legal/terminos",
  "/legal/privacidad",
  "/legal/cookies",
  "/legal/encargo-tratamiento",
  "/legal/declaracion-responsable",
  "/legal/verifactu",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-06-25T00:00:00.000Z");

  return [
    ...publicRoutes.map((route) => ({
      url: new URL(route, VIDA_SITE_URL).toString(),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: route === "/" ? 1 : 0.6,
    })),
    ...vidaPages.map((page) => ({
      url: new URL(page.route, VIDA_SITE_URL).toString(),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: page.id === "index" ? 0.8 : 0.65,
    })),
  ];
}
