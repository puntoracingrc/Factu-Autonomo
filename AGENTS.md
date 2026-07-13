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
  original preservado por el usuario cuando falta por completo el bundle, o el
  gap de relación de recibos anterior a la congelación de `sourceDocumentId`.
  Debe conservar snapshots, PDF snapshots, sellos, hashes y VeriFactu existentes
  byte-semánticamente, exigir preview/confirmación y ser reversible.
- Si existe evidencia moderna y su hash, snapshot o sello es inválido, el
  documento siempre queda bloqueado: nunca se degrada a legacy.
- Está prohibido inferir que un documento es legacy solo por su fecha o por la
  ausencia de `issuedAt`.

Esta política solo puede cambiar mediante una decisión explícita de producto y
una migración versionada. Una auditoría de seguridad no puede eliminarla por
considerarla menos estricta.
