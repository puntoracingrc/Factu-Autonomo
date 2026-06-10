/** Datos del SIF para verificación in situ y declaración responsable (art. 15 HAC/1177/2024). */
export const VERIFACTU_SOFTWARE = {
  developerName:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME ?? "Factura Autónomo",
  developerNif:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF ?? "PENDIENTE-NIF",
  developerAddress:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_ADDRESS ??
    "PENDIENTE — configurar dirección postal del productor",
  developerCity:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_CITY ?? "PENDIENTE",
  developerCountry:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_COUNTRY ?? "España",
  developerEmail:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL ?? "",
  developerUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  softwareName: "Factura Autónomo",
  /** Código IdSistemaInformatico (apartado 1.b art. 15). */
  softwareId: process.env.NEXT_PUBLIC_VERIFACTU_SYSTEM_ID ?? "FA",
  softwareVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.2.0",
} as const;

export const AEAT_QR_PATH = "/wlpl/TIKE-CONT/ValidarQR";

export const AEAT_HOSTS = {
  test: "https://prewww2.aeat.es",
  production: "https://www2.agenciatributaria.gob.es",
} as const;

export const AEAT_WS_HOSTS = {
  test: "https://prewww10.aeat.es",
  production: "https://www10.agenciatributaria.gob.es",
} as const;

/** Huella genesis legacy (pre-v0.1.2). Primer registro usa cadena vacía. */
export const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";
