# 2B.7X - Opt-in official artifact verification v1

Marker: `PHASE2B7X_OPT_IN_OFFICIAL_ARTIFACT_VERIFICATION_V1`
Date: 2026-06-26

## Purpose

2B.7X adds an opt-in verifier for a local artifact directory and an explicit
lockfile. It is not part of the default CI path and does not run without
arguments.

Script:

- `scripts/verify-verifactu-official-artifact-lockfile.mjs`

NPM:

- `verify:verifactu-official-artifact-lockfile`

## Options

- `--artifact-dir <path>`;
- `--lockfile <path>`;
- `--json`;
- `--strict`.

## States

- `blocked_missing_arguments`: no-op safe state when required explicit paths are
  missing;
- `lockfile_invalid`: lockfile or local artifact set failed verification;
- `lockfile_valid_but_alignment_still_blocked`: lockfile and local artifact
  checks passed, but official alignment remains blocked.

## Checks

The verifier checks:

- explicit lockfile path only;
- explicit artifact directory only;
- artifact ids;
- official domains and URLs from the known manifest;
- SHA-256;
- local import/include graph;
- blocked remote imports;
- missing dependencies;
- forbidden extensions;
- no XSD/XML content in output.

## Still Blocked

Even a valid lockfile remains blocked because these decisions are still missing:

- safe offline XSD validator;
- complete official safe synthetic data;
- human approval to store or use official artifacts as fixtures.

The verifier does not validate XSD officially, does not generate XML and does
not say "ready for XML".

## Validation

NPM validator:

- `validate:phase2b7x-opt-in-official-artifact-verification`
