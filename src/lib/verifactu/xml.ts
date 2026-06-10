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
  recordType: VerifactuRecordType;
  recordHash: string;
  previousHash: string;
  recordTimestamp: string;
  csv?: string;
}): string {
  const nif = normalizeIssuerNif(input.issuerNif);
  const fecha = formatQrDate(input.fecha);
  const importe = formatQrAmount(input.importe);
  const tipo = input.recordType === "alta" ? "Alta" : "Anulacion";

  return `<?xml version="1.0" encoding="UTF-8"?>
<RegistroFacturacion xmlns="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd">
  <Cabecera>
    <ObligadoEmision>
      <NIF>${escapeXml(nif)}</NIF>
    </ObligadoEmision>
    <SistemaInformatico>
      <NombreRazon>${escapeXml(VERIFACTU_SOFTWARE.developerName)}</NombreRazon>
      <NIF>${escapeXml(VERIFACTU_SOFTWARE.developerNif)}</NIF>
      <NombreSistemaInformatico>${escapeXml(VERIFACTU_SOFTWARE.softwareName)}</NombreSistemaInformatico>
      <IdSistemaInformatico>FA</IdSistemaInformatico>
      <Version>${escapeXml(VERIFACTU_SOFTWARE.softwareVersion)}</Version>
    </SistemaInformatico>
  </Cabecera>
  <RegistroAlta>
    <TipoRegistro>${tipo}</TipoRegistro>
    <IDFactura>
      <IDEmisorFactura>${escapeXml(nif)}</IDEmisorFactura>
      <NumSerieFactura>${escapeXml(input.numserie)}</NumSerieFactura>
      <FechaExpedicionFactura>${escapeXml(fecha)}</FechaExpedicionFactura>
    </IDFactura>
    <ImporteTotal>${escapeXml(importe)}</ImporteTotal>
    <Huella>${escapeXml(input.recordHash)}</Huella>
    <HuellaRegistroAnterior>${escapeXml(input.previousHash)}</HuellaRegistroAnterior>
    <FechaHoraHusoGenRegistro>${escapeXml(input.recordTimestamp)}</FechaHoraHusoGenRegistro>
    ${input.csv ? `<CodigoSeguroVerificacion>${escapeXml(input.csv)}</CodigoSeguroVerificacion>` : ""}
  </RegistroAlta>
</RegistroFacturacion>`;
}
