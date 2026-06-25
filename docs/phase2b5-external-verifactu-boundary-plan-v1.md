# Plan de frontera externa VeriFactu 2B.5

Fase:

`PHASE2B5_EXTERNAL_VERIFACTU_BOUNDARY_PLAN_V1`

Estado:

`PLANIFICACION DOCUMENTAL`

Alcance:

Este documento prepara el siguiente bloque externo posterior a 2B.4. Define la
frontera entre la base local/staging ya estabilizada y cualquier trabajo futuro
relacionado con XML definitivo, QR, firma, certificados, transporte, respuestas,
reintentos, UI o produccion.

No implementa funcionalidad.

## Estado heredado de 2B.4

El bloque 2B.4 queda cerrado como:

`PHASE2B4_LOCAL_STAGING_FISCAL_FLOW: CLOSED / LOCAL-STAGING ONLY`

Capas heredadas:

- Operacion fiscal local/staging con reserva controlada e idempotencia.
- `fiscal_records` como registro fiscal candidato local/staging.
- `fiscal_chain_state` para encadenado local por usuario, entorno y emisor.
- Payload candidato no definitivo y no transportable.
- Validacion semantica de payload candidato.
- Evidence packets internos, seguros y separados.
- Evidence integrity read-only contra `fiscal_records` y `fiscal_chain_state`.
- Operational summary agregado server-only con conteos, gaps y estado operativo.

Estas capas son base tecnica local/staging. No convierten el sistema en
VeriFactu productivo ni sustituyen revision legal, fiscal u oficial.

## Que no existe todavia

- XML AEAT definitivo.
- QR definitivo.
- firma.
- certificados.
- transporte AEAT.
- respuestas AEAT.
- reintentos reales.
- produccion.
- UI.

El payload candidato de 2B.4 no es XML oficial. Los evidence packets no son
cola de transporte. El resumen operacional no es monitor productivo ni prueba
de cumplimiento AEAT real.

## Riesgos del siguiente bloque

- No confundir payload candidato con XML oficial.
- No convertir evidencia en cola de transporte.
- No usar `fiscal_transport_attempts` sin diseno especifico.
- No tocar certificados reales.
- No tocar AEAT real.
- No tocar produccion.
- No derivar estados productivos desde datos local/staging.
- No imprimir XML completo, snapshots, tokens, service role ni secrets.
- No introducir UI que sugiera cumplimiento real antes de aprobacion explicita.

## Propuesta de fases futuras

Estas fases son propuesta documental. No autorizan implementacion real por si
mismas.

### 2B.5A: investigacion tecnica XML/QR/campos oficiales

Objetivo:
revisar especificacion oficial aplicable, campos obligatorios, estructura XML,
QR y restricciones normativas.

Salida esperada:
documento de investigacion con fuentes, decisiones pendientes y preguntas para
revision legal/fiscal externa.

No incluye:
generacion de XML final, QR final, firma, certificados, transporte ni conexion
AEAT.

### 2B.5B: contrato interno de XML definitivo

Objetivo:
definir el contrato interno que podria producir XML definitivo desde la base
local/staging ya existente.

Salida esperada:
tipos, invariantes y criterios de seguridad para una futura implementacion.

No incluye:
firma, certificados, transporte, AEAT real ni produccion.

### 2B.5C: validacion local de XML definitivo con fixtures

Objetivo:
disenar como se validaria localmente un XML definitivo usando fixtures
controlados y datos sinteticos.

Salida esperada:
plan de fixtures, casos validos, casos invalidos y reglas de no exposicion de
datos sensibles.

No incluye:
envio AEAT, certificados reales, datos reales ni XML productivo impreso.

### 2B.5D: politica de certificados

Objetivo:
definir criterios de custodia, carga, rotacion, permisos, auditoria y uso
controlado de certificados.

Salida esperada:
politica documental de secretos y certificados.

No incluye:
uso de certificados reales, claves privadas, PFX/PKCS#12 reales ni firma real.

### 2B.5E: diseno de transporte AEAT

Objetivo:
disenar la frontera de transporte, estados, idempotencia, observabilidad y
separacion entre evidencia interna y envio externo.

Salida esperada:
contrato de transporte futuro y decision explicita sobre el rol de
`fiscal_transport_attempts`.

No incluye:
conexion AEAT, llamadas HTTP reales, colas activas, workers productivos ni
envios.

### 2B.5F: diseno de respuestas/reintentos

Objetivo:
definir tratamiento de respuestas, errores, reintentos, rollback operativo,
trazabilidad y reconciliacion.

Salida esperada:
matriz de estados, politica de reintentos y criterios de recuperacion.

No incluye:
produccion, reintentos reales, mutacion de estados externos ni UI productiva.

## Criterios de entrada antes de implementacion real

Antes de cualquier implementacion real de XML definitivo, QR, firma,
certificados, transporte, respuestas, reintentos, UI o produccion, deben existir:

- revision legal/fiscal externa.
- revision de especificacion oficial.
- entorno staging autorizado.
- secretos gestionados correctamente.
- plan de certificados.
- plan de errores y rollback.
- aprobacion explicita.

Sin estos criterios, el trabajo debe permanecer en documentacion, investigacion
o diseno local no productivo.

## Confirmaciones

- Documento solo de planificacion.
- No codigo funcional.
- No migraciones.
- No Supabase produccion.
- No AEAT real.
- No certificados.
- No XML AEAT definitivo.
- No transporte.
- No firma.
- No QR definitivo.
- No respuestas AEAT.
- No reintentos reales.
- No UI.
- No datos reales.
- No facturas reales.
- No numeracion real.
- No PDFs historicos.
- No cambios de Vercel.
- No promote.
- No dominios, DNS ni aliases.
- No Stripe, precios ni planes.
- No IA.
- No importadores.
- No XML completo impreso.
- No secrets impresos.

## Cierre esperado de 2B.5 documental

El bloque 2B.5 debe servir para decidir con precision que se puede implementar
despues y bajo que controles. El resultado aceptable de este plan no es conectar
con AEAT ni producir XML firmado, sino impedir que una base local/staging se
confunda con una integracion VeriFactu productiva.
