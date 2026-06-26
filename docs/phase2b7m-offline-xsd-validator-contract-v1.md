# 2B.7M - Offline XSD validator contract v1

Marker: `PHASE2B7M_OFFLINE_XSD_VALIDATOR_CONTRACT_V1`
Date: 2026-06-26
Status: `BLOCKED`

## Purpose

2B.7M defines the executable contract expected from a future offline XSD
validator. It does not select a dependency and does not validate XSD.

This phase deliberately provides only a blocked adapter.

## Implementation

Module:

- `src/lib/verifactu-official-gates/offline-xsd-validator-contract.ts`

Function:

- `createBlockedOfflineXsdValidator()`

The adapter:

- reports `status: "blocked"`;
- reports `canValidateOffline: false`;
- reports `usesNetwork: false`;
- reports `usesJava: false`;
- reports `usesNativeBinary: false`;
- reports `printsXml: false`;
- never returns `accepted: true`;
- never echoes XML input in errors.

## Blockers

- `BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR`;
- `BLOCKED_XSD_NOT_COMMITTED`.

## Safety

No fake XSD validation is implemented. The contract exists so future code has to
provide a real adapter with explicit capabilities before official aligned XML
validation can proceed.

No XML official, QR, signature, certificate, transport or production behavior is
introduced by this phase.
