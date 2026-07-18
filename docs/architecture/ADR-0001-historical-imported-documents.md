# ADR-0001: documentos históricos importados y atestados por el usuario

- Estado: Aceptado
- Versión de la decisión: 5
- Fecha: 2026-07-18
- Responsables: Producto e Integridad fiscal

## Contexto

La aplicación importa facturas y presupuestos históricos desde PC Facturación,
Holded, FacturaDirecta y documentos genéricos (incluidos Word y Excel). Esos
documentos nacieron fuera de la aplicación y, por tanto, no pueden acreditar un
snapshot, PDF, sello, hash o registro VeriFactu moderno generado por ella.

Durante el despliegue inicial de la integridad documental se aceptaron
históricos de forma temporal mediante `legacyBackfillDocumentIds`. Esa
procedencia no quedó persistida en `Document`. En cargas posteriores, un
histórico sin pareja de snapshots o sello resultaba indistinguible de un
documento moderno que había perdido evidencia y se bloqueaba. Endurecer la
integridad moderna no debe inutilizar documentos históricos legítimos ni
inventarles una garantía que nunca tuvieron.

Otra variante del mismo rollout completó automáticamente para ciertos IDs del
importador un `documentSnapshot.source = legacy_backfill`, una configuración PDF
y un sello interno. Ese PDF snapshot describe una plantilla; no contiene el PDF
original. El snapshot también pudo copiar la configuración VeriFactu del perfil
sin que existiera un registro VeriFactu del documento. Esos artefactos técnicos,
cuando el bundle completo verifica, tampoco prueban una emisión de Factu ni un
envío a la AEAT.

## Decisión

El dominio mantiene dos políticas explícitas y excluyentes:

1. `legacy_imported + user_attested`: documento histórico importado, aceptado
   expresamente por el usuario, congelado y con procedencia persistente. Es
   utilizable en impuestos, ingresos, rentabilidad y exportaciones fiscales.
   Su validez operativa procede de la atestación versionada y de su copia fiscal
   congelada, no de un sello moderno ni de VeriFactu de esta aplicación.
2. `app_issued`: documento emitido por la aplicación. Mantiene fail-closed
   estricto y necesita la evidencia moderna que corresponda: snapshots, PDF,
   sello, hashes y, cuando aplique, evidencia VeriFactu coherente.

Se conserva además la compatibilidad preexistente `legacy_backfill` únicamente
para snapshots autocontenidos de IDs que no pertenecen a un importador
persistente conocido. No es una vía de reparación ni una alternativa a la
atestación: un ID PCFacturación, Holded, FacturaDirecta o genérico con esa fuente
queda bloqueado hasta confirmación. Tampoco puede aplicarse a un documento con
señales de emisión moderna, evidencia parcial o hashes incoherentes.

`LegacyImportAttestationV1 | LegacyImportAttestationV2 |
LegacyImportAttestationV3` y la política central de
`src/lib/document-integrity/legacy-import-attestation.ts` son el único contrato
para identificar y validar el primer caso. Los importadores soportados deben
pasar cada documento nuevo aceptado por `attestNewImportedDocument`; no se
permiten excepciones equivalentes dispersas en storage, impuestos, ingresos o
exportadores.

## Invariantes de seguridad

- La atestación es versionada, está ligada al ID, origen, contenido fiscal y
  `acceptedState` del documento, y se persiste como
  `legacyImportAttestation`. Ese estado congela `status`, lifecycle, lock,
  entrega, pago, aceptación, timestamps operativos y relaciones de procedencia.
- La consideración de cobro posterior elegida por el usuario es un dato de
  gestión distinto. Solo se expresa mediante
  `collectionStatusOverride` V1 (`collected` o `pending`, con timestamp ISO),
  queda fuera de `acceptedState` y no modifica `status`, `paymentStatus`,
  `paidAt`, `updatedAt`, snapshots, relaciones ni hashes del histórico. No
  acredita un movimiento bancario, no crea un recibo y no cambia el devengo ni
  los importes fiscales.
- La procedencia aceptada se conserva en save/load, cloud y backups, y la
  reimportación debe ser idempotente.
- Los borradores externos que siguen siendo editables conservan
  `legacyImportProvenance` sin presentarse como históricos atestados ni entrar
  por esa razón en cálculos fiscales.
- La referencia a la evidencia original sigue siendo preservable. Si la app no
  almacena el archivo fuente, la atestación lo declara como evidencia gestionada
  por el usuario y nunca afirma haberlo incorporado.
