# ADR-0008: Motor local de lectura y aprendizaje de gastos

- Estado: P1B con almacenamiento vacío y RPC desactivadas; transporte, consentimiento, promoción y lectura pendientes
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
2. P2: consentimiento durable, UI y endpoints, todavía sin contribuciones;
3. P3: ingesta, staging, deduplicación y wiring con kill switch apagado;
4. P4: batch, promoción y retención;
5. P5: Admin, propiedad de su módulo y limitado a métricas promovidas.

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
impedirá que una cuenta cuente varias veces en una misma celda sin conservar un
vector enlazable entre coordenadas.

El rollback P1B es manual y transaccional. Aborta antes de retirar objetos si
cualquiera de las cinco tablas runtime contiene filas, elimina solo wrappers,
tablas, validadores, esquema y rol propios y finaliza con `DROP SCHEMA ...
RESTRICT`. Nunca se ejecuta automáticamente en producción.

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
