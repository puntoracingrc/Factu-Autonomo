# Central Invoice Authority Events Sync State V1

Status: pure state reducer and storage normalization.

This phase persists the operational cursor and last result of central invoice
authority event reception inside `AppData`. It does not call the server, does
not start automatic polling and does not write to storage by itself.

Safety contract:

- Successful local sync results can replace the document list and advance
  `cursor`.
- Failed or conflicted results keep the previous document list and keep the
  previous cursor through `cursorToPersist`.
- `serverNextCursor` is stored only as diagnostic evidence in `lastResult`; it
  is not promoted to `cursor` after conflicts.
- Malformed persisted sync state is quarantined as
  `centralInvoiceAuthorityEventsSync` and the rest of the workspace still loads.
- The state contains counts, cursors, codes and timestamps only. It does not
  store document payloads, emitted snapshots, PDF bytes or fiscal text.

The next phase can call this reducer from the AppStore after a guarded pull,
then persist the resulting `AppData` through the existing durable write path.
