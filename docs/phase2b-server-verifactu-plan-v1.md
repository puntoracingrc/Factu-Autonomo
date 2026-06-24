# Fase 2B - Plan servidor e integridad VERI*FACTU v1

Fecha: 2026-06-24

Rama de trabajo: `docs/phase2b-server-verifactu-plan`

Estado: PLAN DOCUMENTAL / SIN IMPLEMENTACION

Este documento define la arquitectura propuesta para Fase 2B antes de escribir
codigo o migraciones. No constituye certificacion legal, fiscal, tributaria ni
homologacion AEAT. Debe revisarse externamente cuando aplique.

## 1. Objetivo

Fase 2B debe llevar al servidor las garantias que Fase 2A cerro en local:

- documento canonico servidor;
- versionado y bloqueo optimista;
- sincronizacion protegida;
- operacion fiscal transaccional;
- registro fiscal inmutable;
- intentos de transporte AEAT separados del registro fiscal;
- idempotencia;
- seguridad por defecto;
- preparacion para entornos test y produccion sin tocar produccion todavia.

Este plan no implementa nada. Su salida esperada es un PR documental que deje
preparada la arquitectura para posteriores fases pequenas.

## 2. Fuentes oficiales revisadas

Fuentes oficiales consultadas el 2026-06-24:

- Real Decreto 1007/2023, BOE:
  https://www.boe.es/buscar/act.php?id=BOE-A-2023-24840
- Orden HAC/1177/2024, BOE:
  https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138
- AEAT, informacion tecnica SIF / VERI*FACTU:
  https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/informacion-tecnica.html
- AEAT, descripcion de servicios web VERI*FACTU:
  https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf

Uso prudente de fuentes:

- El plan usa estas fuentes como referencia tecnica.
- No declara conformidad productiva.
- No declara que la app este lista para remision real.
- No sustituye validacion legal/fiscal ni pruebas oficiales AEAT.

## 3. Estado de partida

Fase 2A esta cerrada como base local de integridad documental:

- 2A.1: emision y bloqueo central.
- 2A.2: snapshots documentales completos.
- 2A.3: fusion segura de clientes.
- 2A.4: borrado, numeracion y recibos seguros.
- 2A.5: PDF historico desde snapshot.

Checkpoint relacionado:

- `docs/phase2a-stabilization-checkpoint-v1.md`.
- Veredicto: `APTO PARA PLANIFICAR 2B`.

Riesgos vivos que Fase 2B debe abordar:

- sync nube todavia no protegido desde servidor;
- Supabase produccion pendiente de staging, baseline y validacion;
- VERI*FACTU servidor pendiente;
- registro fiscal inmutable pendiente;
- transporte AEAT pendiente;
- idempotencia y concurrencia fiscal pendientes;
- clientes antiguos o dispositivos offline pueden intentar mutaciones
  incompatibles;
- el endpoint actual de VeriFactu acepta documento/perfil desde navegador y
  persiste registro/cadena en pasos separados.

## 4. Principios de diseno

1. El servidor no confia en payload documental del navegador para operaciones
   fiscales.
2. Toda escritura sensible deriva `user_id` desde token autenticado o service
   role, nunca desde el cuerpo de la peticion.
3. Un documento emitido o bloqueado no se degrada aunque lo intente una UI
   antigua.
4. La emision fiscal productiva no ocurre offline.
5. La operacion fiscal se ejecuta de forma atomica.
6. El registro fiscal resultante es inmutable.
7. Los intentos de transporte AEAT son reintentables y no crean nuevos registros
   fiscales.
8. Idempotencia de operacion fiscal e idempotencia de transporte son conceptos
   separados.
9. Las migraciones se disenaran y validaran primero en local/staging, no en
   produccion.
10. Rollback no significa borrar registros fiscales ni reabrir documentos
    bloqueados.

## 5. Alcance de Fase 2B

Fase 2B cubre el diseno e implementacion futura de:

