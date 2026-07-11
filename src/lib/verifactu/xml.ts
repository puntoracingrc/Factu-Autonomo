import {
  lineMoneyAmounts,
  roundMoneySymmetric,
} from "../calculations";
import type { BusinessProfile, Document } from "../types";
import {
  AEAT_VERIFACTU_NAMESPACES,
  VERIFACTU_SOFTWARE,
} from "./constants";
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

function compactText(value: string, maxLength: number): string {
  const compacted = value.replace(/\s+/g, " ").trim();
  if (compacted.length <= maxLength) return compacted;
  return compacted.slice(0, maxLength);
}

function requiredText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function formatPercent(value: number): string {
  return formatQrAmount(roundMoneySymmetric(value));
}

function issuerName(doc: Document, profile: BusinessProfile): string {
  return compactText(
    requiredText(doc.issuer?.name, requiredText(profile.name, "Emisor")),
    120,
  );
}

function documentDescription(doc: Document): string {
  const descriptions = doc.items
    .map((item) => item.description.trim())
    .filter(Boolean);
  return compactText(descriptions.join("; ") || "Servicios facturados", 500);
}

function clientName(doc: Document): string {
  return compactText(
    requiredText(doc.client.name, "Cliente"),
    120,
  );
}

function buildDestinatarios(doc: Document): string {
  const nif = doc.client.nif?.trim().toUpperCase().replace(/\s/g, "");
  if (!nif) return "";

  return `
        <sum1:Destinatarios>
          <sum1:IDDestinatario>
            <sum1:NombreRazon>${escapeXml(clientName(doc))}</sum1:NombreRazon>
            <sum1:NIF>${escapeXml(nif)}</sum1:NIF>
          </sum1:IDDestinatario>
        </sum1:Destinatarios>`;
}

function buildDetalleDesglose(input: {
  doc: Document;
  vatExempt: boolean;
}): string {
  const grouped = new Map<number, { base: number; iva: number }>();
  for (const item of input.doc.items) {
    const rate = input.vatExempt ? 0 : item.ivaPercent;
    const current = grouped.get(rate) ?? { base: 0, iva: 0 };
    const amounts = lineMoneyAmounts(item, input.vatExempt);
    current.base += amounts.subtotal;
    current.iva += amounts.iva;
    grouped.set(rate, current);
  }

  if (grouped.size === 0) {
    grouped.set(0, { base: 0, iva: 0 });
  }

  const detalles = [...grouped.entries()]
    .sort(([left], [right]) => left - right)
    .map(([rate, totals]) => {
      const base = formatQrAmount(roundMoneySymmetric(totals.base));
      const cuota = formatQrAmount(roundMoneySymmetric(totals.iva));
      if (input.vatExempt) {
        return `
          <sum1:DetalleDesglose>
            <sum1:Impuesto>01</sum1:Impuesto>
            <sum1:ClaveRegimen>01</sum1:ClaveRegimen>
            <sum1:OperacionExenta>E1</sum1:OperacionExenta>
            <sum1:BaseImponibleOimporteNoSujeto>${base}</sum1:BaseImponibleOimporteNoSujeto>
          </sum1:DetalleDesglose>`;
      }

      return `
          <sum1:DetalleDesglose>
            <sum1:Impuesto>01</sum1:Impuesto>
            <sum1:ClaveRegimen>01</sum1:ClaveRegimen>
            <sum1:CalificacionOperacion>S1</sum1:CalificacionOperacion>
            <sum1:TipoImpositivo>${escapeXml(formatPercent(rate))}</sum1:TipoImpositivo>
            <sum1:BaseImponibleOimporteNoSujeto>${base}</sum1:BaseImponibleOimporteNoSujeto>
            <sum1:CuotaRepercutida>${cuota}</sum1:CuotaRepercutida>
          </sum1:DetalleDesglose>`;
    })
    .join("");

  return `
        <sum1:Desglose>${detalles}
        </sum1:Desglose>`;
}

