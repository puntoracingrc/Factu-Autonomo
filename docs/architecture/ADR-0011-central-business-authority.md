# ADR-0011: Autoridad central para datos operativos

- Estado: aceptado
- Version: 32
- Fecha: 2026-10-10

## Cambio V32: cobertura de escrituras compartidas y borradores guardados

El propietario solicita sincronización en tiempo real de todos los datos de
empresa y autoriza expresamente compartir los borradores guardados con los
otros dispositivos y administradores. Escribir sin guardar sigue siendo privado
de la pantalla y no crea una operación contable ni una emisión.

- Edición/borrado de presupuestos, marcas de envío y recordatorios del panel
  usan comandos centrales, CAS y commit durable después de confirmar servidor.
- La fusión de clientes/proveedores publica un único lote atómico, incluyendo
  sus referencias operativas, gastos, productos y avisos afectados. No cambia
  snapshots, PDF o sellos de facturas existentes. NIF distintos siguen prohibidos.
  Más de 100 entidades se rechazan antes de escribir, nunca se parten en lotes
  que puedan quedar a medias.
- La edición y retirada de proveedores también confirman sus gastos y productos
  relacionados en el mismo lote. Se cubren ambas referencias de proveedor del
  producto (principal y compra), preservando costes, importes e historia.
- `document_draft` contiene exclusivamente borradores guardados de factura y
  recibo, sin evidencia fiscal, con número `BORRADOR` y sin consumir series.
  Solo Guardar puede adoptar un borrador antiguo aún local; no se publican
  automáticamente. Duplicar y convertir presupuestos usan este mismo flujo.
- `centralBusinessDraftVersion` es metadato operativo de CAS, no parte del
  snapshot ni del PDF. Emitir comprueba esa versión y retira el borrador en la
  misma transacción. Una edición concurrente aborta toda la emisión y no gasta
  un número. Eventos tardíos de borrador nunca borran ni degradan una factura emitida.
- Recibos manuales usan asignación central y conservan el emisor, IVA y plantilla
  originales en su contrato de materialización, sin copiar IRPF ni preferencias
  privadas. Su entrega es un overlay que no cambia el contenido sellado.
- El buzón y notificaciones fiscales despiertan por Broadcast privado del mismo
  owner scope. Solo se transmite `kind`, nunca contenido ni PII; se relee mediante
  APIs autorizadas. Reconexión y sondeo de seguridad recuperan avisos perdidos.
  Las lecturas auxiliares de seguridad se limitan a una cada 30 segundos;
  una invalidación real o cambio de empresa fuerza lectura sin esperar.
- Un tombstone proyectado puede ser la primera versión de un dispositivo nuevo,
  incluso mayor que uno. Se verifica hash y seguridad local antes de avanzar el
  cursor. No permite resurrección ni aceptar un upsert con versiones omitidas.

## Cambio V31: aceptación y rechazo de presupuestos sincronizados

Los botones de aceptar, rechazar y desmarcar usan la mutación versionada de
`quote`, no el mutador local, cuando la empresa tiene autoridad central. Reciben
primero el outbox y exigen versión confirmada, preflight, CAS e idempotencia.
Solo muestran el cambio tras la confirmación central y el commit durable; el
aviso Realtime existente despierta a los demás dispositivos de esa empresa.
Una caída de red o versión desconocida nunca habilita fallback local. Los planes
locales conservan el flujo local. No cambia el número, cliente, conceptos ni
evidencia preservada del presupuesto, y las marcas antiguas exclusivamente
locales no se publican automáticamente por encima del estado del servidor.
El commit de caché puede esperar la base IndexedDB verificada de ADR-0005 V21
y no genera una cola legacy ni adelanta el cursor del outbox.

## Cambio V30: borrado central de recibos

