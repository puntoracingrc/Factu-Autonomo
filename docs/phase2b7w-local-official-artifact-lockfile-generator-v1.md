# 2B.7W - Local official artifact lockfile generator v1

Marker: `PHASE2B7W_LOCAL_OFFICIAL_ARTIFACT_LOCKFILE_GENERATOR_V1`
Date: 2026-06-26

## Purpose

2B.7W adds a local generator that reads an explicitly provided artifact
directory and produces a safe redacted lockfile.

Script:

- `scripts/generate-verifactu-official-artifact-lockfile.mjs`

NPM:

- `generate:verifactu-official-artifact-lockfile`

## Options

- `--artifact-dir <path>`;
- `--json`;
- `--out <path>`;
- `--redacted`;
- `--strict`.

## Behavior

- missing `--artifact-dir` returns a controlled blocked error;
- missing directory returns a controlled blocked error;
- artifact directory under repo `src`, `docs`, `public`, `app` or `.git` is
  blocked;
- temporary synthetic `.xsd` test directories can generate a lockfile;
- output is redacted by default;
- `--out` writes only to an explicit `.json` path outside forbidden repo
  directories;
- no XSD files are copied;
- no downloads are performed;
- no network is used;
- no certificates are used;
- no XSD content is printed.

## Output

The generated lockfile contains only safe metadata:

- artifact id;
- filenames;
- official URL/domain from the known manifest;
- SHA-256;
- byte length;
- import/include references;
- import graph completeness.

## Validation

NPM validator:

- `validate:phase2b7w-local-official-artifact-lockfile-generator`

Tests cover missing arguments, missing directory, synthetic XSD lockfile
generation, redacted JSON, allowed temp `--out`, blocked repo `--out`, checksum
and imports/includes.
