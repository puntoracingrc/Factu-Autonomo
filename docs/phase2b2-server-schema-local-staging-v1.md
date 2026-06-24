# Fase 2B.2 - Esquema servidor local/staging v1

Fecha: 2026-06-24

Rama: `feat/phase2b2-server-schema-local-staging`

Estado: MIGRACION LOCAL/STAGING / SIN IMPLEMENTACION FUNCIONAL VERI*FACTU

Este documento describe la primera migracion tecnica de Fase 2B. No habilita
remision real a AEAT, no usa certificados reales, no toca Supabase produccion y
no modifica la logica fiscal productiva de la aplicacion.

## 1. Contexto canonico

Estado de partida confirmado:

- PR #11 fusionado en `main`.
- Merge commit PR #11:
  `1fe5b8cac3137e0f3b4cafb9ae16b40a685bcab4`.
- PR #12 fusionado en `main`.
- Merge commit PR #12:
  `88676f3f8ac98d77598ff15d0b6fdfdd49120b2a`.
- Plan base integrado:
  `docs/phase2b-server-verifactu-plan-v1.md`.
- Diseno 2B.1 integrado:
  `docs/phase2b1-schema-staging-design-v1.md`.

## 2. Objetivo de 2B.2

Crear una base de datos versionada para local/staging que permita validar, en
fases posteriores, el modelo servidor de:

- documentos canonicos;
- versiones y conflictos;
- operaciones fiscales;
- identidades fiscales de factura;
- registros fiscales inmutables;
- estado de cadena fiscal;
- intentos de transporte separados.

2B.2 no implementa:

- endpoints de emision servidor;
- operacion fiscal transaccional;
- transporte AEAT;
- certificados;
- workers;
- migracion de datos legacy;
- despliegue productivo;
- cambios de UX;
- cambios de Stripe, precios, planes, IA o importadores.

## 3. Archivos creados

Migracion versionada:

```text
supabase/migrations/20260624220000_phase2b_server_schema_local_staging.sql
```

Rollback manual:

```text
supabase/rollbacks/20260624220000_phase2b_server_schema_local_staging.down.sql
```

Documentacion:

```text
docs/phase2b2-server-schema-local-staging-v1.md
```

Validador especifico:

```text
scripts/validate-phase2b2-server-schema.mjs
```

Script npm:

```text
npm run validate:phase2b2-server-schema
```

## 4. Tablas nuevas

### 4.1 `server_documents`

Documento canonico servidor.

Controles relevantes:

- `unique(user_id, local_document_id)`;
- `document_lifecycle in ('draft', 'issued', 'canceled')`;
- `integrity_lock in ('unlocked', 'locked')`;
- `version >= 1`;
- si el documento no esta en borrador, debe estar bloqueado;
- `payload`, `document_snapshot` y `pdf_snapshot` quedan fuera de las
  columnas concedidas al rol `authenticated`.

### 4.2 `server_document_versions`

Historial tecnico de versiones aceptadas.

Controles relevantes:

- `unique(server_document_id, version)`;
- `change_type` limitado a cambios conocidos;
- `actor_type` limitado a actor esperado;
- preparado para auditoria tecnica y conflictos.

### 4.3 `document_conflicts`

Conflictos de sincronizacion, importacion o dispositivos antiguos.

Controles relevantes:

- `resolution_status in ('open', 'ignored', 'resolved')`;
- un conflicto resuelto debe tener `resolved_at`;
- no sobrescribe documentos bloqueados por si mismo; solo registra el conflicto.

### 4.4 `fiscal_operations`

Operacion fiscal concreta.

Controles relevantes:

- `operation_type in ('alta_inicial', 'alta_subsanacion', 'anulacion')`;
- `environment in ('test', 'production')`;
- `unique(user_id, idempotency_key)`;
- `expected_document_version >= 1`;
- `document_snapshot_hash` obligatorio;
- estados separados de operacion, no de transporte.

