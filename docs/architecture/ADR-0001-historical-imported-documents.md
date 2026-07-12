# ADR-0001: documentos históricos importados y atestados por el usuario

- Estado: Aceptado
- Versión de la decisión: 1
- Fecha: 2026-07-12
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

`LegacyImportAttestationV1` y la política central de
`src/lib/document-integrity/legacy-import-attestation.ts` son el único contrato
para identificar y validar el primer caso. Los importadores soportados deben
pasar cada documento nuevo aceptado por `attestNewImportedDocument`; no se
permiten excepciones equivalentes dispersas en storage, impuestos, ingresos o
exportadores.

## Invariantes de seguridad

- La atestación es versionada, está ligada al ID, origen y contenido fiscal
  congelado del documento, y se persiste como `legacyImportAttestation`.
- La procedencia aceptada se conserva en save/load, cloud y backups, y la
  reimportación debe ser idempotente.
- Los borradores externos que siguen siendo editables conservan
  `legacyImportProvenance` sin presentarse como históricos atestados ni entrar
  por esa razón en cálculos fiscales.
- La referencia a la evidencia original sigue siendo preservable. Si la app no
  almacena el archivo fuente, la atestación lo declara como evidencia gestionada
  por el usuario y nunca afirma haberlo incorporado.
- Un histórico atestado es read-only. Los cálculos consumen su contenido fiscal
  congelado y verificado por la política central, no campos vivos divergentes.
- No se fabrica `pdfSnapshot`, `snapshotSeal`, hash moderno ni estado VeriFactu,
  ni se presenta al usuario que tales garantías existen.
- Si el documento ya contiene evidencia moderna y algún snapshot, PDF, sello o
  hash no verifica, permanece bloqueado. Nunca se elimina esa evidencia ni se
  reclasifica como legacy para desbloquearlo.
- Un documento `app_issued` sin la evidencia moderna exigida permanece
  bloqueado, aunque por forma se parezca a un histórico.
- Está prohibido inferir procedencia legacy por fecha, antigüedad, ausencia de
  `issuedAt` o ausencia de evidencia moderna.
- Rectificativas y recibos históricos solo pueden entrar cuando su relación
  fiscal sea inequívoca y esté cubierta expresamente por el contrato; los casos
  ambiguos quedan en revisión manual. La primera versión no los repara
  automáticamente; requieren una ampliación versionada del contrato y pruebas
  positivas de la relación completa.

## Migración y reparación

La reparación es explícita, previsualizable e idempotente. La detección
automática solo propone candidatos con procedencia inequívoca de namespaces o
metadatos conocidos de PC Facturación, Holded, FacturaDirecta o documentos
genéricos. No muta al cargar.

La previsualización muestra recuento, origen y motivos de exclusión. Cualquier
ambigüedad requiere confirmación o revisión manual. La aplicación comprueba una
precondición contra cambios posteriores antes de aplicar. La cuenta real se
reparará únicamente después del despliegue y QA, con backup previo, preview de
los afectados, confirmación del usuario, aplicación idempotente, registro
auditable y rollback protegido. En la primera versión, el rollback consiste en
restaurar mediante el flujo revisado la copia JSON completa descargada justo
antes de confirmar; no se ofrece un deshacer parcial que pudiera mezclar
documentos anteriores y posteriores. El desarrollo y los tests usan solo
fixtures.

## Experiencia de usuario

La UI identifica el estado como «Histórico importado · aceptado por el usuario»
y explica que está congelado y disponible para cálculos, pero que no posee un
sello moderno ni una certificación VeriFactu creada por esta app. Un fallo de
evidencia moderna se presenta como bloqueo de integridad, no como histórico.

## Alcance fiscal

Tras validar la atestación, el contenido congelado participa en IVA, ingresos,
rentabilidad y exportaciones fiscales con las mismas reglas de cálculo del tipo
documental correspondiente. La atestación no corrige datos fiscales ni concede
una garantía legal nueva: preserva el documento que el usuario decidió aceptar.

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
