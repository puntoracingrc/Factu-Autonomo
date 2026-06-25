# Phase 2B.3H - Supabase Local Ingest Route Acceptance

Estado: IMPLEMENTACION LOCAL / PENDIENTE DE PR

Fecha: 2026-06-25

Nombre de fase: `PHASE2B3H_SUPABASE_LOCAL_INGEST_ROUTE_ACCEPTANCE_V1`

## Objetivo

Validar dinamicamente la route shell de ingest documental contra Supabase local,
con `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED=true` solo dentro del proceso local de
aceptacion. La fase no habilita produccion, no conecta UI y no inicia VeriFactu
funcional.

## Alcance

- Arranque de Supabase local mediante Supabase CLI.
- Aplicacion local de migraciones, incluida la migracion 2B.2.
- Script de aceptacion:
  `npm run test:phase2b3h-ingest-local`.
- Test opt-in:
  `src/app/api/server-documents/ingest/route.local-acceptance.test.ts`.
- Uso del handler real `handleServerDocumentIngestRoute`.
- Auth real local con usuario efimero de Supabase Auth local.
- Cliente service role local para verificar datos y limpiar el usuario de prueba.

## Entorno local

Supabase local estuvo disponible.

Comando de arranque usado:

```bash
supabase start
```

Supabase CLI aplico las migraciones locales, incluida:

```text
supabase/migrations/20260624220000_phase2b_server_schema_local_staging.sql
```

El script de aceptacion rechaza entornos no locales comprobando que `API_URL` y
`DB_URL` apunten a `localhost`, `127.0.0.1` o `::1`.

## Tablas validadas

Antes de ejecutar la prueba, el script confirma que existen en Supabase local:

- `public.server_documents`;
- `public.server_document_versions`;
- `public.document_conflicts`.

La prueba dinamica escribe solo datos efimeros del usuario local creado para el
test en:

- `server_documents`;
- `server_document_versions`;
- `document_conflicts`.

La prueba confirma que no se crean filas del usuario local en:

- `fiscal_records`;
- `fiscal_chain_state`;
- `fiscal_transport_attempts`.

## Flujo probado

Con la flag activa solo en el proceso local:

1. Crea un usuario efimero en Supabase Auth local.
2. Inicia sesion contra Supabase local para obtener Bearer token real local.
3. Ejecuta `createDraft` contra el handler real.
4. Verifica que se crea `server_documents`.
5. Verifica que se crea version `create` en `server_document_versions`.
6. Ejecuta `updateDraft` con `expectedVersion` correcto.
7. Verifica version `update` en `server_document_versions`.
8. Ejecuta `updateDraft` con `expectedVersion` antiguo.
9. Verifica rechazo seguro con conflicto `version_mismatch`.
10. Verifica fila en `document_conflicts`.
11. Verifica que la respuesta no contiene payloads, snapshots, XML ni errores
    internos crudos.
12. Limpia documentos, versiones, conflictos y usuario local de prueba.

## Seguridad comprobada

- El usuario operativo se deriva del Bearer token local.
- El body no puede aportar autoridad mediante `user_id`, `userId`,
  `authenticatedUserId`, `plan`, `role`, `status` ni `entitlement`.
- La respuesta no contiene `payload`.
- La respuesta no contiene `documentSnapshot`.
- La respuesta no contiene `pdfSnapshot`.
- La respuesta no contiene `document_snapshot`.
- La respuesta no contiene `pdf_snapshot`.
- La respuesta no contiene `xml_payload`.
- La respuesta no contiene `response_body`.
- No se imprime service role.
- No se imprimen payloads ni snapshots en el script.

## Comandos ejecutados

```bash
supabase start
npm run test:phase2b3h-ingest-local
git diff --check
npm run check:migrations
npm run validate:phase2b2-server-schema
npm run validate:phase2b3e-ingest-route-safety
npm run validate:phase2b3g-controlled-ingest-route
npm test -- src/app/api/server-documents/ingest/route.local-acceptance.test.ts
npm test
npm run lint
npx tsc --noEmit
npm run build
```

## Resultados de validacion

- `supabase start`: OK; Supabase local disponible y migraciones aplicadas.
- `npm run test:phase2b3h-ingest-local`: OK, 1 archivo, 1 test.
- `git diff --check`: OK.
- `npm run check:migrations`: OK, 4 migraciones y 3 rollbacks.
- `npm run validate:phase2b2-server-schema`: OK.
- `npm run validate:phase2b3e-ingest-route-safety`: OK.
- `npm run validate:phase2b3g-controlled-ingest-route`: OK.
- `npm test -- src/app/api/server-documents/ingest/route.local-acceptance.test.ts`:
  OK como test opt-in; se salta si no lo activa el script local.
- `npm test`: OK, 92 archivos pasados, 1 archivo opt-in saltado; 497 tests
  pasados, 1 test opt-in saltado.
- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK, Next.js 15.5.19, 59 paginas estaticas.

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
- No se insertan `fiscal_records`.
- No se actualiza `fiscal_chain_state`.
- No se crean `fiscal_transport_attempts`.
- No se conecto UI.
- No se conectaron formularios reales.
- No se tocaron facturas reales.
- No se toco numeracion real.
- No se tocaron PDFs historicos.
- No se modifico Vercel config.
- No hubo promote.
- No hubo cambios de dominios, DNS ni aliases.
- No se modifico Stripe, precios, planes, IA ni importadores.

## Riesgos vivos

- La ruta sigue sin rate limiting reutilizable.
- La ruta sigue sin auditoria persistente de intentos.
- La activacion en staging real requiere entorno no productivo claro,
  credenciales separadas y autorizacion explicita.
- No hay UI ni flujo de usuario conectado.
- No hay operacion fiscal transaccional ni registros VeriFactu.

## Queda para 2B.3I

- Rate limiting minimo reutilizable antes de activar staging real.
- Auditoria tecnica sin payloads ni snapshots.
- Request ID o correlacion segura.
- Criterio de activacion para staging no productivo.
- Validacion de concurrencia local del endpoint.
- Revision especifica antes de conectar cualquier UI.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria, ni homologacion AEAT.
