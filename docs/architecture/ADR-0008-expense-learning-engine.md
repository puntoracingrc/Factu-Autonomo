# ADR-0008: Motor local de lectura y aprendizaje de gastos

- Estado: P4C1 con primitivos operativos; flags, scheduler, lectura y activación periódica apagados
- Fecha: 2026-07-21
- Ámbito: lectura de facturas y tickets recibidos, modo sombra, aprendizaje estructural y métricas agregadas

## Contexto

El escáner de gastos actual usa un proveedor de IA en cada análisis. Ya existen tres activos que deben converger sin duplicarse:

1. El flujo de Gastos, que propone datos y exige revisión antes de guardar.
2. Un lector local maduro en Notificaciones, con límites, PDF.js, OCR local, abortos, integridad y contenido efímero.
3. Un corpus sintético de facturas y un benchmark determinista. La línea base del 21 de julio de 2026 procesó 403 fixtures sintéticas sin IA y sin fallos.

Ese 100 % no demuestra precisión universal: el corpus es generado y puede compartir supuestos con el parser. Sirve como regresión y punto de partida, no como autorización para aceptar facturas reales sin revisión.

El aprendizaje anterior de Admin (`ai_learning_events`) está limitado a cuentas concretas y conserva identidad de cuenta y rasgos de negocio. No cumple la frontera de privacidad de este motor y no se reutilizará.

## Decisión

### Alcance actual P1A

P1A congela únicamente dos contratos puros: la decisión versionada de
consentimiento y la proyección de una observación del motor a categorías
acotadas. No crea API, almacenamiento, migración, lectura, promoción, interfaz
ni conexión con el modo sombra. Los contratos no importan readers, proveedores,
red o persistencia y cualquier `learningHints` distinto de `null` bloquea la
contribución.

La proyección sustituye `structuralArchetypeId` por
`structuralArchetypeGroup`, con cuatro valores de baja cardinalidad:
`TABLE`, `SUMMARY`, `OTHER` y `UNKNOWN`. No conserva tipo de documento,
valores de campos ni identificadores. Las versiones de schema, motor y política
son constantes cerradas; el servidor futuro asignará periodo, recuentos y
tiempos. Cada categoría aceptada solo podrá producir un incremento unitario
asignado por el servidor; el body no podrá declarar ni multiplicar
`sampleCount`.

La contribución V1 tiene una matriz canónica versionada de 67 coordenadas: nueve
estados singleton, catorce veredictos de campo para cada una de las tres parejas,
seis checks matemáticos con veredicto y residual, y cuatro flags críticos con
presencia o `NOT_OBSERVED` explícitos. El parser exige exactamente esa matriz,
rechaza coordenadas ausentes, añadidas, duplicadas o contradictorias y reconstruye
un orden determinista. Una observación parcial se proyecta como `ABSTAINED` o
`INSUFFICIENT`/`UNKNOWN`; la ausencia nunca se interpreta como acierto ni como
cero.

`EXTRA` significa que el candidato contiene un campo que la referencia no
contiene. Es una corrección explícita, nunca un `MATCH`, y solo se acepta en
triples relacionales compatibles entre local, IA y revisión humana. Los flags
críticos derivables se reconstruyen desde esos veredictos y la matemática
canónica; el builder no depende de que el productor repita correctamente una
señal redundante. `CREDIT_SIGN_CORRECTED` queda reservado y no agregable en
P1A: el builder siempre emite `NOT_OBSERVED` y el parser rechaza `PRESENT`. Una
fase futura necesitará una coordenada categórica probatoria dedicada que
demuestre la corrección del signo de un abono antes de habilitar esa métrica;
ni el tipo documental ni un check matemático genérico bastan. La matriz y sus
cardinalidades se declaran como datos inertes: los módulos P1A no ejecutan
llamadas, constructores ni mutaciones al importarse.

La secuencia posterior queda bloqueada en este orden:

1. P1B: store, migración y RPC con la feature apagada;
2. P2A: ledger durable y wrappers `service_role`, sin API, UI ni feature flag;
3. P2B: API `GET`/`PUT` autenticada e inventariada, protegida por
   `EXPENSE_LEARNING_CONSENT_ENABLED`, que solo activa con el valor exacto
   `true` y permanece apagada por defecto, todavía sin contribuciones;
4. P2C: UI de consentimiento y separación del copy operativo bajo el mismo
   flag; un `404` la oculta y sigue sin existir envío de contribuciones;
5. P3A: core privado, staging, deduplicación, retirada y contratos de
   concurrencia; el wrapper público sigue devolviendo `DISABLED`;
6. P3B: API de contribuciones con un kill switch servidor independiente,
   apagado por defecto y sin capacidad de escribir mientras el wrapper SQL
   permanezca deshabilitado;
7. P3C: wiring best-effort después del guardado durable, también dormido y sin
   modificar escaneo, IA, cola, gasto o interfaz;
8. P4A: retirada reparable y primitivo de purga/retención invocable; sin
   scheduler, promoción, lectura ni activación;
9. P4B: promoción privada y one-shot de una única marginal allowlisted de
   revisión humana, con coarsening completo y soporte por bandas; sin lectura,
   scheduler ni afirmación de anonimización;
10. P4C1: wrappers operativos de ingesta y purga con margen, pero ambos kill
    switches apagados y sin tráfico real;
11. P4C2: scheduler, reintentos y observabilidad operativa genérica;
12. P4C3: activación gradual bajo los dos kill switches, únicamente después de
    cerrar secretos, retención, copy y gates de producción;
