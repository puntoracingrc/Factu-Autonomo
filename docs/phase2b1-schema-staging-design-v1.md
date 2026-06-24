# Fase 2B.1 - Diseño de esquema y staging v1

Fecha: 2026-06-24

Rama: `feat/phase2b1-schema-staging-design`

Estado: DISEÑO / SIN MIGRACIONES / SIN IMPLEMENTACION FUNCIONAL

Este documento prepara la entrada controlada a Fase 2B.1. No crea migraciones,
no implementa VERI*FACTU servidor, no conecta con AEAT y no toca Supabase
produccion. Cualquier desarrollo posterior debe validarse primero en local y
staging.

## 1. Base canónica

Estado confirmado:

- PR #11 esta fusionado en `main`.
- Merge commit: `1fe5b8cac3137e0f3b4cafb9ae16b40a685bcab4`.
- Documento base integrado: `docs/phase2b-server-verifactu-plan-v1.md`.
- Fase 2B funcional no iniciada.

Entrada permitida ahora:

- diseño de esquema;
- propuesta de migraciones futuras para local/staging;
- matriz RLS, GRANT y REVOKE;
- estrategia de rollbacks manuales;
- checklist de staging;
- riesgos antes de migraciones reales.

## 2. Objetivo de 2B.1

Diseñar el esquema de servidor que permitirá implementar más adelante:

- documentos canónicos servidor;
- versionado y bloqueo optimista;
- sincronización protegida;
- operaciones fiscales;
- registros fiscales inmutables;
- intentos de transporte AEAT separados;
- auditoría técnica.

2B.1 no debe:

- emitir documentos desde servidor;
- registrar VERI*FACTU real;
- generar transporte AEAT real;
- usar certificados reales;
- aplicar migraciones a producción;
- modificar documentos fiscales reales;
- cambiar numeración real;
- tocar PDFs históricos.

## 3. Propuesta de migraciones futuras

No se crea ningún archivo SQL en esta fase. La propuesta futura sería crear una
migración versionada posterior a:

- `20260623000000_base_schema.sql`
- `20260624000100_phase1_hardening.sql`
- `20260624000200_phase1_rpc_search_path_hardening.sql`

Nombre orientativo futuro:

```text
supabase/migrations/YYYYMMDDHHMMSS_phase2b_server_document_integrity.sql
```

Rollback manual orientativo futuro:

```text
supabase/rollbacks/YYYYMMDDHHMMSS_phase2b_server_document_integrity.down.sql
```

Reglas:

- migración solo `up` en `supabase/migrations`;
- rollback manual solo en `supabase/rollbacks`;
- primero Supabase local limpio;
- después staging;
- producción solo tras baseline validado y autorización explícita;
- no mezclar scripts históricos `supabase/*.sql` con migraciones nuevas.

Tablas legacy a tener en cuenta:

- `supabase/verifactu.sql` existe como script histórico y define
  `verifactu_records` y `verifactu_chain_state`.
- En entornos ya usados, esas tablas pueden existir aunque no formen parte de la
  migración versionada actual.
- Una migración futura 2B no debe asumir que esas tablas no existen.
- Antes de decidir si se renombran, migran, conservan como legacy read-only o se
  reemplazan por tablas nuevas, hay que comprobar local/staging y documentar una
  estrategia de convivencia.
- Producción no se inspecciona ni se toca en esta fase documental.

## 4. Tablas propuestas

### 4.1 `server_documents`

Documento canónico servidor.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario derivado del usuario autenticado. |
| `local_document_id` | `text` | ID del documento local. |
| `document_type` | `text` | `factura`, `presupuesto`, `recibo`. |
| `document_kind` | `text` | Incluye rectificativas. |
| `document_lifecycle` | `text` | `draft`, `issued`, `canceled`. |
| `integrity_lock` | `text` | `unlocked`, `locked`. |
| `status_legacy` | `text` | Compatibilidad con `Document.status`. |
| `version` | `integer` | Bloqueo optimista. |
| `payload` | `jsonb` | Documento canónico completo. |
| `document_snapshot` | `jsonb` | Snapshot documental congelado. |
| `pdf_snapshot` | `jsonb` | Snapshot PDF congelado. |
| `snapshot_hash` | `text` | Hash documental. |
| `pdf_content_hash` | `text` | Hash contenido PDF. |
| `issuer_nif` | `text` | NIF emisor normalizado. |
| `numserie` | `text` | Número/serie fiscal. |
| `issue_date` | `date` | Fecha de expedición. |
| `created_at` | `timestamptz` | Servidor. |
| `updated_at` | `timestamptz` | Servidor. |
| `issued_at` | `timestamptz` | Servidor. |
| `canceled_at` | `timestamptz` | Servidor. |

