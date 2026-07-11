import type { NextConfig } from "next";
import { buildSecurityResponseHeaders } from "./src/lib/security-response-headers";

const securityHeaders = buildSecurityResponseHeaders();

const apiNoStoreHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Vercel-CDN-Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const appNoIndexHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Vercel-CDN-Cache-Control", value: "no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const appNoIndexRoutes = [
  "/admin/:path*",
  "/auth/callback/:path*",
  "/avisos/:path*",
  "/clientes/:path*",
  "/configuracion/:path*",
  "/cuenta/:path*",
  "/drive/callback/:path*",
  "/facturas/:path*",
  "/gastos/:path*",
  "/google-auth/callback/:path*",
  "/importar/:path*",
  "/impuestos/:path*",
  "/presupuestos/:path*",
  "/productos/:path*",
  "/proveedores/:path*",
  "/recibos/:path*",
  "/rentabilidad-real/:path*",
];

const CANONICAL_APP_ORIGIN = "https://facturacion-autonomos.app";
const LEGACY_VERCEL_HOST = "factu-autonomo.vercel.app";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_ENV:
      process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiNoStoreHeaders,
      },
      ...appNoIndexRoutes.map((source) => ({
        source,
        headers: appNoIndexHeaders,
      })),
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: LEGACY_VERCEL_HOST }],
        destination: `${CANONICAL_APP_ORIGIN}/:path*`,
        permanent: true,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
