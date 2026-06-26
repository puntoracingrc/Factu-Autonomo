# PHASE2C7_PHASE2_VALIDATOR_SCOPE_MAINTENANCE_V1

Fecha: 2026-06-26
Estado: mantenimiento minimo de validadores phase2

## Objetivo

Corregir falsos positivos de validadores de fases anteriores cuando existen fases posteriores no relacionadas. El cambio mantiene los bloqueos de seguridad y acota cada validador a su superficie de fase.

## Cambios

- `validate-phase2b7q-u-official-artifact-readiness-tooling.mjs` ya no escanea todo `src/lib/verifactu-official-artifact-readiness/`; valida solo los archivos Q-U que pertenecen al tooling de readiness.
- `validate-phase2b7v-z-official-artifact-unlock-preparation.mjs` mantiene su lista permitida 2B.7V-Z, pero ignora rutas 2C posteriores cuando solo son trabajo de fases no relacionadas.
- `validate-phase2c1-6-server-sync-integrity-foundation.mjs` mantiene la validacion 2C.1-2C.6 y deja de fallar por rutas 2C.7-2C.12 posteriores.

## Falsos positivos resueltos

- Patrones de seguridad de 2B.7Q-U activados por `artifact-lockfile.ts`, que pertenece al trabajo posterior 2B.7V-Z.
- Rechazo de rutas 2C por el validador 2B.7V-Z aunque esas rutas no forman parte de su fase.

## Seguridad conservada

- Se siguen bloqueando rutas de Supabase, migraciones, ViDA, configuracion de despliegue, UI/public, artefactos oficiales, certificados y transporte.
- No se permite añadir XML oficial, XSD oficiales commiteados, QR, firma, certificados ni transporte.
- No se relaja ninguna comprobacion sobre los archivos propios de 2B.7Q-U o 2B.7V-Z.

## Validacion

- `npm run validate:phase2b7q-u-official-artifact-readiness-tooling`
- `npm run validate:phase2b7v-z-official-artifact-unlock-preparation`
- `npm run validate:phase2c7-phase2-validator-scope-maintenance`