- documento canonico servidor;
- ingest/sync protegido desde cliente;
- versionado y `expectedVersion`;
- operaciones de emision, anulacion y subsanacion desde servidor;
- cadena fiscal por emisor y entorno;
- registros fiscales inmutables;
- intentos de transporte AEAT;
- auditoria tecnica;
- tests de permisos, concurrencia, idempotencia y reintentos.

Fase 2B no debe mezclar:

- cambios de precios;
- cambios de planes comerciales;
- Stripe;
- IA;
- importadores;
- redisenos visuales;
- migraciones en produccion;
- promocion Vercel;
- dominios, aliases o DNS.

## 6. Modelo canonico servidor

### 6.1 `server_documents`

Tabla conceptual para el documento canonico sincronizado.

Campos propuestos:

- `id uuid primary key`
- `user_id uuid not null`
- `local_document_id text not null`
- `document_type text not null`
- `document_kind text not null`
- `document_lifecycle text not null`
- `integrity_lock text not null`
- `status_legacy text not null`
- `version integer not null`
- `expected_source text`
- `payload jsonb not null`
- `document_snapshot jsonb`
- `pdf_snapshot jsonb`
- `snapshot_hash text`
- `pdf_content_hash text`
- `issuer_nif text`
- `numserie text`
- `issue_date date`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `issued_at timestamptz`
- `canceled_at timestamptz`

Restricciones conceptuales:

- `unique(user_id, local_document_id)`.
- Si esta emitido, `document_snapshot` debe existir salvo legacy importado
  explicitamente como protegido.
- Si `integrity_lock = locked`, no se permiten cambios en campos documentales.
- `version` sube con cada mutacion permitida.
- Toda mutacion de cliente debe enviar `expectedVersion`.

### 6.2 `server_document_versions`

Historial tecnico append-only de cambios aceptados.

Campos propuestos:

- `id uuid primary key`
- `server_document_id uuid not null`
- `user_id uuid not null`
- `version integer not null`
- `change_type text not null`
- `payload_before_hash text`
- `payload_after_hash text`
- `changed_fields jsonb`
- `actor_type text not null`
- `actor_id text`
- `created_at timestamptz not null`

Uso:

- Auditoria tecnica de cambios.
- Diagnostico de conflictos.
- No sustituye el registro fiscal.

### 6.3 `document_conflicts`

Tabla conceptual para conflictos de sincronizacion.

Casos:

- cliente antiguo intenta cambiar documento bloqueado;
- dispositivo offline sube version antigua;
- backup/importacion intenta reemplazar snapshot;
- payload remoto no conserva hashes.

Resultado:

- la mutacion se rechaza o queda en conflicto;
- nunca sobrescribe el documento canonico bloqueado.

## 7. Modelo fiscal servidor

### 7.1 Separacion obligatoria

Fase 2B separa tres niveles:

1. Operacion fiscal.
2. Registro fiscal inmutable.
3. Intento de transporte AEAT.

No se debe usar `unique(user_id, document_id, record_type)` como constraint
final porque impediria subsanaciones o anulaciones legitimas.

### 7.2 `fiscal_operations`

Representa la intencion fiscal concreta.

Tipos minimos:

- `alta_inicial`
- `alta_subsanacion`
- `anulacion`

Campos propuestos:

- `id uuid primary key`
- `user_id uuid not null`
- `server_document_id uuid not null`
- `operation_type text not null`
- `environment text not null`
- `idempotency_key text not null`
- `requested_by uuid not null`
- `requested_at timestamptz not null`
- `expected_document_version integer not null`
- `document_snapshot_hash text not null`
- `status text not null`
- `completed_at timestamptz`
- `failed_at timestamptz`
- `failure_code text`
- `failure_message text`

Estados propuestos:

- `requested`
- `processing`
- `completed`
- `failed_retryable`
- `failed_final`

Restricciones:

- `unique(user_id, idempotency_key)`.
- una misma `idempotency_key` devuelve la misma operacion y, si existe, el mismo
  registro fiscal.