El propietario autoriza borrar recibos incluso emitidos, pagados o enviados.
Se usa el comando operativo `delete` existente con version esperada, diario
idempotente y confirmacion servidor-primero. El evento elimina el recibo de todos
los dispositivos y limpia exclusivamente `receiptDocumentId` de su factura;
no borra la factura, no deshace un cobro y no renumera los recibos supervivientes.
No exige ni crea copias before/after. Los historicos atestados y recuperaciones
conservan sus flujos propios. ADR-0010 V5 permite editar/borrar facturas solo
con su comando fiscal separado, nunca mediante esta RPC operativa.

Para un recibo eliminado, el pull proyecta su tombstone actual tambien sobre
sus eventos de alta antiguos (version/hash actuales, payload nulo). Asi un
dispositivo nuevo no reconstruye un recibo cuyo origen ya se borro y no queda
bloqueado por `RECEIPT_SOURCE_MISSING`. La secuencia y los IDs de eventos no
cambian; el resto de entidades mantiene su replay ordenado original.

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
   autoritativa seguira siendo una peticion con cursor. Con Realtime suscrito,
   el sondeo de seguridad se ejecuta cada tres minutos con dispersion; si el
   canal se degrada, se usa temporalmente un respaldo de treinta segundos.
7. La migracion sera aditiva y por canario. Gratis permanece local. Una cuenta
   con plan cloud seleccionada por el rollout bloquea sus acciones de negocio
   mientras resuelve plan, dispositivo y bootstrap. El cliente recibe primero
   los eventos centrales y solo incorpora automaticamente un snapshot aditivo
   o ya identico; cualquier conflicto queda para revision explicita.
8. Las facturas y rectificativas emitidas siguen bajo ADR-0010. Esta autoridad
   operativa no puede editar, borrar ni renumerar un documento fiscal emitido;
   la correccion y el borrado de ADR-0010 V5 usan su RPC separada.
9. El escritor y lector genéricos del navegador quedan retirados para todas las
   cuentas autenticadas. El porcentaje de rollout puede pausar o limitar la
   autoridad central, pero nunca reactiva la ruta anterior.
10. Notificaciones fiscales usa `workspace_auxiliary_entities` con CAS y RLS
    por propietario. El buzón de gastos usa sus tablas dedicadas de servidor.
    Ninguna de las dos funciones vuelve a `sync_entities` como fallback.
11. `sync_entities` y `user_backups` se renombran como archivos fríos sin
    acceso del navegador. Solo `service_role` conserva lectura para auditoría;
    no se permiten nuevas escrituras ni restauraciones automáticas desde ellos.
12. `meta.pendingChanges` deja de transportar negocio genérico. Solo conserva
    compatibilidad local para un pendiente auxiliar fiscal o para descartar de
    forma consciente una cola antigua durante una adopción central verificada.

## Fases

1. Crear el ledger privado, control de version, idempotencia y outbox.
2. Exponer rutas de mutacion y lectura con autenticacion, dispositivo, limites
   y canario apagado por defecto.
3. Conectar clientes, proveedores y productos en la cuenta de pruebas.
4. Incorporar gastos, recordatorios, perfil y documentos no fiscales.
5. Hacer las escrituras servidor-primero y conservar solo un sobre tecnico de
   recuperacion cuando la respuesta de una peticion ya enviada sea ambigua.
6. Comparar y hacer bootstrap de la cuenta real; despues retirar la escritura
   de `sync_entities`.
7. Verificar con cuentas sinteticas el alta cloud, dos dispositivos, todos los
   tipos operativos y el aislamiento entre propietarios antes de habilitar el
   comodin general.

Durante esta retirada, aplicar o adoptar una pagina ya verificada del outbox no
genera otra vez las mismas fichas en `meta.pendingChanges`. El cursor central,
el checkpoint de versiones de la cache y el readback de AppData siguen siendo
obligatorios; una cola de cambios locales ya no es una fuente operativa ni
habilita trabajo offline dentro de la autoridad central.
Las entradas legacy que ya existan se conservan sin alteraciones hasta una
accion explicita de migracion o restauracion, y cualquier guardado local fuera
del contrato central mantiene el seguimiento anterior.