Restricciones futuras:

- `unique(user_id, local_document_id)`;
- `version >= 1`;
- `document_lifecycle in ('draft', 'issued', 'canceled')`;
- `integrity_lock in ('unlocked', 'locked')`;
- si `integrity_lock = 'locked'`, las rutas servidor no permiten cambios en
  campos documentales protegidos;
- si `document_lifecycle != 'draft'`, se trata como bloqueado aunque el payload
  legacy diga otra cosa.

### 4.2 `server_document_versions`

Historial append-only de cambios aceptados.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `server_document_id` | `uuid` | Referencia a documento canónico. |
| `user_id` | `uuid` | Propietario. |
| `version` | `integer` | Versión resultante. |
| `change_type` | `text` | Tipo de cambio. |
| `payload_before_hash` | `text` | Hash previo. |
| `payload_after_hash` | `text` | Hash posterior. |
| `changed_fields` | `jsonb` | Campos modificados. |
| `actor_type` | `text` | Usuario, sistema, importador futuro. |
| `actor_id` | `text` | Identificador del actor. |
| `created_at` | `timestamptz` | Servidor. |

Uso:

- auditoría técnica;
- depuración de conflictos;
- trazabilidad de sincronización;
- no sustituye al registro fiscal.

### 4.3 `document_conflicts`

Conflictos de sincronización o importación.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario. |
| `server_document_id` | `uuid` | Opcional si el conflicto ya identifica documento. |
| `local_document_id` | `text` | ID del documento local. |
| `conflict_type` | `text` | Versión, bloqueo, snapshot, borrado, numeración. |
| `incoming_payload_hash` | `text` | Hash del intento rechazado. |
| `server_payload_hash` | `text` | Hash canónico actual. |
| `resolution_status` | `text` | `open`, `ignored`, `resolved`. |
| `created_at` | `timestamptz` | Servidor. |
| `resolved_at` | `timestamptz` | Servidor. |

Regla:

- un conflicto nunca debe sobrescribir un documento bloqueado.

### 4.4 `fiscal_operations`

Intención fiscal concreta.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario. |
| `server_document_id` | `uuid` | Documento canónico. |
| `operation_type` | `text` | `alta_inicial`, `alta_subsanacion`, `anulacion`. |
| `environment` | `text` | `test`, `production`. |
| `idempotency_key` | `text` | Operación concreta. |
| `requested_by` | `uuid` | Usuario autenticado. |
| `requested_at` | `timestamptz` | Servidor. |
| `expected_document_version` | `integer` | Bloqueo optimista. |
| `document_snapshot_hash` | `text` | Snapshot usado. |
| `status` | `text` | Estado de operación. |
| `completed_at` | `timestamptz` | Servidor. |
| `failed_at` | `timestamptz` | Servidor. |
| `failure_code` | `text` | Diagnóstico. |
| `failure_message` | `text` | Diagnóstico. |

Estados:

- `requested`
- `processing`
- `completed`
- `failed_retryable`
- `failed_final`

Restricciones futuras:

- `unique(user_id, idempotency_key)`;
- no usar esta clave para impedir subsanaciones o anulaciones legítimas;
- idempotencia de operación fiscal separada de idempotencia de transporte.

### 4.5 `fiscal_invoice_identities`

Identidad fiscal de factura.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario. |
| `environment` | `text` | Entorno fiscal. |
| `issuer_nif` | `text` | Emisor. |
| `numserie` | `text` | Número/serie. |
| `fecha_expedicion` | `date` | Fecha de factura. |
| `server_document_id` | `uuid` | Documento canónico. |
| `created_at` | `timestamptz` | Servidor. |

