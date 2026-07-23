# Autoridad central de facturas: diseno de esquema V1

Estado: diseno aprobado para implementacion local; no desplegable todavia.

## Puerta previa

Produccion no puede recibir esta base hasta que:

1. el inventario real de tablas, funciones, policies y migraciones se compare
   con Git;
2. exista una linea base que no intente aplicar migraciones local/staging;
3. una copia se haya restaurado de forma satisfactoria en un proyecto aislado;
4. la migracion aditiva y su verificacion hayan pasado en Supabase local y en
   staging privado;
5. el modo de autoridad siga `off`.

PITR puede mejorar el RPO, pero no es una dependencia de este contrato.

## Tablas

### `central_invoice_documents`

Documento canonico privado. Conserva `user_id`, `local_document_id`, version,
ciclo de vida, payload vigente, snapshot emitido, hashes, identidad fiscal y
marcas de tiempo. Un documento emitido queda bloqueado.

Unicidad:

- `(user_id, local_document_id)`;
- ID tecnico global.

### `central_invoice_document_versions`

Historial append-only de cada cambio aceptado o rechazado. Conserva version,
tipo de cambio, hashes anterior/posterior, actor saneado y fecha. No contiene
payloads en telemetria.

### `central_invoice_series_state`

Cabecera serializada por:

`(user_id, environment, issuer_nif, series_code, fiscal_year)`.

Conserva la ultima secuencia confirmada y una version. La RPC bloquea esta fila
con `FOR UPDATE` antes de asignar el siguiente numero.

### `central_invoice_identities`

Reserva permanente de la identidad asignada.

Unicidad obligatoria:

`(user_id, environment, issuer_nif, series_code, fiscal_year, sequence)`.

La identidad incluye tambien numero completo y fecha de expedicion. Retirar,
anular o rectificar una factura nunca libera la reserva.

### `central_invoice_commands`

Ledger idempotente privado:

- `(user_id, idempotency_key)` unico;
- `request_hash` para rechazar la reutilizacion contradictoria;
- documento, version esperada, dispositivo, estado y resultado canonico;
- timestamps de solicitud y finalizacion.

### `central_invoice_outbox`

Eventos creados dentro de la misma transaccion. Workers y Realtime publican una
senal sin payload fiscal. La entrega usa leases, reintentos e idempotencia.

## RPC `issue_invoice_v1`

La funcion se invoca solo con `service_role` desde una API autenticada:

1. valida usuario, dispositivo activo, entorno y contrato de entrada;
2. bloquea o recupera el comando idempotente;
3. bloquea el borrador y compara version y huella;
4. bloquea la cabecera de serie;
5. asigna la secuencia siguiente sin consultar el navegador;
6. inserta la identidad protegida por `UNIQUE`;
7. congela documento y snapshot;
8. registra version, comando y evento outbox;
9. devuelve el documento canonico dentro del mismo commit.

Una violacion de unicidad, version o huella aborta toda la transaccion. El
cliente no actualiza `AppStore` hasta recibir el documento canonico.

## Compatibilidad

Durante `shadow` no se asigna ni reserva ningun numero. Durante `canary`, el
resultado canonico se proyecta al modelo `Document` actual y a la superficie de
lectura vigente. `sync_entities` deja de ser autoridad para facturas emitidas,
pero puede conservar temporalmente una proyeccion compatible.

Una copia antigua puede aportar borradores o maestros tras revision, pero no
puede modificar documentos, identidades, secuencias o eventos centrales.