13. P5: Admin, propiedad de su módulo y limitado a métricas promovidas.

### Alcance actual P1B

P1B crea exclusivamente la bóveda vacía y sus contratos de acceso. No genera
HMAC, secretos o tokens; no ejecuta DML de aprendizaje; no ingiere observaciones
y no conecta API, consentimiento, interfaz, shadow, Admin, jobs o workflows. El
registro SQL de coordenadas y buckets se expresa mediante validadores inmutables
sin filas de aprendizaje y se contrasta con las 67 coordenadas canónicas de
P1A.

Todo el estado futuro vive en el esquema no expuesto
`expense_learning_private`, propiedad de un rol dedicado `NOLOGIN`, sin acceso
directo para `PUBLIC`, `anon`, `authenticated` o `service_role`. Sus cinco
tablas runtime nacen vacías, con `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL
SECURITY` y cero policies. Como `service_role` tiene `BYPASSRLS`, la barrera
efectiva frente a acceso directo es la ausencia de `USAGE` y privilegios de
tabla; RLS es defensa adicional, no la garantía principal.

La superficie pública queda congelada en tres wrappers `SECURITY DEFINER`:

- `submit_expense_learning_contribution_v1(jsonb, text, text)`;
- `promote_expense_learning_closed_weeks_v1()`;
- `purge_expense_learning_retention_v1()`.

Tienen propietario dedicado no-login, `search_path` vacío, referencias
totalmente cualificadas y `EXECUTE` exclusivo de `service_role`. La ACL es la
frontera primaria. Como defensa adicional, reproducen la semántica de rol de
PostgREST/Supabase leyendo solo `request.jwt.claim.role` y el fallback
`request.jwt.claims` con `pg_catalog.current_setting`. Esos claims ya han sido
validados por PostgREST; rol ausente, vacío, distinto o JSON malformado falla
cerrado. El propietario no recibe acceso al esquema `auth`. En P1B los wrappers
solo devuelven la categoría `DISABLED`, no reflejan argumentos, no registran
contenido y no contienen DML ni referencias a las tablas privadas. No existe
RPC de lectura.

Las tablas fijan únicamente límites estructurales para fases posteriores:

- digest de claim de 32 bytes y TTL máximo de 24 horas;
- HMAC semanal y HMAC por coordenada de 32 bytes;
- límite futuro de 20 contribuciones de aprendizaje por cuenta y semana;
- memberships y acumuladores protegidos con TTL máximo de 35 días;
- métricas de semana cerrada con soporte declarado mínimo de 10 aportantes y
  TTL máximo de 13 meses.

El límite de 20 se aplica únicamente a futuras contribuciones de aprendizaje.
Nunca bloquea, retrasa ni modifica el escaneo, la llamada de IA, el guardado
durable o el gasto. P1B no calcula todavía diversidad, `k`, `OTHER`, promoción
o retención: esos valores son constraints y obligaciones de diseño para P3/P4,
no garantías operativas ya alcanzadas. La tabla
`closed_week_supported_metrics` no se denomina segura ni anónima y permanece
vacía e ilegible.

Los digests futuros serán HMAC-SHA-256 de un token aleatorio de un solo uso o
de un pseudónimo semanal, con secreto rotado y separación de dominio. Nunca
serán hashes del documento, contenido, payload, usuario, email, proveedor o
importe. El HMAC semanal solo limitará aprendizaje; el HMAC por coordenada
impedirá que una cuenta cuente varias veces en una misma celda. P3A reconoce
expresamente que el staging temporal sigue siendo seudonimizado y enlazable
mediante un índice privado de retirada. No se presenta como anónimo y solo
podrá perder esa relación al purgar lo separable o al promover resultados que
hayan superado la evaluación de reidentificación.

El rollback P1B es manual y transaccional. Aborta antes de retirar objetos si
cualquiera de las cinco tablas runtime contiene filas, elimina solo wrappers,
tablas, validadores, esquema y rol propios y finaliza con `DROP SCHEMA ...
RESTRICT`. Nunca se ejecuta automáticamente en producción.

### Alcance actual P2A

P2A añade exclusivamente el ledger durable de consentimiento y dos wrappers
internos. No abre API, interfaz, feature flag, ingesta, lectura de métricas,
contribuciones, shadow wiring, Admin, job o workflow. Por tanto, desplegar P2A
no permite todavía decidir ni enviar aprendizaje desde la aplicación y no
modifica el escaneo, la IA ni el guardado de gastos.

El consentimiento es una decisión **vinculada a identidad y autenticada**; no
se denomina anónima ni desidentificada. El ledger privado conserva solo el
usuario, una identidad monotónica interna, la decisión afirmativa o negativa,
la hora asignada por el servidor y la tupla cerrada de versión de schema,
aviso, finalidad y política de privacidad. No almacena IP, user-agent, sesión,
tenant, documento, OCR, proveedor, importes, porcentajes, observaciones ni
payloads. Un grant de otra tupla nunca autoriza la vigente.

La tabla `learning_consent_decisions` reutiliza el esquema y el propietario
dedicado de P1B. Mantiene `ENABLE` y `FORCE RLS`, con exactamente dos policies
limitadas a `expense_learning_storage_owner`: `SELECT` e `INSERT`. No existen
policies `ALL`, `UPDATE` o `DELETE`. La ACL sigue siendo la barrera principal:
`PUBLIC`, `anon`, `authenticated` y `service_role` carecen de acceso al esquema,
tabla y secuencia. `service_role` solo puede ejecutar los wrappers públicos
`SECURITY DEFINER`, que validan también los claims PostgREST de forma
fail-closed y nunca devuelven el identificador de usuario.

