# Phase 2B.3E - Server Document Ingest Route Shell

Estado: IMPLEMENTACION LOCAL / PENDIENTE DE PR

Fecha: 2026-06-24

## Objetivo

Fase 2B.3E prepara una ruta HTTP de servidor para el ingest documental canonico,
pero la deja desactivada por defecto. La ruta sirve como envoltorio controlado
para el wiring de 2B.3D sin activar sincronizacion productiva ni transporte
fiscal.

## Alcance implementado

- Nueva ruta server-only `POST /api/server-documents/ingest`.
- Flag privado de servidor `SERVER_DOCUMENT_INGEST_ROUTE_ENABLED`.
- Valor por defecto cerrado: si el flag no es exactamente `true`, la ruta
  responde `404` y no autentica, no inicializa Supabase y no llama al ingest.
- Validacion de metodo, `Content-Type` JSON y body JSON antes de tocar datos.
- Autenticacion derivada exclusivamente del Bearer token del servidor.
- Limpieza de campos de autoridad enviados por cliente: `user_id`, `userId`,
  `authenticatedUserId`, `plan`, `status`, `entitlement` y `entitlements`.
- Reutilizacion del wiring seguro `handleServerDocumentIngestForServer`.
- Respuestas sanitizadas sin `payload`, `documentSnapshot`, `pdfSnapshot`,
  `xml_payload`, `response_body` ni detalles internos.
- Tests de ruta, flag, errores seguros, aislamiento cuando esta desactivada y
  ausencia de variables service role en codigo cliente.

## Fuera de alcance

- No se activa el flag en Vercel ni produccion.
- No se crean migraciones.
- No se toca Supabase produccion.
- No se implementa transporte AEAT.
- No se usan certificados reales.
- No se registra VeriFactu funcional.
- No se modifica UI.
- No se modifica Stripe, precios, planes, IA ni importadores.
- No se tocan facturas reales, numeracion real ni PDFs historicos.

## Seguridad esperada

La ruta debe permanecer cerrada salvo habilitacion explicita en local o staging.
Mientras esta cerrada, el flujo no debe leer credenciales, no debe construir
cliente Supabase admin y no debe ejecutar ninguna escritura.

Cuando se habilite para pruebas controladas, el servidor debe:

1. validar el Bearer token;
2. derivar `authenticatedUserId` del token;
3. ignorar cualquier autoridad enviada por el body;
4. usar el cliente Supabase admin solo en servidor;
5. devolver un resultado seguro y minimo.

## Riesgos diferidos

- Autorizacion fina por plan o entitlement de sincronizacion documental.
- Rate limiting y auditoria de intentos.
- Observabilidad de conflictos y rechazos.
- Pruebas dinamicas contra Supabase local con la ruta habilitada.
- Activacion de staging con variables reales de entorno no productivas.
- Endpoints adicionales para lectura selectiva de documentos canonicos.
- Operacion fiscal transaccional y VeriFactu servidor real.

## Criterio de aceptacion

- `git diff --check` OK.
- `npm run check:migrations` OK.
- `npm run validate:phase2b2-server-schema` OK.
- Tests de ruta OK.
- Suite completa OK.
- Lint OK.
- Typecheck OK.
- Build OK.
- Phase 1 acceptance OK con Supabase local.
- PR con Quality y Supabase Acceptance en verde.

Este documento no constituye certificacion legal ni fiscal. Es evidencia tecnica
interna y debera revisarse externamente cuando aplique.
