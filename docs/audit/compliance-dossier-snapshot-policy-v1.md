# Compliance dossier snapshot policy v1

Marker: AUDIT1_COMPLIANCE_DOSSIER_SNAPSHOT_METADATA_V1

## Purpose

Markdown source: `docs/compliance-evidence-v1.md` remains the live, canonical and reviewable source for technical evidence in Git.

HTML and PDF outputs are derived snapshots for audit preparation. They are frozen views of the canonical Markdown at a specific commit/date and must not replace the Markdown source.

## Scope

Snapshots are intended for:

- technical audit preparation;
- legal/fiscal review preparation;
- traceability of internal controls and validation evidence.

Snapshots are not:

- a certification;
- AEAT validation;
- productive compliance closure;
- external legal/fiscal review;
- tax advice.

Limit identifiers used by the metadata:

- `not_a_certification`;
- `not_aeat_validation`;
- `not_productive_compliance`;
- `not_external_legal_review`;
- `not_tax_advice`.

## Generation rule

Generate a snapshot after relevant technical milestones, before external review, or when a reviewer requests a stable copy of the dossier.

Each generated snapshot should include:

- source document path;
- source commit when available;
- generation date/time;
- explicit limits and claim flags;
- the visible banner: "Evidencia técnica interna / No certificación / No cumplimiento productivo".

## Archive rule

Archive external snapshots as release/review artifacts, not as a replacement for the canonical Markdown. If a PDF is produced, it must be regenerated from the HTML output and not edited manually.

Do not include secrets, real customer data, private URLs, certificates, tokens, XML transport material, or production credentials in any snapshot.