Restricción:

- `unique(environment, issuer_nif, numserie, fecha_expedicion)`.

Decisión pendiente antes de migrar:

- La identidad fiscal real de factura se identifica por emisor, número/serie,
  fecha y entorno. A nivel producto multiusuario debe decidirse si esa unicidad
  se fuerza globalmente o si se incorpora `user_id` para permitir cuentas
  separadas del mismo obligado tributario.
- Esta decisión debe cerrarse en staging antes de crear una constraint
  productiva, porque afecta a usuarios que puedan duplicar cuenta, migrar datos
  o trabajar como asesoría para varios obligados.

### 4.6 `fiscal_records`

Registro fiscal inmutable.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario. |
| `operation_id` | `uuid` | Operación fiscal. |
| `invoice_identity_id` | `uuid` | Identidad fiscal. |
| `server_document_id` | `uuid` | Documento canónico. |
| `environment` | `text` | Entorno. |
| `issuer_nif` | `text` | Emisor. |
| `numserie` | `text` | Número/serie. |
| `fecha_expedicion` | `date` | Fecha. |
| `record_type` | `text` | `alta`, `anulacion`. |
| `record_sequence` | `bigint` | Secuencia por emisor/entorno. |
| `previous_record_id` | `uuid` | Registro anterior. |
| `previous_hash` | `text` | Huella anterior. |
| `record_hash` | `text` | Huella del registro. |
| `hash_algorithm` | `text` | Algoritmo. |
| `record_timestamp` | `timestamptz` | Generado en servidor. |
| `xml_payload` | `text` | XML congelado. |
| `qr_url` | `text` | URL QR si aplica. |
| `document_snapshot_hash` | `text` | Hash documental. |
| `pdf_content_hash` | `text` | Hash PDF. |
| `schema_version` | `text` | Versión de esquema. |
| `renderer_version` | `text` | Versión renderer. |
| `created_at` | `timestamptz` | Servidor. |

Reglas:

- append-only;
- no `update`;
- no `delete`;
- `unique(operation_id)`;
- `unique(user_id, environment, issuer_nif, record_sequence)`;
- no usar `unique(user_id, document_id, record_type)`.

Endurecimiento esperado:

- La inmutabilidad no debe depender solo de la aplicación.
- Debe reforzarse con RLS, `GRANT/REVOKE` y, si hace falta, triggers que
  rechacen `UPDATE`/`DELETE` incluso si una ruta futura se equivoca.
- La UI no debería leer directamente `xml_payload` completo salvo necesidad
  explícita; para lectura ordinaria se recomienda una vista o endpoint que
  exponga solo estado, hashes, QR/CSV y metadatos mínimos.

### 4.7 `fiscal_chain_state`

Estado de cadena fiscal.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `user_id` | `uuid` | Propietario. |
| `environment` | `text` | Entorno. |
| `issuer_nif` | `text` | Emisor. |
| `last_record_id` | `uuid` | Último registro. |
| `last_hash` | `text` | Última huella. |
| `record_count` | `bigint` | Contador. |
| `updated_at` | `timestamptz` | Servidor. |

Clave:

- `primary key (user_id, environment, issuer_nif)`.

Regla:

- solo se actualiza dentro de la transacción fiscal.

### 4.8 `fiscal_transport_attempts`

Intentos de transporte AEAT.

Campos propuestos:

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Propietario. |
| `fiscal_record_id` | `uuid` | Registro fiscal inmutable. |
| `environment` | `text` | Entorno. |
| `attempt_number` | `integer` | Número de intento. |
| `status` | `text` | Estado transporte. |
| `endpoint` | `text` | Endpoint usado. |
| `request_hash` | `text` | Hash del XML enviado. |
| `response_code` | `text` | Código respuesta. |
| `response_body` | `text` | Respuesta cruda controlada. |
| `aeat_csv` | `text` | CSV si existe. |
| `error_code` | `text` | Error técnico o AEAT. |
| `error_message` | `text` | Diagnóstico. |
| `started_at` | `timestamptz` | Servidor. |
| `finished_at` | `timestamptz` | Servidor. |
| `created_at` | `timestamptz` | Servidor. |

Estados:

