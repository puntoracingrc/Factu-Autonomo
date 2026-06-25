# Checkpoint de cierre documental de frontera externa VeriFactu 2B.5

Fase:

`PHASE2B5_EXTERNAL_BOUNDARY_DOCUMENTATION_CHECKPOINT_V1`

Estado:

`PHASE2B5_EXTERNAL_VERIFACTU_BOUNDARY: DOCUMENTATION CLOSED`

Limites:

`NO CODE IMPLEMENTATION`

`NO XML FINAL`

`NO QR FINAL`

`NO SIGNATURE`

`NO CERTIFICATES`

`NO TRANSPORT`

`NO AEAT REAL`

`NO PRODUCTION`

## Objetivo

Este checkpoint cierra 2B.5 como bloque documental de frontera externa. Resume
las decisiones, planes y limites necesarios antes de cualquier codigo ejecutable
relacionado con XML, QR, canonicalizacion, firma, certificados, transporte,
respuestas, staging o revision externa.

No implementa nada. No desbloquea produccion. No sustituye revision legal,
fiscal, tecnica ni de seguridad.

## Resumen de subfases 2B.5

| Subfase | Documento | Resumen | Resultado |
| ------- | --------- | ------- | --------- |
| 2B.5A | `docs/phase2b5a-official-xml-qr-research-v1.md` | Investigacion oficial sobre XML, QR, huella/hash, firma, certificados, transporte y respuestas. | Fuentes identificadas como base documental, sin implementar. |
| 2B.5B | `docs/phase2b5b-internal-xml-contract-v1.md` | Contrato interno futuro para XML de alta/anulacion. | Entradas candidatas y pendientes separados de XML final. |
| 2B.5C | `docs/phase2b5c-xml-fixtures-validation-plan-v1.md` | Plan de fixtures sinteticos y validaciones futuras. | Casos definidos sin crear fixtures ejecutables. |
| 2B.5D | `docs/phase2b5d-xml-source-schema-canonicalization-v1.md` | Politica de fuentes, esquema y canonicalizacion. | Bloqueo hasta fijar versiones, reglas y anonimizacion. |
| 2B.5E | `docs/phase2b5e-official-artifacts-registry-v1.md` | Registro de artefactos oficiales. | Artefactos y bloqueos documentados antes de codigo. |
| 2B.5F | `docs/phase2b5f-certificate-signature-policy-v1.md` | Politica documental de certificados y firma. | Firma y certificados bloqueados hasta aprobacion futura. |
| 2B.5G | `docs/phase2b5g-transport-responses-retry-boundary-v1.md` | Frontera de transporte, respuestas y reintentos. | Transporte y `fiscal_transport_attempts` bloqueados como cola. |
| 2B.5H | `docs/phase2b5h-safe-executable-implementation-plan-v1.md` | Plan de entrada a codigo seguro. | Recomienda empezar por guardrails sinteticos. |
| 2B.5I | `docs/phase2b5i-synthetic-fixtures-execution-plan-v1.md` | Plan de fixtures ejecutables futuros. | Define artefactos permitidos/prohibidos y oleadas. |
| 2B.5J | `docs/phase2b5j-canonicalization-hash-execution-plan-v1.md` | Plan de canonicalizacion y hash candidato. | Separa `record_hash` de huella candidata/oficial. |
| 2B.5K | `docs/phase2b5k-qr-presentation-boundary-plan-v1.md` | Frontera QR y presentacion. | Bloquea QR/frase productiva y cambios PDF/UI. |
| 2B.5L | `docs/phase2b5l-external-review-staging-readiness-v1.md` | Revision externa y staging autorizado. | Define criterios antes de pasar a entorno autorizado. |

## Cierre documental

2B.5 queda cerrado documentalmente con estos limites:

- no codigo funcional;
- no migraciones;
- no XML AEAT definitivo;
- no archivos XML completos;
- no fixtures ejecutables;
- no QR definitivo;
- no firma;
- no certificados;
- no transporte;
- no AEAT real;
- no produccion;
- no `fiscal_transport_attempts` como transporte o cola;
- no UI fiscal real;
- no datos reales;
- no secretos impresos.

## Siguiente bloque recomendado

La siguiente fase recomendada es:

`PHASE2B6A_SYNTHETIC_FIXTURE_GUARDRAILS_V1`

Debe ser la primera fase de codigo seguro y debe limitarse a guardrails de
fixtures sinteticos, sin crear XML completo, sin tocar Supabase, sin AEAT, sin
certificados, sin transporte, sin UI y sin ViDA.

## Resultado esperado

Este checkpoint permite cerrar la fase documental 2B.5 y preparar una futura
fase 2B.6A bajo aprobacion explicita. No convierte el producto en VeriFactu
productivo ni declara cumplimiento externo.
