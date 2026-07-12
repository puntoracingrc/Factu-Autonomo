# Plan de implementación — Consultor fiscal

## Arquitectura encontrada

- Next.js 15 con App Router (`src/app`), React 19 y TypeScript estricto.
- Páginas privadas envueltas por `ConditionalAppShell`/`AppShell`; navegación
  declarativa y compartida entre escritorio y móvil en
  `src/components/layout/app-navigation.ts`.
- Tailwind CSS 4, iconos Lucide y primitivas propias en `src/components/ui`.
- Estado principal en Context API (`AppStore`) con `localStorage` como almacén
  primario y sincronización opcional a Supabase por `user_id`.
- Autenticación Supabase mediante Bearer JWT en rutas que la necesitan. La app
  admite uso local sin cuenta.
- Backend en Route Handlers de Next.js. Los cuerpos y respuestas se validan con
  normalizadores/validadores manuales tipados; el proyecto no usa un ORM ni una
  librería general de esquemas.
- Vitest es el marco de pruebas. Las pruebas se colocan junto al código; las
  rutas se prueban invocando directamente sus handlers. Playwright está
  disponible para QA de navegador.
- Comandos de aceptación: `npm run lint`, `npm run typecheck`, `npm test` y
  `npm run build`.

## Decisiones de integración

1. El motor puro vivirá en `src/lib/tax-engine`. No importará React, Next.js,
   Supabase, AppStore, `taxes.ts` ni módulos de red/persistencia.
2. Todos los importes del motor serán enteros en céntimos. El mapeo de campos en
   euros a céntimos se hará sin aritmética decimal de JavaScript.
3. La fecha de evaluación y el identificador se inyectarán desde la capa de
   aplicación para que el motor siga siendo determinista y testeable.
4. `ExpenseInput` será exclusivamente el DTO efímero del motor, no una entidad
   persistida. Los gastos registrados se adaptarán desde `Expense` y
   `BusinessProfile`, reutilizando `resolveExpenseVat` y conservando como
   bloqueo cualquier inconsistencia documental o fiscal canónica. La entrada
   manual será otra frontera hacia el mismo DTO y no creará un segundo gasto.
5. La UI vivirá en `src/components/consultor-fiscal` y la ruta en
   `src/app/consultor-fiscal`. La evaluación se ejecutará en servidor mediante
   `POST /api/expense-deductibility/evaluate`.
6. El endpoint será utilizable sin cuenta, como el resto de funciones locales,
   pero aplicará límite de peticiones por el identificador de red saneado del
   mecanismo común. No resolverá sesiones porque el cálculo no autoriza ni
   persiste nada; identidad y tenancy nunca entrarán en el motor.
7. No habrá persistencia ni asiento automático en esta fase. El
   `EvaluationSnapshot` serializable es solo un contrato de datos: no tendrá
   repositorio propio ni creará otra auditoría. Referenciará, cuando proceda,
   el `userId` y el `Expense` existentes; no inventará un tenant mientras el
   producto no disponga de esa entidad canónica.
8. Las reglas nuevas quedarán marcadas `PENDING_REVIEW`. La interfaz Beta puede
   mostrar el cálculo orientativo, pero la propuesta contable permanece
   deshabilitada y exige revisión fiscal humana antes de producción operativa.
9. Una regla ejecutable solo podrá enlazar fuentes oficiales con estado
   `VERIFIED`. Las referencias pendientes pueden permanecer en el catálogo para
   revisión jurídica, pero no fundamentarán una evaluación.
10. Un contexto fiscal desconocido devolverá `NEEDS_INPUT`, sin importes ni una
    conclusión negativa. `UNSUPPORTED` se reservará para un dato conocido que
    esté explícitamente fuera del alcance implementado.
11. El perfil fiscal se añade de forma opcional dentro del `BusinessProfile`
    canónico y se normaliza con el almacenamiento existente. No se modifican
    `Expense`, `expenses.ts`, `taxes.ts`, asignaciones, integridad documental ni
    VeriFactu. Los documentos bloqueados y los importes manuales ausentes no se
    transforman en ceros aparentemente válidos.
12. El fallback de IA reutiliza el transporte OpenAI server-only extraído de la
    revisión de importaciones, `OPENAI_API_KEY`, configuración por entorno,
    consentimiento, Bearer, cuota y rate limiting existentes. No contiene un
    `fetch` fiscal aislado ni crea otro endpoint, cliente, tabla o dependencia.
    Ejecuta siempre primero el motor local y conserva toda propuesta como
    `NEEDS_REVIEW` sin escritura contable automática.
13. No existe un framework general de feature flags. Se reutilizará el patrón de
    configuración por entorno mediante `NEXT_PUBLIC_CONSULTOR_FISCAL_ENABLED`,
    con valor implícito desactivado en producción y activación explícita solo
    para una Beta controlada tras revisión fiscal.
14. El fallback usa además `CONSULTOR_FISCAL_AI_FALLBACK_ENABLED`, una bandera
    server-only fail-closed e independiente. El repositorio no tiene alcance de
    flags por tenant; la limitación se documenta en vez de crear otro sistema.
15. Responses API se usa con Structured Outputs estricto, `store: false`, modelo
    configurable, timeout, cancelación y dos intentos solo para errores
    transitorios. El producto no dispone de circuit breaker ni cola IA común.
