# 2B.7G - Offline XSD validator selection v1

Marker: `PHASE2B7G_OFFLINE_XSD_VALIDATOR_SELECTION_V1`
Date: 2026-06-26
Status: `BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`

## Decision

No offline XSD validator is selected in this phase.

This repository does not currently contain an approved XSD validator dependency,
and 2B.7F did not produce committed XSD fixtures. Adding a validator without
fixtures would create an implementation that cannot prove real offline schema
validation. The phase remains blocked instead of simulating validation.

## Evaluation

| Option | Decision | Reason |
| --- | --- | --- |
| Maintained JavaScript/WASM library | Not selected | No approved dependency was added in this phase, and no committed XSD fixture exists to validate against. |
| Pure JavaScript npm library | Not selected | The project has no existing pure JS XSD validator dependency. Adding one without fixture proof would not close the gate. |
| External stable binary | Not selected | A binary tool would add CI and platform risk and is not already part of the project toolchain. |
| Java | Not selected | Java was explicitly not preferred and would add runtime requirements that the project does not currently need. |
| No implementation for now | Selected | This is the only honest result while XSD fixtures and a proven offline validator are missing. |

## Required properties for a future validator

A future validator can be selected only if it is:

- reproducible in CI;
- offline during tests;
- independent from runtime downloads;
- able to validate against committed official XSD fixtures;
- compatible with the Node/Next toolchain;
- able to return controlled errors without printing full XML;
- safe for synthetic-only data;
- not dependent on real AEAT calls, certificates, transport, QR, signature or
  production configuration.

## What was not added

- no dependency;
- no package-lock change;
- no `src/lib/verifactu-official-validation/` module;
- no fake `validateOfficialAlignedSyntheticXmlOffline`;
- no XML serializer;
- no XSD validation claim.

## Blocker

`BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`

This blocker remains active until an approved offline validator and committed
official XSD fixtures exist together.