Para una cuenta cloud nueva incluida en el rollout, el sincronizador legacy se
retira desde el primer arranque central, pero su cola local no se borra. La
preparacion automatica recibe eventos, compara el snapshot operativo y crea
solo fichas ausentes. Un dispositivo que ya tenga un corte explicito no repite
el bootstrap. Un fallo de red reintenta; un conflicto o una ficha solo central
que no pueda recibirse mantiene las acciones bloqueadas y exige revision en
Cuenta. Las facturas historicas locales quedan fuera de este bootstrap y no se
reinterpretan como emisiones centrales.

La restauracion explicita de un dispositivo desde las autoridades centrales
puede retirar su `meta.pendingChanges` legacy sin publicar esas operaciones.
La confirmacion muestra cuantas fichas existen solo en el dispositivo y avisa
que se descartaran localmente. Tras la adopcion, clientes, proveedores,
productos, recordatorios, gastos, gastos fijos, presupuestos, recibos y perfil
se vuelven a comparar sin diferencias.
Antes de retirar la cola, el dispositivo descarga y guarda hasta vaciar los
eventos de facturas de ADR-0010. El recuento y el contenido exacto de los
pendientes confirmados al iniciar la accion deben seguir intactos y la retirada
se persiste con readback en una unica transicion que no vuelve a generar
tracking legacy. Cualquier cambio, conflicto, pagina pendiente o escritura
local indeterminada conserva la cola completa. La operacion no escribe en el
servidor ni modifica el contenido de los documentos; solo impide que una copia
expresamente descartada vuelva a publicarse desde ese dispositivo.

La ruta de mutacion de la fase 2 permanece apagada por defecto. Para escribir
exige esquema, gate operativo, aprobacion de produccion y allowlist explicita.
El navegador no recibe `service_role` ni puede ejecutar directamente la RPC.

La lectura usa el `event_sequence` monotono del outbox como cursor. Cada
dispositivo solicita solo eventos posteriores al ultimo confirmado; no decide
por marcas de tiempo ni accede directamente a las tablas centrales.

El despertar de negocio usa Broadcast privado por propietario y solo contiene
`event_sequence`; no publica fichas, importes, NIF, hashes ni el contenido del
outbox. La autorizacion del canal resuelve el propietario central contra la
membresia activa de la empresa, porque en un workspace compartido ese
propietario no tiene por que coincidir con `auth.uid()`. Si el WebSocket falla,
el sondeo por cursor continua como respaldo.

El preflight autenticado de la fase 2 comprueba todas las tablas requeridas con
lecturas `HEAD` sin filas y ejecuta cada RPC con entradas invalidas a
proposito. Solo declara `writesPossible` cuando el dispositivo esta vigente, el
canario aplica, los gates de entorno permiten escribir y todos los rechazos
seguros responden como se espera. Este estado se consulta con `no-store` y no
sustituye una confirmacion de escritura.

Los clientes clasifican un fallo de red o servidor como no confirmado, pero
nunca presentan el cambio como guardado localmente ni reintentan a ciegas un
conflicto de version, una clave idempotente reutilizada o una entidad ya
eliminada. PostgreSQL expone esos casos con SQLSTATE estables (`P4103`, `P4102`
y `P4104`) y la API los traduce a codigos de dominio.