16. El certificado censal con texto se extrae localmente con la dependencia
    `pdfjs-dist` ya instalada. El usuario confirma una vista previa; solo se
    persiste el perfil estructurado, nunca el PDF, el texto completo ni el CSV.
    Un PDF escaneado se deriva al formulario manual y no activa OCR externo.
17. El Consultor se registra como módulo de producto independiente con ID
    `consultor_fiscal`. Release, activación y entitlement son decisiones
    separadas. En esta fase conserva acceso Beta temporal, no tiene precio ni
    planes asignados y no reutiliza la activación local de Rentabilidad Real.
    Una futura venta exigirá autoridad de acceso en servidor y comprobación
    antes de ejecutar el endpoint; no se confiará en `BusinessProfile`,
    `localStorage` ni datos enviados por el cliente.

## Fases

### 1. Contratos y registro legal

- Tipos de contexto, gasto, preguntas, reglas, resultados, trazas y fuentes.
- Validadores manuales de entrada/respuesta y errores de validación saneados.
- Registro versionado de fuentes oficiales BOE/AEAT/DGT.
- Invariante que impide ejecutar una regla respaldada por una fuente que no sea
  `VERIFIED`.
- Parámetros versionados de límites diarios de manutención.
- Sin contratos alternativos de OCR, IA o escritura contable: cualquier
  ampliación se integrará en la infraestructura existente.

### 2. Motor puro

- Normalización con minúsculas, eliminación de diacríticos, puntuación y tokens
  por palabras completas, conservando siempre el concepto original.
- Matching exacto, alias y tokens con explicación y puntuación.
- Detección de empates y categorías ambiguas.
- Contexto desconocido resuelto como `NEEDS_INPUT` antes de aplicar reglas o
  producir importes.
- Registro de reglas con control de vigencia y estado `RETIRED`.
- Evaluadores puros para restauración/manutención y gastos corrientes de
  vehículos.
- Cálculos enteros, límites, documentación, advertencias y traza auditable.

### 3. Capa de aplicación y endpoint

- Request/response validados y tamaño de cuerpo acotado.
- Adaptador de `Expense` + `BusinessProfile` hacia el DTO del motor, con uso de
  `resolveExpenseVat` y propagación de bloqueos, sin persistir copias.
- Rate limit compartido por identificador de red, antes de leer el cuerpo.
- Errores 4xx saneados, sin stack traces ni contenido fiscal en logs.
- Contrato y constructor de `EvaluationSnapshot` sin escritura real.

### 4. Interfaz

- Entrada “Consultor fiscal” en la navegación existente.
- Formulario accesible y responsive en `/consultor-fiscal`.
- Selector opcional de gasto existente y frontera manual explícita; seleccionar
  un gasto no permite saltarse sus bloqueos canónicos ni modifica el original.
- Preguntas condicionales con respuestas preservadas y reevaluación.
- Estados diferenciados, semáforo con texto/icono, IRPF e IVA separados,
  importes, límites, pruebas, fuentes y versión.
- Botón “Aplicar propuesta” deshabilitado y aviso de revisión obligatoria.

### 5. Pruebas y documentación

- Pruebas tabulares de todas las rutas mínimas de restauración, vehículo y
  comportamiento transversal.
- Pruebas del matcher, validadores, adaptador y bloqueos canónicos, snapshot,
  endpoint y contratos visibles de la pantalla/navegación.
- Documentación de alcance, exclusiones, arquitectura, fuentes y ciclo de vida
  de reglas.
- Revisión de cobertura del paquete y aceptación completa con lint, tipos,
  pruebas y build.

### 6. Fallback de IA controlado

- Activación únicamente tras `NO_MATCH`; las preguntas locales, estados fuera
  de alcance, entradas inválidas y revisiones jurídicas locales no llaman al
  proveedor.
- Contexto mínimo por allowlist, con redacción de identificadores y exclusión de
  OCR, proveedor, actividad libre e identidad de usuario.
- Corpus limitado a fuentes `VERIFIED` del registro, con IDs de fuente y de
  fragmento estables. Los resúmenes actuales son solo aptos para revisión, no
  para calcular importes definitivos.
- Salida JSON Schema cerrada y segunda validación determinista de fuentes,
  impuestos, cantidades, porcentajes, completitud y referencias.
- Metadata opcional y serializable para origen, prompt, modelo, fuentes,
  validación, duración, tokens, confianza y revisión humana.
- Misma pantalla, consentimiento existente, distintivo accesible y tarjetas
  separadas IRPF/IVA; el botón de aplicar continúa deshabilitado.
- Autenticación y límite por `user.id` solo en la rama externa. El cálculo local
  conserva el contrato público previo.

## Fuera de alcance de esta fase

OCR, embeddings, asientos automáticos, nuevos clientes o gateways de IA,
persistencia de evaluaciones o auditoría paralela, Impuesto sobre Sociedades,
Canarias/IGIC, Navarra, País Vasco, Ceuta/Melilla y compra/amortización/leasing/
renting/venta de vehículos.

También quedan fuera la aceptación automática de propuestas IA, el uso de
fuentes recuperadas libremente por el modelo, RAG/embeddings, un ledger de coste
por función, la persistencia servidor de entitlements comerciales, el checkout
del módulo, flags por tenant y la activación en producción sin revisión técnica,
de seguridad y fiscal.
