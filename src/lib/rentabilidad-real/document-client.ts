import type { Document } from "@/lib/types";

export const RENTABILIDAD_REAL_UNASSIGNED_CLIENT_LABEL = "Cliente sin asignar";
const RENTABILIDAD_REAL_UNASSIGNED_CLIENT_ID = "client_unassigned";

export function rentabilidadRealDocumentClientName(
  document: Pick<Partial<Document>, "client">,
): string {
  return (
    document.client?.name?.trim() || RENTABILIDAD_REAL_UNASSIGNED_CLIENT_LABEL
  );
}

export function rentabilidadRealDocumentClientId(
  document: Pick<Partial<Document>, "client" | "customerId">,
): string {
  if (document.customerId?.trim()) return document.customerId;

  const name = rentabilidadRealDocumentClientName(document);
  if (name === RENTABILIDAD_REAL_UNASSIGNED_CLIENT_LABEL) {
    return RENTABILIDAD_REAL_UNASSIGNED_CLIENT_ID;
  }

  return `client_name_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}
