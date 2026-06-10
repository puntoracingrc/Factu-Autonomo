import { VERIFACTU_SOFTWARE } from "./constants";

const PLACEHOLDER_NIF = "PENDIENTE-NIF";
const PLACEHOLDER_ADDRESS_PREFIX = "PENDIENTE";

export interface ProducerConfigStatus {
  complete: boolean;
  missing: string[];
  warnings: string[];
}

export function getProducerConfigStatus(): ProducerConfigStatus {
  const missing: string[] = [];
  const warnings: string[] = [];
  const s = VERIFACTU_SOFTWARE;

  if (!s.developerNif || s.developerNif === PLACEHOLDER_NIF) {
    missing.push("NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF");
  }
  if (!s.developerName?.trim()) {
    missing.push("NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME");
  }
  if (
    !s.developerAddress?.trim() ||
    s.developerAddress.startsWith(PLACEHOLDER_ADDRESS_PREFIX)
  ) {
    missing.push("NEXT_PUBLIC_VERIFACTU_DEVELOPER_ADDRESS");
  }
  if (!s.developerCity?.trim() || s.developerCity === "PENDIENTE") {
    missing.push("NEXT_PUBLIC_VERIFACTU_DEVELOPER_CITY");
  }
  if (!s.developerEmail?.trim()) {
    warnings.push("NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL (recomendado)");
  }
  if (!s.developerUrl?.trim()) {
    warnings.push("NEXT_PUBLIC_APP_URL (recomendado para anexo declaración)");
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings,
  };
}
