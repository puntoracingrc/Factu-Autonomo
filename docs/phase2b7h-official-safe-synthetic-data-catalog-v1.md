# 2B.7H - Official safe synthetic data catalog v1

Marker: `PHASE2B7H_OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG_V1`
Date: 2026-06-26
Status: `BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA`

## Decision

No XML-usable official synthetic data is created in this phase.

The project now has an explicit catalog of blocked data requirements under
`src/lib/verifactu-official-alignment/synthetic-data-catalog.ts`. The catalog
does not invent NIFs, invoice numbers, invoice dates, totals or cancellation
values. Every entry is `syntheticOnly: true`, `source: "blocked"`,
`usableForXml: false` and `value: null`.

## Source review

The official artifact sources reviewed for 2B.7A-E and 2B.7F identify schemas,
design references, validation references and hash references, but this phase did
not identify a complete official safe sample set that can be used for both:

- `RegistroAlta`;
- `RegistroAnulacion`.

The public schema index was available, but the XSD files themselves were not
downloaded into the repo as fixtures in 2B.7F. Without the XSD fixtures and
without a validator selected in 2B.7G, the project cannot prove that any
candidate values are complete enough for official-aligned XML.

## Catalog result

The catalog blocks at least these requirements:

- alta issuer tax identifier;
- alta invoice identifier;
- alta issue date;
- alta total amount;
- anulacion issuer tax identifier;
- anulacion cancelled invoice identifier.

No value from existing internal synthetic fixtures is promoted into official XML
data, because those values were intentionally internal and not official safe
examples.

## Gate

`OFFICIAL_SAFE_SYNTHETIC_DATA_GATE` is blocked:

- `completeAltaCaseAvailable: false`;
- `completeAnulacionCaseAvailable: false`;
- `usableForXml: false`;
- blocker: `BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA`.

## Consequence

2B.7I and 2B.7J must not be implemented in this branch.

No XML aligned with the official schema is serialized, persisted, printed,
snapshotted, signed, transported or represented as production-ready.
