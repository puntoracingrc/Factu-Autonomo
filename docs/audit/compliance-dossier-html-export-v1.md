# Compliance dossier HTML export v1

Marker: AUDIT2_COMPLIANCE_DOSSIER_HTML_EXPORT_V1

## Summary

The HTML export creates a printable static snapshot from `docs/compliance-evidence-v1.md`.

Command:

```bash
npm run export:compliance-dossier:html
```

Default output:

```text
docs/audit/exports/compliance-evidence-v1-snapshot.html
```

## Safety controls

- The Markdown dossier remains canonical.
- The script reads local files only.
- No network access is required.
- No remote scripts or remote CSS are included.
- Markdown content is escaped before rendering to HTML.
- The output includes commit/date metadata when available.
- The output includes a visible limitation banner.

## Limits

The generated HTML is technical internal evidence for audit preparation. It does not declare productive compliance, certification, homologation, AEAT validation, tax advice, public endpoint readiness, or productive sync.
