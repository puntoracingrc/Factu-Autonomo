import { type NextRequest, NextResponse } from "next/server";
import { buildSecurityResponseHeaders } from "@/lib/security-response-headers";

const PRIVATE_APP_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const LEGAL_ALIAS_DESTINATIONS: Readonly<Record<string, string>> = {
  "/privacidad": "/legal/privacidad",
  "/privacy": "/legal/privacidad",
  "/terminos": "/legal/terminos",
  "/terms": "/legal/terminos",
};

export function middleware(request?: NextRequest) {
  const legalDestination = request
    ? LEGAL_ALIAS_DESTINATIONS[request.nextUrl.pathname]
    : undefined;

  if (request && legalDestination) {
    const destination = request.nextUrl.clone();
    destination.pathname = legalDestination;

    const response = NextResponse.redirect(destination, 308);
    for (const { key, value } of buildSecurityResponseHeaders()) {
      response.headers.set(key, value);
    }
    return response;
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(PRIVATE_APP_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    "/privacidad",
    "/privacy",
    "/terminos",
    "/terms",
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
  ],
};
