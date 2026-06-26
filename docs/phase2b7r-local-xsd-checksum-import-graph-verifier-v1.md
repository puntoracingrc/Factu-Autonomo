# 2B.7R - Local XSD checksum and import graph verifier v1

Marker: `PHASE2B7R_LOCAL_XSD_CHECKSUM_IMPORT_GRAPH_VERIFIER_V1`
Date: 2026-06-26

## Purpose

2B.7R adds local-only technical helpers for a future manual official artifact
review:

- `computeLocalArtifactSha256(...)`;
- `inspectLocalXsdImportGraph(...)`.

This phase still performs no validacion XSD and makes no claim of AEAT,
VERI*FACTU or production compliance.

## Checksum verifier

`computeLocalArtifactSha256(...)`:

- reads a local file path;
- accepts `.xsd` only;
- rejects files above a safe size limit;
- returns SHA-256 and byte length;
- returns only a safe filename;
- does not print file content.

## Import/include graph verifier

`inspectLocalXsdImportGraph(...)`:

- reads a local `.xsd`;
- detects `xs:include` and `xs:import` `schemaLocation` references;
- resolves only relative local references under the provided base directory;
- rejects remote references;
- rejects traversal outside the base directory;
- reports dependencies, missing dependencies and blocked references safely;
- does not validate schemas.

## Guardrails

- sin red;
- no runtime downloads;
- no official XSD committed;
- no XML official;
- no certificates;
- no signature;
- no QR;
- no transport.

## Validation

NPM validator:

- `validate:phase2b7r-local-xsd-checksum-import-graph-verifier`

Tests:

- deterministic checksum;
- checksum changes with content;
- local include/import detected;
- missing dependency detected;
- remote URL blocked;
- traversal blocked;
- no content printed in results.
