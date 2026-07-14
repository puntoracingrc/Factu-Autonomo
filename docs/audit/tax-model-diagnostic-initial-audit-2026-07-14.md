# Auditoría inicial — diagnóstico de modelos tributarios

Fecha: 2026-07-14. Base auditada: `origin/main@4dc421f`.

## Repositorio y Git

- `/Users/macbookpro14/Documents/New project 2` es un contenedor de worktrees,
  no un repositorio.
- Repositorio canónico: `/Users/macbookpro14/Projects/factura-autonomo`.
- Remoto: `https://github.com/puntoracingrc/Factu-Autonomo.git`.
- Rama base remota: `main`, SHA `4dc421f57c714bf57382de9b75f7ae7455966ccd`.
- Worktree propio: `factura-autonomo-tax-model-diagnostic`, rama
  `feat/tax-model-diagnostic`, limpio al reservarlo y sin PR ni rama remota.
- El checkout canónico local de `main` no es una base segura: está un commit por
  delante y 427 por detrás, además de contener cambios y artefactos no
  confirmados.
- Se inventariaron 192 ramas locales, 131 remotas y 139 worktrees, seis de ellos
  podables. Varios worktrees conservan cambios locales; no se tocarán.

Últimos commits de `origin/main`:

1. `4dc421f` — Ordenar cronológicamente el listado de facturas (#486).
2. `e122ed1` — Recuperar documentos emitidos pre-canónicos (#485).
3. `5adf017` — Añadir fuentes oficiales ROI a Notificaciones (#484).
4. `572e1a3` — Reconocer embargo inmobiliario, requerimientos y acuerdos ROI (#483).
5. `b146e06` — Publicar fichas AEAT 521–553, lote 15 (#482).

GitHub mostraba seis PR abiertos (#380, #83, #51, #31, #28 y #15), ninguno
relacionado con este diagnóstico, y cero issues abiertos.

## Arquitectura y convenciones

- Next.js 15 App Router, React 19, TypeScript estricto, Tailwind 4 y Lucide.
- Navegación declarativa en `src/components/layout/app-navigation.ts` y menú
  interno de Asesoría fiscal en
  `src/components/consultor-fiscal/AdvisorAreaNavigation.tsx`.
- Estado principal en `AppStore`; almacenamiento local primario y sincronización
  opcional a Supabase.
- Supabase guarda entidades por propietario en `sync_entities`, con `payload`
  JSONB y RLS. Ampliar el perfil estructurado no requiere por sí solo una tabla.
- No existe Supabase Storage configurado ni buckets públicos. Persistir
  documentos requeriría un diseño nuevo con bucket privado, RLS, metadatos,
  URLs firmadas, TTL y borrado. El MVP mantendrá archivos y texto efímeros.
- Autenticación Supabase Bearer en APIs sensibles. El flujo local/manual puede
  seguir disponible sin cuenta.
- No hay analítica de producto. Los errores y métricas existentes usan datos
  saneados; no se incorporarán respuestas, NIF ni texto documental a telemetría.
- ADR-0001 y ADR-0002 obligan a conservar procedencia, confirmación y
  comportamiento fail-closed; no se fabricará evidencia moderna ni vigencia.

## Funcionalidades que se solapan

- `BusinessProfile.fiscalProfile` ya permite un perfil v1 limitado, manual o
  importado desde certificado censal/036 con texto local.
- El lector actual valida PDF, magic bytes, 4 MB, 80 páginas y 250.000
  caracteres; el archivo, texto y CSV no se persisten. Concilia el NIF y exige
  revisión, pero no conserva evidencia por campo/página/confianza ni historial
  de varios documentos.
- `src/lib/tax-engine` decide deducibilidad de gastos, no obligaciones. No debe
  deformarse para el nuevo dominio.
- `src/lib/fiscal-models` es un catálogo informativo oficial cuya instrucción
  local prohíbe obligaciones, plazos, cálculos, OCR e integración con AppStore.
- El calendario fiscal está versionado y es la única base válida para fechas.
  `src/lib/billing/tax-deadlines.ts` contiene atajos de facturación que no deben
  alimentar este diagnóstico.
- Las notificaciones fiscales ofrecen un patrón endurecido de extracción PDF y
  revisión, pero su dominio no debe importarse directamente.

## Pruebas y CI

- Vitest co-localizado, ESLint, `tsc --noEmit`, build Next y comprobación de
  migraciones.
- CI observado verde: 595 archivos, 5.087 pruebas correctas, 17 omitidas; lint,
  typecheck, build y aceptación Supabase correctos; `npm ci` sin
  vulnerabilidades informadas en ese run.
- Playwright está instalado, pero no existe configuración ni suite E2E del
  producto. La accesibilidad se comprueba principalmente mediante contratos de
  fuente. Este trabajo debe añadir E2E real y comprobaciones de accesibilidad.
- No hay cobertura obligatoria ni perfiles dorados 1–27 para obligaciones.

## CI, Vercel y producción

- No hay `vercel.json`; el proyecto usa integración Git–Vercel.
- Un push a `main` con CI verde espera el despliegue y reasigna automáticamente
  `facturacion-autonomos.app`. Este comportamiento no satisface la autorización
  explícita `PUBLICAR PRODUCCIÓN` exigida por la tarea y debe tratarse como
  riesgo de despliegue.
- El ruleset de `main` exige PR y checks Quality/Supabase Acceptance, pero no
  exige aprobaciones ni resolución de threads.
- Preview carece de smoke E2E automático para auth, almacenamiento, borrado,
  accesibilidad y redacción de logs.
- No se publicará en producción durante este trabajo sin la autorización actual
  y explícita indicada por el responsable.

## Entorno y feature flags

- `.env.example` documenta Supabase, Stripe, OpenAI, Vercel, calendario,
  Consultor fiscal y rutas privadas.
- Faltan en `.env.example` dos flags que el catálogo fiscal ya consume:
  `FISCAL_MODELS_ENGINE_ENABLED` y `FISCAL_MODELS_ENGINE_MODE`.
- El diagnóstico necesita flags separados y fail-closed para su UI, documentos,
  OCR, calendario y exportación. OCR externo permanecerá apagado por defecto.

## Seguridad y privacidad

Fortalezas existentes: RLS, pruebas de aislamiento, CSP/HSTS/no-store,
rate-limit, inventario de APIs y fixtures privados ignorados por Git.

Brechas a cerrar:

- no existe threat model específico de documentos fiscales;
- no hay evidencia por página/campo/confianza;
- no hay historial documental cronológico ni reconciliación completa;
- no hay retención configurable, borrado de binarios ni almacenamiento privado;
- el escáner externo de gastos no es reutilizable: envía archivos a un tercero y
  su consentimiento no es una autoridad de servidor;
- no existe suite de acceso cruzado/E2E para esta funcionalidad;
- el almacenamiento local eleva el impacto de un XSS y exige minimizar todavía
  más los datos guardados.

## Conclusión y trabajo desbloqueado

No hay conflicto material. Puede desarrollarse ya el flujo manual, el modelo de
dominio, el motor conservador, el cuestionario, la evidencia confirmada y la
navegación. La activación de OCR externo, persistencia de documentos, nuevos
territorios y producción queda bloqueada por revisión fiscal, privacidad e
infraestructura específica, no por el MVP manual.