Las decisiones normales son append-only. El setter toma un advisory lock
transaccional con dominio separado por usuario, valida exactamente las cinco
claves del contrato, consulta la última decisión por `decision_id DESC` e
inserta la hora del servidor después del lock. Repetir la misma decisión para
la misma tupla es idempotente; grant y retirada distintos conservan ambas
decisiones en orden. El getter devuelve `UNDECIDED`, `GRANTED` o `REVOKED` solo
para la tupla vigente.

Hay una excepción explícita al append-only normal: eliminar la cuenta en
`auth.users` purga todo su ledger mediante `ON DELETE CASCADE`, por
minimización. La retención mínima de evidencia, su base jurídica y el efecto
de esa purga requieren decisión y revisión jurídica antes de activar cualquier
feature. Hasta entonces no se promete retención indefinida y toda superficie
de producto permanece apagada.

El rollback P2A es manual y transaccional, aborta si existe una sola decisión,
retira únicamente sus dos wrappers, dos policies y tabla, y conserva intactos
el esquema, rol, tablas y RPC desactivadas de P1B.

### Alcance actual P3A

P3A instala un core privado ejecutable solo por el propietario dedicado para
aceptación local. El wrapper público de submit continúa devolviendo
`DISABLED`, promoción, lectura y purga programada siguen apagadas y no existe
API ni wiring cliente. P3A no puede producir filas desde la aplicación aunque
una variable de entorno se configure por error. P3B y P3C deberán conservar la
ingesta apagada hasta que P4 demuestre borrado operativo de claims en 24 horas
y de staging en 35 días.

La contribución mantiene exactamente las 67 coordenadas P1A y la frontera SQL
reproduce también su coherencia cruzada: outcome y abstención, ruta y uso IA,
calidad y confianza, triples de los 14 campos, revisión humana, pares matemáticos
y flags derivados. Una matriz con vocabulario válido pero relaciones imposibles
se rechaza antes de cualquier DML. Los valores JSON `null` también se rechazan
explícitamente; la lógica ternaria de SQL nunca convierte una ausencia en una
validación positiva. Esta validación duplicada es deliberada: P3B deberá
normalizar con P1A, pero el core persistente no confía en el caller.

La semana UTC se asigna en servidor y el JSON no acepta usuario, semana, tiempo,
HMAC, digest o identidad. `p_user_id`, el digest de claim y el HMAC semanal son
argumentos internos separados. Un claim nace una sola vez por contribución;
el replay del mismo vínculo es idempotente y un digest ligado a otro vínculo
aborta toda la transacción.

`contributor_revocation_links` es un índice temporal protegido y vinculado a
identidad. Solo contiene usuario, lunes UTC, pseudónimo semanal y expiración
fija; carece de ACL, Data API, RPC de lectura, logs y acceso Admin. Claims y
límites dependen por FK de ese vínculo. Las memberships conservan solo un HMAC
por coordenada derivado con separación de dominio. El core crea o verifica la
fila semanal y registra el claim con FK al vínculo antes de cualquier DML de
memberships o acumuladores; esa FK mantiene el vínculo frente al cascade. Al
retirar el consentimiento, el setter toma el mismo advisory lock por usuario,
registra `REVOKED` y elimina
los vínculos en la misma transacción. El trigger purga claims, memberships y
límites, recalcula los acumuladores exactos y aborta ante ausencia, underflow o
desajuste. El borrado de `auth.users` usa los locks de FK/fila y el mismo
trigger; este no toma el advisory de usuario para evitar un ciclo con el row
lock de `auth.users`.

Toda mutación de memberships y acumuladores toma primero un mutex advisory
global y después locks por celda completa en orden canónico. Es una
serialización deliberadamente conservadora que evita lost updates y deadlocks
en cascadas con varias semanas. Una futura reducción del mutex deberá conservar
los locks por celda y demostrar concurrencia equivalente antes de cambiar este
contrato.

Los tiempos exactos se eliminan de vínculos, límites, memberships y
acumuladores: todos usan solo semana UTC y expiración determinista a 35 días.
Solo el claim conserva hora exacta por su TTL máximo de 24 horas. Revocar purga
todo el raw separable, incluido el contador semanal. Para impedir que revocar y
volver a aceptar reinicie el cap de 20, el core consulta bajo lock el ledger ya
existente y aplica `WITHDRAWAL_COOLDOWN` hasta la siguiente semana UTC. Esta
limitación solo afecta a aportaciones de aprendizaje; nunca al escaneo, IA,
guardado, gasto o cuota.

La purga por expiración futura deberá tomar el advisory de usuario antes de
eliminar vínculos. Hasta que P4 implemente y pruebe esa purga programada, el
wrapper público no puede dejar de responder `DISABLED`. Admin/P5 no podrá leer
links, claims, memberships ni acumuladores protegidos: solo métricas de semana
cerrada que hayan superado soporte y evaluación de reidentificación.

Antes de habilitar P4 debe existir además una ruta operativa fail-closed que
haga efectiva la retirada de inmediato incluso si detecta corrupción, y permita
purgar o reparar lo todavía separable sin reabrir la ingesta. La purga
programada por sí sola no satisface ese gate y P3A permanece desconectado.

