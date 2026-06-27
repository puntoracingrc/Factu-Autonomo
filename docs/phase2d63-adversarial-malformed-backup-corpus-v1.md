# Phase 2D.63 - Adversarial malformed backup corpus v1

Marker: `PHASE2D63_ADVERSARIAL_MALFORMED_BACKUP_CORPUS_V1`

Status: evidence tecnica interna for local data safety and data-loss regression.

## Scope

Adds an adversarial synthetic corpus for malformed backup hardening.

Implemented in:

- `src/lib/local-data-safety/adversarial-backup-corpus.ts`
- `src/lib/local-data-safety/adversarial-backup-corpus.test.ts`

## Cases

- Prototype pollution.
- Constructor/prototype keys.
- Circular-like unsupported marker.
- Deep nesting.
- Huge arrays.
- HTML/script string.
- XML-like string as synthetic adversarial input only.
- Token/secret-like marker as synthetic adversarial input only.
- Function-like value.
- Class instance-like value.
- Document with malicious labels.

## Boundaries

No payload echo, no prototype pollution, no production input and no real data. No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

## Validation

Covered by `validate:phase2d63-adversarial-malformed-backup-corpus` and unit tests.