Cada escritura central sigue este orden: descargar eventos pendientes,
comprobar el preflight, preparar una identidad idempotente, enviar la mutacion
con `expectedVersion`, recibir la confirmacion transaccional y solo entonces
actualizar la cache local visible. Sin conexion o sin preflight valido no se
aplica ningun cambio de negocio confirmado en el navegador. Un formulario de
factura o presupuesto puede conservarse como borrador local pendiente y sin
numeracion definitiva, pero no aparece como emitido, no consume contador ni
entra en contabilidad. Al recuperar conexion, la misma identidad idempotente se
reutiliza en el reintento al servidor y solo su confirmacion materializa el
documento numerado.
Para resolver una respuesta ambigua puede conservarse por propietario un sobre
tecnico temporal con esa identidad; nunca se proyecta como dato confirmado,
nunca adelanta el cursor y desaparece al confirmar o rechazar la operacion. Las
transiciones se serializan bajo Web Locks por propietario cuando el navegador
lo soporta, con serializacion local de respaldo.

La secuencia devuelta por una escritura no adelanta el cursor de descarga:
podria haber eventos intermedios de otro dispositivo. Una pagina descargada
solo confirma su cursor despues de aplicar todos sus eventos a la cache y
verificar su readback. Realtime sigue siendo unicamente el aviso que dispara
esa lectura autoritativa.

El primer flujo funcional es la creacion de clientes y permanece limitado por
una allowlist publica de UUIDs sin datos fiscales, ademas del canario privado
del servidor. Fuera de esa lista se conserva exactamente el guardado local
anterior. Dentro del canario, el cliente consulta el preflight: un rechazo
autenticado o un servidor no preparado bloquean antes de escribir; un fallo
transitorio de red bloquea el guardado visible y no crea una ficha local. La
ficha cacheada y el comando central comparten ID y timestamp solo despues de
la confirmacion. El boton queda ocupado durante el commit para evitar dobles
operaciones. El
preflight tiene un limite corto: si una red degradada lo deja colgado, se trata
como fallo transitorio y no congela el formulario.

Crear o editar el cliente desde una factura o presupuesto reutiliza exactamente
esta cola central versionada antes de guardar el documento. Si la ficha
normalizada no cambia, se conserva su version y no se publica un evento vacio.
El documento emitido mantiene su snapshot congelado y nunca se reescribe por
una modificacion posterior del maestro.

Un commit de cache bloqueado despues de una confirmacion central no revierte ni
duplica el servidor: la UI informa que debe recargar y el outbox reconstruye la
copia local. Una confirmacion de escritura actualiza la version conocida de la
entidad, pero no adelanta el cursor del outbox.

La creacion manual de productos desde su formulario dedicado reutiliza el
mismo contrato. El producto normalizado y el comando central comparten ID y
timestamp; la cache local se materializa despues de confirmar. Las altas
automaticas y duplicados permanecen
locales hasta que sus flujos tengan control de version propio; activar este
canario no los convierte implicitamente en escrituras centrales.

La creacion, edicion y borrado manual de proveedores reutilizan ese contrato.
El borrado central aplica la retirada completa de la ficha maestra en una unica
transicion local: desvincula gastos y productos, pero conserva sus nombres, NIF,
lineas, precios, costes y snapshots historicos. Las altas automaticas de
proveedores dentro de gastos manuales, fijos o escaneados solo se centralizan
dentro del mismo lote atomico que el gasto; nunca se confirma una mitad sin la
otra.

Todas las escrituras de gastos usan autoridad central para una cuenta cloud
seleccionada: alta, edicion, borrado, captura escaneada, resumen de proveedor,
vinculos con documentos y rentabilidad, y creacion, activacion, cambio o
borrado de recurrencias. Editar una ocurrencia de un gasto fijo tampoco puede
usar el mutador local. Gratis conserva exactamente esos flujos en local.

Los documentos operativos entran por tipos centrales separados: `quote` para
presupuestos y `receipt` para recibos. La RPC, las tablas privadas y el cliente
rechazan `invoice`, rectificativas y cualquier payload que declare `factura`,
`centralInvoiceAuthority`, `rectification` o `verifactu`. Esta primera
ampliacion solo habilita la mutacion versionada y la recepcion validada; el
bootstrap, la numeracion y el cableado de formularios se activan en fases
posteriores y permanecen apagados por defecto.