- no impide crear una `alta_subsanacion` o `anulacion` con otra operacion
  legitima.

### 7.3 `fiscal_invoice_identities`

Identidad fiscal de factura, separada del documento local.

Campos propuestos:

- `id uuid primary key`
- `user_id uuid not null`
- `environment text not null`
- `issuer_nif text not null`
- `numserie text not null`
- `fecha_expedicion date not null`
- `server_document_id uuid not null`
- `created_at timestamptz not null`

Restriccion conceptual:

- `unique(environment, issuer_nif, numserie, fecha_expedicion)`.

Uso:

- evita duplicar altas iniciales para la misma factura fiscal;
- permite que varios registros posteriores apunten a la misma identidad fiscal.

### 7.4 `fiscal_records`

Registro fiscal inmutable generado por una operacion.

Campos propuestos:

- `id uuid primary key`
- `user_id uuid not null`
- `operation_id uuid not null`
- `invoice_identity_id uuid not null`
- `server_document_id uuid not null`
- `environment text not null`
- `issuer_nif text not null`
- `numserie text not null`
- `fecha_expedicion date not null`
- `record_type text not null`
- `record_sequence bigint not null`
- `previous_record_id uuid`
- `previous_hash text`
- `record_hash text not null`
- `hash_algorithm text not null`
- `record_timestamp timestamptz not null`
- `xml_payload text not null`
- `qr_url text`
- `document_snapshot_hash text not null`
- `pdf_content_hash text`
- `schema_version text not null`
- `renderer_version text`
- `created_at timestamptz not null`

Tipos de registro:

- `alta`
- `anulacion`

Notas:

- `alta_inicial` y `alta_subsanacion` son operaciones; ambas pueden generar un
  registro tipo `alta` si la especificacion aplicable lo exige.
- Las rectificativas se tratan como facturas con su propio alta, no como
  anulacion AEAT salvo que el caso fiscal concreto lo requiera.
- Un mismo documento/factura puede tener varios registros fiscales posteriores.
- Los registros no se actualizan ni se borran. Cualquier correccion crea un
  nuevo registro o un nuevo intento de transporte, segun corresponda.

Restricciones:

- `unique(operation_id)`.
- `unique(user_id, environment, issuer_nif, record_sequence)`.
- no `update` ni `delete` para `anon` ni `authenticated`.

### 7.5 `fiscal_chain_state`

Estado de cadena por usuario, emisor y entorno.

Campos propuestos:

- `user_id uuid not null`
- `environment text not null`
- `issuer_nif text not null`
- `last_record_id uuid`
- `last_hash text`
- `record_count bigint not null`
- `updated_at timestamptz not null`
- `primary key (user_id, environment, issuer_nif)`

Uso:

- se bloquea dentro de la transaccion fiscal;
- nunca se actualiza desde cliente;
- solo avanza si el registro fiscal se inserta correctamente.

### 7.6 `fiscal_transport_attempts`

Intentos de envio a AEAT separados del registro fiscal.

Campos propuestos:

- `id uuid primary key`
- `user_id uuid not null`
- `fiscal_record_id uuid not null`
- `environment text not null`
- `attempt_number integer not null`
- `status text not null`
- `endpoint text`
- `request_hash text not null`
- `response_code text`
- `response_body text`
- `aeat_csv text`
- `error_code text`
- `error_message text`
- `started_at timestamptz`
- `finished_at timestamptz`
- `created_at timestamptz not null`

Estados propuestos:

- `pending`
- `sending`
- `accepted`
- `rejected_retryable`
- `rejected_final`
- `failed_retryable`
- `failed_final`

Reglas:

- reintentar transporte no crea un nuevo `fiscal_record`;
- varios intentos pueden apuntar al mismo registro;
- el XML enviado debe ser el mismo `xml_payload` del registro inmutable;
- la respuesta AEAT no modifica el registro fiscal, solo crea/actualiza el
  intento de transporte y, como derivado, el estado visible.

