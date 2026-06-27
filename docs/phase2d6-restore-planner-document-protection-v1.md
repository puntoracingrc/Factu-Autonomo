# Phase 2D.6 restore planner document protection v1

Marker: PHASE2D6_RESTORE_PLANNER_DOCUMENT_PROTECTION_V1

El planificador de restauracion compara el estado actual con un snapshot de recuperacion y devuelve decisiones seguras. No restaura ni modifica datos.

## Decisiones

- `restore_missing_draft`: restauracion futura posible de borrador ausente;
- `restore_changed_draft`: restauracion futura posible de borrador cambiado;
- `keep_current`: sin cambio relevante;
- `manual_review`: requiere revision humana;
- `blocked_protected`: bloqueo por documento protegido.

## Proteccion documental

Un documento actual protegido no se modifica ni elimina mediante restauracion automatica. Los documentos emitidos, bloqueados o legacy no borrador requieren tratamiento manual y evidencia adicional.

Estado: RESTORE PLANNING ONLY / DOCUMENT PROTECTION ENFORCED
