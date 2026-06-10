import { VERIFACTU_SOFTWARE } from "./constants";
import { formatQrAmount, formatQrDate, normalizeIssuerNif } from "./qr";
import type { VerifactuRecordType } from "./types";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRegistroFacturacionXml(input: {
  issuerNif: string;
  numserie: string;
  fecha: string;
  importe: number;
  cuotaTotal: number;
  tipoFactura: string;
  recordType: VerifactuRecordType;
  recordHash: string;
  previousHash: string;
  recordTimestamp: string;
  csv?: string;
}): string {
  const nif = normalizeIssuerNif(input.issuerNif);
  const fecha = formatQrDate(input.fecha);
  const importe = formatQrAmount(input.importe);
  const cuota = formatQrAmount(input.cuotaTotal);
  const encadenamiento =
    input.previousHash.trim().length > 0
      ? `<Encadenamiento><RegistroAnterior><Huella>${escapeXml(input.previousHash)}</Huella></RegistroAnterior></Encadenamiento>`
      : "";

  const sistemaInformatico = `
    <SistemaInformatico>
      <NombreRazon>${escapeXml(VERIFACTU_SOFTWARE.developerName)}</NombreRazon>
      <NIF>${escapeXml(VERIFACTU_SOFTWARE.developerNif)}</NIF>
      <NombreSistemaInformatico>${escapeXml(VERIFACTU_SOFTWARE.softwareName)}</NombreSistemaInformatico>
      <IdSistemaInformatico>FA</IdSistemaInformatico>
      <Version>${escapeXml(VERIFACTU_SOFTWARE.softwareVersion)}</Version>
    </SistemaInformatico>`;

  if (input.recordType === "anulacion") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<RegistroFacturacion xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd">
  <Cabecera>
    <ObligadoEmision>
      <NIF>${escapeXml(nif)}</NIF>
    </ObligadoEmision>
    ${sistemaInformatico}
  </Cabecera>
  <RegistroAnulacion>
    <IDFacturaAnulada>
      <IDEmisorFacturaAnulada>${escapeXml(nif)}</IDEmisorFacturaAnulada>
      <NumSerieFacturaAnulada>${escapeXml(input.numserie)}</NumSerieFacturaAnulada>
      <FechaExpedicionFacturaAnulada>${escapeXml(fecha)}</FechaExpedicionFacturaAnulada>
    </IDFacturaAnulada>
    ${encadenamiento}
    <Huella>${escapeXml(input.recordHash)}</Huella>
    <FechaHoraHusoGenRegistro>${escapeXml(input.recordTimestamp)}</FechaHoraHusoGenRegistro>
    ${input.csv ? `<CodigoSeguroVerificacion>${escapeXml(input.csv)}</CodigoSeguroVerificacion>` : ""}
  </RegistroAnulacion>
</RegistroFacturacion>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<RegistroFacturacion xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd">
  <Cabecera>
    <ObligadoEmision>
      <NIF>${escapeXml(nif)}</NIF>
    </ObligadoEmision>
    ${sistemaInformatico}
  </Cabecera>
  <RegistroAlta>
    <IDFactura>
      <IDEmisorFactura>${escapeXml(nif)}</IDEmisorFactura>
      <NumSerieFactura>${escapeXml(input.numserie)}</NumSerieFactura>
      <FechaExpedicionFactura>${escapeXml(fecha)}</FechaExpedicionFactura>
    </IDFactura>
    <TipoFactura>${escapeXml(input.tipoFactura)}</TipoFactura>
    <CuotaTotal>${escapeXml(cuota)}</CuotaTotal>
    <ImporteTotal>${escapeXml(importe)}</ImporteTotal>
    ${encadenamiento}
    <Huella>${escapeXml(input.recordHash)}</Huella>
    <FechaHoraHusoGenRegistro>${escapeXml(input.recordTimestamp)}</FechaHoraHusoGenRegistro>
    ${input.csv ? `<CodigoSeguroVerificacion>${escapeXml(input.csv)}</CodigoSeguroVerificacion>` : ""}
  </RegistroAlta>
</RegistroFacturacion>`;
}