- `pending`
- `sending`
- `accepted`
- `rejected_retryable`
- `rejected_final`
- `failed_retryable`
- `failed_final`

Reglas:

- reintentar transporte no crea nuevo registro fiscal;
- el XML sale de `fiscal_records.xml_payload`;
- dos workers no deben enviar simultáneamente el mismo intento.

Decisión de auditoría:

- `fiscal_transport_attempts` puede requerir `UPDATE` controlado por servidor
  para pasar de `pending` a `sending` y cerrar con resultado.
- Si se quiere una trazabilidad estrictamente append-only también para
  transporte, añadir en una fase futura `fiscal_transport_attempt_events`.
- En ambos casos, `authenticated` no debe escribir intentos ni respuestas.

## 5. Matriz RLS / GRANT / REVOKE propuesta

| Tabla | anon | authenticated | service_role | Notas |
| --- | --- | --- | --- | --- |
| `server_documents` | Sin acceso | `SELECT` propio limitado; escrituras directas no | Escritura servidor | Mutaciones por rutas/RPC protegidas. |
| `server_document_versions` | Sin acceso | `SELECT` propio si la UI lo necesita | Insert servidor | Append-only. |
| `document_conflicts` | Sin acceso | `SELECT` propio; resolución directa no | Escritura servidor | Resolución por flujo controlado. |
| `fiscal_operations` | Sin acceso | `SELECT` propio limitado | Escritura servidor | Sin insert/update/delete directo. |
| `fiscal_invoice_identities` | Sin acceso | `SELECT` propio si hace falta | Escritura servidor | Identidad fiscal protegida. |
| `fiscal_records` | Sin acceso | `SELECT` propio read-only | Insert servidor | Inmutable. Sin update/delete. |
| `fiscal_chain_state` | Sin acceso | `SELECT` propio si hace falta | Escritura servidor | Bloqueada en transacción. |
| `fiscal_transport_attempts` | Sin acceso | `SELECT` propio limitado | Escritura servidor/job | Reintentos controlados. |

Privilegios objetivo:

- `revoke all on <tablas> from anon`;
- `revoke insert, update, delete on <tablas> from authenticated`;
- conceder `select` propio solo donde exista policy de lectura segura;
- funciones/RPC futuras sin `execute` para `public`, `anon` ni
  `authenticated` salvo excepción explícita;
- service role usado solo en servidor.

Lectura limitada:

- Aunque `authenticated` tenga `SELECT` propio, no significa acceso completo a
  todos los campos.
- Payloads como `payload`, `document_snapshot`, `xml_payload`,
  `response_body`, errores técnicos o datos de certificado deben exponerse solo
  por vistas/endpoints mínimos.
- Las políticas y grants deben favorecer vistas de lectura o endpoints servidor
  antes que `SELECT *` sobre tablas fiscales.

Datos sensibles:

- `xml_payload`, `response_body` y snapshots pueden contener datos personales,
  fiscales o comerciales.
- El diseño de staging debe revisar retención, acceso mínimo, exportación,
  soporte técnico y borrado legalmente permitido sin comprometer registros
  inmutables.
- Nunca almacenar certificados, claves privadas o contraseñas en estas tablas.

## 6. Funciones o transacción futura

Diseño preferido:

- transacción PostgreSQL directa desde servidor.

Si el entorno impide transacciones directas:

- detener implementación;
- diseñar una única RPC transaccional protegida;
- no sustituir atomicidad por varias llamadas REST/RPC independientes.

Funciones candidatas futuras:

- `create_server_document_draft`
- `update_server_document_draft`
- `ingest_client_document_change`
- `issue_server_document`
- `create_fiscal_operation`
- `create_fiscal_record_transaction`
- `claim_transport_attempt`
- `record_transport_result`

Este documento no crea ninguna función.

## 7. Estrategia de rollback manual

Rollback de 2B.1/2B futuro no debe:

- borrar registros fiscales;
- borrar intentos de transporte;
- borrar auditoría;
- reabrir documentos bloqueados;
- permitir mutaciones que Fase 2A ya prohíbe.

Rollback permitido:

