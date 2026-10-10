# ADR-0010: Autoridad central para la emision de facturas

- Estado: aceptado
- Version: 7
- Fecha: 2026-10-09

## Fiabilidad V7: emisión de un borrador compartido

ADR-0011 V32 comparte únicamente borradores guardados. Si existe un borrador
central con el mismo ID local, la emisión exige su `centralBusinessDraftVersion`
vigente y lo retira mediante tombstone en la misma transacción PostgreSQL.
Un borrador borrado o cambiado por otro usuario aborta la emisión entera, sin
asignación definitiva de número ni documento huérfano. Un documento nuevo aún
no guardado conserva la emisión directa existente. Los eventos operativos de
borrador nunca eliminan ni sustituyen un documento ya emitido.

## Fiabilidad V6: lectura y avisos por empresa

Los avisos de facturas usan la misma comprobacion de membresia activa por
empresa que los avisos operativos: `data_owner_id` puede diferir de `auth.uid()`.
La tabla solo expone IDs opacos y fechas, nunca payload fiscal. No cambian los
permisos de escritura, la autenticacion de las APIs ni la asignacion central.
La suscripcion inicial y `pageshow` fuerzan una lectura por cursor. Una pagina
completa programa inmediatamente la siguiente, no el sondeo ocioso de tres
minutos. La recepcion usa el overflow verificado de ADR-0005 V21 cuando la
copia completa excede la cuota pequeña de `localStorage`.

## Decision de producto V5: correccion y borrado central ordinarios

El propietario autoriza expresamente editar facturas ordinarias emitidas,
cambiar su cliente, regenerar su PDF, borrar facturas y reutilizar su numero.
Esta decision reemplaza la inmutabilidad absoluta y la reserva perpetua de
numeros de V4 solo mediante el nuevo comando `manage_central_invoice_v1`.
No habilita el mutador ni el borrado genericos del navegador.

- Se exige empresa autenticada, miembro owner/admin, plan/dispositivo vigentes,
  autoridad central activa, identidad tecnica y `expectedVersion`.
- Editar conserva ID, numero, emisor original, instante original de emision,
  ejercicio, cobro y entrega. Solo cambia fecha dentro del ejercicio, cliente,
  conceptos y textos; snapshot, sello y configuracion PDF se regeneran en
  servidor. No es otra emision, no consume cuota y no vuelve a registrar VeriFactu.
- Una version obsoleta produce conflicto, nunca una sobrescritura silenciosa.
  Reintentar la misma correccion o borrado es idempotente.
- Borrar elimina contenido y snapshot del estado canonico. No crea una copia
  before/after ni obliga a descargar backups. Quedan solo tombstone tecnico,
  hashes de auditoria y eventos sin contenido para impedir resurrecciones.
- La identidad tecnica eliminada no se reutiliza. Su numero queda libre: bajo
  el candado de la serie la siguiente emision toma el menor numero explicitamente
  liberado en la misma empresa/entorno/NIF/serie/ejercicio. Nunca se rellenan
  huecos historicos por conjetura ni se renumeran otras facturas. Entre borrar y
  emitir de nuevo existe un hueco temporal. Los indices unicos protegen reservas
  activas y el contador maximo no retrocede.
- Los dispositivos reciben el estado actual, incluidas correcciones y borrados;
  una fila antigua del outbox nunca reconstruye contenido ya eliminado. El
  cursor no avanza por una confirmacion de escritura, solo tras pull durable.
- Antes de corregir/borrar una factura con recibo activo debe borrarse ese
  recibo. Rectificativas, originales rectificados, historicos atestados,
  recuperaciones y registros externos de produccion permanecen en sus flujos
  especializados. Un artefacto local TEST no acredita el contenido corregido.

Regresiones V5: `invoice-management.test.ts`,
`invoice-management-postgres-acceptance.test.ts`, eventos centrales, integridad,
durabilidad y aislamiento de empresas. La migracion no modifica ninguna factura
ni libera numeros hasta una accion explicita del usuario.

Publicacion V5: CI completo y aceptacion PostgreSQL sintetica antes de merge;
aplicar solo la migracion nueva, nunca un `db push` del historial antiguo no
reconciliado. Verificar RPC privado, indices parciales, proyeccion de eventos y
estado READY del commit publico, sin modificar facturas reales para hacer QA.
La migracion es transaccional y aborta si las funciones desplegadas no contienen
el contrato esperado. Ante un incidente, pausar escrituras centrales y mantener
lectura; no revertir los indices ni restaurar contenido borrado, y no desplegar
un lector antiguo incapaz de reconocer los nuevos eventos tras el primer uso.

## Contexto

Factu conserva hoy el estado operativo en cada navegador y sincroniza entidades
con Supabase. Antes de emitir, el cliente intenta descargar cambios pendientes,
pero el numero definitivo se calcula y guarda localmente. Dos dispositivos que
parten de copias distintas pueden asignar la misma identidad fiscal antes de que
la sincronizacion detecte la colision.

El repositorio ya contiene fundamentos de documentos canonicos, control de
version, idempotencia, identidades fiscales y cadena, pero sus rutas y
migraciones se declararon expresamente para local y staging. Produccion no
dispone todavia de esas tablas ni de una transaccion de emision autoritativa.

