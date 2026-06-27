# PHASE2C52_SYNC_HANDLER_FAKE_SUPABASE_LOCAL_PARITY_V1

Paridad tecnica entre el handler con fake adapter y el handler con adaptador Supabase local inyectado.

## Objetivo

Comparar comportamiento observable seguro sin depender de ids internos exactos:

- status HTTP;
- `ok`;
- estado seguro del resultado;
- command kind;
- shape de batch;
- ausencia de payload completo o snapshots.

## Casos

- Create draft.
- Update draft.
- Stale conflict.
- Protected rejected.
- Cross-user rejected.
- Batch mixed.
- Safe report shape.

## Resultado esperado

El fake adapter sigue siendo default de la route shell. El harness Supabase local queda opt-in y se usa solo como evidencia tecnica interna local/staging.

No se declara sync productiva ni cumplimiento cerrado.
