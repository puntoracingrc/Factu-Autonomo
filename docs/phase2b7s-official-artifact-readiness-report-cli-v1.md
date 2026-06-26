# 2B.7S - Official artifact readiness report CLI v1

Marker: `PHASE2B7S_OFFICIAL_ARTIFACT_READINESS_REPORT_CLI_V1`
Date: 2026-06-26

## Purpose

2B.7S adds a local CLI for a safe readiness report over optional local artifact
files:

- `scripts/check-verifactu-official-artifact-readiness.mjs`
- `check:verifactu-official-artifact-readiness`

The CLI is for local/offline inspection only. It does not download files, does
not write reports by default, does not copy artifacts and does not unlock
official XML.

## Options

- `--artifact-dir <path>`: explicit local directory to inspect.
- `--json`: print a safe JSON report.
- `--strict`: exit non-zero while the report is blocked.
- `--expected-sha256 <artifactId=sha256>`: local synthetic-test override used
  by acceptance tests; it is not a production artifact source.

Without `--strict`, blocked reports still exit zero so humans and CI can inspect
the JSON. With `--strict`, blocked reports exit non-zero.

## Safe output

The salida segura includes:

- status;
- blockers;
- artifact summaries;
- checksum status;
- import graph status;
- validator status, currently `blocked`;
- synthetic data status, currently `blocked`;
- next required decisions.

It does not include full XSD/XML content, secrets, real data, certificates or
private keys.

## Current expected status

The readiness report remains `blocked` even if local synthetic checksums and
import graph checks pass, because:

- no safe offline XSD validator is selected;
- no complete official safe synthetic data set is available;
- no official XSD files are committed or approved as fixtures.

## Validation

NPM validator:

- `validate:phase2b7s-official-artifact-readiness-report-cli`

Smoke checks cover:

- no `--artifact-dir`;
- JSON blocked output;
- strict non-zero exit while blocked;
- no XSD content in output;
- no network/certificate usage flags.
