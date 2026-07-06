# Invoice extraction fixtures

This folder keeps regression contracts for the invoice extraction engine.

- `private_real/ground_truth/` may contain anonymized expected JSON files.
- `private_real/pdf/` is ignored by git. Put real PDFs there only for local QA.
- `synthetic/` is reserved for generated PDF/JSON packs that do not contain real customer data.

The extractor should prefer deterministic PDF/table parsing first. AI should only help when confidence is low or the deterministic parser cannot map the document safely.