- desactivar feature flag servidor;
- bloquear rutas nuevas;
- marcar operaciones nuevas como no disponibles;
- conservar tablas y datos para diagnóstico;
- revertir permisos a modo más restrictivo;
- crear vistas de solo lectura si una UI necesita inspección.

Rollback peligroso y no permitido:

- `drop table fiscal_records` en entornos con datos reales;
- `truncate` de tablas fiscales;
- eliminar cadena fiscal;
- resetear `record_count`;
- modificar hashes ya generados.

## 8. Checklist de staging

Antes de cualquier migración productiva:

1. Crear o confirmar proyecto Supabase staging.
2. Aplicar migraciones base en staging limpio.
3. Aplicar migración futura 2B en staging.
4. Ejecutar secuencia `up -> down manual -> up` en entorno descartable.
5. Validar RLS con:
   - `anon`;
   - usuario A;
   - usuario B;
   - service role.
6. Confirmar que `authenticated` no puede escribir tablas fiscales.
7. Confirmar que registros fiscales son append-only.
8. Confirmar que la cadena se actualiza solo dentro de operación transaccional.
9. Ejecutar pruebas de concurrencia:
   - dos altas simultáneas;
   - dos idempotency keys iguales;
   - dos workers de transporte.
10. Confirmar que no hay service role en bundle cliente.
11. Confirmar que no se usa AEAT producción.
12. Documentar resultado en informe de aceptación 2B.1/2B futuro.
13. Confirmar coexistencia o migración controlada de `verifactu_records` y
    `verifactu_chain_state` legacy si existen.
14. Confirmar que las vistas/endpoints de lectura no exponen XML o respuestas
    completas por defecto.

## 9. Riesgos antes de migraciones reales

| Riesgo | Severidad | Mitigación antes de implementar |
| --- | --- | --- |
| Producción puede tener esquema manual legacy | Alta | Baseline/staging antes de migrar. |
| Endpoint actual VeriFactu acepta payload de navegador | Alta | Sustituir por fuente servidor canónica en 2B. |
| `sync_entities` puede sobrescribir entidades sin política fiscal servidor | Alta | Ingest protegido y conflictos. |
| Transacción directa PostgreSQL puede requerir driver/server setup | Media | Validar viabilidad antes de escribir lógica. |
| Transporte AEAT real requiere credenciales/certificados | Alta | Mantener fuera hasta fase específica. |
| Rollbacks mal diseñados pueden borrar evidencia | Alta | Rollbacks conservadores y manuales. |
| Estados fiscales pueden confundirse con estados UI | Media | Mantener modelo separado operación/registro/transporte. |
| Tablas VeriFactu legacy pueden chocar con el esquema 2B | Alta | Estrategia de convivencia/migración en staging antes de SQL real. |
| Lecturas demasiado amplias pueden exponer XML o respuestas AEAT | Alta | Vistas/endpoints mínimos y revisión de campos sensibles. |

## 10. Validadores futuros propuestos

Sin implementarlos todavía, 2B debería añadir validadores para:

- nombres de migraciones y rollbacks;
- presencia de RLS en tablas fiscales;
- ausencia de grants peligrosos para `anon` y `authenticated`;
- ausencia de funciones fiscales ejecutables por `public`;
- inmutabilidad de registros;
- constraints esperadas;
- no existencia de `unique(user_id, document_id, record_type)` como bloqueo
  final.
- ausencia de `SELECT *` peligroso para tablas con XML, snapshots o respuestas
  crudas;
- presencia de estrategia explícita para tablas legacy VeriFactu.

## 11. Criterio de parada

Detener la fase si aparece cualquiera de estas necesidades:

- tocar Supabase producción;
- usar certificados reales;
- enviar a AEAT real;
- mutar facturas reales;
- tocar numeración real;
- cambiar PDFs históricos;
- relajar permisos RLS;
- exponer service role al navegador;
- mezclar Stripe, precios, planes, IA o importadores.

## 12. Validación de esta fase documental

Validaciones mínimas:

- `git diff --check`;
- `npm run check:migrations`;
- no ejecutar tests completos si solo cambia documentación.

Confirmación:

- este documento no crea SQL;
- no crea migraciones;
- no modifica código funcional;
- no empieza implementación VERI*FACTU servidor.
