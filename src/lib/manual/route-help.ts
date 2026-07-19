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
  if (path.startsWith("/demo")) return "demo";
  if (path.startsWith("/avisos")) return "inicio";
  if (path.startsWith("/clientes")) return "clientes";
  if (path.startsWith("/facturas")) return "facturas";
  if (path.startsWith("/presupuestos")) return "presupuestos";
  if (path.startsWith("/recibos")) return "recibos";
  if (path.startsWith("/gastos")) return "gastos";
  if (path.startsWith("/productos")) return "productos";
  if (path.startsWith("/impuestos")) return "impuestos";
  if (path === "/consultor-fiscal/calendario") return "calendario-fiscal";
  if (
    path === "/consultor-fiscal/notificaciones" ||
    path === "/consultor-fiscal/notificaciones/guia" ||
    path === "/consultor-fiscal/modelos" ||
    path.startsWith("/consultor-fiscal/modelos/")
  ) {
    return null;
  }
  if (path.startsWith("/consultor-fiscal")) return "consultor-fiscal";
  if (path.startsWith("/proveedores")) return "proveedores";
  if (path.startsWith("/cuenta")) return "cuenta";
  if (path.startsWith("/configuracion")) return "configuracion";
  if (path.startsWith("/importar")) return "importacion";
  if (
    path === "/rentabilidad-real" ||
    path.startsWith("/rentabilidad-real/")
  ) {
    return "rentabilidad-real";
  }

  return null;
}

export function manualHelpHref(pathname: string): string | null {
  const slug = resolveManualSlug(pathname);
  return buildManualHref(slug ? `/ayuda/${slug}` : "/ayuda", pathname);
}
