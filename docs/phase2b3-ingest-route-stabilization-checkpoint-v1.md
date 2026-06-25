# Phase 2B.3 - Ingest Route Stabilization Checkpoint

Estado: CHECKPOINT DOCUMENTAL / FASE 2B.3 INTEGRADA

Fecha: 2026-06-25

Nombre de fase: `PHASE2B3_INGEST_ROUTE_STABILIZATION_CHECKPOINT_V1`

## Veredicto

`APTO PARA PLANIFICAR 2B.4, NO APTO PARA PRODUCCION`.

Fase 2B.4 no debe empezar sin instruccion expresa. Este checkpoint solo cierra
la estabilizacion tecnica local de la ruta de ingest documental.

## Estado integrado

Los PRs de Fase 2B.3A a 2B.3I estan fusionados en `main`.

Ultimo hito integrado:

- PR #25: `test(server): add ingest route operational hardening`.
- Merge commit: `57da209c16ca7f541f1205a453350b8af200d210`.
- Head funcional integrado: `3014a7e0a6ab779d40c053f49fc54c3c994c6bc4`.

Checks de `main` tras PR #25:

- Quality: SUCCESS.
- Supabase Acceptance: SUCCESS.

Deployment automatico Vercel, solo informativo:

- GitHub deployment ID: `5190960916`.
- Estado: `success`.
- URL tecnica: `https://factu-autonomo-pzzx4qksp-persianas-almar-web-s-projects.vercel.app`.

No se hizo promote. No se cambiaron dominios, DNS ni aliases.

## Que queda implementado

- Repositorio server-only para documentos canonicos.
- Adapter Supabase server-only para:
  - `server_documents`;
  - `server_document_versions`;
  - `document_conflicts`.
- Service interno de ingest documental para:
  - `createDraft`;
  - `updateDraft`;
  - rechazo seguro de mutaciones no permitidas.
- Wiring interno entre auth server-only, repositorio y adapter Supabase.
- Route shell `POST /api/server-documents/ingest`.
- Route shell apagada por defecto.
- Hardening de flag privada:
  - solo `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED=true` activa la ruta;
  - valores como `1`, `yes`, `TRUE` o `True` no la activan;
  - no existe flag publica `NEXT_PUBLIC_*`.
- Validacion controlada local/test con la flag activa solo en proceso de test.
- Prueba dinamica con Supabase local:
  - usuario efimero local;
  - Bearer token real local;
  - `createDraft`;
  - `updateDraft`;
  - conflicto por `expectedVersion` antiguo;
  - verificacion de tablas locales.
- Rate limiting minimo en memoria, server-only y testeable.
- Auditoria tecnica segura en memoria, server-only y sin datos sensibles.
- Request ID / correlacion segura mediante `x-request-id`.
- Concurrencia local con `expectedVersion`:
  - dos updates simultaneos;
  - uno aceptado;
  - otro rechazado como conflicto seguro;
  - sin registros fiscales.
- Validador de hardening operativo:
  `npm run validate:phase2b3i-ingest-operational-hardening`.

## Que NO esta implementado

- No hay UI.
- No hay formularios reales conectados.
- No hay Supabase produccion.
- No hay staging remoto real.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No hay operacion fiscal transaccional.
- No hay transporte AEAT.
- No hay `fiscal_records` funcional.
- No hay `fiscal_chain_state` funcional.
- No hay `fiscal_transport_attempts` funcional.
- No se tocan Stripe, precios ni planes.
- No se toca IA.
- No se tocan importadores.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.

## Riesgos vivos

- Rate limiting en memoria no vale como solucion productiva distribuida.
- Auditoria en memoria no es trazabilidad persistente.
- Falta staging no productivo real.
- Falta autorizacion por plan/entitlement para activacion futura.
- Falta decision de activacion UI.
- Falta auditoria persistente si se requiere.
- Falta operacion fiscal transaccional.
- Falta transporte AEAT.
- Faltan certificados.
- Falta revision compliance antes de produccion.
- Falta validacion externa legal/fiscal cuando aplique.

## Recomendacion siguiente

Opciones para decidir antes de continuar:

### Opcion A - 2B.4 planificacion de operacion fiscal transaccional local

Preparar diseno detallado de la operacion fiscal transaccional sin produccion,
sin AEAT real y sin certificados reales. Esta opcion deberia centrarse en
idempotencia, bloqueo de cadena, estados y atomicidad local/staging.

### Opcion B - Staging no productivo real del ingest documental

Preparar un entorno staging claramente no productivo para probar la ruta de
ingest documental con credenciales separadas, rate limiting adecuado y
auditoria no sensible. Requiere autorizacion explicita.

### Opcion C - Pausa tecnica y cierre de dossier 2B.3

Actualizar dossier vivo de evidencias con Fase 2B.3 completa antes de abrir
nueva implementacion.

## Validaciones del checkpoint

Ejecutadas para este documento:

- `git diff --check`: OK.
- `npm run check:migrations`: OK.
- `npm run validate:phase2b2-server-schema`: OK.
- `npm run validate:phase2b3e-ingest-route-safety`: OK.
- `npm run validate:phase2b3g-controlled-ingest-route`: OK.
- `npm run validate:phase2b3i-ingest-operational-hardening`: OK.

No se ejecuto suite completa porque este checkpoint solo modifica
documentacion.

## Confirmaciones

- No se empezo 2B.4.
- No se activo produccion.
- No se anadio variable a Vercel.
- No hay flag `NEXT_PUBLIC_*`.
- No se toco Supabase produccion.
- No se inspecciono Supabase produccion.
- No se aplicaron migraciones a produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No se inicio operacion fiscal transaccional.
- No hay transporte AEAT.
- No se devuelven payloads ni snapshots en respuestas.
- No se registran payloads ni snapshots en logs o auditoria.
- No hay service role en cliente.
- No se modifico Vercel config.
- No hubo promote.
- No hubo cambios de dominios, DNS ni aliases.
- No se modifico Stripe, precios ni planes.
- No se modifico IA.
- No se modificaron importadores.
- No se tocaron facturas reales.
- No se toco numeracion real.
- No se tocaron PDFs historicos.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria, ni homologacion AEAT.