- El contenido fiscal y documental de un histórico atestado es read-only. Los
  cálculos consumen ese contenido congelado y verificado por la política
  central, no campos vivos divergentes. Cambiar después los campos de estado o
  las relaciones que pertenecen a `acceptedState` invalida la atestación y lo
  bloquea; nunca se corrige ni reproyecta silenciosamente al cargar. El overlay
  operativo de cobro es la única excepción y su ausencia conserva exactamente
  el comportamiento histórico importado.
- No se fabrica `pdfSnapshot`, `snapshotSeal`, hash moderno ni estado VeriFactu,
  ni se presenta al usuario que tales garantías existen.
- La política central puede reconocer un `verified_importer_rollout_bundle`
  únicamente si el namespace y fingerprint del importador son inequívocos, el
  source es `legacy_backfill`, snapshot + PDF técnico + sello están completos y
  todos sus hashes fuertes, identidad y contexto verifican. Exige además que no
  exista `document.verifactu`, `verifactuPersistence`, `snapshot.verifactu`,
  cuarentena, borrador emitido después ni acción posterior incompatible. El
  contexto VeriFactu aislado del perfil se retira al atestar y no se presenta
  como registro. Una pieza parcial, un hash/sello incoherente, source `issue` o
  `customer_repair`, evidencia VeriFactu real o procedencia dudosa permanece
  bloqueada.
- La atestación que convierte ese residuo conserva, dentro de su hash, huellas
  no identificativas del documento anterior, bundle, snapshots y sello, además
  del algoritmo de hash histórico cuando su redondeo legacy válido lo necesita.
  No duplica el bundle ni afirma conservar un PDF original. La copia JSON
  completa descargada antes de confirmar permite restaurar de forma durable el
  alcance de datos de negocio que la exportación declara; no incluye metadata
  efímera ni datos de Rentabilidad Real guardados fuera de AppData.
- V2 conserva `importProvenance` con el origen y, solo cuando existe evidencia
  persistida, la fecha real de importación. Si el rollout antiguo no la guardó,
  usa `importedAt: null` y separa `provenanceRecordedAt` de `attestedAt`; nunca
  convierte la fecha de reparación, `createdAt` o la fecha fiscal en una fecha
  de importación inventada. Conserva además un `sourceRecord` fiscal, su hash, el
  `taxSummary` aceptado y las carencias formales observadas. Base, IVA y total proceden de un snapshot legacy
  verificable o de las líneas persistidas que el usuario confirma contra sus
  documentos declarados; nunca se afirma que procedan de una cabecera externa
  que la aplicación no almacena.
- La ausencia o formato antiguo de nombre, NIF, dirección, localidad, código
  postal o descripción de línea se registra como aviso y no convierte el importe
  en cero. La reparación nunca rellena esos campos desde el perfil actual. Los
  importadores históricos que ya capturaban el perfil activo como encabezado
  deben declararlo como `issuerOrigin: current_profile_at_import`; un emisor
  leído del archivo se marca `source_document` y un origen antiguo imposible de
  demostrar, `unknown_legacy_import`. Ninguno se presenta como dato original sin
  esa procedencia explícita. `documentStateAtImport` distingue además un
  histórico que ya entró emitido de un borrador externo: si este último se emite
  después en Factu, nunca puede repararse como legacy aunque se pierdan también
  sus timestamps junto a snapshots/sello. Las procedencias V1 sin ese marcador
  solo se aceptan con el fingerprint inequívoco del importador; los casos
  ambiguos quedan en revisión. Siguen siendo obligatorios una
  procedencia conocida, número y fecha representables, al menos una línea y
  cantidades/precios/tipos de IVA finitos y reconciliables con el resumen.
- Si el documento ya contiene evidencia moderna y algún snapshot, PDF, sello o
  hash no verifica, permanece bloqueado. Nunca se elimina esa evidencia ni se
  reclasifica como legacy para desbloquearlo.
- Un documento `app_issued` sin la evidencia moderna exigida permanece
  bloqueado, aunque por forma se parezca a un histórico.
- Está prohibido inferir procedencia legacy por fecha, antigüedad, ausencia de
  `issuedAt` o ausencia de evidencia moderna.
- V3 admite rectificativas y recibos históricos solo cuando la pareja completa
  es inequívoca, recíproca y queda cubierta por un fingerprint de grupo común.
  La rectificativa debe enlazar un original único por ID, número y fecha, y el
  original debe señalar esa misma rectificativa. Una anulación debe cancelar
  algebraicamente el resumen fiscal; una corrección conserva su importe
  histórico confirmado. El recibo y su factura deben enlazarse en ambos
  sentidos y conservar fecha, líneas y resumen fiscal compatibles.
