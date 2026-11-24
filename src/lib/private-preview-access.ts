import type { AppCompany } from "@/lib/companies/types";

export type PreviewAccess = "full" | "tax-summary" | "none";

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

export function previewAccessForAccount(
  user: { id: string; email?: string } | null,
  company: Pick<AppCompany, "taxSummaryGrantedTo"> | null,
): PreviewAccess {
  if (hasPrivatePreviewAccess(user?.email)) return "full";
  if (user && company?.taxSummaryGrantedTo === user.id) return "tax-summary";
  return "none";
}

export function isPrivatePreviewPath(pathname: string): boolean {
  return PRIVATE_PREVIEW_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isPrivatePreviewManualSlug(slug: string): boolean {
  return PRIVATE_PREVIEW_MANUAL_SLUGS.has(slug);
}

export function canReadManualSection(
  slug: string,
  access: PreviewAccess,
): boolean {
  return (
    !isPrivatePreviewManualSlug(slug) ||
    access === "full" ||
    (slug === "impuestos" && access === "tax-summary")
  );
}
