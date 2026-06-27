# PHASE2C61_PRIVATE_STAGING_KILL_SWITCH_ROLLBACK_RUNBOOK_V1

## Objetivo

Documentar un runbook de kill switch y rollback para private staging sin configurar entornos reales ni tocar Vercel.

## Kill switch

El contrato contempla `DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH`. Si se evalua como `true`, el estado permitido es inactive. Este PR solo documenta y testea el contrato; no crea la variable real.

## Rollback

1. Confirmar que la route shell sigue disabled by default.
2. Confirmar que el fake adapter sigue siendo default.
3. Confirmar que Supabase local sigue opt-in only.
4. Confirmar que no existe Supabase remoto activo para document sync.
5. Confirmar que no existe endpoint publico operativo.
6. Revertir cambios de configuracion en una orden humana separada si alguna vez se crean en el futuro.

## Limites

- No produccion.
- No Supabase remoto.
- No staging remoto activo.
- No dominios, DNS, aliases ni promote.
- No documentos reales.

## Evidencia

- Contrato en `src/lib/document-sync-integrity/private-staging-environment.ts`.
- Validador: `scripts/validate-phase2c61-private-staging-kill-switch-rollback-runbook.mjs`.
