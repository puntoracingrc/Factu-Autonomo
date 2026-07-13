import type { MetadataRoute } from "next";
import { listPublicAeatOfficialModelContentsV1 } from "@/lib/fiscal-models/model-pages";

const SITE_URL = "https://facturacion-autonomos.app";

const publicRoutes = [
  "/",
  "/inicio",
  "/demo",
  "/precios",
  "/ayuda",
  "/ayuda/primeros-pasos",
  "/ayuda/demo",
  "/ayuda/inicio",
  "/ayuda/clientes",
  "/ayuda/facturas",
  "/ayuda/presupuestos",
  "/ayuda/recibos",
  "/ayuda/gastos",
  "/ayuda/impuestos",
  "/ayuda/productos",
  "/ayuda/proveedores",
  "/ayuda/cuenta",
  "/ayuda/configuracion",
  "/ayuda/importacion",
  "/legal/aviso-legal",
  "/legal/privacidad",
  "/legal/terminos",
  "/legal/cookies",
  "/legal/encargo-tratamiento",
  "/legal/verifactu",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-07-04T00:00:00.000Z");
  const modelLastModified = new Date("2026-07-13T00:00:00.000Z");
  const officialModels = listPublicAeatOfficialModelContentsV1();
  if (officialModels.status === "BLOCKED") {
    throw new Error("Inconsistent public AEAT model content sitemap");
  }

  return [
    ...publicRoutes.map((route) => ({
      url: `${SITE_URL}${route}`,
      lastModified,
      changeFrequency:
        route === "/" || route === "/inicio"
          ? ("weekly" as const)
          : ("monthly" as const),
      priority: route === "/" || route === "/inicio" ? 1 : 0.7,
    })),
    {
      url: `${SITE_URL}/consultor-fiscal/modelos`,
      lastModified: modelLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    ...officialModels.data.map((model) => ({
      url: `${SITE_URL}/consultor-fiscal/modelos/${model.code}`,
      lastModified: modelLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