### Alcance actual P3B

P3B añade únicamente un endpoint `POST` autenticado y su protocolo servidor.
La ruta solo existe cuando `EXPENSE_LEARNING_INGESTION_ENABLED` tiene el valor
exacto `true`; el valor por defecto y cualquier variante distinta responden
`404` antes de autenticación, rate-limit, lectura de body, cabecera, secretos o
base de datos. Aunque el flag se configure por error, el wrapper P3A continúa
respondiendo `DISABLED` y P3B transforma cualquier resultado del RPC, incluido
un éxito prematuro o desconocido, en el mismo `503` genérico. No hay respuesta
de aceptación, UI, shadow wiring, envío cliente ni DML alcanzable.

El body está limitado a 16 KiB y debe normalizar exactamente la contribución
P1A completa de 67 coordenadas, incluida la clave `learningHints: null`. No
acepta envelope, usuario, semana, tiempo, token, digest o HMAC. La identidad se
obtiene exclusivamente del bearer confirmado y el rate-limit distribuido
`expense_learning_contribution_submit` permite como máximo 30 intentos por
usuario cada 10 minutos. Este límite afecta solo al transporte de aprendizaje;
nunca bloquea, ralentiza ni consume escaneo, IA, guardado, gasto o cuota.

Cada intento lleva un token opaco de un solo uso en
`X-Expense-Learning-Claim-V1`. Es base64url canónico sin padding, exactamente
43 caracteres y 32 bytes después de decodificar; no entra en el body, RPC,
logs ni respuesta. El digest global del claim usa HMAC-SHA-256 con el dominio
versionado `expense-learning-claim-token-hmac.v1` sobre esos bytes y no incluye
cuenta ni semana, preservando la detección cross-account demostrada por P3A.

El pseudónimo semanal usa otra clave independiente y el dominio versionado
`expense-learning-contributor-week-hmac.v1`. Su mensaje incluye las versiones
cerradas P1A, el UUID autenticado canónico y el lunes UTC `YYYY-MM-DD`; no
incluye token, email, documento o body. Los outputs son hex minúsculos de 64
caracteres. Las variables servidor son
`EXPENSE_LEARNING_CLAIM_HMAC_SECRET_V1` y
`EXPENSE_LEARNING_CONTRIBUTOR_HMAC_SECRET_V1`: base64url canónico sin padding,
entre 32 y 64 bytes reales, sin default, fallback ni lectura al importar el
módulo. Las dos variables deben contener claves distintas. Una ausencia,
reutilización de clave, alias, padding o material corto falla cerrado.

Las dos claves tienen rotación separada. La clave de claim no puede retirarse
mientras existan claims con TTL de 24 horas que todavía deban deduplicarse; la
clave del aportante no puede rotar dentro de una semana UTC. P3B aplica una
mitigación temporal: rechaza los cinco minutos anteriores y posteriores al
lunes 00:00 UTC, calcula el contexto justo antes del RPC, lo vuelve a comprobar
después de preparar los HMAC y aborta el RPC a los 10 segundos. Esta guardia no
convierte el reloj de API en autoridad. P4 permanece bloqueado hasta que el RPC
compare una semana esperada con la semana UTC de base de datos o derive allí el
vínculo temporal, y hasta que exista un protocolo de rotación compatible con
los TTL.

P3B no incorpora un `GET` de elegibilidad. El core seguirá revalidando el
consentimiento bajo lock cuando se habilite en una fase posterior. Secretos,
token, body, digests, errores del RPC y detalles de base de datos no se
registran ni se reflejan; todas las respuestas son privadas y `no-store`.
P4 continúa siendo un gate separado y apagado.

### Alcance actual P3C

P3C conecta la observación sombra con el transporte P3B únicamente después de
que `saveScannedExpenseDurably` confirme `status: applied`, el resultado no sea
un replay y la completion local produzca una observación válida. El shadow
continúa ejecutándose aunque el wiring esté apagado. Solo la proyección P1A y
el POST quedan detrás de
`NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED === "true"`, cuyo valor por
defecto es apagado. El flag servidor P3B y el wrapper SQL P3A permanecen también
apagados, por lo que P3C no habilita ingesta ni DML.

La cuenta que inició el escaneo queda capturada en un handle opaco, efímero,
single-use y no serializable. No entra en `PendingExpenseScan` como string, en
el body, en el token ni en persistencia. El intento instala una suscripción de
autenticación antes de leer la sesión y exige el mismo UUID capturado en la
sesión inicial, justo antes del POST y después de resolverlo. Un sign-out o un
cambio A→B invalida y aborta best-effort el intento. La navegación normal de
`/gastos/nuevo` a `/gastos` con el mismo sujeto no lo cancela: el listener, el
timeout y el `AbortController` pertenecen al intento y se liberan en su
`finally`, no al desmontaje visual.

El handle del lector local se transfiere fuera del set de cleanup justo antes
de completar una observación aplicada y no repetida. Ese handoff tiene un
límite local de 15 segundos; al agotarse, dispone el reader y no contribuye.
Replay, descarte, fallo durable, observación nula o contribución P1A inválida no
crean ningún POST. La página no espera el transporte para guardar, cerrar inbox
o navegar.

