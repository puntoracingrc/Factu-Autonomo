# Consultor fiscal

Módulo Beta para analizar de forma orientativa la deducibilidad de gastos de un
autónomo en IRPF e IVA mediante reglas locales, deterministas, versionadas y
auditables, con un fallback de IA opcional y siempre pendiente de revisión para
los casos sin coincidencia local.

## Alcance de la versión 1

- España, territorio fiscal común.
- Autónomo persona física.
- IRPF en estimación directa normal o simplificada.
- IVA general con derecho pleno conocido; prorrata y dudas sobre el derecho
  general devuelven revisión.
- Restauración y manutención:
  - manutención del propio autónomo;
  - atenciones a clientes o proveedores;
  - gasto personal.
- Gastos corrientes vinculados a un vehículo identificado:
  - combustible;
  - reparación y mantenimiento;
  - aparcamiento;
  - peajes;
  - neumáticos y lavado.

No incluye OCR, embeddings, asientos contables, Impuesto sobre Sociedades,
IGIC, IPSI, territorios forales, compra/amortización/leasing/renting/venta de
vehículos ni persistencia de evaluaciones. Sí lee localmente el texto ya
presente en un certificado censal PDF; un PDF escaneado no activa OCR. Tampoco
crea un segundo gasto, un registro de auditoría o una infraestructura fiscal
paralelos. Sí incorpora un fallback opcional de IA, siempre posterior al motor
local y limitado a una propuesta de revisión sin aplicación automática.

## Perfil fiscal opcional

El Consultor ofrece tres caminos equivalentes y no bloqueantes:

1. Importar un certificado de situación censal o modelo 036 en PDF.
2. Completar manualmente tipo de contribuyente, territorio, régimen, derecho de
   deducción de IVA y una o varias actividades/epígrafes IAE.
3. Continuar sin completar el perfil.

Los PDF con texto se procesan en el navegador mediante `pdfjs-dist`. El parser
determinista propone campos y cruza el NIF leído con el NIF canónico de la
empresa. Un NIF distinto bloquea la importación; la forma del NIF solo puede
sugerir persona física o entidad y nunca acredita actividad o régimen. El
usuario revisa y confirma antes de guardar.

El archivo, el texto extraído y el valor del CSV son efímeros. No se persisten,
no se registran y no se envían a la IA. `BusinessProfile.fiscalProfile` conserva
solo datos estructurados, fecha/fuente mínima, si se detectó un CSV y el NIF
normalizado necesario para detectar un cambio posterior de empresa. El CSV se
puede cotejar manualmente en la Sede de la AEAT y se advierte que permite acceder
al documento.

Referencias operativas oficiales:

