import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";

/** Pin a request to the workspace actually displayed by this quick editor. */
export function quickCompanyRequestHeaders(
  action: string,
  companyId: string | undefined,
): Record<string, string> {
  // Bootstrap discovers the current server enrollment, including reassignment.
  if (action === "bootstrap") return {};
  if (!companyId) throw new Error("Vuelve a abrir Factu Rápido para cargar la empresa habilitada.");
  return { [FACTU_COMPANY_HEADER]: companyId };
}

export function quickCompanyScopeProblem(
  requestedCompanyId: string | null,
  activeCompanyId: string,
  allowBootstrap = false,
): { status: number; code: string; message: string } | null {
  if (requestedCompanyId && requestedCompanyId !== activeCompanyId) {
    return { status: 403, code: "COMPANY_NOT_ALLOWED",
      message: "Factu Rápido está conectado a otra empresa. Vuelve a abrir la app; tu borrador se conserva." };
  }
  if (!requestedCompanyId && !allowBootstrap) {
    return { status: 409, code: "COMPANY_REFRESH_REQUIRED",
      message: "Vuelve a abrir Factu Rápido para cargar la empresa habilitada. Tu borrador se conserva." };
  }
  return null;
}
