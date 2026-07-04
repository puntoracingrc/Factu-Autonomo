export const MANUAL_FROM_PARAM = "from";

const RETURN_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: "/configuracion", label: "Ajustes" },
  { prefix: "/proveedores", label: "Proveedores" },
  { prefix: "/impuestos", label: "Impuestos" },
  { prefix: "/gastos", label: "Gastos" },
  { prefix: "/recibos", label: "Recibos" },
  { prefix: "/presupuestos", label: "Presupuestos" },
  { prefix: "/facturas", label: "Facturas" },
  { prefix: "/clientes", label: "Clientes" },
  { prefix: "/", label: "Panel" },
];

/** Solo rutas internas de la app; evita open redirect. */
export function sanitizeReturnPath(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;

  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  if (decoded.includes("://")) return null;
  if (decoded.startsWith("/ayuda")) return null;
  if (decoded.startsWith("/auth") || decoded.startsWith("/legal")) return null;

  return decoded;
}

export function buildManualHref(
  manualPath: string,
  returnPath?: string | null,
): string {
  const safeReturn = sanitizeReturnPath(returnPath);
  if (!safeReturn) return manualPath;

  const params = new URLSearchParams();
  params.set(MANUAL_FROM_PARAM, safeReturn);
  return `${manualPath}?${params.toString()}`;
}

export function returnPathLabel(path: string): string {
  const normalized = path.split("?")[0]?.replace(/\/$/, "") || "/";
  const match = RETURN_LABELS.find(({ prefix }) =>
    prefix === "/"
      ? normalized === "/"
      : normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
  return match?.label ?? "la app";
}