## Decision

1. El servidor sera la unica autoridad para asignar la identidad definitiva de
   facturas y rectificativas emitidas por Factu.
2. Los borradores pueden seguir siendo locales y funcionar sin conexion. La
   emision definitiva requiere conexion y una respuesta confirmada del servidor.
3. El navegador nunca reserva ni decide el siguiente numero fiscal. Envia un
   comando con clave idempotente, version esperada y huella del borrador.
4. PostgreSQL serializa por empresa, entorno, NIF emisor, serie y ejercicio. La
   asignacion del numero, identidad, documento congelado, version, auditoria y
   evento de salida se confirma dentro de una unica transaccion.
5. Una restriccion `UNIQUE` protege la identidad
   `(user_id, environment, issuer_nif, series_code, fiscal_year, sequence)`.
   La fecha de expedicion forma parte del registro fiscal, pero no permite
   reutilizar el mismo numero.
6. Repetir una clave idempotente con la misma peticion devuelve el resultado ya
   confirmado. Reutilizarla con contenido distinto se rechaza y se audita.
7. Un timeout posterior al commit no crea otra factura: el reintento recupera el
   resultado del primer comando.
8. El mutador generico sigue rechazando facturas emitidas. V5 permite su
   correccion o borrado mediante el comando central separado descrito arriba;
   nunca mediante renumeracion del resto del conjunto.
9. Los retiros y reparaciones identifican documentos por ID tecnico, version y
   huella. Compartir numero nunca autoriza a retirar otro documento.
10. Realtime solo comunica que existe una version nueva. El cliente vuelve a
    leer el estado canonico. Con el canal suscrito, el sondeo queda como red de
    seguridad cada tres minutos y se dispersa entre dispositivos; si el canal
    falla, baja temporalmente a treinta segundos hasta recuperarlo.
11. Restaurar una copia local antigua no puede sobrescribir documentos ni
    secuencias cuya autoridad ya sea central.
12. Los limites Pro y Pro+ se validan en servidor mediante el dispositivo y la
    sesion activos. Debe funcionar con hasta cinco dispositivos concurrentes.
13. La activacion se hace por modos `off`, `shadow`, `canary` y `required`.
    `shadow` no escribe identidades fiscales. `canary` exige allowlist y
    aprobacion explicita en produccion.
    Los modos con escrituras fiscales exigen ademas que la sincronizacion
    operativa este marcada como lista, que la baseline de produccion este
    reconciliada con Git y que exista copia restaurable con ensayo aislado
    superado. Dentro de `canary`, una cohorte porcentual determinista por UUID
    puede ampliar la elegibilidad. El porcentaje empieza en cero y usa la misma
    asignacion en navegador y servidor. El comodin solo puede activarse tras
    verificar con cuentas sinteticas el alta central automatica, el segundo
    dispositivo, el aislamiento por propietario y el fail-closed. La compuerta
    de plan mantiene Gratis local; Pro y Pro+ no pueden emitir localmente
    mientras su bootstrap central siga pendiente.
14. Una vez activada la autoridad central para una serie, un incidente puede
    pausar nuevas emisiones mediante el interruptor de emergencia, pero
    mantiene la lectura de eventos y nunca devuelve esa serie a numeracion
    local.
15. PITR es recomendable, no obligatorio. La puerta operativa exige una copia
    recuperable y una restauracion ensayada, sin imponer un proveedor o
    tecnologia concretos.

## Migracion

La transicion sera aditiva. `sync_entities` y las vistas actuales permanecen
intactas mientras el servidor proyecta documentos canonicos al formato vigente.
No se aplica ninguna migracion remota hasta reconciliar el historial real de
Supabase con Git y aprobar una linea base reproducible.

Los documentos existentes se registraran como historicos sin reemitirlos,
renumerarlos ni fabricar evidencia. Las colisiones previas se clasificaran de
forma explicita y conservaran todos sus IDs y copias. Una identidad que haya
estado emitida o retirada queda reservada salvo liberacion explicita V5.

La aplicacion durable de eventos fiscales centrales no vuelve a publicar el
documento recibido en la cola legacy pausada. El cursor solo avanza despues del
guardado y readback habituales. Esta regla no vacia entradas legacy previas ni
autoriza a retirar, editar o renumerar facturas: esas entradas se conservan
hasta una decision explicita de migracion.

## Rollback

- Antes del canario, desactivar el flag conserva el flujo vigente.
- Realtime puede desactivarse sin cambiar la autoridad; el sondeo degradado
  sigue leyendo por cursor.
- Despues de activar una serie, el kill switch pausa emisiones y mantiene
  lectura. No se permite fallback local.
- Las primeras migraciones son aditivas. El rollback operativo desactiva rutas
  y workers; no elimina ledgers, identidades ni auditoria.

## Contratos relacionados

- [ADR-0002](ADR-0002-app-issued-document-recovery.md)
- [ADR-0003](ADR-0003-explicit-test-document-retirement.md)
- [ADR-0005](ADR-0005-cloud-and-drive-sync-reliability.md)
- [Diseño de esquema V1](central-invoice-authority-schema-v1.md)