Cada intento válido genera exactamente una vez 32 bytes con WebCrypto y los
codifica como base64url canónico de 43 caracteres. El body es exclusivamente
`ExpenseAggregateContributionV1`, se mide en bytes UTF-8 y no puede superar 16
KiB. El único `fetch` usa bearer, la cabecera de claim compartida,
`keepalive`, `credentials: omit`, `cache: no-store`, redirección bloqueada y un
timeout de ocho segundos. No hay retry, beacon, cola, persistencia, lectura de
respuesta, logs ni cambios de UI. Un aborto cliente posterior al envío no
garantiza rollback servidor: la autoridad sigue siendo el bearer y la
revalidación transaccional de consentimiento y sujeto en el core.

### Alcance actual P4A

P4A separa la retirada y la retención de la promoción. No crea `OTHER`, no
calcula `k`, no cierra semanas, no escribe métricas promovidas, no expone
lectura y no modifica los stubs públicos de submit o promoción. Ambos siguen
devolviendo `DISABLED`; los flags P3B/P3C permanecen apagados. Admin, workflow,
cron y scheduler quedan fuera.

El setter de consentimiento registra una decisión `REVOKED` en la transacción
exterior, bajo el mismo advisory de usuario que usa el core. La limpieza de raw
se ejecuta después en un bloque contenido. Si el acumulador derivado no coincide
con sus memberships, P4A lo reconstruye exclusivamente desde memberships
canónicas y atribuibles de forma inequívoca, bajo el mutex global y locks de
celda ordenados. Nunca fabrica, corrige o elimina memberships para hacer
cuadrar un acumulador. Si la fuente sigue siendo irreparable, conserva la
decisión `REVOKED`, el link y el raw protegidos; no refleja el fallo, no reabre
ingesta y una aportación posterior sigue bloqueada por el ledger.

Los links pendientes no requieren una cola de identidad adicional. Son
elegibles para reintento si han vencido o si existe una decisión `REVOKED` de
la tupla V1 exacta con `decided_at` igual o posterior al lunes UTC del link. La
decisión no tiene que seguir siendo la última: un regrant posterior no oculta
raw histórico. A la vez, una revocación anterior al lunes de un link futuro no
lo selecciona. El cooldown semanal P3A sigue impidiendo crear raw después de
retirar y volver a aceptar dentro de la misma semana.

El mantenimiento sin argumentos congela primero la foto de usuarios candidatos
y adquiere todos sus advisory en orden UUID. Después toma una vez el mutex
global y, bajo él, bloquea con `FOR UPDATE SKIP LOCKED`, también en orden
canónico, únicamente los links de esa foto que siguen siendo elegibles. Este
orden es compartido con el trigger del cascade: si una baja de cuenta ya ocupa
un link, mantenimiento lo salta sin esperar mientras conserva el mutex; si el
trigger obtuvo antes el mutex, mantenimiento aún no retiene ningún row lock.
Links ocupados o candidatos nuevos quedan para la siguiente ejecución. Después
se adquieren los locks de celda ordenados. Como `FORCE RLS` también se aplica al
owner, P4A añade una policy `UPDATE` exclusiva para ver y bloquear esas filas,
pero con
`WITH CHECK (false)`: habilita el row lock sin permitir ninguna actualización.
El rollback la retira y restaura las tres policies P3A originales. Cada unidad
se aísla para que una fuente irreparable no revierta purgas ya completadas. La
respuesta es solo `PURGED` o `RETRY_REQUIRED`, sin usuarios, celdas, recuentos
ni contenido. Una retirada individual nunca toca métricas promovidas; el
mantenimiento solo puede borrar de esa tabla filas cuyo `expires_at` ya venció.

El trigger de borrado permanece estricto respecto a la fuente. Puede reparar
un `protected_accumulator` derivado y permitir la baja de cuenta, pero una
membership no atribuible, ambigua o incompleta aborta el cascade para no dejar
raw huérfano. Esa baja debe reintentarse después de reparación service-only;
P4A no promete un borrado de cuenta exitoso ante corrupción irreparable ni crea
una cuarentena paralela.

P4A elimina, al invocarse, claims con `expires_at` vencido, links/raw elegibles
y métricas promovidas ya expiradas. Esto no demuestra todavía borrado físico
continuo dentro de 24 horas, 35 días o 13 meses: sin scheduler no existe
garantía de cadencia. P4C deberá fijar margen antes del TTL máximo, reintentos,
monitorización de `RETRY_REQUIRED` y aceptación de fallos antes de activar
cualquier flag. P4A por sí solo no autoriza promoción ni uso del agregado; P4B
añade después el primitivo privado y la evaluación V1 descritos a continuación,
sin scheduler, lectura ni activación.

### Alcance actual P4B

P4B elige para V1 batch semanal y coarsening determinista. No usa privacidad
diferencial ni añade ruido ad hoc. La fuente completa de 67 coordenadas debe
seguir siendo canónica y coherente, pero la única marginal que puede cruzar a
la tabla promovida es exactamente `HUMAN_REVIEW / NONE / VALUE`. Las otras 66,
incluido `CREDIT_SIGN_CORRECTED`, quedan fuera. Esta reducción evita componer
en la salida las implicaciones deterministas entre outcome, ruta, IA, campos,
matemática y flags.

