# Invoice extraction fixtures

This folder keeps regression contracts for the invoice extraction engine.

- `private_real/ground_truth/` and `private_real/pdf/` are ignored by git.
  Private PDFs and expected JSON stay outside the checkout and require explicit
  local opt-in through the variables documented in `../PRIVATE_FIXTURES.md`.
- `synthetic/` is reserved for generated PDF/JSON packs that do not contain real customer data.

The extractor should prefer deterministic PDF/table parsing first. AI should only help when confidence is low or the deterministic parser cannot map the document safely.
