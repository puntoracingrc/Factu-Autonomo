# Compliance dossier PDF snapshot guide v1

Marker: AUDIT3_COMPLIANCE_DOSSIER_PDF_SNAPSHOT_GUIDE_V1

## Canonical source

`docs/compliance-evidence-v1.md` remains the source of truth. The HTML and PDF files are derived snapshots.

## Recommended PDF flow

1. Generate the printable HTML:

```bash
npm run export:compliance-dossier:html
```

2. Open `docs/audit/exports/compliance-evidence-v1-snapshot.html` in a local browser.
3. Use "Print to PDF".
4. Name the PDF with date and commit, for example:

```text
compliance-evidence-v1-snapshot-YYYYMMDD-COMMIT.pdf
```

5. Archive the PDF as an external review/release artifact.

## Rules

- Do not edit the PDF manually.
- Regenerate the PDF from the HTML after relevant technical milestones.
- Keep the commit/date visible in the snapshot.
- Do not use the PDF to declare productive compliance.
- Do not include secrets, tokens, private URLs, real customer data, certificates, XML transport material, or production credentials.

## Automation

No PDF export script is added in AUDIT_EXPORT_V1. A future script may be introduced only if it remains opt-in, local, dependency-light and does not require network access or external services.
