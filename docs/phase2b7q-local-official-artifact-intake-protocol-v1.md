# 2B.7Q - Local official artifact intake protocol v1

Marker: `PHASE2B7Q_LOCAL_OFFICIAL_ARTIFACT_INTAKE_PROTOCOL_V1`
Date: 2026-06-26

## Purpose

2B.7Q adds an executable local intake protocol for future manually provided
official artifacts. It does not download files, does not copy files into the
repository and does not commit official XSD files.

The entry point is:

- `inspectLocalOfficialArtifactSet(...)`

## Current behavior

The protocol accepts an explicit local `baseDirectory`, an expected manifest and
a required artifact list. The current required artifacts are local `.xsd`
candidates only.

Status outcomes:

- no directory: `blocked` with `BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_PROVIDED`;
- missing directory: `blocked` with `BLOCKED_LOCAL_ARTIFACT_DIRECTORY_NOT_FOUND`;
- missing required XSD: `blocked` with `BLOCKED_REQUIRED_XSD_FILE_MISSING`;
- forbidden source/docs/public/app/.git location: `blocked`;
- forbidden extension or secret-looking filename: `blocked`;
- valid temporary synthetic `.xsd` set in tests: inspectable.

The safe result includes only summaries such as artifact id, expected filename,
existence, extension status and checksum expectation. It does not include XSD
content, secrets, certificates or source XML.

## Guardrails

- no descarga de XSD;
- no network access;
- no certificates;
- no file copy into the repo;
- no XML official generation;
- no real invoice data;
- no AEAT calls;
- no Supabase;
- no transport.

## Validation

NPM validator:

- `validate:phase2b7q-local-official-artifact-intake-protocol`

Tests:

- missing directory input;
- non-existing directory;
- forbidden repo source location;
- valid temporary synthetic XSD directory;
- forbidden extension and secret-looking filename;
- no sensitive content in serialized errors.
