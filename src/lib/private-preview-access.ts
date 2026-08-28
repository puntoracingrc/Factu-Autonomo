const PRIVATE_PREVIEW_EMAILS = new Set([
  "persianasalmar@gmail.com",
  "puntoracingrc@gmail.com",
]);

const PRIVATE_PREVIEW_ROUTE_PREFIXES = [
  "/afiliados",
  "/consultor-fiscal",
  "/impuestos",
] as const;

const PRIVATE_PREVIEW_MANUAL_SLUGS = new Set([
  "calendario-fiscal",
  "consultor-fiscal",
  "impuestos",
  "modelos-aeat",
  "test-autonomos",
]);

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

export function hasPrivatePreviewAccess(
  email: string | null | undefined,
): boolean {
  return PRIVATE_PREVIEW_EMAILS.has(normalizeEmail(email));
}

export function isPrivatePreviewPath(pathname: string): boolean {
  return PRIVATE_PREVIEW_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPrivatePreviewManualSlug(slug: string): boolean {
  return PRIVATE_PREVIEW_MANUAL_SLUGS.has(slug);
}
