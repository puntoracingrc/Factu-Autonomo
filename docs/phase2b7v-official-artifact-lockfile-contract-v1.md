# 2B.7V - Official artifact lockfile contract v1

Marker: `PHASE2B7V_OFFICIAL_ARTIFACT_LOCKFILE_CONTRACT_V1`
Date: 2026-06-26

## Purpose

2B.7V defines a safe executable contract for a future official artifact
lockfile. It does not introduce official artifacts, does not commit XSD files
and does not validate XSD officially.

The lockfile format is:

- `lockfileVersion: "phase2b7v-official-artifact-lockfile-v1"`;
- `generatedAt`;
- `generatedBy`;
- `source: "manual_local_intake"`;
- `artifacts[]` with artifact id, expected/local filenames, official URL,
  official domain, version, SHA-256, byte length, content type candidate,
  import/include metadata, graph completeness, safe-for-offline-tests flag and
  notes.

## Executable API

- `buildOfficialArtifactLockfile(...)`;
- `validateOfficialArtifactLockfile(...)`;
- `redactOfficialArtifactLockfile(...)`.

## Validation Rules

The validator checks:

- known artifact ids from the official manifest;
- official URL and domain match the manifest;
- lowercase SHA-256 format;
- `.xsd` filenames only;
- forbidden extensions blocked;
- complete import/include graph flag;
- no XML/XSD content;
- no secrets or certificates;
- no local absolute paths in public output;
- no unsafe unknown fields.

## Redaction

Local paths are not included by default. If an internal/debug caller includes a
`localPath`, `redactOfficialArtifactLockfile(...)` removes it before public
export.

## Current Gate

A valid lockfile is only a contract-level artifact inventory. It is not approval
to generate XML, validate official XSD, add QR, sign, transport or use
VERI*FACTU productively.

## Validation

NPM validator:

- `validate:phase2b7v-official-artifact-lockfile-contract`

Tests use synthetic XSD files created only in temporary directories.