El bootstrap incorpora presupuestos y recibos existentes al mismo snapshot
comparado de maestros y datos operativos. El navegador excluye toda `factura`;
el servidor valida la forma completa de cada documento, y PostgreSQL vuelve a
exigir `presupuesto` para `quote` y `recibo` para `receipt`, rechazando ademas
metadatos de autoridad fiscal, rectificacion o Veri*Factu. La vista previa y el
commit conservan las mismas reglas fail-closed, de forma que ningun documento
solo central, tombstone o contenido divergente puede quedar oculto dentro del
lote.

La numeracion de documentos operativos nuevos se asigna en PostgreSQL. Cada
plantilla conserva una serie monotona por propietario y tipo; si la plantilla
incluye `{year}`, el año forma parte de la serie, y si no lo incluye la
secuencia no se reinicia para evitar repetir numeros entre ejercicios. Antes de
la primera asignacion, una reconciliacion inmutable certifica el maximo
historico observado. El servidor guarda numero, payload versionado, comando y
evento de salida en una unica transaccion, conserva la identidad aunque el
documento se retire y rechaza las altas genericas que intenten aportar su propio
numero. Los presupuestos y recibos historicos incorporados por bootstrap no se
renumeran ni se marcan como incorrectos; su identidad central queda vacia y
solo los creados por esta autoridad reciben la nueva garantia.

La API autenticada `numbered-document` expone dos acciones separadas. La
conciliacion recibe solo plantilla, ejercicio, maximo, cantidad y huella del
inventario; la creacion recibe el documento sin `number` y devuelve el payload
materializado por PostgreSQL junto con version, evento, secuencia y numero. La
ruta valida sesion y dispositivo, aplica rate limit, mantiene `service_role`
fuera del navegador y usa `no-store`. El cliente rechaza cualquier respuesta
parcial y clasifica como conflicto no reintentable una serie sin conciliar, una
entidad ya creada o una clave idempotente reutilizada. Esta API puede probarse
sin cambiar todavia el guardado visible de los formularios.

El inventario previo del navegador solo incluye documentos cuyo numero coincide
exactamente con la plantilla configurada y envia una huella de IDs, numeros,
fechas y secuencias, nunca datos de cliente ni lineas. El contador configurado
actua como suelo monotono. Cuando la plantilla no contiene `{year}`, se revisan
todos los ejercicios y se concilia el alcance global `0`, evitando reinicios en
enero. El preflight rechaza una confirmacion con otro alcance o con un contador
inferior antes de permitir cualquier alta central.

Cada alta numerada conserva antes de la llamada un comando completo en un
diario local separado por propietario y lo relee byte a byte. Los reintentos
usan el mismo ID de entidad y la misma clave idempotente. Una confirmacion del
servidor se vuelve a persistir antes de modificar la copia visible y solo se
retira con un acuse que coincida en operacion, evento y hash. Los fallos
transitorios quedan pendientes; los conflictos y respuestas incoherentes quedan
bloqueados para revision y nunca generan automaticamente otra identidad.

La materializacion local usa exclusivamente el payload numerado devuelto por
PostgreSQL. Antes de escribir valida tipo, identidad, serie, ejercicio, secuencia
y alcance; una identidad local divergente o un numero ya ocupado bloquean la
transicion. Una repeticion byte-semantica no duplica el documento. Documento,
suelo de numeracion y contador correspondiente se guardan juntos mediante el
commit durable de AppStore, sin reducir ningun contador ya adelantado. El
adaptador se carga bajo demanda y el diario solo podra acusar la operacion
despues de que esta escritura haya terminado de forma confirmada.

