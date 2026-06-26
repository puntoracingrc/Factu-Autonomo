# 2B.7F - Official artifact offline fixture policy v1

Marker: `PHASE2B7F_OFFICIAL_ARTIFACT_OFFLINE_FIXTURE_POLICY_V1`
Date: 2026-06-26
Status: `BLOCKED_XSD_NOT_COMMITTED`

## Decision

The official XSD files are identified, but they are not committed as offline
fixtures in this phase.

This is deliberate. The official schema listing is public, but the XSD links
are marked by the AEAT developers page as `Con certificado`, and local download
attempts without a client certificate did not complete. The project must not use
real certificates, client certificates, AEAT operational services, endpoint
calls, or reconstructed schema text.

Therefore, the offline fixture gate remains blocked.

## Official sources reviewed

Schema index:

- `https://www.agenciatributaria.es/AEAT.desarrolladores/Desarrolladores/_menu_/Documentacion/Sistemas_Informaticos_de_Facturacion_y_Sistemas_VERI_FACTU/Esquemas_de_los_servicios_web/Esquemas_de_los_servicios_web.html`

Identified XSD links:

- `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd`
- `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd`

Related official references already registered by 2B.7A-E:

- `https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DsRegistroVeriFactu.xlsx`
- `https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf`
- `https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf`
- `https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf`

## Artifact registry

| Artifact | Version | URL | SHA-256 | Content type | Fixture path |
| --- | --- | --- | --- | --- | --- |
| `AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0` | `tikeV1.0` | `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd` | `cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36` | `not-provided-by-server` in the existing manifest; not reverified as a fixture in this phase | none |
| `AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0` | `tikeV1.0` | `https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd` | `ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1` | `not-provided-by-server` in the existing manifest; not reverified as a fixture in this phase | none |

No PDF or XLSX official artifact is committed.

## Import/include verification

Raw `xs:import` / `xs:include` verification was not completed in this phase
because the XSD files were not downloaded into the repository. The public AEAT
schema index identifies `SuministroInformacion.xsd` as the common type
definition, but this is not enough to claim a complete offline dependency graph.

This missing import/include verification is part of the blocker.

## Local evidence

Local, no-certificate attempts were limited to static official XSD URLs:

- `prewww2.aeat.es` returned a connection timeout from the local environment.
- `www2.agenciatributaria.gob.es` returned a connection timeout from the local environment.

No AEAT operational endpoint was called. No SOAP request was sent. No client
certificate was used. No XSD content was reconstructed from extracted text.

## Fixture policy

XSD fixtures may be committed in a later phase only if all conditions are true:

- the XSD files are obtained from an official static source without real
  certificates or operational service calls;
- SHA-256 checksums are recorded;
- the import/include graph is verified;
- fixture usage is limited to tests/offline validation;
- PDFs and XLSX files remain out of the repo unless separately approved;
- tests do not download artifacts at runtime.

Until then:

- no `test/fixtures/verifactu-official-artifacts/xsd/*.xsd` fixture is tracked;
- no official XML validation can be claimed;
- 2B.7I and 2B.7J must remain blocked.
