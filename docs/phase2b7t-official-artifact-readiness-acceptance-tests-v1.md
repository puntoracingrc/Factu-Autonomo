# 2B.7T - Official artifact readiness acceptance tests v1

Marker: `PHASE2B7T_OFFICIAL_ARTIFACT_READINESS_ACCEPTANCE_TESTS_V1`
Date: 2026-06-26

## Purpose

2B.7T adds acceptance coverage for the blocked readiness tooling and the
hypothetical local/manual path using XSD sinteticos created only inside
temporary test directories.

No official XSD files are committed. No official XML is generated.

## Scope

The acceptance file is:

- `scripts/phase2b7t-official-artifact-readiness-acceptance.test.ts`

It covers 12 casos:

1. current repository without official local artifacts stays blocked;
2. CLI without `--artifact-dir` stays blocked;
3. CLI strict without `--artifact-dir` exits non-zero;
4. temporary simple synthetic XSD set can be inspected;
5. incorrect expected checksum stays blocked;
6. remote import stays blocked;
7. missing local import stays blocked;
8. complete local import graph is ready;
9. global readiness remains blocked even when checksum and graph are ready;
10. report does not contain complete XML/XSD content;
11. report does not contain secrets;
12. no red is used.

## Guardrails

- sin XSD oficiales;
- sin red;
- no official XML;
- no AEAT real calls;
- no certificates;
- no QR;
- no signature;
- no transport;
- no Supabase;
- no ViDA.

## Validation

NPM validator:

- `validate:phase2b7t-official-artifact-readiness-acceptance-tests`

Test command:

- `npx vitest run scripts/phase2b7t-official-artifact-readiness-acceptance.test.ts`