- [Mis datos censales de la AEAT](https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/otros-servicios-ayuda-tecnica/datos-censales.html).
- [Cotejo de documentos mediante CSV](https://sede.agenciatributaria.gob.es/Sede/procedimientos/ZZ05.shtml).

Un perfil omitido o parcial no produce una respuesta negativa: el motor devuelve
`NEEDS_INPUT`. En la entrada manual, base, IVA y total también son opcionales para
la orientación inicial. Si no se facilitan, `amountsKnown: false` impide que los
ceros de transporte entren en cálculos o se presenten como importes reales.

## Qué consulta el motor y cómo se actualiza

El motor no se entrena y no navega por internet durante cada análisis. Las reglas,
parámetros y referencias oficiales están versionados en el repositorio y se
ejecutan localmente de forma determinista. Añadir precisión significa incorporar
o versionar reglas con pruebas y revisión fiscal, no proporcionar ejemplos para
“entrenarlo”.

El fallback de IA tampoco busca legislación libremente: solo recibe fragmentos e
identificadores de fuentes `VERIFIED` que la aplicación le suministra. Su salida
se valida de nuevo y siempre queda pendiente de revisión. Para actualizar una
norma hay que verificar la fuente oficial, añadir una nueva versión con vigencia
y conservar la anterior para auditoría.

## Arquitectura

El núcleo está en `src/lib/tax-engine` y solo contiene TypeScript puro:

1. `schemas.ts` valida entrada y salida sin una dependencia de producción nueva.
2. `normalizers.ts` conserva el concepto original y crea una versión comparable.
3. `matcher.ts` prioriza concepto exacto, alias, tokens completos y categoría
   manual; los empates piden intervención.
4. `rule-registry.ts` controla identificadores, versiones, vigencia y estado.
5. `evaluators/` contiene una función pura por familia de reglas.
6. `calculators.ts` opera únicamente con céntimos enteros y usa `BigInt` solo de
   forma interna para impedir pérdidas de precisión; nunca lo serializa.
7. `sources.ts` registra exclusivamente fuentes oficiales BOE/AEAT/DGT; toda
   fuente asociada a una regla ejecutable debe estar marcada `VERIFIED`.

El motor no importa React, Next.js, HTTP, Supabase, AppStore, `taxes.ts`, reloj
global ni generadores aleatorios. `evaluationId` y `evaluatedAt` se inyectan
desde el Route Handler.

La capa de aplicación vive en `src/lib/expense-deductibility`. `ExpenseInput`
es un DTO interno y efímero con los hechos que necesita el motor: no se
persiste, no sustituye a `Expense` y no constituye una segunda representación
del gasto. Cuando el usuario selecciona un gasto existente, un adaptador toma
la entidad `Expense` y el `BusinessProfile` actuales y consulta
`resolveExpenseVat`. Si el desglose canónico está bloqueado, si falta el
documento original de un resumen de proveedor o si hay otra inconsistencia, la
adaptación conserva el bloqueo y devuelve información pendiente o revisión;
nunca lo convierte en base o IVA cero aparentemente válidos.

La entrada manual sigue disponible como frontera de evaluación para un caso
que todavía no existe en Gastos. Solo construye el mismo DTO efímero y no crea,
duplica ni modifica una entidad `Expense`. Los importes pueden quedar marcados
explícitamente como desconocidos para una orientación cualitativa; el cálculo
exacto solo se ejecuta cuando existen cantidades reales.

El fallback vive en `src/lib/expense-deductibility/ai-fallback`, fuera del
núcleo puro. Reutiliza `OPENAI_API_KEY` y el transporte OpenAI server-only
extraído del adaptador de revisión de importaciones, la autenticación Bearer,
el rate limit común, el consentimiento versionado y la bolsa existente de
unidades IA. Usa Responses API con JSON Schema estricto, `store: false`, timeout,
cancelación y como máximo dos intentos para fallos transitorios. No se añadió un
SDK, una dependencia, una tabla, un endpoint ni un cliente fiscal paralelo.

La llamada solo es admisible después de un `NO_MATCH` real. `NEEDS_INPUT`,
`UNSUPPORTED`, reglas concluyentes y reglas locales que ya exigen revisión no
activan IA. La ambigüedad actual se resuelve con una pregunta local y tampoco la
activa; el puerto admite una futura marca interna
`UNRESOLVABLE_AMBIGUITY`, pero ninguna entrada del cliente puede establecerla.

El contexto externo excluye proveedor, OCR, fecha exacta, importes, descripción
libre de actividad, identidades y respuestas abiertas. Reduce el concepto a una
lista cerrada de vocabulario fiscal genérico y elimina NIF, IBAN, correo,
teléfono, dirección, URL, números y secretos detectables. Solo suministra
fuentes `VERIFIED` del registro BOE/AEAT/DGT mediante IDs estables. Como el
catálogo actual contiene
metadatos y resúmenes verificados, no extractos legales aptos para automatizar
cálculos, el prompt obliga a dejar porcentajes e importes en `null`. El
validador vuelve a comprobar estructura, impuestos, fuentes, límites, importes,
contexto y referencias; la salida válida siempre se transforma en
`NEEDS_REVIEW` con revisión humana obligatoria.

La interfaz está en `/consultor-fiscal` y llama a
`POST /api/expense-deductibility/evaluate`. El cálculo local sigue admitiendo
invitados, no persiste información y conserva su límite por identificador de red.
Solo después de un resultado elegible, y si el usuario lo solicitó, el endpoint
comprueba consentimiento vigente, Bearer con email confirmado, plan, cuota y un
segundo límite más estricto por `user.id`. Nunca acepta `userId`, `tenantId` o
empresa del cuerpo como autoridad ni envía ese identificador al proveedor.

La visibilidad usa el mecanismo mínimo de configuración ya aceptado por el
proyecto: `NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED`. Si no se configura, está
activo en desarrollo/pruebas y desactivado en producción. El mismo flag oculta
la navegación y su sección del manual, convierte la página en 404 y cierra el
endpoint. No debe activarse en producción hasta completar la revisión fiscal
de las reglas.

### Módulo comercial independiente

El Consultor está registrado fuera del dominio fiscal y fuera de Rentabilidad
Real con el identificador estable `consultor_fiscal`. Su contrato distingue tres
puertas que no son intercambiables:

1. _release_ global del entorno;
2. activación o desactivación elegida para la cuenta;
3. _entitlement_ comercial concedido por Beta, compra separada o inclusión en un
   plan.

El catálogo lo mantiene en Beta, con asignación comercial `unassigned`, sin
precio y con `includedPlanIds: []`. Declara expresamente que en el futuro puede
venderse por separado o incluirse en un plan superior, pero no decide ahora
ninguna de las dos opciones. La política pura solo permite usarlo cuando las
tres puertas están abiertas.

El marketplace actual de Rentabilidad Real no es un marketplace global: sus
productos `RR_*` dependen de `RR_BASE`, Pro+ y una activación en `localStorage`.
El Consultor no se añade allí porque eso lo acoplaría a un producto distinto y
haría que un dato manipulable por el navegador aparentase ser una autorización
de pago.

Mientras no existe infraestructura comercial de módulos, el acceso de esta
fase se representa como una concesión temporal `beta_access`, activa por
política cuando el _release_ global está abierto. Esto conserva el flujo de
prueba actual, pero no constituye un paywall. Antes de venderlo, la activación y
el entitlement deberán provenir de una fuente propiedad del servidor, por
usuario o por el tenant canónico que exista entonces; el endpoint deberá validar
sesión y acceso antes de analizar. `BusinessProfile`, el cuerpo de la petición y
`localStorage` no pueden actuar como autoridad comercial.

El fallback tiene un kill switch independiente y exclusivamente servidor:
`CONSULTOR_FISCAL_AI_FALLBACK_ENABLED`. Solo el valor literal `true` lo activa;
por omisión está desactivado en todos los entornos. El modelo se configura una
sola vez mediante `OPENAI_FISCAL_FALLBACK_MODEL` (por defecto el modelo pequeño
ya usado por la revisión de importaciones) y el timeout con
`OPENAI_FISCAL_FALLBACK_TIMEOUT_MS`. El producto no dispone todavía de flags por
tenant, por lo que el alcance de esta bandera es global por entorno.

## Flujo de evaluación

1. Reutilizar el perfil fiscal confirmado, o conservar como desconocido aquello
   que el usuario haya omitido.
2. Adaptar un `Expense` existente respetando sus bloqueos canónicos, o construir
   un DTO efímero desde la entrada manual.
3. Validar tipos, fechas, importes enteros conocidos, totales y contexto fiscal.
4. Devolver `NEEDS_INPUT`, sin importes ni conclusión negativa, cuando falte el
   territorio, el tipo de contribuyente, el régimen directo, el régimen de IVA
   o la descripción de la actividad.
5. Rechazar como `UNSUPPORTED` un territorio, contribuyente, régimen o moneda
   explícitamente conocido pero no implementado.
6. Normalizar el concepto sin alterar el original.
7. Elegir una única regla vigente, no retirada y respaldada únicamente por
   fuentes oficiales `VERIFIED`.
8. Devolver `NO_MATCH` si no existe regla o `NEEDS_INPUT` si hay empate.
9. Solicitar únicamente respuestas condicionales pendientes.
10. Ejecutar el evaluador puro; si faltan importes, detener cualquier cálculo
    positivo y explicar que solo son necesarios para saber cuánto.
11. Calcular IRPF e IVA por separado y devolver fuentes, versión, documentación,
    advertencias y traza determinista.
12. Solo ante `NO_MATCH`, comprobar flag, consentimiento, sesión, plan, cuota y
    rate limit sin alterar el resultado local si alguna puerta está cerrada. La
    clasificación cualitativa no recibe la fecha ni los importes del gasto.
13. Construir el contexto mínimo redactado y llamar al proveedor en servidor.
14. Validar la salida estructural y fiscalmente; una salida inválida se descarta.
15. Convertir una salida válida en propuesta `NEEDS_REVIEW`, sin importes
    definitivos ni escritura contable.

`RESOLVED` queda reservado para una versión de regla que ya haya superado su
revisión jurídica. Todas las reglas de esta fase siguen en `PENDING_REVIEW`, por
lo que incluso una conclusión negativa determinista se presenta como
`NEEDS_REVIEW`; así la incertidumbre del estado legal no se aplica solo a las
propuestas favorables. El botón de aplicación está deshabilitado y
`requiresHumanReview` permanece activo.

## Decisiones conservadoras

- El límite de manutención se consume por día, no por factura. Se pregunta el
  importe ya utilizado en la misma fecha.
- El límite de atenciones es conjunto para clientes y proveedores y usa el 1 %
  del INCN del ejercicio para todas las actividades del contribuyente.
- Una factura simplificada no habilita el IVA por su nombre: debe incluir NIF y
  domicilio del destinatario y cuota separada.
- Las categorías de vehículo de IRPF y de IVA son distintas. Vigilancia puede
  tener presunción del 100 % en IVA, pero no se convierte automáticamente en
  excepción de IRPF.
- Rotulación, contabilización o disponer de otro vehículo son indicios, no
  pruebas automáticas de exclusividad.
- Cada gasto corriente debe estar vinculado al vehículo y a la actividad; no
  basta con reutilizar un porcentaje sin evidencia de la factura concreta. El
  motor exige un identificador estable, pero esta fase todavía no persiste ni
  contrasta un perfil fiscal canónico del vehículo entre facturas.
- Un recibo no genera IVA deducible. La falta de factura para IRPF produce
  revisión, no una acusación ni un riesgo rojo automático.
- Un número leído en `purchaseDocument` no acredita por sí solo una factura
  completa emitida al contribuyente. El adaptador conserva el justificante como
  desconocido hasta que el usuario confirme el tipo y los requisitos exigibles.
- El IVA no deducible se incorpora a la base estimada de gasto directo cuando el
  resultado indirecto está resuelto. Esta política debe validarse fiscalmente.

## Snapshot y confirmación futura

`createEvaluationSnapshot()` genera únicamente un objeto JSON con entrada
normalizada, contexto fiscal, respuestas efectivas combinadas, resultado,
regla, versión, fuentes, traza, fecha, el `userId` existente, el identificador
opcional del `Expense` de origen y la decisión del usuario. El texto extraído se
excluye deliberadamente y las estructuras de entrada se clonan para no
conservar referencias mutables externas. Una confirmación o rechazo exige una
fecha de decisión válida.

El snapshot es un contrato de datos, no una segunda auditoría ni una
persistencia. No existe repositorio, migración o tabla nueva para guardarlo, y
no se inventa un `tenantId`: el producto actual identifica los datos por el
`user_id` de la cuenta. Si en el futuro existe una entidad tenant canónica,
deberá reutilizarse entonces. Cualquier persistencia futura deberá integrarse
en la infraestructura y las puertas de integridad actuales, conservar la
inmutabilidad y exigir confirmación expresa antes de generar siquiera una
propuesta contable pendiente de revisión.

Los campos opcionales `evaluationOrigin` y `aiFallback` preservan la
compatibilidad con snapshots anteriores. Solo guardan versión de prompt, modelo,
IDs de fuentes suministradas/citadas, códigos acotados del validador, duración,
uso numérico, banda de confianza y la propuesta revisable. Nunca incluyen el
prompt, la salida cruda, la API key, el OCR ni identificadores de cuenta.
El constructor del snapshot reconstruye el resultado mediante una allowlist;
propiedades adicionales o payloads crudos inyectados se descartan.

## Operación, costes y rollback

- La duración, intentos, tokens y códigos de error se registran con una lista
  cerrada de campos; no se registran conceptos, facturas, prompts, respuestas,
  cabeceras ni identidades.
- La cuota reutiliza la bolsa atómica de unidades IA. La columna histórica de
  usos pequeños no distingue todavía el coste fiscal por función y no existe un
  ledger de coste real por proveedor; esta limitación sigue documentada como
  pendiente y no se ha creado una tabla paralela. Si el metering no puede
  registrar la unidad, el fallback falla cerrado y conserva el `NO_MATCH` local.
- No existe circuit breaker ni cola común de IA en el producto. El fallback usa
  flag apagada por defecto, timeout, cancelación, dos intentos acotados y rate
  limit; añadir otra infraestructura solo para este módulo quedó fuera de alcance.
- Desactivación inmediata: establecer
  `CONSULTOR_FISCAL_AI_FALLBACK_ENABLED=false` y redesplegar. El motor local y
  el contrato existente continúan funcionando.
- Rollback de código: revertir los archivos de `ai-fallback`, el wiring opcional
  de ruta/UI y los campos opcionales; no hay migraciones, datos persistidos ni
  lockfile que revertir.

## Pruebas y aceptación

Las pruebas co-localizadas cubren normalización, matching, vigencia, contratos,
reglas, cantidades, snapshot, endpoint, navegación y superficie visible. Para
validar el módulo:

```bash
npm run manual:verify
npm run lint
npm run typecheck
npm test
npm run build
```

No se añade una dependencia de cobertura solo para este paquete. La cobertura
de ramas se logra mediante tablas de casos y revisión explícita de los caminos
obligatorios.