La cohorte se calcula con aportantes distintos enlazados inequívocamente para
versiones, semana y grupo estructural. Los cuatro buckets exhaustivos de
revisión (`CONFIRMED`, `CORRECTED`, `REJECTED`, `NOT_REVIEWED`) deben formar
una partición disjunta y completa. Con menos de 10 aportantes se cierra el batch
como `DISCARDED` y no nace ninguna métrica. Si todos los buckets no vacíos
tienen soporte mínimo 10, se publican todos los buckets exactos. Si cualquiera
tiene soporte entre 1 y 9, no se combina una celda rara con exactos visibles:
la coordenada completa se sustituye por una única fila cerrada
`COARSENED_OTHER / OTHER`.

P4B elimina físicamente el recuento exacto de la tabla promovida. Solo conserva
la banda de la cohorte `K10_19`, `K20_49`, `K50_99` o `K100_PLUS`; no guarda N
en métricas, marker, retorno o logs. La forma candidata se evalúa dentro de la
misma transacción antes del primer INSERT. Esta evaluación versionada comprueba
la fuente completa, la partición, la ausencia de residuo visible y la allowlist;
no es una autoafirmación literal. Aun así, P4B no denomina el resultado anónimo
ni seguro, no acredita humanidad o independencia y no habilita lectura P5.

Cada identidad irreversible de batch (versiones, lunes UTC y grupo) admite un
único tombstone `PROMOTED` o `DISCARDED`. La versión de evaluación es un
atributo allowlisted, nunca parte de la clave: cambiarla no reabre una semana.
El marker no tiene UPDATE ni TTL autónomo. P4B no lo elimina; P4C solo podrá
definir su retirada cuando no queden métricas, raw ni deuda de toda la semana y
sea imposible reintroducir fuente histórica. Reparar raw después de cerrar un
batch no crea un segundo snapshot.

El fence de ingesta conserva el orden anti-deadlock P3A: advisory de usuario,
link y claim, mutex global y locks de celda. Ya bajo el mutex, recalcula la
semana UTC de base de datos y comprueba que no exista marker antes de mutar
limits, memberships o accumulators. Un cambio de semana o batch cerrado lanza
una excepción y revierte también link y claim; nunca retorna dejando DML
parcial. La promoción adquiere todos los advisories de usuario en orden,
después el mutex global, bloquea links con `FOR UPDATE SKIP LOCKED` y exige que
el conjunto esperado coincida con el bloqueado. Stage, retirada, baja de cuenta,
deuda o corrupción concurrente producen `RETRY_REQUIRED` sin marker ni métrica.
Una semana cerrada sin marker que conserve memberships o accumulators pero no
pueda formar candidatos enlazables también devuelve `RETRY_REQUIRED`;
`NOTHING` queda reservado a la ausencia real de fuente pendiente.
Los batches sanos pueden progresar atómicamente en la misma invocación, pero
la presencia residual de cualquier fuente marker-less mantiene el resultado
global en `RETRY_REQUIRED` hasta que esa deuda se repare o purgue.

Marker y todas las filas promovidas de un batch nacen atómicamente. Las
métricas no admiten UPDATE y usan tiempos deterministas de cierre semanal y
retención de 13 meses. Solo existe un wrapper de promoción `service_role` con
respuesta genérica `PROMOTED`, `NOTHING` o `RETRY_REQUIRED`; no hay reader,
Data API, Admin, endpoint, workflow, cron ni scheduler. Submit y los flags
P3B/P3C continúan dormidos. Por tanto P4B instala capacidad privada, pero no
activa ingesta, promoción periódica ni uso del resultado.

### Alcance actual P4C1

P4C1 vuelve operativos dos wrappers `service_role` sin activar todavía ningún
flujo real. `submit_expense_learning_contribution_v1` conserva los límites y
claims fail-closed, decodifica únicamente los dos HMAC hexadecimales canónicos
de 32 bytes y delega en el core privado P3A/P4B. Solo admite los estados
terminales cerrados `ACCEPTED`, `REPLAYED`, `NOT_CONSENTED`,
`WITHDRAWAL_COOLDOWN` y `CAP_REACHED`; cualquier valor distinto aborta. No
añade una RPC de lectura ni concede acceso directo al esquema privado.

La API sigue oculta salvo que `EXPENSE_LEARNING_INGESTION_ENABLED` sea
exactamente `true`. Cuando una petición habilitada alcanza un estado terminal,
responde siempre `202` sin body: esa respuesta solo confirma que el intento
terminó y no revela si se persistió, se deduplicó, faltaba consentimiento o se
alcanzó un límite. `DISABLED`, un resultado desconocido o un error convergen en
el mismo `503` genérico. El cliente no lee la respuesta, no reintenta y el flag
público `NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED` permanece también
apagado. P4C1 no modifica ninguna variable de entorno ni habilita tráfico en
producción.

La purga pública continúa sin argumentos y exclusiva de `service_role`, pero
invoca el core P4A con un horizonte fijo de cuatro horas por delante del reloj
de base de datos. Esto elimina antes del máximo contractual los claims, raw y
métricas ya próximos a vencer, dejando margen para reintentos del scheduler.
El margen es privado, inmutable y no configurable desde la petición. No cambia
la elegibilidad fail-closed de links corruptos ni permite borrar markers con
fuente o deuda.

P4C1 todavía no instala cron, workflow, endpoint de mantenimiento ni alerta.
Por tanto no demuestra cadencia continua ni garantiza por sí solo el borrado
físico dentro de 24 horas, 35 días o 13 meses. P4C2 deberá ejecutar el
mantenimiento con frecuencia menor que el margen, tratar `RETRY_REQUIRED` como
fallo operativo, reintentar y alertar sin IDs, recuentos ni contenido. Solo
después de aceptar retrasos y fallos reales podrá considerarse P4C3. El
rollback de P4C1 es no destructivo: vuelve a `DISABLED`, restaura el reloj P4A
sin margen y conserva cualquier dato protegido ya existente para que la purga
service-only siga disponible.

