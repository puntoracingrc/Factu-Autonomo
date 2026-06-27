# Phase 2D.97 - Import/restore no-go conditions registry

Marker: `PHASE2D97_IMPORT_RESTORE_NO_GO_CONDITIONS_REGISTRY_V1`

This phase adds a pure registry of no-go conditions for future hidden/routeless enablement review.

No-go conditions cover route existence, navigation connection, browser storage write, file reader, download, import apply, restore apply, real data usage, unblocked protected documents, forbidden copy, Supabase import and secrets.

The registry is safe by default when all conditions are absent. Any active condition blocks enablement and requires no activation.

It does not inspect production, Supabase remote or real documents.
