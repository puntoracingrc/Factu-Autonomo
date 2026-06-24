# Phase 2B.3G - Controlled Ingest Route Local/Staging Validation

Estado: IMPLEMENTACION LOCAL / PENDIENTE DE PR

Fecha: 2026-06-25

Nombre de fase: `PHASE2B3G_CONTROLLED_INGEST_ROUTE_LOCAL_STAGING_V1`

## Objetivo

Fase 2B.3G valida la route shell de ingest documental con la flag activada solo
en entorno de test. El objetivo es comprobar el camino activo sin abrir
produccion, sin conectar UI, sin tocar facturas reales y sin iniciar VeriFactu
funcional.

## Alcance

- Tests dinamicos de la ruta con `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED=true`
  solo dentro de Vitest.
- Bearer token simulado mediante dependencia inyectada.
- Cliente Supabase simulado mediante fake.
- Servicio de ingest simulado para los casos de aceptacion y error.
- Uso del wiring real en el caso de `updateDraft` sin `expectedVersion`, para
  validar error seguro antes de cualquier operacion de store.
- Validador estatico adicional:
  `npm run validate:phase2b3g-controlled-ingest-route`.
- Documentacion tecnica de riesgos vivos.

## Que se probo con flag activa

- `createDraft` valido devuelve respuesta segura.
- `updateDraft` valido devuelve respuesta segura.
- `updateDraft` sin `expectedVersion` devuelve error seguro.
- Errores internos de ingest no se filtran al cliente.
- El usuario operativo se deriva del Bearer token simulado.
- El body no puede aportar autoridad mediante `user_id`, `userId`,
  `authenticatedUserId`, `plan`, `role`, `status` o `entitlement`.
- La respuesta no contiene `payload`.
- La respuesta no contiene `documentSnapshot`.
- La respuesta no contiene `pdfSnapshot`.
- La respuesta no contiene XML ni respuestas crudas.

## Supabase local/staging

En esta fase no se ejecuto una prueba dinamica contra Supabase local ni staging.
Se uso una combinacion de mocks/fakes e ingest real para cubrir el flujo activo
sin arrancar servicios externos ni gestionar tokens reales.

Supabase local/staging queda pendiente para 2B.3H con un harness dedicado y no
productivo. Ese harness debera crear usuarios efimeros, aplicar migraciones
locales, activar la flag solo en proceso local, ejecutar `createDraft` y
`updateDraft` contra tablas `server_documents`, y limpiar datos al finalizar.

No se debe usar Supabase produccion ni staging remoto sin configuracion no
productiva clara y autorizacion explicita.

## Rate limiting

No se encontro un patron de rate limiting existente en el repositorio para
reutilizar sin inventar infraestructura nueva.

Decision de 2B.3G:

- no implementar rate limiting ad hoc;
- dejarlo como requisito previo para activar staging real;
- documentar que la ruta no debe habilitarse fuera de tests/local controlado
  sin proteccion de abuso.

Trabajo pendiente para 2B.3H:

- definir limite por usuario/IP/ventana temporal;
- definir respuesta segura para exceso de intentos;
- anadir tests de abuso sin payloads ni snapshots;
- evitar almacenamiento de datos sensibles en contadores.

## Auditoria

No existe todavia un audit log tecnico reutilizable para este endpoint sin crear
migraciones nuevas.

Decision de 2B.3G:

- no crear tablas nuevas;
- no registrar payloads;
- no registrar snapshots;
- no registrar XML;
- no registrar tokens;
- documentar la auditoria minima requerida para 2B.3H.

Auditoria pendiente:

- timestamp;
- resultado;
- reason;
- userId derivado del servidor;
- requestId si existe;
- nunca payload, snapshots, XML, tokens ni errores internos crudos.

## Logs seguros

La route shell no incorpora `console.*` ni logs runtime. El validador 2B.3G
comprueba que la ruta, handler, flag, serializer y wiring no introduzcan logging
directo.

Cualquier logging futuro debe ser estructurado, server-only y sin:

- payloads;
- snapshots;
- XML;
- tokens;
- errores internos crudos;
- datos fiscales completos.

## Limites

- No hay UI.
- No hay formularios reales conectados.
- No hay Supabase produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No hay operacion fiscal transaccional.
- No hay transporte AEAT.
- No se insertan `fiscal_records`.
- No se actualiza `fiscal_chain_state`.
- No se tocan facturas reales.
- No se toca numeracion real.
- No se tocan PDFs historicos.
- No se modifica Stripe, precios, planes, IA ni importadores.

## Riesgos vivos

- Activar la flag sin rate limiting podria abrir una superficie de abuso.
- Activar la flag sin auditoria segura dificultaria trazabilidad.
- Activar contra staging remoto requiere separar claramente secretos no
  productivos de produccion.
- El endpoint sigue sin autorizacion fina por plan o entitlement documental.
- La prueba con base de datos real local/staging queda pendiente.

## Queda para 2B.3H

- Harness dinamico contra Supabase local.
- Rate limiting minimo reutilizable.
- Auditoria tecnica sin datos sensibles.
- Request ID o correlacion segura.
- Activacion local controlada de extremo a extremo.
- Criterios para staging no productivo.
- Revision especifica antes de cualquier UI.

## Confirmaciones

- No se activo produccion.
- No se anadio variable a Vercel.
- No hay flag `NEXT_PUBLIC_*`.
- No se toco Supabase produccion.
- No hay AEAT real.
- No hay certificados reales.
- No hay VeriFactu funcional.
- No se inicio operacion fiscal transaccional.
- No hay transporte AEAT.
- No se devuelven payloads ni snapshots.
- No hay service role en cliente.
- No se modifico Vercel config.
- No hubo promote.
- No hubo cambios de dominios, DNS ni aliases.

Este documento es evidencia tecnica interna. No constituye certificacion legal,
fiscal ni tributaria, ni homologacion AEAT.
