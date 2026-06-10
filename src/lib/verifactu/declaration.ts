import { VERIFACTU_SOFTWARE } from "./constants";

export interface DeclarationOfConformity {
  softwareName: string;
  softwareVersion: string;
  developerName: string;
  developerNif: string;
  modality: "VERI*FACTU";
  issuedAt: string;
  statementEs: string;
}

export function buildDeclarationOfConformity(): DeclarationOfConformity {
  const issuedAt = new Date().toISOString().slice(0, 10);
  return {
    softwareName: VERIFACTU_SOFTWARE.softwareName,
    softwareVersion: VERIFACTU_SOFTWARE.softwareVersion,
    developerName: VERIFACTU_SOFTWARE.developerName,
    developerNif: VERIFACTU_SOFTWARE.developerNif,
    modality: "VERI*FACTU",
    issuedAt,
    statementEs: [
      `DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN`,
      ``,
      `El abajo firmante, ${VERIFACTU_SOFTWARE.developerName} (NIF ${VERIFACTU_SOFTWARE.developerNif}),`,
      `en calidad de productor del sistema informático de facturación`,
      `"${VERIFACTU_SOFTWARE.softwareName}" versión ${VERIFACTU_SOFTWARE.softwareVersion},`,
      `DECLARA bajo su responsabilidad que dicho sistema cumple con los requisitos`,
      `establecidos en el Reglamento que establece los requisitos que deben adoptar`,
      `los sistemas y programas informáticos o electrónicos que soporten los procesos`,
      `de facturación (RD 1007/2023) y su normativa de desarrollo, en modalidad VERI*FACTU.`,
      ``,
      `Fecha: ${issuedAt}`,
    ].join("\n"),
  };
}
