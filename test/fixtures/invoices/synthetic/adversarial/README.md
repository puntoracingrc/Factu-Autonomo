# Synthetic Adversarial Invoice Fixtures

This suite contains generated, fully fictitious Spanish invoice PDFs and JSON ground truth files for hardening the deterministic invoice engine.

- No real invoices or real customer data are stored here.
- Regenerate with `npm run fixtures:invoices:generate-adversarial`.
- Validate structure with `npm run fixtures:invoices:validate`.
- Run the full benchmark with `npm run benchmark:invoices`.

The fixtures exercise multipage tables, repeated and missing headers, wrapped descriptions, changed columns, explicit M2/ML/UN charge quantities, line discounts, Spanish tax cases, misleading totals, and product groups with components.

The expected JSON is generated from the fixture source of truth before the PDF is rendered. Do not edit ground truth to hide parser failures.