El alta central de presupuestos se activa por una bandera publica y una lista
cerrada de UUID de usuario. Fuera de ese canario conserva el flujo local
anterior. Dentro del canario falla cerrado: primero termina una operacion
numerada anterior, recibe los eventos centrales, comprueba los gates del
servidor y concilia la serie. Solo entonces conserva el comando y solicita el
numero. Una respuesta perdida reintenta la misma clave; una confirmacion sin
commit local queda en el diario y se recupera antes de aceptar otro alta. El
formulario no puede degradar silenciosamente a numeracion local cuando el
canario central esta activo. Si se apaga la bandera, un UUID retirado conserva
el flujo local solo cuando su diario numerado esta vacio; una operacion ya
confirmada o pendiente se termina antes de permitir otro alta.

El candado transaccional por propietario se toma tambien al insertar o
reintentar cualquier comando ordinario. De este modo el bootstrap, una
reconciliacion de serie y una mutacion normal comparten el mismo orden de
bloqueo antes de tocar entidades concretas; ninguna escritura puede cruzar la
comparacion y el commit del snapshot.

La recepcion de datos centrales se ejecuta al arrancar la sesion, al volver a la
pestana, al recuperar conexion y al recibir el aviso Realtime. El sondeo
adaptativo solo recupera avisos perdidos: tres minutos con el canal suscrito,
treinta segundos mientras este degradado y dispersion entre dispositivos. Cada
alta del canario fuerza ademas una lectura justo antes del preflight de
escritura: un conflicto local bloquea la operacion, mientras una caida
transitoria de red impide confirmar la escritura y conserva, como maximo, el
borrador pendiente o el sobre tecnico necesario para resolver una respuesta
ambigua sin duplicarla.

El navegador valida la forma completa de la ficha recibida, su ID, version y
hash antes de incorporarla. Nunca pisa una ficha local divergente sin una
version central previa conocida. La aplicacion local se confirma con readback
antes de avanzar el cursor; si el proceso cae entre ambos pasos, la repeticion
es idempotente. Incluso un evento cuyo hash ya estaba confirmado vuelve a
verificar la presencia de su ficha local, de modo que puede reparar una
ausencia sin ocultarla detras del cursor.

Las ediciones y borrados de clientes y productos que ya tienen una version
central confirmada usan esa version como `expectedVersion`. Primero descargan
eventos, despues envian la operacion con su clave idempotente y solo tras la
confirmacion actualizan la cache local. Al recuperar conexion, foco o
visibilidad, el cliente resuelve cualquier sobre ambiguo antes de descargar el
outbox; asi un evento propio confirmado no se confunde con una operacion cuya
respuesta se perdio.

Un conflicto de version bloquea la escritura antes de tocar la cache y ordena
recibir la version autoritativa. Los sobres heredados de la etapa local-primero
siguen disponibles para revision agrupada y no se eliminan automaticamente;
las operaciones nuevas rechazadas no se convierten en cambios locales. Una
descarga parcial o fallida deja la recuperacion reintentable. Un conflicto de
idempotencia no ofrece reparacion automatica.

Una ficha antigua sin version en el ledger sigue local fuera del rollout. En
una cuenta cloud seleccionada, la ausencia de version obliga a terminar el
bootstrap automatico seguro antes de permitir cambios; no habilita fallback
local. Si la red impide clasificarla, el cambio se bloquea en vez de
centralizar o sobrescribir por conjetura. Dos cambios pendientes sobre la misma
entidad no se encadenan con una version obsoleta.

El bootstrap empieza por una vista previa autenticada y vinculada al
dispositivo. El servidor calcula por separado la huella del snapshot local y
la del estado central, y clasifica altas, coincidencias, conflictos y registros
solo centrales sin devolver payloads. Un tombstone central frente a una ficha
local es conflicto, nunca una resurreccion automatica. La vista previa no
escribe, y solo declara el commit posible cuando no hay conflictos ni registros
activos ausentes del snapshot local.

