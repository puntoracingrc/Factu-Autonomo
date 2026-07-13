import { type NextRequest, NextResponse } from "next/server";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";
import { isPublicAeatOfficialIndexablePathV1 } from "@/lib/fiscal-models/model-pages/official-content/indexable-paths.v1";
import { isPublicAeatModelReviewPathV1 } from "@/lib/fiscal-models/model-pages/public-review-route-manifest.v1";
import { buildSecurityResponseHeaders } from "@/lib/security-response-headers";

const PRIVATE_APP_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};
const PRIVATE_APP_ROBOTS_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const LEGAL_ALIAS_DESTINATIONS: Readonly<Record<string, string>> = {
  "/privacidad": "/legal/privacidad",
  "/privacy": "/legal/privacidad",
  "/terminos": "/legal/terminos",
  "/terms": "/legal/terminos",
};

function applyPrivateHeaders(
  response: NextResponse,
  options: Readonly<{ allowIndex?: boolean }> = {},
): NextResponse {
  for (const [key, value] of Object.entries(PRIVATE_APP_HEADERS)) {
    response.headers.set(key, value);
  }
  if (!options.allowIndex) {
    for (const [key, value] of Object.entries(PRIVATE_APP_ROBOTS_HEADERS)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

function isConsultorFiscalReleasePath(pathname: string): boolean {
  return (
    pathname === "/consultor-fiscal" ||
    pathname.startsWith("/consultor-fiscal/") ||
    pathname === "/ayuda/consultor-fiscal" ||
    pathname.startsWith("/ayuda/consultor-fiscal/")
  );
}

function isFiscalModelReviewNamespacePath(pathname: string): boolean {
  return pathname.toLowerCase().startsWith("/consultor-fiscal/modelos");
}

function isNormalizedFiscalModelTraversalTarget(pathname: string): boolean {
  const prefix = "/consultor-fiscal/";
  if (!pathname.startsWith(prefix)) return false;
  const segment = pathname.slice(prefix.length);
  return /^(?:\d{2,3}|\d{2}[A-Za-z]|[A-Za-z]\d{2})$/.test(segment);
}

function isAllowedFiscalModelReviewPath(pathname: string): boolean {
  return (
    pathname === "/consultor-fiscal/modelos" ||
    isPublicAeatModelReviewPathV1(pathname)
  );
}

function isAllowedConsultorPublicReviewPath(pathname: string): boolean {
  return (
    pathname === "/consultor-fiscal/calendario" ||
    isAllowedFiscalModelReviewPath(pathname)
  );
}

function privateNotFoundResponse(): NextResponse {
  const response = applyPrivateHeaders(
    new NextResponse("Not Found", { status: 404 }),
  );
  for (const { key, value } of buildSecurityResponseHeaders()) {
    response.headers.set(key, value);
  }
  return response;
}

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

  if (
    request &&
    ((isFiscalModelReviewNamespacePath(request.nextUrl.pathname) &&
      !isAllowedFiscalModelReviewPath(request.nextUrl.pathname)) ||
      isNormalizedFiscalModelTraversalTarget(request.nextUrl.pathname))
  ) {
    return privateNotFoundResponse();
  }

  if (
    request &&
    isConsultorFiscalReleasePath(request.nextUrl.pathname) &&
    !isAllowedConsultorPublicReviewPath(request.nextUrl.pathname) &&
    !isConsultorFiscalEnabled()
  ) {
    return privateNotFoundResponse();
  }

  return applyPrivateHeaders(NextResponse.next(), {
    allowIndex:
      request !== undefined &&
      isPublicAeatOfficialIndexablePathV1(request.nextUrl.pathname),
  });
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
    "/ayuda/consultor-fiscal/:path*",
    "/clientes/:path*",
    "/configuracion/:path*",
    "/consultor-fiscal/:path*",
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
