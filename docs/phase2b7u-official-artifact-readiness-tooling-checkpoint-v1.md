# 2B.7U - Official artifact readiness tooling checkpoint v1

Marker: `PHASE2B7U_OFFICIAL_ARTIFACT_READINESS_TOOLING_CHECKPOINT_V1`
Date: 2026-06-26

`PHASE2B7_OFFICIAL_ALIGNMENT_GATE: BLOCKED / READINESS TOOLING AVAILABLE`

## Summary

2B.7Q-U adds local/offline tooling to prepare a future safe manual intake of
official XSD artifacts. It does not unlock official aligned XML, official XSD
validation, QR, signature, certificates, transport or AEAT real calls.

The previous 2B.7L-P enforcement remains active. The system can report why the
official alignment gate is still blocked, and now also offers local readiness
checks for a future artifact set supplied manually and safely.

## Completed

2B.7Q:

- local official artifact intake protocol;
- explicit local directory requirement;
- forbidden source/docs/public/app/.git locations blocked;
- forbidden extensions and secret-looking filenames blocked;
- safe artifact summaries only.

2B.7R:

- local SHA-256 verifier for `.xsd` files;
- local import/include graph inspector;
- remote references, traversal and missing dependencies blocked;
- no validacion XSD claim.

2B.7S:

- readiness CLI;
- safe JSON or text summary;
- strict mode for blocked exit code;
- validator and synthetic data gates remain blocked.

2B.7T:

- acceptance tests with temporary XSD sinteticos;
- blocked default flow;
- hypothetical local graph/checksum-ready flow still globally blocked.

## Still blocked

- no XSD oficiales commiteados;
- no official XSD fixture policy approved;
- no safe offline XSD validator selected;
- no complete official safe synthetic data set;
- no XML oficial;
- no validacion XSD oficial;
- no QR;
- no firma;
- no certificados;
- no transporte;
- no AEAT real;
- no produccion VeriFactu.

## Next decision

Before any future unlock:

- obtain official XSD files through a safe manual/offline process;
- decide whether official XSD files may be stored as test fixtures;
- select a reproducible offline XSD validator;
- define a safe official synthetic data strategy.

No iniciar 2B.8 from this state.
