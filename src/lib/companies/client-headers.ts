import { getActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import { FACTU_COMPANY_HEADER } from "./types";

export function activeCompanyRequestHeaders(
  headers: Record<string, string> = {},
): Record<string, string> {
  const companyId = getActiveWorkspaceOwnerScope();
  return companyId
    ? { ...headers, [FACTU_COMPANY_HEADER]: companyId }
    : { ...headers };
}
