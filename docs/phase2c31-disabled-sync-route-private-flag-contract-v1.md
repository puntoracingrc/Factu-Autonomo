# Phase 2C.31 disabled sync route private flag contract v1

Marker: `PHASE2C31_DISABLED_SYNC_ROUTE_PRIVATE_FLAG_CONTRACT_V1`

## Objective

Define a server-only private flag contract for the future document sync route shell.
The route shell is disabled by default and does not depend on deployment config.

## Contract

The shell can only reach `enabled_for_local_staging_shell_only` when both values
are explicit:

- `DOCUMENT_SYNC_ROUTE_SHELL_ENABLED === "true"`
- `DOCUMENT_SYNC_ROUTE_SHELL_PRIVATE_MODE === "local_staging_only"`

Any missing, partial or unsupported value keeps the shell disabled.

## Blocks

- production environment: disabled;
- remote or preview environment: disabled;
- missing env: disabled;
- unsupported private mode: disabled.

## Safe summary

The summary reports status, reason and coarse booleans only. It does not echo raw
environment values or sensitive material.

## Limits

- evidence tecnica interna;
- server-only;
- flag privada de servidor;
- sin produccion;
- sin endpoint publico operativo;
- sin UI;
- sin documentos reales;
- sin Supabase remoto.