## 8. Operacion fiscal transaccional

Arquitectura elegida para 2B: transaccion PostgreSQL directa desde servidor.

No se aceptan varias llamadas REST/RPC independientes como si fueran atomicas.

Flujo conceptual:

1. Ruta servidor valida Bearer token y deriva `user_id`.
2. Ruta servidor abre transaccion PostgreSQL con credenciales servidor.
3. Bloquea `server_documents` por `id` y `user_id`.
4. Verifica `expectedVersion`.
5. Verifica que el documento esta emitido/bloqueado o emite segun operacion
   permitida.
6. Obtiene/cierra `documentSnapshot` y hashes desde el documento canonico.
7. Bloquea `fiscal_chain_state` con `FOR UPDATE` para
   `(user_id, environment, issuer_nif)`.
8. Obtiene `previousHash` y `record_count` desde la fila bloqueada.
9. Obtiene `record_timestamp` desde el servidor dentro de la transaccion.
10. Construye payload fiscal, huella y XML con datos canonicos.
11. Inserta `fiscal_operations` si no existe por `idempotency_key`.
12. Inserta `fiscal_records`.
13. Actualiza `fiscal_chain_state`.
14. Registra evento de auditoria.
15. Confirma transaccion.
16. Encola o crea `fiscal_transport_attempts` fuera o al final del flujo,
    siempre referenciando el registro ya inmutable.

Timestamp, hash y previousHash:

- `previousHash` sale de `fiscal_chain_state` bloqueada.
- `record_timestamp` se genera en servidor durante la transaccion.
- `record_hash` se calcula con `previousHash`, timestamp y datos canonicos.
- el hash no se recalcula despues de insertar el registro.

Si no es viable abrir una transaccion PostgreSQL directa en el entorno de
hosting, la fase de implementacion debe detenerse y redisenar esta pieza como
una unica funcion SQL/RPC transaccional protegida. No se debe degradar a varias
llamadas no atomicas.

## 9. Idempotencia

### 9.1 Idempotencia de operacion fiscal

`idempotency_key` identifica una operacion concreta, no una factura completa.

Ejemplos conceptuales:

- `alta_inicial:{server_document_id}:{expectedVersion}:{snapshotHash}:{environment}`
- `alta_subsanacion:{server_document_id}:{reasonHash}:{snapshotHash}:{environment}`
- `anulacion:{server_document_id}:{reasonHash}:{targetRecordId}:{environment}`

Reglas:

- misma clave concurrente devuelve el mismo resultado;
- no duplica registros;
- no impide una subsanacion legitima con otra clave;
- no impide una anulacion legitima con otra clave;
- si una operacion quedo `processing` demasiado tiempo, debe existir estrategia
  de recuperacion antes de reintentar.

### 9.2 Idempotencia de transporte

El transporte usa el `fiscal_record_id` como referencia estable.

Reglas:

- repetir envio del mismo registro reutiliza el mismo XML;
- un reintento crea un nuevo intento o retoma uno `failed_retryable`;
- no crea un nuevo registro fiscal;
- `accepted` es terminal salvo criterio AEAT contrario documentado.

## 10. Seguridad y permisos

RLS y privilegios esperados:

- `anon`: sin acceso a tablas fiscales.
- `authenticated`: lectura propia limitada donde la UI lo necesite.
- `authenticated`: sin `insert`, `update` ni `delete` directos sobre documentos
  canonicos bloqueados, operaciones fiscales, registros fiscales, cadena ni
  transporte.
- `service_role`: escrituras solo desde rutas servidor o jobs controlados.

Rutas servidor:

- derivan usuario desde Bearer token;
- ignoran `user_id`, plan, entorno fiscal y estado enviados por cliente;
- validan permisos de plan si la funcion se liga a Pro;
- no exponen `SUPABASE_SERVICE_ROLE_KEY`;
- no aceptan documento fiscal completo desde navegador para registrar AEAT;
- usan `expectedVersion` y `idempotency_key`;
- registran auditoria de intentos rechazados.

