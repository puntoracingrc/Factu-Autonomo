# ADR-0002 — Recuperación explícita de documentos emitidos por Factu

- Estado: aceptada
- Versión de contrato: 1
- Fecha: 2026-07-13
- Decisión de producto: explícita

## Contexto

Dos defectos históricos de Factu podían dejar a cero documentos cuyo contenido
seguía visible en el PDF original:

1. algunas rectificativas se guardaron como emitidas antes de pasar por el
   flujo canónico que crea snapshot, snapshot PDF y sello;
2. algunos recibos conservan un bundle criptográfico válido anterior a la
   congelación de `sourceDocumentId` dentro del snapshot y hoy fallan solo al
   verificar la relación con la factura.

El bloqueo actual es deliberadamente _fail-closed_. Un PDF permite contrastar
el contenido fiscal, pero no puede reconstruir el sello original de emisión.
Re-sellar el documento como si aquel sello hubiera existido sería una falsa
afirmación de integridad.

## Decisión

Se admite una recuperación manual, versionada y reversible distinta de
`legacy_imported` y distinta del bundle moderno de emisión. Solo cubre:

- `pre_canonical_rectification_v1`: pareja recíproca factura–rectificativa en la
  que uno o ambos miembros carecen por completo de snapshot, snapshot PDF y
  sello; cada miembro sin bundle exige que el usuario seleccione y confirme su
  PDF original, del que solo se guarda SHA-256, tamaño, resumen confirmado y la
  huella del contenido fiscal completo mostrado para revisión;
- `receipt_source_snapshot_gap_v1`: pareja recíproca factura–recibo cuyo bundle
  individual verifica íntegramente y cuyo único defecto es que el snapshot del
  recibo, creado por una versión anterior, no contiene `sourceDocumentId`.

La recuperación se guarda en `appIssuedRecoveryAttestation`. Un snapshot de
recuperación puede representar el contenido confirmado, pero nunca ocupa
`documentSnapshot`, nunca genera `pdfSnapshot` ni `snapshotSeal` y siempre lleva
la fuente `app_issued_recovery`. Los consumidores financieros lo aceptan a
través de una única política central. Acciones de edición, reemisión,
VeriFactu o efectos protegidos que requieren el bundle original siguen
bloqueadas.

El código solo comprueba la cabecera de formato, calcula la huella SHA-256 y
vincula el archivo seleccionado con la vista previa. No extrae ni valida el
texto del PDF. La interfaz muestra emisor, cliente, relación, líneas, notas y
resumen fiscal procedentes del documento almacenado; su coincidencia con el PDF
es una confirmación humana explícita. La huella de ese contenido impide cambiar
cliente o líneas conservando los mismos totales después de confirmarlo. La
interfaz no puede presentarlo como una verificación automática del PDF.

## Invariantes

- Nunca se infiere una recuperación por fecha, número, ausencia de `issuedAt` o
  por estar bloqueado.
- No se ejecuta nada en `load`, normalización, nube, backup o demo. Siempre hay
  vista previa, copia recomendada, confirmación y commit durable único.
- La factura y su rectificativa o recibo se aplican como un grupo atómico. IDs,
  fechas, números, líneas, importes, cliente, emisor, estados y relaciones deben
  coincidir de forma determinista.
- Una relación congelada en un snapshot moderno prevalece sobre los campos
  vivos. Una pareja híbrida que apunte a otro original o emisor queda bloqueada.
- Toda evidencia VeriFactu excluye el candidato. También lo excluye cualquier
  snapshot, hash, snapshot PDF o sello presente que no verifique. La ausencia
  total y el gap exacto de recibo no se confunden con corrupción.
- La aplicación y el rollback usan precondiciones frescas y fingerprints. Un
  cambio posterior bloquea el rollback; no se sobrescribe.
- `documentSnapshot`, `pdfSnapshot`, `snapshotSeal`, sus hashes,
  `verifactu`, `verifactuPersistence` y la cadena VeriFactu permanecen idénticos
  antes y después.
- El PDF original no se sube ni se persiste en Factu. Se conserva fuera de la
  app bajo responsabilidad del usuario; el código no registra nombre, texto ni
  bytes. Su huella SHA-256 se conserva como dato protegido de la cuenta.
- Una restauración exacta desde una copia que ya contenga el bundle original es
  la única forma de recuperar ese sello como evidencia moderna original.

## Alcance fiscal y de negocio

Una atestación válida permite que el snapshot de recuperación alimente importes
en listados, Panel, ingresos, cuentas y rentabilidad. Impuestos y exportaciones
fiscales pueden consumirlo únicamente si también supera sus validaciones
preexistentes: la recuperación no convierte en fiscalmente válida una
rectificativa cuyo tipo y signo ya eran incompatibles. Las reglas existentes de
rectificación siguen evitando doble contabilización y los recibos vinculados
siguen sin duplicar ingresos. La etiqueta de UI debe decir que es contenido
recuperado desde PDF, no “integridad moderna válida”.

## Migración y recuperación de datos reales

No hay migración automática. El despliegue solo publica el motor y la interfaz.
La cuenta real se repara en un paso separado: exportar backup, generar preview
exacta de IDs y cifras, confirmar, aplicar de forma idempotente y conservar una
ruta de rollback. Durante desarrollo y CI solo se usan fixtures sintéticos.

## Evolución

Esta política solo puede modificarse mediante otra decisión explícita de
producto y una migración versionada. Una auditoría de seguridad no puede
reclasificar estos documentos como legacy, crear sellos retrospectivos ni
eliminar la recuperación por considerarla menos estricta.