- La confirmación V3 es atómica: o se atestan todos los miembros de la relación
  con el mismo contrato, o ninguno. Relaciones huérfanas, unilaterales,
  duplicadas, ambiguas, con fechas o importes incompatibles permanecen en
  revisión manual. Nunca se infiere ni completa un vínculo por título, número
  parecido, proveedor o proximidad temporal.
- V1 y V2 conservan exactamente su semántica anterior de relaciones nulas. V3
  no reinterpreta sus hashes ni convierte documentos `app_issued` dañados en
  históricos.

## Migración y reparación

La reparación V2/V3 y la conversión versionada del residuo de rollout son
explícitas, previsualizables e idempotentes. La detección
automática solo propone candidatos con procedencia inequívoca de namespaces o
metadatos conocidos de PC Facturación, Holded, FacturaDirecta o documentos
genéricos. No muta al cargar.

La previsualización muestra recuento, origen, base, IVA, total, carencias,
grupos de relaciones V3 y motivos de exclusión. En V3 muestra además todos los
miembros, su papel y la relación recíproca que se congelará. El usuario confirma
que las cifras y relaciones coinciden con lo ya declarado y acepta conservar
los campos históricos incompletos. Cualquier
ambigüedad de procedencia o identidad requiere revisión manual. La aplicación comprueba una
precondición contra cambios posteriores antes de aplicar. La cuenta real se
reparará únicamente después del despliegue y QA, con backup previo, preview de
los afectados, confirmación del usuario, aplicación idempotente, registro
auditable y rollback protegido. En la primera versión, el rollback consiste en
restaurar mediante el flujo durable revisado la copia JSON completa descargada
justo antes de confirmar. La restauración persiste antes de publicar memoria,
registra el diff cloud pendiente y no afirma éxito ante un resultado bloqueado
o indeterminado; no se ofrece un deshacer parcial que pudiera mezclar documentos
anteriores y posteriores. El desarrollo y los tests usan solo fixtures.

Cuando hay residuos del rollout, la vista previa los desglosa de los candidatos
sin bundle y explica que su sello técnico no es de emisión. La propia tarjeta
debe descargar la copia del mismo precondition; cualquier cambio posterior la
invalida y obliga a descargar otra. Aplicar elimina únicamente el PDF snapshot,
sello, expectativa y señal sintéticos, sanea el contexto de perfil y produce el
snapshot `legacy_import_attested` con las mismas líneas y resumen fiscal. Nunca
se recalculan silenciosamente los importes declarados ni se muta durante load.

## Experiencia de usuario

La UI identifica el estado como «Histórico importado · aceptado por el usuario»
y explica que su contenido está congelado y disponible para Panel, facturación,
cobros, impuestos, ingresos, beneficio, periodos, Rentabilidad Real e informes.
Las carencias antiguas son visibles y no equivalen a una validación formal
nueva. Una factura histórica puede marcarse o desmarcarse como cobrada en la
gestión de Factu; la etiqueta y los totales de cobro usan el overlay, mientras
la factura importada conserva su estado original. El documento no posee un
sello moderno ni una certificación VeriFactu creada por esta app. Un fallo de
evidencia moderna se presenta como bloqueo de integridad, no como histórico.
Cuando se reconoce un paquete técnico del rollout, la UI separa expresamente
«bundle verificado» de «sello de emisión» y exige descargar una copia completa
del estado vigente antes de habilitar la confirmación. Cualquier cambio del
workspace invalida esa copia y obliga a descargar otra.

## Alcance fiscal

Tras validar la atestación, el contenido congelado participa en IVA, ingresos,
cobros, facturación, beneficio, periodos, rentabilidad y exportaciones fiscales.
V2 permite exportar el contenido tal como fue almacenado aunque no cumpla la
completitud moderna; no inventa los campos ausentes ni garantiza que un tercero
acepte el formato. La atestación no corrige datos fiscales ni concede una
garantía legal nueva: preserva el documento que el usuario decidió aceptar.

## Auditoría y evolución

CI verifica esta decisión, su referencia desde `AGENTS.md`, el uso del contrato
central en los cuatro importadores y la revisión mediante CODEOWNERS de storage,
integridad documental, importadores, impuestos, ingresos y exportaciones
fiscales.

Esta regla es una decisión de producto, no una excepción accidental. Solo puede
cambiarse mediante otro ADR explícito, una nueva versión del contrato, una
migración versionada y regresiones de compatibilidad. Una auditoría de seguridad
no puede eliminarla por considerarla menos estricta: debe proteger a la vez la
procedencia legacy y el fail-closed moderno.
