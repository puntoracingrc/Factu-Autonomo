# ADR-0011: Autoridad central para datos operativos

- Estado: aceptado
- Version: 4
- Fecha: 2026-07-29

## Contexto

La emision fiscal ya dispone de una autoridad central transaccional, pero las
fichas maestras y los datos operativos todavia se guardan primero en cada
navegador. La tabla `sync_entities` replica despues esos cambios con marcas de
tiempo. Ese modelo no puede impedir que dos dispositivos partan de una version
distinta ni explicar con precision cual de las dos escrituras debe aceptarse.

## Decision

1. PostgreSQL sera la autoridad canonica de clientes, proveedores, productos,
   gastos, gastos recurrentes, recordatorios y perfil.
2. Cada entidad tendra una version monotona. Toda mutacion indicara
   `expectedVersion`; una version atrasada producira conflicto y nunca
   sobrescribira silenciosamente.
3. Cada comando tendra una clave idempotente y una huella de la peticion.
   Repetir el mismo comando devolvera el resultado confirmado; reutilizar la
   clave con otro contenido se rechazara.
4. Estado canonico, version, comando confirmado y evento de salida se guardaran
   en una unica transaccion.
5. Las tablas centrales seran privadas. El navegador solo accedera mediante
   rutas autenticadas que validen tambien el dispositivo y la sesion.
6. El outbox sera la fuente ordenada para que los demas dispositivos descarguen
   cambios confirmados. Realtime solo despertara al cliente; la lectura
   autoritativa seguira siendo una peticion con cursor.
7. La migracion sera aditiva y por canario. No se reactivara
   `sync_entities`, ni se importaran datos reales, hasta disponer de
   comparacion y bootstrap verificables.
8. Las facturas y rectificativas emitidas siguen bajo ADR-0010. Esta autoridad
   operativa no puede editar, borrar ni renumerar un documento fiscal emitido.

## Fases

1. Crear el ledger privado, control de version, idempotencia y outbox.
2. Exponer rutas de mutacion y lectura con autenticacion, dispositivo, limites
   y canario apagado por defecto.
3. Conectar clientes, proveedores y productos en la cuenta de pruebas.
4. Incorporar gastos, recordatorios, perfil y documentos no fiscales.
5. Añadir cola offline visible y resolucion explicita de conflictos.
6. Comparar y hacer bootstrap de la cuenta real; despues retirar la escritura
   de `sync_entities`.

La ruta de mutacion de la fase 2 permanece apagada por defecto. Para escribir
exige esquema, gate operativo, aprobacion de produccion y allowlist explicita.
El navegador no recibe `service_role` ni puede ejecutar directamente la RPC.

La lectura usa el `event_sequence` monotono del outbox como cursor. Cada
dispositivo solicita solo eventos posteriores al ultimo confirmado; no decide
por marcas de tiempo ni accede directamente a las tablas centrales.

El preflight autenticado de la fase 2 comprueba las tres tablas con lecturas
`HEAD` sin filas y ejecuta ambas RPC con entradas invalidas a proposito. Solo
declara `writesPossible` cuando el dispositivo esta vigente, el canario aplica,
los gates de entorno permiten escribir y todos los rechazos seguros responden
como se espera. Este estado se consulta con `no-store` y no sustituye una
confirmacion de escritura.

Los clientes clasifican un fallo de red o servidor como reintentable, pero
nunca reintentan automaticamente un conflicto de version, una clave
idempotente reutilizada o una entidad ya eliminada. PostgreSQL expone esos
casos con SQLSTATE estables (`P4103`, `P4102` y `P4104`) y la API los traduce a
codigos de dominio. La cola cliente debe conservar esos conflictos hasta una
decision explicita.

La cola duradera se separa por propietario y se escribe y relee antes de
permitir la mutacion local. Procesa en FIFO, conserva la misma clave idempotente
en todos los reintentos y no usa la secuencia devuelta por una escritura para
adelantar el cursor de descarga: podria haber eventos intermedios de otro
dispositivo. Una pagina descargada solo confirma su cursor despues de aplicar
todos sus eventos. Si falla a mitad, se repite de forma idempotente; si coincide
con una operacion local pendiente, ambas versiones quedan en conflicto
explicito. Las transiciones de la cola se ejecutan bajo Web Locks por
propietario cuando el navegador lo soporta, con serializacion local de respaldo
para evitar que dos acciones de la misma pestaña se pisen.

## Rollback

Antes del corte, desactivar el canario conserva el flujo local actual. Las
tablas son aditivas y no modifican datos existentes. Una vez una entidad se
declare central, el rollback operativo pausa nuevas escrituras y mantiene la
lectura; nunca vuelve a permitir sobrescrituras silenciosas desde una copia
atrasada.

## Contratos relacionados

- [ADR-0005](ADR-0005-cloud-and-drive-sync-reliability.md)
- [ADR-0010](ADR-0010-central-invoice-authority.md)
