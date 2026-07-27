# Central Invoice Authority Events Local Sync V1

Status: guarded browser orchestration, not wired to automatic cloud sync.

This phase composes the existing authenticated browser event puller with the
pure local event applicator. It gives the app one explicit operation for:

1. reading central invoice authority events with the current cursor,
2. applying them to an in-memory document list,
3. returning the next cursor that is safe to persist.

Safety contract:

- No automatic polling is enabled in this phase.
- The module performs no durable writes: no `localStorage`, no AppStore commit,
  no legacy cloud snapshot commit and no Supabase admin access.
- Pull failures return the original document list and keep the previous cursor.
- If any local apply conflict exists, especially `duplicate_fiscal_number`, the
  operation returns the original document list and keeps the previous cursor.
- The central server cursor is surfaced separately as `serverNextCursor` for
  diagnostics, but `cursorToPersist` never advances on a failed or conflicted
  local sync.
- Successful pages can include inserted invoices, metadata-only attachments or
  skipped unsupported events; only conflict-free pages can advance the cursor.

This is the bridge needed before wiring central event reception into the app
store. The next phase can decide where to persist `cursorToPersist` and when to
call this operation, without duplicating the fiscal safety rules.