Auditoria minima:

- usuario;
- ruta/operacion;
- documento;
- version esperada y version real;
- resultado;
- hash de payload;
- fecha;
- motivo de rechazo si aplica.

## 11. Sincronizacion local/nube

Estado actual:

- `sync_entities` admite upsert de entidades desde cliente autenticado.
- Ese modelo es util para datos operativos, pero no debe poder degradar
  documentos emitidos/bloqueados.

Reglas 2B:

- documentos emitidos/bloqueados deben validarse en servidor;
- si un cliente antiguo sube un documento bloqueado alterado, se rechaza o se
  crea conflicto;
- los snapshots y hashes del servidor prevalecen;
- borradores pueden seguir sincronizando con menos restricciones;
- importaciones/backups deben pasar por una ruta de ingest con validacion, no
  por sobrescritura directa de documentos canonicos protegidos.

Offline:

- borradores offline siguen permitidos;
- emision VERI*FACTU productiva requiere conexion y confirmacion servidor;
- cola fiscal offline queda fuera de esta primera 2B;
- modo local no se declara automaticamente NO VERI*FACTU.

## 12. Entornos

Entornos logicos:

- `local_preview`: pruebas de UI/PDF sin validez productiva.
- `test`: entorno tecnico de pruebas con AEAT/preproduccion cuando proceda.
- `production`: entorno productivo, bloqueado hasta staging, credenciales,
  certificado/transporte y validacion.

Reglas:

- no mezclar cadenas entre entornos;
- `fiscal_chain_state` incluye `environment`;
- QR y frases productivas solo se muestran cuando el flujo productivo real este
  cerrado;
- ninguna migracion se aplica a Supabase produccion durante este plan.

## 13. Compatibilidad con Fase 2A

2B debe respetar:

- `documentSnapshot` como fuente documental congelada;
- `pdfSnapshot` y `pdfSnapshot.contentHash`;
- `documentLifecycle`;
- `integrityLock`;
- `customerId` operativo sin reescribir destinatario historico;
- recibos y rectificativas protegidas;
- PDF historico desde snapshot.

No debe permitir que una ruta servidor vieja:

- quite `integrityLock`;
- vuelva `issued` a `draft`;
- borre snapshot;
- reescriba cliente historico;
- renumere emitidos;
- elimine registros fiscales o intentos ya aceptados.

## 14. Plan por pasos pequenos

### 2B.0 - Plan documental

Este documento.

Sin codigo, sin migraciones, sin produccion.

### 2B.1 - Diseno de esquema y staging

Objetivo:

- redactar migraciones nuevas para local/staging;
- crear rollbacks manuales si aplica;
- definir baseline de produccion sin aplicarlo;
- preparar matriz RLS/GRANT/REVOKE.

No tocar produccion.

### 2B.2 - Documento canonico servidor y sync protegida

Objetivo:

- crear repositorio servidor de documentos canonicos;
- validar `expectedVersion`;
- bloquear mutaciones incompatibles;
- crear conflictos en vez de sobrescribir bloqueados;
- mantener compatibilidad con clientes actuales.

### 2B.3 - Operacion fiscal transaccional

Objetivo:

- implementar transaccion para `alta_inicial`;
- bloquear cadena;
- calcular hash;
- insertar operacion y registro;
- actualizar cadena;
- cubrir concurrencia e idempotencia.

Sin transporte AEAT real todavia.

### 2B.4 - Subsanacion y anulacion

Objetivo:

- implementar `alta_subsanacion`;
- implementar `anulacion`;
- modelar relaciones con registros previos;
- no usar borrado fisico.

### 2B.5 - Transporte AEAT separado

Objetivo:

- crear intentos de transporte;
- enviar XML desde registro inmutable;
- manejar aceptado, rechazado retryable, rechazado final y errores tecnicos;
- reintentar sin crear nuevo registro.