El commit exige la huella de esa vista previa, confirmacion literal y clave
idempotente. El servidor vuelve a comparar y PostgreSQL repite las comprobaciones
dentro de una unica transaccion antes de crear solo las fichas ausentes. Un
bloqueo transaccional por propietario se comparte con las mutaciones ordinarias,
de modo que ninguna escritura puede entrar entre la comprobacion y el lote. Un
conflicto, tombstone o registro solo central aborta el lote completo; la
auditoria del bootstrap conserva huellas y cantidades, pero no payloads.

El borrado remoto de un cliente aplica el contrato completo del maestro:
desvincula borradores y recordatorios operativos, pero conserva
byte-semanticamente el cliente congelado, snapshots, PDF, sellos, hashes y
evidencia de documentos emitidos. Las reorganizaciones de familias y
subfamilias que incluyen productos centrales usan un unico lote atomico con la
version esperada de cada producto y del perfil cuando migran reglas de margen.
El lote completo se envia y confirma en servidor antes de actualizar la cache
local; una respuesta ambigua conserva una unica identidad atomica de
recuperacion y nunca se descompone en escrituras parciales.
La fusion entre fichas de producto reutiliza el mismo contrato: actualiza o
materializa la ficha conservada, absorbe sus alias y completa campos ausentes,
y retira las fichas duplicadas dentro del mismo lote. Los gastos historicos no
se reescriben; sus descripciones siguen resolviendo al producto conservado
mediante los alias.

El corte final de una cuenta se registra por propietario en
`central_authority_cutovers` solo despues de obtener una copia cifrada,
comparar el PC autoritativo con central, adoptar central en los demas
dispositivos y retirar expresamente sus colas locales. La migracion de esquema
no activa ninguna cuenta por si sola. El registro conserva huella y tamaño de
la copia, cantidades verificadas, cola retirada y revision de codigo.

Tras completar el corte general, `sync_entities` y `user_backups` dejan de ser
rutas de runtime para cualquier propietario. Sus filas no se borran: se renombran
como archivos fríos, se revocan los grants del navegador y solo `service_role`
puede leerlas con fines de auditoría. Bandeja de gastos y espacio de
notificaciones fiscales se copian antes a tablas dedicadas. Los lotes locales
de retirada documental dejan de exponerse hasta disponer de un comando central
atómico que preserve su historial y rollback.

La ampliacion general usa una cohorte porcentual determinista por UUID comun a
datos operativos y facturas. La allowlist explicita sigue teniendo prioridad y
el porcentaje permanece en cero hasta aprobar metricas y elegibilidad. El
comodin solo se habilita despues de superar una prueba sintetica de alta,
escritura, recepcion en un segundo dispositivo, gastos completos y aislamiento
entre dos propietarios. Con el comodin activo, solo las cuentas con plan cloud
entran en autoridad central; Gratis sigue local. El sincronizador legacy queda
retirado para la cohorte aunque se active el interruptor de emergencia. Dicho
interruptor pausa nuevas escrituras sin detener la descarga del outbox ni
autorizar fallback local. Reducir carga o perder Realtime nunca convierte una
copia local en autoridad.

## Rollback

Desactivar el canario o el rollout pausa nuevas escrituras centrales y mantiene
la lectura. No reactiva el motor genérico retirado ni convierte una copia local
en autoridad. Las tablas archivadas son evidencia fría, no un mecanismo de
rollback operativo.

Tras el corte, el rollback exige pausar primero las escrituras centrales y
cambiar el registro del propietario a `rolled_back` con fecha de confirmacion.
Ese cambio desactiva el trigger y la policy restrictiva sin tocar el archivo
legacy. La allowlist publica retirada se elimina solo despues del readback de
base de datos y de revisar que ningun dispositivo central siga escribiendo.

## Contratos relacionados

- [ADR-0005](ADR-0005-cloud-and-drive-sync-reliability.md)
- [ADR-0010](ADR-0010-central-invoice-authority.md)
