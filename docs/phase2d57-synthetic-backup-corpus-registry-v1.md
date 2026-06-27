# Phase 2D.57 - Synthetic backup corpus registry v1

Marker: `PHASE2D57_SYNTHETIC_BACKUP_CORPUS_REGISTRY_V1`

Status: evidence tecnica interna, synthetic backup corpus, local data safety.

## Scope

Creates a registry of synthetic backup/import/restore cases for data-loss regression before any UI wiring decision.

Implemented in:

- `src/lib/local-data-safety/synthetic-backup-corpus.ts`
- `src/lib/local-data-safety/synthetic-backup-corpus.test.ts`

## Cases

- `SYNTHETIC_ONLY_EMPTY_APP_BACKUP`
- `SYNTHETIC_ONLY_DRAFTS_ONLY_BACKUP`
- `SYNTHETIC_ONLY_ISSUED_LOCKED_BACKUP`
- `SYNTHETIC_ONLY_LEGACY_PROTECTED_BACKUP`
- `SYNTHETIC_ONLY_COUNTERS_MISMATCH_BACKUP`
- `SYNTHETIC_ONLY_SNAPSHOT_HASH_MISMATCH_BACKUP`
- `SYNTHETIC_ONLY_PDF_HASH_MISMATCH_BACKUP`
- `SYNTHETIC_ONLY_DUPLICATE_DOCUMENT_IDS_BACKUP`
- `SYNTHETIC_ONLY_DUPLICATE_CUSTOMER_IDS_BACKUP`
- `SYNTHETIC_ONLY_MIXED_VALID_AND_BLOCKED_BACKUP`
- `SYNTHETIC_ONLY_LARGE_LIST_BACKUP`
- `SYNTHETIC_ONLY_MALFORMED_SHAPE_BACKUP`

## Boundaries

No UI conectada, no ruta, no navegación, no localStorage read/write, no import/restore apply, sin producción, sin Supabase y sin documentos reales.

The corpus stores references, hashes and safe summaries only. It does not include full document snapshots, PDF bodies or real identifiers.

## Validation

Covered by `validate:phase2d57-synthetic-backup-corpus-registry` and unit tests.
