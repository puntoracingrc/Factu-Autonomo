# Phase 2B.3I - Ingest Route Operational Hardening

Estado: IMPLEMENTACION LOCAL / PENDIENTE DE PR

Fecha: 2026-06-25

Nombre de fase: `PHASE2B3I_INGEST_ROUTE_OPERATIONAL_HARDENING_V1`

## Objetivo

Anadir hardening operativo minimo a la route shell de ingest documental antes
de cualquier activacion en staging real. Esta fase sigue limitada a servidor,
tests y documentacion. No conecta UI, no habilita produccion y no inicia
VeriFactu funcional.

## Alcance

- Rate limiting minimo server-only, en memoria y reutilizable.
- Auditoria tecnica segura en memoria, sin migraciones.
- Request ID / correlacion segura mediante cabecera `x-request-id`.
- Concurrencia local validada contra Supabase local.
- Update canonico endurecido con compare-and-set por version esperada.
- Validador estatico:
  `npm run validate:phase2b3i-ingest-operational-hardening`.

## Rate limiting

Implementado como helper server-only:

```text
src/lib/server-documents/operational-hardening.ts
```

Caracteristicas:

- opera en memoria;
- limita por clave derivada de usuario autenticado e IP segura si existe;
- no almacena payloads;
- no almacena snapshots;
- no almacena tokens;
- puede sustituirse por otro limiter inyectando dependencia en tests o futuro
  staging;
- devuelve rechazo seguro `rate_limited` con HTTP 429.

Limitacion viva:

- no es una solucion productiva final para entorno serverless distribuido;
- antes de staging real debe revisarse si basta para ese entorno o si hace falta
  almacenamiento compartido no sensible.

## Auditoria tecnica segura

Implementada como recorder server-only en memoria, sin tabla nueva.

Campos permitidos:

- `timestamp`;
- `requestId`;
- `route`;
- `userId` si existe usuario autenticado;
- `action`;
- `status`;
- `reason`.

Campos expresamente excluidos:

- payload;
- `documentSnapshot`;
- `pdfSnapshot`;
- XML;
- token;
- service role;
- errores internos crudos;
- datos fiscales completos.

La auditoria cubre:

- accepted;
- rejected;
- conflict;
- unauthorized;
- rate_limited.

Limitacion viva:

- la auditoria es tecnica y volatil en memoria. Persistencia segura queda para
  una fase posterior con diseno explicito y, si procede, migracion aprobada.

## Request ID

Implementado soporte de correlacion:

- acepta `x-request-id` si cumple formato seguro;
- genera request ID si falta o si el valor es invalido;
- devuelve `x-request-id` en cabecera;
- lo incluye en auditoria tecnica segura;
- no se usa para permisos;
- no acepta valores enormes, espacios ni caracteres peligrosos.

## Concurrencia local

La aceptacion local opt-in se amplio para simular dos updates concurrentes con
el mismo `expectedVersion` contra Supabase local.

Resultado esperado:

- solo un update queda aceptado;
- el otro queda como conflicto seguro `version_mismatch`;
- se conserva una sola version nueva;
- se registra un conflicto en `document_conflicts`;
- no se crean registros fiscales.

Para sostener esto, el adapter Supabase de documentos canonicos actualiza con
filtro por:

- `id`;
- `user_id`;
- `version` esperada.

Si la fila ya cambio por una carrera concurrente, el resultado se convierte en
conflicto seguro.

## Comandos ejecutados

```bash
npm test -- src/app/api/server-documents/ingest/route.test.ts src/lib/server-documents/supabase-store.test.ts src/lib/server-documents/repository.test.ts src/lib/server-documents/ingest.test.ts
npm run validate:phase2b3i-ingest-operational-hardening
npm run test:phase2b3h-ingest-local
git diff --check
npm run check:migrations
npm run validate:phase2b2-server-schema
npm run validate:phase2b3e-ingest-route-safety
npm run validate:phase2b3g-controlled-ingest-route
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Resultados de validacion

- `npm test -- src/app/api/server-documents/ingest/route.test.ts src/lib/server-documents/supabase-store.test.ts src/lib/server-documents/repository.test.ts src/lib/server-documents/ingest.test.ts`:
  OK, 4 archivos, 72 tests.
- `npm run test:phase2b3h-ingest-local`: OK, 1 archivo, 2 tests.
- `git diff --check`: OK.
- `npm run check:migrations`: OK, 4 migraciones y 3 rollbacks.
- `npm run validate:phase2b2-server-schema`: OK.
- `npm run validate:phase2b3e-ingest-route-safety`: OK.
- `npm run validate:phase2b3g-controlled-ingest-route`: OK.
- `npm run validate:phase2b3i-ingest-operational-hardening`: OK.
- `npm test`: OK, 92 archivos pasados, 1 archivo opt-in saltado; 501 tests
  pasados, 2 tests opt-in saltados.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK, Next.js 15.5.19, 59 paginas estaticas.

## Limites

- No hay UI.
- No hay formularios reales conectados.
- No hay staging remoto.
- No hay Supabase produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No hay operacion fiscal transaccional.
- No hay transporte AEAT.
- No se insertan `fiscal_records`.
- No se actualiza `fiscal_chain_state`.
- No se crean `fiscal_transport_attempts`.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.
- No se modifica Stripe, precios, planes, IA ni importadores.

## Riesgos vivos

- Rate limiting en memoria no es garantia suficiente para produccion distribuida.
- Auditoria en memoria no sirve como trazabilidad persistente.
- Staging real requiere entorno no productivo claro y autorizacion explicita.
- Falta auditoria persistente sin payloads ni snapshots.
- Falta criterio de activacion para UI futura.

## Queda para 2B.3J

- Decidir rate limiting apto para staging real.
- Disenar auditoria persistente segura si procede.
- Preparar request correlation para logs estructurados server-only.
- Revalidar concurrencia contra staging no productivo si se autoriza.
- Revisar autorizacion fina por plan/entitlement antes de UI.

## Confirmaciones

- No se activo produccion.
- No se anadio variable a Vercel.
- No hay flag `NEXT_PUBLIC_*`.
- No se toco Supabase produccion.
- No se inspecciono Supabase produccion.
- No se aplicaron migraciones a produccion.
- No se uso staging remoto.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No se inicio operacion fiscal transaccional.
- No hay transporte AEAT.
- No se devuelven payloads ni snapshots en respuestas.
- No se registran payloads ni snapshots en auditoria.
- No hay service role en cliente.
- No se modifico Vercel config.
- No hubo promote.
- No hubo cambios de dominios, DNS ni aliases.
- No se modifico Stripe, precios, planes, IA ni importadores.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria, ni homologacion AEAT.
