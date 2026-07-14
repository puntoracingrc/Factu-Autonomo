# Coordinación — diagnóstico de modelos tributarios

Última actualización: 2026-07-14 (Europe/Madrid)

## Reserva adicional — extractores fiscales v1

La rama `agent/tax-document-extractors-v1`, basada en
`origin/main@4aa8a6c10d128e2b4c8a143a52f60adb2075683d`, reserva:

- `src/lib/tax-model-diagnostic/extractors/**`;
- `docs/tax-extractors/**`.

El núcleo es TypeScript puro, sin React, red ni almacenamiento. El original,
OCR y metadatos sensibles son efímeros; la futura integración de UI solo podrá
persistir una proyección mínima confirmada. `src/lib/fiscal-models/**`, el motor
de obligaciones público y la UI del catálogo quedan fuera de esta reserva.

Las auditorías coordinadas de cuestionario/reglas, almacenamiento/privacidad y
UI/resultados se realizaron en solo lectura. Detectaron como incompatibles con
el nuevo contrato las inferencias históricas directas y la persistencia del
nombre de archivo; ambos puntos deben corregirse antes de conectar el núcleo a
la interfaz.

## Reserva de ámbito

El trabajo se realiza exclusivamente en el worktree
`factura-autonomo-tax-model-diagnostic`, rama `feat/tax-model-diagnostic`,
partiendo de `origin/main@4dc421f`.

Ámbito reservado:

- `src/app/consultor-fiscal/diagnostico/**`;
- `src/components/tax-model-diagnostic/**`;
- `src/lib/tax-model-diagnostic/**`;
- persistencia versionada del diagnóstico dentro del perfil canónico;
- cambios mínimos y revisados en la navegación de Asesoría fiscal, manual,
  flags y pruebas de integración;
- `docs/plans/tax-model-diagnostic.md`, documentación funcional, técnica,
  fiscal y de seguridad propia de esta funcionalidad.

No se modificará `src/lib/fiscal-models/**`: sus instrucciones locales
prohíben introducir obligaciones, recomendaciones, plazos, OCR o cálculos. El
catálogo existente solo podrá usarse como referencia de identidad y enlaces.

## Agentes y trabajos detectados

| Agente o hilo | Objetivo | Rama o worktree | Archivos y directorios reservados | Estado | Dependencias | Riesgos de conflicto | Última actualización |
|---|---|---|---|---|---|---|---|
| Agente principal | Diseñar e implementar el diagnóstico de modelos dentro de Asesoría fiscal | `feat/tax-model-diagnostic` / `factura-autonomo-tax-model-diagnostic` | Ámbito indicado arriba | En curso | Fuentes AEAT/BOE, perfil fiscal, AppStore, calendario y navegación existentes | Navegación, normalización de perfil y manual | 2026-07-14 |
| `repo_coordination_audit` | Auditar Git, worktrees, PR, issues y handoffs | Solo lectura sobre `origin/main@4dc421f` | Ninguno | Completado | Git y GitHub | Ninguno; no modificó archivos | 2026-07-14 |
| `architecture_audit` | Cartografiar arquitectura y punto de integración | Solo lectura sobre `origin/main@4dc421f` | Ninguno | Completado | README, AGENTS, ADR, código | Ninguno; no modificó archivos | 2026-07-14 |
| `quality_ops_audit` | Auditar pruebas, CI, Vercel, entorno y seguridad | Solo lectura sobre `origin/main@4dc421f` | Ninguno | Completado | CI, Vercel, Supabase y configuración | Ninguno; no modificó archivos | 2026-07-14 |
| Worktree `fiscal-calendar-resume` | Trabajo histórico del calendario | `codex/fiscal-calendar-aeat-resume` | Cambios sin confirmar en calendario | Detectado; no se presupone activo | Calendario fiscal | Evitar copiar o sobrescribir sus cambios | 2026-07-14 |
| Worktree `fiscal-notifications-resume` | Trabajo histórico de notificaciones | `codex/fiscal-notifications-cases-resume` | Cambios sin confirmar en `/consultor-fiscal`, navegación y notificaciones | Detectado; no se presupone activo | Navegación Asesoría fiscal | Solapamiento potencial en `AdvisorAreaNavigation`; comparar conscientemente | 2026-07-14 |
| Worktree `notifications-persisted-workspace-v1` | Persistencia de notificaciones | `agent/fiscal-notifications-persisted-workspace-v1` | Archivos sin confirmar de notificaciones | Detectado; no se presupone activo | AppStore/Supabase | No reutilizar su estado no integrado | 2026-07-14 |
| Worktree `fiscal-change-watch` | Vigilancia de cambios fiscales | `codex/fiscal-change-watch` | Workflow, catálogo y panel admin | Commit no integrado en `origin/main` | Fuentes fiscales | Futuro punto de integración; no incorporarlo silenciosamente | 2026-07-14 |
| Worktrees de fichas AEAT | Publicar contenido oficial de modelos | ramas `codex/aeat-models-official-batch-*` | `src/lib/fiscal-models/**` | Parte integrada; lotes 03/16 conservan cambios locales | Catálogo de modelos | Límite duro: diagnóstico fuera de ese módulo | 2026-07-14 |
| Worktree `fix-backup-restore-stale-loop` | Reparar backup/restauración | `codex/fix-backup-restore-stale-loop` | Ajustes, backup y manual | Sucio, aunque apunta a `origin/main` | Persistencia local | No usar como base ni copiar cambios sin commit | 2026-07-14 |

No existe acceso a conversaciones históricas de esos worktrees. Solo se afirma
lo observado en Git, GitHub y el repositorio. Los tres agentes accesibles
entregaron resúmenes de solo lectura, consolidados aquí y en la auditoría
inicial.

## Contratos que se conservan

1. `/consultor-fiscal` sigue siendo el analizador de gastos deducibles y conserva
   su feature flag; no se reutiliza para otro significado.
2. `/consultor-fiscal/modelos` sigue siendo el catálogo informativo y público;
   no evaluará aplicabilidad.
3. El diagnóstico vivirá en `/consultor-fiscal/diagnostico`, será el primer
   elemento del menú interno y el acceso global de «Asesoría fiscal» aterrizará
   en él.
4. El motor será TypeScript puro, determinista, versionado y separado de React,
   red y almacenamiento.
5. Los documentos y su texto permanecen efímeros en el MVP. Solo se guardan
   hechos estructurados que el usuario haya confirmado.
6. El uso manual sin documentos será siempre posible.
7. Los territorios no implementados fallan de forma explícita a revisión
   territorial; nunca reciben modelos estatales por defecto.
8. No se activa producción ni OCR externo sin puertas y autorización separadas.

## Control de conflictos

Antes de cada commit se ejecutará:

```bash
git status --short
git diff --check
git diff --name-only origin/main...HEAD
git log --oneline --left-right origin/main...HEAD
```

Antes de integrar se actualizará `origin/main`, se revisará cada conflicto por
contrato y se volverá a ejecutar la suite. No se usará `force push`, no se
reformateará código ajeno y no se tocarán worktrees con cambios sin confirmar.
