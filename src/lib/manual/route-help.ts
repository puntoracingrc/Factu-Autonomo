import { buildManualHref } from "./return-url";

/** Slug del manual que corresponde a cada ruta de la app. */
export function resolveManualSlug(pathname: string): string | null {
  const path = pathname.split("?")[0]?.replace(/\/$/, "") || "/";

  if (
    path.startsWith("/ayuda") ||
    path.startsWith("/auth") ||
    path.startsWith("/legal") ||
    path.startsWith("/precios")
  ) {
    return null;
  }

  if (path === "/" || path === "") return "inicio";
  if (path.startsWith("/clientes")) return "clientes";
  if (path.startsWith("/facturas")) return "facturas";
  if (path.startsWith("/presupuestos")) return "presupuestos";
  if (path.startsWith("/recibos")) return "recibos";
  if (path.startsWith("/gastos")) return "gastos";
  if (path.startsWith("/impuestos")) return "impuestos";
  if (path.startsWith("/proveedores")) return "proveedores";
  if (path.startsWith("/configuracion")) return "configuracion";

  return null;
}

export function manualHelpHref(pathname: string): string | null {
  const slug = resolveManualSlug(pathname);
  if (!slug) return null;
  return buildManualHref(`/ayuda/${slug}`, pathname);
}