### Incentivo futuro separado

Después de P4 se evaluará un bloque de producto independiente para cuentas que
mantengan activa la colaboración: al agotarse su cuota normal, podrán recibir
un único relleno mensual del 100 % de la cuota de IA. Deberá reutilizar la
misma semántica de reinicio mensual que Admin, con ledger idempotente de una
concesión máxima por mes y sin crear un saldo paralelo ni tocar créditos extra.
No forma parte de P3, no está activo y requiere revisión específica de copy,
consentimiento, elegibilidad, revocación y billing antes de publicarse.

### Separación de dominios

Se crea una capa neutral `document-reading` para mecánica de lectura y una capa `expense-engine` para semántica de gastos. Notificaciones conserva intactas sus familias, reglas, hechos, plazos, relaciones, estados y persistencia fiscal.

La migración del lector será gradual:

1. Fase 0: PDF digital en modo sombra mediante compatibilidad explícita con el parser de capa de texto actual. Imágenes y PDF sin texto se abstienen.
2. Fase 1: extracción neutral de PDF/OCR solo después de demostrar paridad completa en Notificaciones.
3. Fase 2: activación parcial del motor local de gastos únicamente en estructuras que superen los gates versionados.

### Modo sombra

El motor local corre antes o junto a la lectura IA, pero inicialmente no sustituye el resultado visible, no guarda gastos y no evita llamadas. Se comparan tres salidas:

- propuesta local;
- propuesta IA;
- resultado confirmado o corregido por la persona usuaria.

La confirmación humana convierte los campos de ese documento en verdad operativa para evaluar el ejemplo. No convierte automáticamente las hipótesis de estructura o fórmula de la IA en reglas activas.

### Contrato IA

La misma llamada que hoy extrae el gasto podrá devolver un envelope interno con:

- `expense`: contrato visible actual, sin cambios para consumidores;
- `learningHints`: DSL cerrada de regiones, roles de columnas, unidades, signos, fórmulas, redondeo y confianza.

No se hará una segunda llamada para aprendizaje. Los hints inválidos se descartan completos sin invalidar un gasto legible. El navegador, la API pública y el buzón siguen recibiendo solo el gasto.

Los hints no forman parte del contrato P1A de contribución. Aunque el envelope
interno de IA los valide, su futuro emparejamiento con una revisión humana exige
otro diseño. P1A solo admite `learningHints: null` para demostrar que esa vía
permanece desactivada.

### Aprendizaje permitido

El motor puede acumular únicamente señales categóricas y agregables:

- arquetipo estructural;
- orden de regiones y roles de columnas;
- fórmulas de una lista cerrada;
- unidades, signos, redondeo y buckets de confianza;
- veredictos por campo;
- conciliación matemática por estado y bucket de diferencia;
- abstenciones, fallback IA y flags críticos.

Se prohíben PDF, imagen, OCR o texto bruto, cabeceras libres, nombre de archivo, proveedor, usuario, email, NIF, dirección, cuenta bancaria, número de factura, IDs opacos, hashes del documento e importes o porcentajes exactos. También se prohíbe que el futuro body acepte `owner`, `tenant`, periodo, semana, `sampleCount`, timestamps o versiones libres. Una clave desconocida, getter, array sobredimensionado o valor fuera del enum invalida el contrato completo.

P1A no persiste ni envía la proyección. La autenticación futura podrá autorizar y limitar una aportación, pero la identidad no formará parte de la contribución ni del agregado. Que una estructura carezca de identificadores directos no permite denominarla anónima: la sesión, la hora, los logs operativos, las celdas raras y el análisis por diferencias pueden seguir permitiendo aislamiento o correlación.

El navegador es un **cliente no confiable**. Puede alterar la observación,
automatizar envíos o coordinar cuentas antes de que el servidor la reciba. Por
tanto, el contrato categórico limita forma y cardinalidad, pero no acredita la
procedencia, la honestidad ni la independencia de una contribución. P1A no abre
un endpoint y ninguna fase posterior podrá tratar un body validado como verdad
del motor sin controles server-side separados.

El consentimiento para enviar un documento a IA y la contribución para mejorar el motor son finalidades distintas. La contribución requerirá información específica y una decisión separada antes de persistir cualquier observación.

### Frontera de privacidad futura

El diseño distingue tres estados y mantiene su semántica separada:

1. **ingesta autenticada minimizada y desidentificada**: sigue siendo un
   tratamiento protegido y no se denomina anónimo;
2. **acumulador protegido y exclusivo de servicio**: no es legible por Admin ni
   por el navegador, conserva solo lo imprescindible para deduplicar, limitar y
   retirar aportaciones todavía separables;
3. **métrica semanal cerrada con soporte mínimo**: solo puede nacer en batch,
   después de superar los controles versionados de diversidad y
   reidentificación.

El acumulador y cualquier deduplicación seudonimizada tendrán un TTL máximo de
35 días. Las métricas promovidas tendrán un TTL máximo de 13 meses, decisión
provisional de producto para cubrir un ciclo anual y un mes de solape; no es
una conclusión jurídica. La semana abierta nunca será publicable.

