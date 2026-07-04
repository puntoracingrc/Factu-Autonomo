import type { MetadataRoute } from "next";

const SITE_URL = "https://facturacion-autonomos.app";

const publicRoutes = [
  "/",
  "/inicio",
  "/demo",
  "/precios",
  "/ayuda",
  "/ayuda/inicio",
  "/ayuda/primeros-pasos",
  "/ayuda/facturas",
  "/legal/aviso-legal",
  "/legal/privacidad",
  "/legal/terminos",
  "/legal/cookies",
  "/legal/encargo-tratamiento",
  "/legal/verifactu",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-04T00:00:00.000Z");

  return publicRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === "/" || route === "/inicio" ? "weekly" : "monthly",
    priority: route === "/" || route === "/inicio" ? 1 : 0.7,
  }));
}
