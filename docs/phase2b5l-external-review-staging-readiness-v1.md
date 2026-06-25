# Plan de revision externa y staging autorizado VeriFactu 2B.5L

Fase:

`PHASE2B5L_EXTERNAL_REVIEW_STAGING_READINESS_V1`

Estado:

`PLAN DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5e-official-artifacts-registry-v1.md`
- `docs/phase2b5f-certificate-signature-policy-v1.md`
- `docs/phase2b5g-transport-responses-retry-boundary-v1.md`
- `docs/phase2b5h-safe-executable-implementation-plan-v1.md`

## Objetivo

Este documento define que debe existir antes de pasar de local a staging
autorizado o revision externa. No crea staging, no toca entornos remotos, no
conecta AEAT y no activa produccion.

## 1. Revision externa

Antes de cualquier paso real deben planificarse revisiones externas o
especializadas en:

- legal/fiscal;
- tecnica;
- seguridad;
- proteccion de datos;
- certificados/secretos;
- producto/comunicacion.

La revision externa debe confirmar alcance, riesgos, mensajes permitidos,
responsables, evidencias y condiciones de paso a pruebas controladas. No debe
recibir secretos, certificados reales ni datos reales salvo decision separada y
autorizada.

## 2. Staging autorizado

Un staging autorizado debe exigir:

- entorno separado;
- datos sinteticos;
- secretos controlados;
- no produccion;
- permisos minimos;
- logs seguros;
- rollback;
- responsables;
- checklist de aprobacion;
- separacion clara entre local, staging, test autorizado y produccion;
- prohibicion de mezclar datos reales con fixtures;
- trazabilidad de cambios y despliegues.

El staging autorizado no debe crearse por inercia desde local. Debe tener
objetivo, alcance, permisos, validaciones y responsable definidos antes de
existir.

## 3. Que no permite

Este plan no permite:

- produccion;
- AEAT real;
- certificados reales;
- transporte;
- facturas reales;
- NIF reales;
- QR productivo;
- firma real;
- `fiscal_transport_attempts` como cola;
- secretos en logs;
- dominios, DNS, aliases o promote.

Un entorno de staging autorizado tampoco convierte un flujo en cumplimiento
productivo.

## 4. Criterios de salida

Solo se debe pasar a implementacion real cuando exista:

- aprobacion explicita;
- revision externa;
- entorno test autorizado;
- plan de certificados;
- plan de transporte;
- plan de respuestas y errores;
- plan de proteccion de datos;
- politica de secretos;
- criterio de rollback;
- criterio de comunicacion publica;
- lista de evidencias aceptadas.

Si cualquiera de esos elementos falta, el paso a entorno autorizado o a
implementacion real queda bloqueado.

## Resultado esperado

2B.5L deja la preparacion de revision externa y staging como frontera futura. No
crea entornos, no usa secretos, no conecta servicios y no activa produccion.
