# Phase 2B.3F - Ingest Route Safety Validation

Estado: IMPLEMENTACION LOCAL / PENDIENTE DE PR

Fecha: 2026-06-25

Nombre de fase: `PHASE2B3F_INGEST_ROUTE_SAFETY_VALIDATION_V1`

## Objetivo

Fase 2B.3F refuerza la seguridad de la route shell de ingest documental
integrada en Fase 2B.3E. El objetivo es validar que la superficie HTTP existe
solo como entrada controlada, sigue apagada por defecto y no activa ningun flujo
productivo, fiscal ni de sincronizacion real.

## Alcance

- Tests adicionales sobre `POST /api/server-documents/ingest`.
- Validador estatico especifico para la seguridad de la ruta.
- Script npm de validacion.
- Documentacion tecnica de evidencia interna.

No se modifica el comportamiento funcional de producto. La ruta sigue cerrada
salvo activacion explicita con `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED=true` en un
entorno controlado.

## Que se valida

- La flag privada `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED` existe.
- La flag solo activa si su valor es exactamente `"true"`.
- Valores como `"false"`, `"1"`, `"yes"`, `"TRUE"` y `" True "` no activan la
  ruta.
- No existe flag publica `NEXT_PUBLIC_SERVER_DOCUMENT_INGEST_ROUTE_ENABLED`.
- La flag no aparece en configuracion de Vercel, Next, GitHub Actions ni
  `package.json`.
- La ruta desactivada responde `404`.
- La ruta desactivada no autentica.
- La ruta desactivada no crea cliente Supabase.
- La ruta desactivada no llama al servicio de ingest.
- Metodos no permitidos devuelven respuesta segura.
- `Content-Type` invalido devuelve respuesta segura.
- JSON invalido devuelve respuesta segura.
- El usuario se deriva del Bearer token, no del body.
- El body no puede aportar autoridad mediante `user_id`, `userId`,
  `authenticatedUserId`, `plan`, `status`, `entitlement` o `entitlements`.
- La respuesta no devuelve `payload`, `documentSnapshot`, `pdfSnapshot`,
  `document_snapshot`, `pdf_snapshot`, `xml_payload` ni `response_body`.
- Los errores internos no se filtran al cliente.
- No hay `SUPABASE_SERVICE_ROLE_KEY` en codigo cliente.
- No hay referencias runtime a AEAT real, certificados, `fiscal_records` ni
  `fiscal_chain_state` desde la route shell.

## Tests anadidos o reforzados

Archivo:

- `src/app/api/server-documents/ingest/route.test.ts`

Refuerzos:

- Variantes de flag que no deben activar la ruta.
- Metodo no permitido con la ruta activa, sin tocar auth, Supabase ni ingest.
- `Content-Type` invalido, sin tocar auth, Supabase ni ingest.

Los tests existentes de 2B.3E ya cubrian:

- flag ausente;
- flag `"true"` en test controlado;
- ruta apagada sin auth/Supabase/ingest;
- POST exportado cerrado por defecto;
- JSON invalido;
- token ausente;
- autoridad del body ignorada;
- respuesta sin payload/snapshots;
- errores internos no filtrados;
- ausencia de service role en codigo cliente.

## Validador anadido

Archivo:

- `scripts/validate-phase2b3e-ingest-route-safety.mjs`

Script:

- `npm run validate:phase2b3e-ingest-route-safety`

El validador usa analisis estatico simple de archivos locales. No conecta con
Supabase, Vercel, AEAT ni ningun servicio externo. No lee variables reales de
produccion.

## Confirmaciones de seguridad

- La flag sigue apagada por defecto.
- No se anadio variable activa a Vercel.
- No hay flag `NEXT_PUBLIC_*`.
- No se toca Supabase produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No se empezo operacion fiscal transaccional.
- No se inserta en `fiscal_records`.
- No se actualiza `fiscal_chain_state`.
- No hay transporte AEAT.
- No hay UI ni formularios reales conectados a la ruta.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.
- No se modifica Stripe, precios, planes, IA ni importadores.

## Futuro 2B.3G

Una fase posterior podria preparar activacion controlada en staging, pero debe
tratarse como trabajo separado. Como minimo deberia incluir:

- entorno staging no productivo;
- variables privadas configuradas fuera de produccion;
- rate limiting;
- auditoria de intentos;
- logs seguros sin payloads ni snapshots;
- pruebas dinamicas con Supabase local/staging;
- autorizacion fina por plan o entitlement de sincronizacion documental;
- estrategia de apagado rapido;
- revision antes de cualquier UI o integracion con formularios reales.

## Criterio de aceptacion

- `git diff --check` OK.
- `npm run check:migrations` OK.
- `npm run validate:phase2b2-server-schema` OK.
- `npm run validate:phase2b3e-ingest-route-safety` OK.
- Tests de ruta OK.
- `npm test` OK.
- `npm run lint` OK.
- `npx tsc --noEmit` OK.
- `npm run build` OK.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria, ni homologacion AEAT.