La promoción exige al menos 10 aportantes distintos. Diez documentos no son
suficientes y una cuenta no puede alcanzar el umbral aportando muchos gastos.
El mecanismo futuro debe aplicar contribution bounding. Las celdas raras se
fusionarán únicamente en categorías cerradas `OTHER`; si el grupo resultante
sigue por debajo de 10 aportantes distintos, se descarta. Este umbral no
demuestra por sí solo anonimización ni autoriza una regla del motor.

10 aportantes distintos no demuestra humanidad ni independencia: ataques de
**poisoning**, **Sybil**, múltiples cuentas y **collusion** pueden sesgar una
celda aun superando `k=10`. El diseño posterior debe limitar por cuenta, semana
y celda; aplicar deduplicación temporal y rate-limit; detectar automatización,
replay y abuso; y separar las señales de diversidad de las de confianza. Estas
medidas son mitigaciones y no una prueba de anonimato, independencia o calidad.

No habrá lectura incremental, `updated_at` por celda visible ni snapshots que
permitan reconstruir una aportación mediante differencing. Antes de cualquier
lectura o promoción se evaluarán expresamente **singling-out**, **linkability**
e **inference**. También deberá decidirse de forma versionada entre mayor
coarsening/batch o privacidad diferencial; no se añadirá ruido ad hoc.

La deduplicación futura usará un token aleatorio o HMAC separado, de un solo uso
y TTL corto, reclamado transaccionalmente. Ese token nunca entra en la
observación ni en el agregado y, mientras sea separable, se trata como dato
seudonimizado. Retirar el consentimiento detiene aportaciones futuras y purga
lo todavía separable. Solo una métrica ya promovida tras una prueba real de
anonimización puede quedar no separable; este límite se informará antes del
opt-in. El historial mínimo necesario para demostrar el consentimiento se
decidirá por separado y no se resuelve borrando sin más toda evidencia.

Ante replay, abuso, incoherencia, procedencia dudosa o fallo de cualquier gate,
la observación **no contribuye ni promueve**. El token de un solo uso solo evita
una repetición concreta; no resuelve Sybil, collusion ni poisoning.

### Matemática

La IA propone una fórmula solo como enum de la DSL. El motor determinista la contrasta en memoria con los valores confirmados:

- extensión de línea;
- suma de líneas contra base;
- IVA y recargo desde base;
- total del documento;
- coherencia de signo para abonos.

Datos ausentes producen `INSUFFICIENT`, nunca cero. Se reutiliza la tolerancia monetaria vigente del dominio de Gastos. Las observaciones persistibles contienen solo `MATCH`, `MISMATCH` o `INSUFFICIENT` y un bucket de diferencia, nunca los operandos.

### Promoción de reglas

Una regla nueva empieza como candidata y permanece en sombra. Solo puede activarse mediante una política versionada que exija soporte diverso, holdout no usado para crear la regla, ausencia de regresiones críticas y posibilidad de rollback. La IA y una sola confirmación humana no pueden promoverla por sí solas.

Ninguna métrica agregada modifica por sí sola reglas, extractores o modelos. La
promoción exige revisión separada, holdout independiente, gates de precisión y
falsos positivos, regresiones críticas verdes y un kill switch operativo. La
diversidad de cuentas es una señal de soporte, no sustituto de estos controles.

### Admin

Admin solo podrá leer métricas semanales promovidas que hayan superado la
frontera anterior. Nunca leerá el acumulador protegido ni la semana abierta.
Mostrará métricas agregadas por versión, grupo estructural y periodo: cobertura
local, exactitud por campo, reconciliación matemática, fallback IA,
abstenciones, falsos positivos críticos y evolución. No habrá vistas por
proveedor, usuario o documento.

## Consecuencias

- Durante el modo sombra el coste de IA no baja todavía; obtenemos una línea base comparable sin arriesgar guardados.
- Añadir hints a la respuesta existente aumenta algo la salida, pero no crea otra llamada ni otra unidad de cuota.
- PDF digital aportará valor antes que imágenes; el OCR neutral se incorpora después de demostrar que Notificaciones conserva paridad.
- El corpus sintético existente se divide en desarrollo, validación y holdout para evitar medir con los mismos ejemplos que moldean las reglas.
- Cualquier fallo de límites, OCR, estructura, matemática o política termina en abstención y revisión humana.
- P1A no reduce coste ni recopila aprendizaje: solo impide que fases posteriores
  inventen un body más amplio o confundan desidentificación con anonimización.

## Sistemas fuera de alcance

Este ADR no modifica documentos emitidos, VeriFactu, snapshots, sellos, fiscal notifications, Drive, sincronización cloud, billing, asientos, declaraciones ni deducibilidad automática.

## Referencias de diseño

- [RGPD, artículos 5, 7 y 25 (BOE)](https://www.boe.es/buscar/doc.php?id=DOUE-L-2016-80807).
- [AEPD: protección de datos desde el diseño](https://www.aepd.es/derechos-y-deberes/cumple-tus-deberes/medidas-de-cumplimiento/proteccion-de-datos-desde-el-diseno).
- [AEPD: guía básica de anonimización](https://www.aepd.es/documento/guia-basica-anonimizacion.pdf).
- [EDPB Guidelines 02/2026 on Anonymisation, versión sometida a consulta](https://www.edpb.europa.eu/public-consultations/guidelines-022026-on-anonymisation_en).

Estas referencias orientan el threat model. El ADR no declara por sí mismo
cumplimiento jurídico ni anonimización consumada.
