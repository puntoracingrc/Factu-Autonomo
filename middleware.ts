import { NextResponse } from "next/server";

const PRIVATE_APP_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

export function middleware() {
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(PRIVATE_APP_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
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
