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
- `app_issued` mantiene el fail-closed estricto de snapshots, PDF, sello, hash y
  VeriFactu.
- Si existe evidencia moderna y su hash, snapshot o sello es inválido, el
  documento siempre queda bloqueado: nunca se degrada a legacy.
- Está prohibido inferir que un documento es legacy solo por su fecha o por la
  ausencia de `issuedAt`.

Esta política solo puede cambiar mediante una decisión explícita de producto y
una migración versionada. Una auditoría de seguridad no puede eliminarla por
considerarla menos estricta.
