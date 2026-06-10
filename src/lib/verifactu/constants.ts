/** Datos del SIF para verificación in situ y declaración responsable. */
export const VERIFACTU_SOFTWARE = {
  developerName: process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_NAME ?? "Factura Autónomo",
  developerNif:
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF ?? "PENDIENTE-NIF",
  softwareName: "Factura Autónomo",
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

export const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";
