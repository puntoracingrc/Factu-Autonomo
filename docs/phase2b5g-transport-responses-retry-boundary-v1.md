# Frontera documental de transporte, respuestas y reintentos VeriFactu 2B.5G

Fase:

`PHASE2B5G_TRANSPORT_RESPONSES_RETRY_BOUNDARY_V1`

Estado:

`FRONTERA DOCUMENTAL / NO IMPLEMENTACION`

Base previa:

- `docs/phase2b5a-official-xml-qr-research-v1.md`
- `docs/phase2b5e-official-artifacts-registry-v1.md`
- `docs/phase2b5f-certificate-signature-policy-v1.md`
- `docs/phase2b4-local-staging-fiscal-flow-stabilization-checkpoint-v1.md`

## Objetivo

Este documento diseña una frontera futura de transporte, respuestas y
reintentos sin conectar AEAT y sin usar `fiscal_transport_attempts` todavia.

Este documento confirma:

- no conexion AEAT;
- no HTTP real;
- no SOAP real;
- no envio;
- no cola;
- no worker;
- no `fiscal_transport_attempts`;
- no respuestas AEAT reales;
- no produccion.

La finalidad es impedir que la evidencia interna local/staging se convierta en
transporte por inercia. Cualquier envio real exige contrato, seguridad,
aprobacion y entorno autorizado.

## 1. Separacion entre evidencia y transporte

El cierre 2B.4 creo evidencia interna local/staging para trazabilidad tecnica,
pero esa evidencia no es un sistema de remision.

Reglas de separacion:

- `fiscal_evidence_packets` no es cola de transporte;
- evidence integrity no es respuesta AEAT;
- operational summary no es estado productivo;
- `fiscal_transport_attempts` no debe usarse sin contrato especifico;
- un payload candidato no es XML AEAT definitivo;
- un digest interno no es acuse, aceptacion ni rechazo externo;
- cero intentos de transporte es una garantia de no envio, no un backlog listo
  para enviar.

Las fases documentales 2B.5A-G no cambian esa frontera.

## 2. Modelo conceptual futuro

La siguiente tabla solo enumera conceptos candidatos. No crea estados, tablas,
workers, colas, endpoints ni transporte real.

| Concepto futuro | Fuente interna posible | Riesgo | Requiere implementacion |
| --------------- | ---------------------- | ------ | ----------------------- |
| Solicitud de envio | Operacion fiscal validada en una fase futura, no 2B.4 directamente. | Enviar material no definitivo o sin autorizacion. | SI, futura y aprobada. |
| Intento de transporte | Contrato futuro separado de `fiscal_evidence_packets`. | Confundir evidencia interna con intento externo. | SI, futura y aprobada. |
| Idempotencia externa | Clave futura derivada de contrato de servicio y politica de reintentos. | Duplicar envios o reconciliar mal respuestas. | SI, futura y aprobada. |
| Respuesta aceptada | Respuesta externa real en entorno autorizado. | Tratar un estado local como aceptacion AEAT. | SI, futura y aprobada. |
| Respuesta rechazada | Respuesta externa real en entorno autorizado. | No bloquear una factura o registro rechazado. | SI, futura y aprobada. |
| Aceptacion con errores | Modelo oficial de respuesta y severidad fijado. | Considerar productivo un caso con errores no reconciliados. | SI, futura y aprobada. |
| Reintento | Politica aprobada de errores reintentables, backoff e idempotencia. | Repetir envios no admisibles o crear duplicados. | SI, futura y aprobada. |
| Bloqueo manual | Regla operacional futura de revision y desbloqueo. | Ocultar errores o permitir desbloqueos sin auditoria. | SI, futura y aprobada. |
| Reconciliacion | Modelo futuro de consulta, respuesta conservada y estado interno. | Desalinear registro interno y estado externo. | SI, futura y aprobada. |
| Alerta operativa | Observabilidad futura sin XML completo ni secretos. | Imprimir datos sensibles o perder incidentes criticos. | SI, futura y aprobada. |

## 3. Estados futuros candidatos

Estados documentales posibles, sin implementarlos:

- `not_ready`;
- `ready_for_transport_candidate`;
- `queued_candidate`;
- `sending_candidate`;
- `accepted_candidate`;
- `accepted_with_errors_candidate`;
- `rejected_candidate`;
- `retry_pending_candidate`;
- `manual_review_candidate`.

Todos son candidatos y no productivos. No deben aparecer como estado operativo
real sin una fase posterior que defina contrato, persistencia, transiciones,
autorizacion, seguridad, pruebas y aprobacion explicita.

## 4. Politica de reintentos futura

Una politica futura de reintentos debera responder y aprobar como minimo:

- que errores son reintentables;
- que errores no son reintentables;
- que errores bloquean revision manual;
- que backoff se aplica;
- numero maximo de intentos;
- como se asegura idempotencia;
- como se evita duplicar envios;
- como se conserva la respuesta externa;
- como se reconcilia manualmente;
- cuando se alerta;
- quien puede desbloquear;
- como se audita el desbloqueo;
- como se impide imprimir XML completo;
- como se impide imprimir secretos, certificados, tokens o respuestas completas
  sensibles.

Hasta que esa politica exista, no debe haber reintento real, cola, worker,
remision ni uso de `fiscal_transport_attempts` como transporte.

## 5. Criterios antes de implementar transporte

Antes de cualquier transporte real debe existir:

- XML definitivo validado;
- firma/certificado resueltos si aplica;
- entorno test autorizado;
- contrato de servicio fijado;
- politica de reintentos aprobada;
- modelo de respuestas aprobado;
- seguridad de secretos;
- politica de no impresion de XML completo;
- estrategia de idempotencia externa;
- reconciliacion manual definida;
- aprobacion explicita.

Si cualquiera de estos puntos falta, el transporte queda bloqueado.

## 6. Limites

Este documento confirma:

- no conexion AEAT;
- no HTTP real;
- no SOAP real;
- no envio;
- no cola;
- no worker;
- no uso de `fiscal_transport_attempts`;
- no respuestas AEAT reales;
- no reintentos reales;
- no produccion;
- no XML completo impreso;
- no secrets impresos.

2B.5G solo cierra una frontera documental. No desbloquea transporte AEAT,
respuestas reales, reintentos, produccion fiscal ni uso operativo de
`fiscal_transport_attempts`.