function buildEncadenamiento(input: {
  issuerNif: string;
  previousHash: string;
  previousNumSerie?: string;
  previousFechaExpedicion?: string;
}): string {
  if (
    input.previousHash.trim() &&
    input.previousNumSerie?.trim() &&
    input.previousFechaExpedicion?.trim()
  ) {
    return `
        <sum1:Encadenamiento>
          <sum1:RegistroAnterior>
            <sum1:IDEmisorFactura>${escapeXml(input.issuerNif)}</sum1:IDEmisorFactura>
            <sum1:NumSerieFactura>${escapeXml(input.previousNumSerie)}</sum1:NumSerieFactura>
            <sum1:FechaExpedicionFactura>${escapeXml(formatQrDate(input.previousFechaExpedicion))}</sum1:FechaExpedicionFactura>
            <sum1:Huella>${escapeXml(input.previousHash)}</sum1:Huella>
          </sum1:RegistroAnterior>
        </sum1:Encadenamiento>`;
  }

  return `
        <sum1:Encadenamiento>
          <sum1:PrimerRegistro>S</sum1:PrimerRegistro>
        </sum1:Encadenamiento>`;
}

function buildSistemaInformatico(): string {
  return `
        <sum1:SistemaInformatico>
          <sum1:NombreRazon>${escapeXml(VERIFACTU_SOFTWARE.developerName)}</sum1:NombreRazon>
          <sum1:NIF>${escapeXml(VERIFACTU_SOFTWARE.developerNif)}</sum1:NIF>
          <sum1:NombreSistemaInformatico>${escapeXml(compactText(VERIFACTU_SOFTWARE.softwareName, 30))}</sum1:NombreSistemaInformatico>
          <sum1:IdSistemaInformatico>${escapeXml(compactText(VERIFACTU_SOFTWARE.softwareId, 2))}</sum1:IdSistemaInformatico>
          <sum1:Version>${escapeXml(compactText(VERIFACTU_SOFTWARE.softwareVersion, 50))}</sum1:Version>
          <sum1:NumeroInstalacion>${escapeXml(compactText(VERIFACTU_SOFTWARE.installationId, 100))}</sum1:NumeroInstalacion>
          <sum1:TipoUsoPosibleSoloVerifactu>N</sum1:TipoUsoPosibleSoloVerifactu>
          <sum1:TipoUsoPosibleMultiOT>S</sum1:TipoUsoPosibleMultiOT>
          <sum1:IndicadorMultiplesOT>S</sum1:IndicadorMultiplesOT>
        </sum1:SistemaInformatico>`;
}

function buildCabecera(input: { issuerName: string; issuerNif: string }): string {
  return `
    <sum:Cabecera>
      <sum1:ObligadoEmision>
        <sum1:NombreRazon>${escapeXml(input.issuerName)}</sum1:NombreRazon>
        <sum1:NIF>${escapeXml(input.issuerNif)}</sum1:NIF>
      </sum1:ObligadoEmision>
    </sum:Cabecera>`;
}

export function stripXmlDeclaration(xml: string): string {
  return xml.replace(/^\s*<\?xml[^>]*>\s*/i, "");
}

