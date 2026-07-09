import type { NextConfig } from "next";

type CspDirective = readonly [name: string, values?: readonly string[]];

const isProductionBuild = process.env.NODE_ENV === "production";

function serializeCsp(directives: readonly CspDirective[]): string {
  return directives
    .map(([name, values]) =>
      values && values.length > 0 ? `${name} ${values.join(" ")}` : name,
    )
    .join("; ");
}

const developmentConnectSources = isProductionBuild
  ? []
  : [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "ws://localhost:*",
      "ws://127.0.0.1:*",
    ];

const contentSecurityPolicy = serializeCsp([
  ["default-src", ["'self'"]],
  ["base-uri", ["'self'"]],
  ["object-src", ["'none'"]],
  ["frame-ancestors", ["'none'"]],
  ["form-action", ["'self'"]],
  [
    "script-src",
    [
      "'self'",
      "'unsafe-inline'",
      "https://accounts.google.com",
      "https://challenges.cloudflare.com",
      "https://maps.googleapis.com",
      "https://maps.gstatic.com",
    ],
  ],
  [
    "style-src",
    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  ],
  ["img-src", ["'self'", "data:", "blob:", "https:"]],
  ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
  [
    "connect-src",
    [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.openai.com",
      "https://accounts.google.com",
      "https://oauth2.googleapis.com",
      "https://www.googleapis.com",
      "https://maps.googleapis.com",
      "https://*.googleapis.com",
      ...developmentConnectSources,
    ],
  ],
  [
    "frame-src",
    [
      "'self'",
      "https://accounts.google.com",
      "https://challenges.cloudflare.com",
      "https://drive.google.com",
      "https://mail.google.com",
    ],
  ],
  ["worker-src", ["'self'", "blob:"]],
  ["media-src", ["'self'", "blob:", "data:"]],
  ["manifest-src", ["'self'"]],
  ["report-uri", ["/api/security/csp-report"]],
  ["upgrade-insecure-requests"],
]);

const cspMode =
  process.env.SECURITY_CSP_MODE ??
  (isProductionBuild ? "enforce" : "report-only");

const contentSecurityPolicyHeader =
  cspMode === "enforce"
    ? "Content-Security-Policy"
    : "Content-Security-Policy-Report-Only";

const securityHeaders = [
  {
    key: "Access-Control-Allow-Origin",
    value: "https://facturacion-autonomos.app",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), bluetooth=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), serial=(), usb=()",
  },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: contentSecurityPolicyHeader,
    value: contentSecurityPolicy,
  },
];

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
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