La idempotencia identifica una operacion concreta. No impide crear una
subsanacion o anulacion legitima con otra clave idempotente.

### 4.5 `fiscal_invoice_identities`

Identidad fiscal de factura.

Campos de identidad:

- `issuer_nif`;
- `numserie`;
- `fecha_expedicion`;
- `environment`.

Decision provisional para local/staging:

```text
unique(user_id, environment, issuer_nif, numserie, fecha_expedicion)
```

Riesgo pendiente:

- antes de produccion hay que decidir si la unicidad debe ser global por
  identidad fiscal, no solo por usuario. Esa decision queda fuera de 2B.2.

### 4.6 `fiscal_records`

Registro fiscal inmutable.

Controles relevantes:

- `unique(operation_id)`;
- `unique(user_id, environment, issuer_nif, record_sequence)`;
- `record_type in ('alta_inicial', 'alta_subsanacion', 'anulacion')`;
- hash anterior obligatorio si existe registro anterior;
- trigger que bloquea `UPDATE` y `DELETE`;
- `xml_payload` no se concede al rol `authenticated`;
- no existe `unique(user_id, document_id, record_type)`.

Esta tabla prepara la inmutabilidad tecnica, pero no declara conformidad
productiva ni homologacion AEAT.

### 4.7 `fiscal_chain_state`

Cabeza actual de cadena por usuario, entorno y emisor.

Controles relevantes:

- primary key `(user_id, environment, issuer_nif)`;
- `record_count >= 0`;
- si la cadena tiene registros, debe existir `last_record_id` y `last_hash`.

La actualizacion atomica de la cadena queda para una fase posterior.

### 4.8 `fiscal_transport_attempts`

Intentos de transporte AEAT separados del registro fiscal.

Controles relevantes:

- `unique(fiscal_record_id, attempt_number)`;
- estados de transporte separados;
- `request_hash` obligatorio;
- `response_body` no se concede al rol `authenticated`;
- no crea nuevos registros fiscales al reintentar.

2B.2 solo crea la tabla. No implementa envio real.

## 5. Vistas y columnas seguras

Se crean vistas de lectura limitada:

- `server_documents_safe`;
- `fiscal_records_safe`;
- `fiscal_transport_attempts_safe`.

Ademas, los permisos directos sobre tablas se conceden por columnas seguras, no
con `SELECT *`.

Columnas crudas no expuestas a `authenticated`:

- `server_documents.payload`;
- `server_documents.document_snapshot`;
- `server_documents.pdf_snapshot`;
- `fiscal_records.xml_payload`;
- `fiscal_transport_attempts.response_body`;
- `fiscal_operations.failure_message`.

## 6. RLS, GRANT y REVOKE

Todas las tablas nuevas tienen RLS activado.

Politicas `SELECT`:

| Tabla | Lectura authenticated | Regla |
| --- | --- | --- |
| `server_documents` | columnas seguras propias | `auth.uid() = user_id` |
| `server_document_versions` | propias | `auth.uid() = user_id` |
| `document_conflicts` | propias | `auth.uid() = user_id` |
| `fiscal_operations` | columnas seguras propias | `auth.uid() = user_id` |
| `fiscal_invoice_identities` | propias | `auth.uid() = user_id` |
| `fiscal_records` | columnas seguras propias | `auth.uid() = user_id` |
| `fiscal_chain_state` | propia | `auth.uid() = user_id` |
| `fiscal_transport_attempts` | columnas seguras propias | `auth.uid() = user_id` |

Permisos:

| Rol | Lectura | Escritura |
| --- | --- | --- |
| `anon` | sin permisos | sin permisos |
| `authenticated` | solo columnas/vistas seguras propias | sin `INSERT`, `UPDATE` ni `DELETE` |
| `service_role` | `ALL` sobre tablas nuevas | permitido para futuros flujos servidor |

La escritura sensible queda preparada para servidor/service role. No se habilita
desde cliente autenticado.