export function buildRegistroFacturacionXml(input: {
  doc: Document;
  profile: BusinessProfile;
  issuerNif: string;
  numserie: string;
  fecha: string;
  importe: number;
  cuotaTotal: number;
  tipoFactura: string;
  recordType: VerifactuRecordType;
  recordHash: string;
  previousHash: string;
  previousNumSerie?: string;
  previousFechaExpedicion?: string;
  recordTimestamp: string;
  vatExempt: boolean;
}): string {
  const nif = normalizeIssuerNif(input.issuerNif);
  const fecha = formatQrDate(input.fecha);
  const importe = formatQrAmount(input.importe);
  const cuota = formatQrAmount(input.cuotaTotal);
  const nombreEmisor = issuerName(input.doc, input.profile);
  const encadenamiento = buildEncadenamiento({
    issuerNif: nif,
    previousHash: input.previousHash,
    previousNumSerie: input.previousNumSerie,
    previousFechaExpedicion: input.previousFechaExpedicion,
  });
  const sistemaInformatico = buildSistemaInformatico();
  const cabecera = buildCabecera({
    issuerName: nombreEmisor,
    issuerNif: nif,
  });

  if (input.recordType === "anulacion") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sum:RegFactuSistemaFacturacion xmlns:sum="${AEAT_VERIFACTU_NAMESPACES.suministroLR}" xmlns:sum1="${AEAT_VERIFACTU_NAMESPACES.suministroInformacion}" xmlns:xd="${AEAT_VERIFACTU_NAMESPACES.xmlSignature}">
${cabecera}
    <sum:RegistroFactura>
      <sum1:RegistroAnulacion>
        <sum1:IDVersion>1.0</sum1:IDVersion>
        <sum1:IDFactura>
          <sum1:IDEmisorFacturaAnulada>${escapeXml(nif)}</sum1:IDEmisorFacturaAnulada>
          <sum1:NumSerieFacturaAnulada>${escapeXml(input.numserie)}</sum1:NumSerieFacturaAnulada>
          <sum1:FechaExpedicionFacturaAnulada>${escapeXml(fecha)}</sum1:FechaExpedicionFacturaAnulada>
        </sum1:IDFactura>${encadenamiento}${sistemaInformatico}
        <sum1:FechaHoraHusoGenRegistro>${escapeXml(input.recordTimestamp)}</sum1:FechaHoraHusoGenRegistro>
        <sum1:TipoHuella>01</sum1:TipoHuella>
        <sum1:Huella>${escapeXml(input.recordHash)}</sum1:Huella>
      </sum1:RegistroAnulacion>
    </sum:RegistroFactura>
</sum:RegFactuSistemaFacturacion>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<sum:RegFactuSistemaFacturacion xmlns:sum="${AEAT_VERIFACTU_NAMESPACES.suministroLR}" xmlns:sum1="${AEAT_VERIFACTU_NAMESPACES.suministroInformacion}" xmlns:xd="${AEAT_VERIFACTU_NAMESPACES.xmlSignature}">
${cabecera}
    <sum:RegistroFactura>
      <sum1:RegistroAlta>
        <sum1:IDVersion>1.0</sum1:IDVersion>
        <sum1:IDFactura>
          <sum1:IDEmisorFactura>${escapeXml(nif)}</sum1:IDEmisorFactura>
          <sum1:NumSerieFactura>${escapeXml(input.numserie)}</sum1:NumSerieFactura>
          <sum1:FechaExpedicionFactura>${escapeXml(fecha)}</sum1:FechaExpedicionFactura>
        </sum1:IDFactura>
        <sum1:NombreRazonEmisor>${escapeXml(nombreEmisor)}</sum1:NombreRazonEmisor>
        <sum1:TipoFactura>${escapeXml(input.tipoFactura)}</sum1:TipoFactura>
        <sum1:DescripcionOperacion>${escapeXml(documentDescription(input.doc))}</sum1:DescripcionOperacion>${buildDestinatarios(input.doc)}${buildDetalleDesglose({
          doc: input.doc,
          vatExempt: input.vatExempt,
        })}
        <sum1:CuotaTotal>${escapeXml(cuota)}</sum1:CuotaTotal>
        <sum1:ImporteTotal>${escapeXml(importe)}</sum1:ImporteTotal>${encadenamiento}${sistemaInformatico}
        <sum1:FechaHoraHusoGenRegistro>${escapeXml(input.recordTimestamp)}</sum1:FechaHoraHusoGenRegistro>
        <sum1:TipoHuella>01</sum1:TipoHuella>
        <sum1:Huella>${escapeXml(input.recordHash)}</sum1:Huella>
      </sum1:RegistroAlta>
    </sum:RegistroFactura>
</sum:RegFactuSistemaFacturacion>`;
}
