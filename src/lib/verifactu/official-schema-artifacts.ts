export const VERIFACTU_OFFICIAL_ARTIFACTS_RETRIEVED_AT = "2026-09-02";

export type OfficialVerifactuArtifactKind = "xsd" | "wsdl";

export interface OfficialVerifactuArtifact {
  readonly fileName: string;
  readonly kind: OfficialVerifactuArtifactKind;
  readonly sourceUrl: string;
  readonly sha256: string;
  readonly byteLength: number;
}

export const OFFICIAL_VERIFACTU_ARTIFACTS = [
  {
    fileName: "SuministroLR.xsd",
    kind: "xsd",
    sourceUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd",
    sha256:
      "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
    byteLength: 1573,
  },
  {
    fileName: "SuministroInformacion.xsd",
    kind: "xsd",
    sourceUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd",
    sha256:
      "ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1",
    byteLength: 49540,
  },
  {
    fileName: "RespuestaSuministro.xsd",
    kind: "xsd",
    sourceUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/RespuestaSuministro.xsd",
    sha256:
      "82acf80f785643caac13087aae66808ed721a13f08ca5218cf8ae81b695549ef",
    byteLength: 6259,
  },
  {
    fileName: "ConsultaLR.xsd",
    kind: "xsd",
    sourceUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/ConsultaLR.xsd",
    sha256:
      "bf2cdb8fc4b95b291757a72b76d8fffca06a6d30d9329122ca2fd6b2d5f8f1b1",
    byteLength: 3886,
  },
  {
    fileName: "RespuestaConsultaLR.xsd",
    kind: "xsd",
    sourceUrl:
      "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/RespuestaConsultaLR.xsd",
    sha256:
      "de35063acb8d9ba0d6ae51acc6b595de9c2b12333250e95e13108ef5f2670d45",
    byteLength: 10058,
  },
  {
    fileName: "xmldsig-core-schema.xsd",
    kind: "xsd",
    sourceUrl:
      "https://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd",
    sha256:
      "d102ad3df7664c307e0c2c776ba4a90513b1969974d8a940bae1a77f9f21e15d",
    byteLength: 10292,
  },
  {
    fileName: "SistemaFacturacion.wsdl",
    kind: "wsdl",
    sourceUrl:
      "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SistemaFacturacion.wsdl",
    sha256:
      "05919120708ff7650612fa6683c9336eaf919335d9a4db10e86759190af48602",
    byteLength: 8780,
  },
] as const satisfies readonly OfficialVerifactuArtifact[];

export type OfficialVerifactuSchema =
  | "registration"
  | "registration_response"
  | "query"
  | "query_response";

export const OFFICIAL_VERIFACTU_SCHEMA_ROOTS = {
  registration: "SuministroLR.xsd",
  registration_response: "RespuestaSuministro.xsd",
  query: "ConsultaLR.xsd",
  query_response: "RespuestaConsultaLR.xsd",
} as const satisfies Readonly<Record<OfficialVerifactuSchema, string>>;

export const OFFICIAL_XMLDSIG_IMPORT_URL =
  "http://www.w3.org/TR/xmldsig-core/xmldsig-core-schema.xsd";

export const OFFICIAL_VERIFACTU_FIXTURE_ROOT =
  "test/fixtures/verifactu-official-artifacts";
