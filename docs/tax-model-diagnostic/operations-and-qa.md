# Operación, actualización anual y QA

## Actualización anual

1. Crear nuevas reglas para el ejercicio sin editar las reglas históricas.
2. Verificar vigencia, umbrales, exclusiones, periodicidad e instrucciones en fuente oficial.
3. Registrar `lastVerifiedAt`, fuentes, ubicación exacta, revisor y estado.
4. Añadir casos positivo, negativo, excepción, incompleto, discrepancia censal y límite de ejercicio por regla.
5. Ejecutar perfiles de referencia y comparar cambios contra el ejercicio anterior.
6. Mantener `PENDING_FISCAL_REVIEW` hasta la aprobación nominal del profesional fiscal.
7. Incrementar ruleset, engine/catalog si cambia el contrato, y documentar la migración.
8. Probar preview con el flag cerrado en producción.
9. Activar únicamente con autorización expresa, revisión fiscal y Production Domain verde.

## Matriz mínima de QA

- 27 perfiles dirigidos, uno por código canónico.
- Profesional con retención menor, igual y mayor al 70 %.
- Actividad empresarial y actividad mixta, sin heredar la excepción profesional.
- Alta y cese parciales con trimestres/meses activos.
- Persona física, sociedad, comunidad de bienes y actividad personal adicional.
- IVA general, exento, recargo/agrario y operación no periódica.
- Empleados, profesionales pagados, alquiler sujeto y alquiler exonerado.
- Operaciones UE con y sin ROI; alta ROI sin operaciones; OSS confirmado y dudoso.
- 347 por debajo, por encima, excluido y SII.
- Censo no revisado, lista vacía confirmada, coincidencia y discrepancia.
- Territorio desconocido, Canarias y foral.
- Sesión malformada, enum desconocido, fecha imposible, porcentaje fuera de rango, código concatenado y evidencia no confirmada.
- Navegación por teclado, foco visible, lector de pantalla, móvil estrecho y modo oscuro.

## Gates

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Además deben revisarse visualmente la primera pregunta, el paso de confirmación, un resultado completo, un resultado incompleto y un territorio bloqueado.

## Despliegue y rollback

- Flag público: `NEXT_PUBLIC_TAX_MODEL_DIAGNOSTIC_ENABLED`.
- Valor por defecto en producción: cerrado.
- Preview: puede abrirse explícitamente para QA.
- Producción: no se activa sin orden expresa `PUBLICAR PRODUCCIÓN` y aprobación fiscal.
- Rollback inmediato: cerrar el flag; la navegación vuelve al catálogo completo de modelos.
- Rollback de código: revertir los commits de la feature. El bloque persistido es opcional y las versiones incompatibles fallan cerrado.

Calendar y Modelos AEAT no deben iniciar su integración hasta recibir un aviso posterior que incluya SHA de `main`, export/shape definitivos, versiones, archivos compartidos y confirmación de Production Domain Wait/Assign/Verify verde.