Primero en entorno test.

### 2B.6 - UI/UX de emision servidor

Objetivo:

- que la UI pida emision servidor cuando corresponda;
- bloquear VERI*FACTU productivo offline;
- mostrar estados claros;
- no prometer cumplimiento productivo antes de validacion.

### 2B.7 - Aceptacion tecnica y compliance

Objetivo:

- pruebas completas;
- informe de aceptacion;
- actualizacion del dossier vivo;
- checklist de produccion separado.

## 15. Tests minimos por fase

### Documento canonico

- crear borrador servidor;
- editar borrador con `expectedVersion` correcto;
- rechazar version antigua;
- rechazar cambio de emitido/bloqueado;
- cliente antiguo intenta desbloquear;
- sync concurrente de dos dispositivos;
- backup/import intenta reemplazar snapshot.

### Operacion fiscal

- alta inicial correcta;
- doble alta inicial concurrente con misma clave;
- doble alta inicial concurrente con claves distintas;
- saldo de cadena no se corrompe;
- previousHash corresponde al registro anterior;
- timestamp y hash quedan estables tras insertar;
- fallo intermedio hace rollback completo;
- reintento idempotente devuelve registro existente.

### Registros fiscales

- registro no actualizable;
- registro no borrable;
- multiples registros para misma factura cuando procede;
- no existe constraint `unique(user_id, document_id, record_type)`;
- identity fiscal evita duplicar alta inicial.

### Transporte AEAT

- intento aceptado;
- firma/certificado ausente en test controlado;
- error tecnico retryable;
- rechazo final;
- reintento no crea nuevo registro;
- dos workers no envian dos veces el mismo intento `sending`.

### Seguridad

- `anon` no accede;
- `authenticated` solo lee lo propio permitido;
- `authenticated` no escribe operaciones fiscales;
- service role solo desde servidor;
- service role no aparece en bundle cliente;
- payload con `user_id` ajeno se ignora.

## 16. Migraciones futuras

Este PR no crea migraciones.

Cuando se implementen:

- solo en `supabase/migrations`;
- rollbacks manuales en `supabase/rollbacks`;
- nombres versionados unicos;
- primero local;
- despues staging;
- produccion solo con baseline validado;
- `git diff --check`, `npm run check:migrations`, tests y aceptacion dinamica.

Rollback:

- no borra registros fiscales;
- no reabre documentos bloqueados;
- puede desactivar rutas o feature flag;
- puede marcar operaciones como no disponibles;
- conserva datos para auditoria.

## 17. Cambios expresamente fuera de alcance

No hacer en esta fase documental:

- codigo;
- migraciones;
- deploy manual;
- Vercel promote;
- dominios, aliases o DNS;
- Supabase produccion;
- credenciales reales AEAT;
- certificados reales;
- Stripe;
- precios o planes;
- IA;
- importadores;
- redisenos de UI;
- declaracion responsable final;
- afirmaciones de cumplimiento productivo.

## 18. Criterio de aceptacion de este PR documental

Este PR sera aceptable si:

- solo anade `docs/phase2b-server-verifactu-plan-v1.md`;
- no toca codigo;
- no toca migraciones;
- no toca Vercel;
- no toca Supabase produccion;
- mantiene lenguaje prudente;
- define modelo canonico servidor;
- define operacion fiscal transaccional;
- define registro fiscal inmutable;
- define transporte AEAT separado;
- define estados, idempotencia y seguridad;
- deja claro que 2B aun no esta implementada.

## 19. Veredicto

Veredicto: **APTO PARA ABRIR PLAN DE FASE 2B**.

La Fase 2A aporta una base local suficiente para disenar Fase 2B, pero Fase 2B
no debe implementarse directamente contra produccion. El siguiente paso debe ser
un trabajo de diseno de esquema y staging, con migraciones futuras revisadas,
RLS/GRANT/REVOKE, pruebas de concurrencia y aceptacion dinamica antes de
cualquier despliegue productivo.
