# 2E.6 Backup-before-write policy

Marker: `PHASE2E6_BACKUP_BEFORE_WRITE_POLICY_V1`

Estado: politica previa / no write / confirmaciones false por defecto.

## Requisitos para cualquier escritura futura

- Manifest de datos actuales.
- Digest de datos actuales.
- Recovery snapshot.
- Confirmacion humana.
- Dry-run report.

## Reglas

- `evaluateBackupBeforeWritePolicy` no escribe.
- Todos los requisitos empiezan como no confirmados.
- Incluso cuando los requisitos estan completos, `writeAllowed` permanece `false`.
- La politica solo prepara readiness para decision humana posterior.

## Limites

- No backup real automatico.
- No restore aplicado.
- No import aplicado.
- No documentos reales ni storage real.
