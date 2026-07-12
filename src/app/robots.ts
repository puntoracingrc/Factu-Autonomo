import type { MetadataRoute } from "next";

const SITE_URL = "https://facturacion-autonomos.app";

const appInternalRoutes = [
  "/admin",
  "/api",
  "/auth",
  "/google-auth",
  "/drive",
  "/avisos",
  "/clientes",
  "/configuracion",
  "/consultor-fiscal",
  "/cuenta",
  "/facturas",
  "/gastos",
  "/importar",
  "/impuestos",
  "/presupuestos",
  "/productos",
  "/proveedores",
  "/recibos",
  "/rentabilidad-real",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/consultor-fiscal/modelos"],
        disallow: appInternalRoutes,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