## 7. Estrategia legacy

Existe el script historico:

```text
supabase/verifactu.sql
```

Ese script define tablas legacy:

- `verifactu_records`;
- `verifactu_chain_state`.

2B.2 no las borra, no las renombra y no las migra. El nuevo esquema usa nombres
distintos:

- `fiscal_records`;
- `fiscal_chain_state`.

Decision:

- local/staging puede validar el nuevo modelo sin pisar tablas legacy;
- produccion requerira inventario, baseline y plan de convivencia o migracion;
- cualquier migracion de datos legacy queda fuera de esta fase.

## 8. Rollback

Rollback manual:

```text
supabase/rollbacks/20260624220000_phase2b_server_schema_local_staging.down.sql
```

Alcance:

- valido para local/staging antes de datos fiscales reales;
- elimina vistas, trigger, funcion y tablas nuevas en orden de dependencia.

No es aceptable como rollback productivo una vez existan documentos canonicos o
registros fiscales. En produccion el rollback deberia ser una migracion hacia
delante que preserve registros fiscales inmutables.

## 9. Decisiones explicitamente aplazadas

- unicidad fiscal global vs por usuario;
- RPC o transaccion servidor final para operacion fiscal atomica;
- calculo final de `record_timestamp`, `previous_hash` y `record_hash`;
- formato XML definitivo;
- transporte AEAT real;
- modelo de errores AEAT resumidos;
- workers/reintentos;
- migracion de tablas legacy;
- auditoria completa de transporte;
- politica de lectura final para soporte/admin;
- baseline de Supabase produccion.

## 10. Validacion esperada

Validaciones locales esperadas de esta fase:

```text
git diff --check
npm run check:migrations
npm run validate:phase2b2-server-schema
```

Si se dispone de Supabase local limpio:

```text
supabase db reset --local
```

El reset local solo se debe ejecutar contra Supabase local. Produccion no se
usa en esta fase.

## 11. Validaciones ejecutadas

Resultado local:

| Validacion | Resultado |
| --- | --- |
| `git diff --check` | OK |
| `npm run check:migrations` | OK |
| `npm run validate:phase2b2-server-schema` | OK |
| `npm test` | OK, 87 archivos, 419 tests |
| `npm run lint` | OK |
| `npx tsc --noEmit` | OK |
| `npm run build` | OK, Next.js 15.5.19, 58 paginas estaticas |
| `supabase db reset --local` | No disponible: Supabase local no estaba levantado |
| DDL `up` + `down` en PostgreSQL temporal local | OK |

La validacion DDL se ejecuto en un contenedor PostgreSQL local descartable con
roles/esquema minimos (`auth.users`, `auth.uid()`, `anon`, `authenticated`,
`service_role`) para comprobar sintaxis, dependencias, permisos, vistas,
trigger y rollback. No sustituye la aceptacion posterior en Supabase local o
staging, pero evita subir SQL que ni siquiera aplique.

## 12. Criterio de aceptacion

2B.2 queda lista para PR si:

- la migracion nueva es versionada y unica;
- el rollback emparejado existe fuera de `supabase/migrations`;
- las tablas requeridas existen en el SQL;
- `authenticated` no tiene escrituras directas;
- `anon` no tiene permisos;
- los datos crudos sensibles no quedan expuestos por `SELECT *`;
- `fiscal_records` queda protegida frente a update/delete;
- no se crea transporte AEAT;
- no se toca produccion;
- no se implementa Fase 2B funcional.

## 13. Confirmaciones

- No se ha conectado con AEAT.
- No se han usado certificados reales.
- No se ha tocado Supabase produccion.
- No se ha cambiado Vercel.
- No se han promovido deployments.
- No se han cambiado dominios, aliases ni DNS.
- No se han tocado Stripe, precios, planes, IA ni importadores.
- No se han tocado documentos emitidos reales, numeracion real ni PDFs
  historicos.
