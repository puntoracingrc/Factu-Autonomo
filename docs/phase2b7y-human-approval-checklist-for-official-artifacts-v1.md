# 2B.7Y - Human approval checklist for official artifacts v1

Marker: `PHASE2B7Y_HUMAN_APPROVAL_CHECKLIST_FOR_OFFICIAL_ARTIFACTS_V1`
Date: 2026-06-26

## Purpose

2B.7Y defines the human approval checklist required before any future phase may
store official XSD files as fixtures or use them for official alignment work.

This checklist does not approve anything by itself. It records the gates that a
person must review and explicitly approve later.

## Checklist

- official source verified;
- official URLs recorded;
- checksums recorded and reviewed;
- license or reasonable-use review completed;
- no real certificate used;
- no operational AEAT call used;
- XSD obtained through a static/manual path;
- import graph complete;
- offline XSD validator selected;
- safe synthetic data strategy approved;
- legal/fiscal review completed;
- technical review completed;
- explicit user approval recorded;
- decision made on whether to commit XSD files as fixtures.

## Machine-Readable Template

Template:

- `docs/phase2b7y-human-approval-checklist-for-official-artifacts.template.json`

The template contains only empty strings, empty arrays and `false` flags. It has
no secrets, no absolute paths and no default approval.

## Default State

All approval flags are `false` by default. The template must never authorize
fixture commits, XML generation, XSD validation, QR, signature, certificates,
transport or production behavior.

## Validation

NPM validator:

- `validate:phase2b7y-human-approval-checklist-for-official-artifacts`
