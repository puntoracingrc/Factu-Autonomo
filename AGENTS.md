<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Integridad de documentos históricos importados

La decisión obligatoria y versionada está en
[`docs/architecture/ADR-0001-historical-imported-documents.md`](docs/architecture/ADR-0001-historical-imported-documents.md).

- `legacy_imported + user_attested` es válido para impuestos y rentabilidad,
  permanece congelado/read-only —incluidos estado operativo y relaciones— y
  conserva su procedencia y evidencia original preservable; no se le fabrica ni
  exige un sello moderno o VeriFactu de esta app.
- En V2, base, IVA y total almacenados y confirmados por el usuario son la
  referencia histórica aunque falten NIF, dirección u otros campos exigidos hoy;
  esas carencias se conservan como avisos y el documento participa en Panel,
  ingresos, cobros, beneficio, periodos, Rentabilidad Real y exportaciones.
- Un bundle completo `legacy_backfill` que el rollout antiguo creó durante una
  importación solo puede convertirse mediante preview y confirmación si el
  importador/fingerprint son inequívocos y snapshot, PDF técnico y sello
  verifican juntos. El contexto VeriFactu copiado del perfil no es un registro;
  cualquier VeriFactu real, acción posterior, pieza parcial o hash/sello inválido
  sigue fail-closed. La conversión conserva hashes auditables del bundle y exige
  una copia JSON completa del alcance exportable para rollback; nunca se
  ejecuta al cargar.
- No se inventa una fecha de importación ni se presenta el perfil activo como
  emisor extraído del original: V2 conserva `importedAt: null` cuando no se
  conoce y declara `issuerOrigin` (`source_document`,
  `current_profile_at_import` o `unknown_legacy_import`). También conserva
  `documentStateAtImport`: un borrador externo emitido después por Factu nunca
  puede reclasificarse como histórico si pierde su evidencia moderna.
- V3 cubre únicamente relaciones históricas inequívocas y recíprocas:
  factura–rectificativa o factura–recibo. La pareja completa se previsualiza,
  confirma y atesta de forma atómica con un fingerprint común. Una relación
  huérfana, unilateral, duplicada, ambigua o con importes incompatibles sigue
  bloqueada; nunca se completa por número, título o fecha aproximada.
- `app_issued` mantiene el fail-closed estricto de snapshots, PDF, sello, hash y
  VeriFactu. La única excepción de lectura financiera es la recuperación
  explícita, versionada y reversible descrita en
  [`docs/architecture/ADR-0002-app-issued-document-recovery.md`](docs/architecture/ADR-0002-app-issued-document-recovery.md): nunca se ejecuta al cargar, nunca
  reclasifica como legacy y nunca fabrica un sello de emisión.
- Una recuperación `app_issued` solo puede aceptar contenido visible en un PDF
  original preservado por el usuario cuando falta por completo el bundle, el
  gap de relación de recibos anterior a la congelación de `sourceDocumentId` o
  el caso pre-sello exacto de ADR-0002 V2. Ese caso solo admite
  `test_registered + environment=test + legacy_unverified`: es un artefacto
  local de desarrollo no enviado a AEAT, se preserva byte-semánticamente y no
  entra en el snapshot recuperado ni se presenta como evidencia Veri*Factu.
  `server_confirmed`, producción, atestación autenticada o cualquier otra
  evidencia Veri*Factu siguen fail-closed.
- El gap V2 de cobro de recibos solo admite una pareja recíproca con bundles
  válidos, estado `pagado` en ambos extremos y ausencia completa de
  `paymentStatus` y `paidAt` en ambos; un estado híbrido o procedencia importada
  queda bloqueado y no se completa ni migra automáticamente.
- Toda recuperación debe conservar snapshots, PDF snapshots, sellos, hashes y
  artefactos VeriFactu existentes byte-semánticamente, exigir una descarga real
  de copia ligada al `AppData` completo, preview/confirmación por un único grupo
  y rollback reversible. El contexto VeriFactu del perfil por sí solo no es
  evidencia del documento.
- Si existe evidencia moderna y su hash, snapshot o sello es inválido, el
  documento siempre queda bloqueado: nunca se degrada a legacy.
- Está prohibido inferir que un documento es legacy solo por su fecha o por la
  ausencia de `issuedAt`.

Esta política solo puede cambiar mediante una decisión explícita de producto y
una migración versionada. Una auditoría de seguridad no puede eliminarla por
considerarla menos estricta.

## Retirada explícita de documentos de prueba

La decisión versionada está en
[`docs/architecture/ADR-0003-explicit-test-document-retirement.md`](docs/architecture/ADR-0003-explicit-test-document-retirement.md).

- Un documento emitido nunca se vuelve borrable mediante el botón genérico ni
  se relaja `DeletePolicy`. La retirada de pruebas es un flujo distinto,
  explícito, reversible y ligado a la sesión propietaria sincronizada.
- La selección se realiza en tiempo de ejecución; están prohibidos emails,
  tenants, IDs o números de documento codificados en el repositorio.
- Antes de aplicar o revertir se exige vista previa exacta, generación del JSON
  vigente con solicitud de descarga, precondición fresca y confirmación tipada.
  El evento registra hash y tamaño de esos bytes sin afirmar que el sistema
  operativo haya terminado de guardarlos. El lote conserva
  documentos y relaciones before/after, eventos append-only y reservas de
  numeración; nunca renumera ni permite reutilizar identidades retiradas.
- Solo puede limpiarse el backlink operativo `receiptDocumentId` de una factura
  superviviente cuando el recibo seleccionado es su única pareja recíproca.
  Snapshots, PDF snapshots, sellos, hashes, importes, estados, timestamps y
  cualquier artefacto VeriFactu se archivan byte-semánticamente y no se
  regeneran ni reinterpretan.
- Cualquier evidencia VeriFactu confirmada por servidor, registrada en
  producción o asociada a contexto de producción bloquea la retirada. Un
  artefacto local de TEST puede conservarse dentro del archivo, pero nunca se
  presenta como envío a la AEAT.
- La nube conserva intactas las filas documentales: la retirada se sincroniza
  como un único overlay versionado y los clientes actuales proyectan el estado
  activo. No se suben tombstones ni backlinks reescritos. Un cliente antiguo
  puede seguir mostrando las filas subyacentes hasta actualizarse, pero no debe
  reinterpretarse esa visualización como pérdida del lote. En clientes
  compatibles, el único camino de vuelta es el rollback explícito del lote.

Esta excepción solo sirve para retirar datos declarados expresamente como
pruebas. No es una herramienta para borrar operaciones fiscales reales ni para
silenciar una incidencia de integridad.
