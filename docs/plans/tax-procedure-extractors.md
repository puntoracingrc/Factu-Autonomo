# Plan versionado — motor de expedientes tributarios

Última actualización: 2026-07-15 (Europe/Madrid)  
Base auditada: `origin/main@7a9c6f7282a7f0bff5c6952879e310b41ccd2581`  
Rama: `agent/tax-procedure-master-phase0-v1`  
Estado del plan: Fase 0 reconciliada; Fase 1 ampliada de 9 a 13 familias ejecutables.

## Objetivo y límites

Este documento gobierna exclusivamente el Motor 2 de notificaciones y expedientes tributarios bajo `src/lib/fiscal-notifications/**`. No se mezcla con el diagnóstico de modelos o perfil fiscal. La lectura del PDF y el OCR se ejecutan localmente; el análisis no usa red ni IA. El PDF, el nombre de archivo, el texto y el OCR son efímeros. Solo la proyección estructurada que el usuario confirma puede guardarse.

Toda salida permanece `REVIEW_REQUIRED`, conserva evidencia y versión, y prohíbe crear o modificar automáticamente deuda, plazo, pago, embargo o asiento. Una referencia oficial sirve para interpretar el tipo de documento; nunca sustituye lo impreso.

## Reconciliación de la orden maestra con `main`

La base ya contenía el contrato puro, segmentador, registro de 16 motores, cuatro adaptadores históricos, extractores de notificación/requerimiento/liquidación/pago, nueve familias de embargo, revisión visible, persistencia estructurada y relaciones exactas. Este lote no duplica esas piezas.

Tras la ampliación de Fase 1:

- catálogo: **87** familias;
- motores reutilizables: **16**;
- familias ejecutables y siempre sujetas a revisión: **26**;
- familias con adaptador pendiente: **1**;
- familias con contrato pero sin extractor: **60**;
- familias de embargo ejecutables: **13 de 13**.

Las cuatro incorporaciones son `seizure.movable_asset`, `seizure.securities_or_financial_assets`, `seizure.business_income_or_rents` y `seizure.compliance_reiteration`.

## Fuentes oficiales verificadas para Fase 1

- [AEAT — Qué es un embargo](https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/que-embargo.html): clases generales de bienes y secuencia del procedimiento.
- [AEAT — Tipos de embargo](https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/tipos-embargo.html): cuentas, créditos, TPV, valores, inmuebles, vehículos y otros bienes muebles.
- [AEAT — Gestiones de embargos](https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/gestiones-embargos.html): familias operativas de gestiones y contestaciones.
- [BOE — Reglamento General de Recaudación](https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803): artículos 75 a 93, incluidos valores, rentas/frutos y bienes muebles.

Estas fuentes fijan contexto y nomenclatura. Los valores guardados proceden únicamente de etiquetas cerradas presentes en el documento revisado.

## Matriz de cobertura de las 87 familias

| Familia | Nombre | Motor reutilizable | Estado | Fase | Fuentes | Trabajo pendiente |
| --- | --- | --- | --- | --- | ---: | --- |
| `notification.delivery_attempt` | Intento, reenvío o carátula de notificación | `notification-envelope` | Ejecutable · revisión | F9 Catálogo restante | 2 | Operativo sin efectos automáticos |
| `notification.publication_or_appearance` | Publicación o comparecencia para notificación | `notification-envelope` | Ejecutable · revisión | F9 Catálogo restante | 2 | Operativo sin efectos automáticos |
| `notification.dehu_envelope` | Sobre, acuse o evidencia DEHú/Notific@ | `notification-envelope` | Ejecutable · revisión | F9 Catálogo restante | 2 | Operativo sin efectos automáticos |
| `information.tax_data_report` | Datos fiscales | `informative-communication` | Contrato sin extractor | F9 Catálogo restante | 0 | Título + campos + fixture + pruebas |
| `information.regulatory_change` | Comunicación informativa de cambio normativo o de canal | `informative-communication` | Contrato sin extractor | F9 Catálogo restante | 0 | Título + campos + fixture + pruebas |
| `information.model_filing_reminder` | Recordatorio de obligación de presentar un modelo | `informative-communication` | Contrato sin extractor | F9 Catálogo restante | 0 | Título + campos + fixture + pruebas |
| `identity.clave_registration_receipt` | Justificante de alta en Cl@ve | `identity-and-certificate` | Contrato sin extractor | F8 Certificados/censo | 0 | Título + campos + fixture + pruebas |
| `certificate.tax_compliance` | Certificado de estar al corriente | `identity-and-certificate` | Contrato sin extractor | F8 Certificados/censo | 1 | Título + campos + fixture + pruebas |
| `registry.tax_registration_resolution` | Resolución censal o registral | `census-resolution` | Adaptador pendiente | F8 Certificados/censo | 5 | Adaptar contrato existente |
| `compliance.informal_missing_return_notice` | Carta de aviso por declaraciones no registradas | `requirement` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 3 | Título + campos + fixture + pruebas |
| `compliance.formal_filing_requirement` | Requerimiento formal de presentación | `requirement` | Ejecutable · revisión | F2 Requerimientos/liquidaciones | 3 | Operativo sin efectos automáticos |
| `compliance.document_request` | Requerimiento de documentación | `requirement` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 4 | Título + campos + fixture + pruebas |
| `assessment.allegations_and_proposal` | Trámite de alegaciones y propuesta de liquidación | `assessment` | Ejecutable · revisión | F2 Requerimientos/liquidaciones | 4 | Operativo sin efectos automáticos |
| `assessment.final_provisional_assessment` | Resolución con liquidación provisional | `assessment` | Ejecutable · revisión | F2 Requerimientos/liquidaciones | 4 | Operativo sin efectos automáticos |
| `sanction.initiation_and_hearing` | Inicio de expediente sancionador y audiencia | `penalty` | Contrato sin extractor | F4 Sanciones | 3 | Título + campos + fixture + pruebas |
| `sanction.resolution` | Resolución sancionadora | `penalty` | Contrato sin extractor | F4 Sanciones | 3 | Título + campos + fixture + pruebas |
| `sanction.loss_of_reduction` | Exigencia de reducción de sanción perdida | `penalty` | Contrato sin extractor | F4 Sanciones | 3 | Título + campos + fixture + pruebas |
| `collection.deferral_grant` | Concesión de aplazamiento o fraccionamiento | `deferral` | Ejecutable · revisión | F5 Aplazamientos/compensaciones | 3 | Operativo sin efectos automáticos |
| `collection.deferral_modification` | Modificación de aplazamiento o fraccionamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 3 | Título + campos + fixture + pruebas |
| `collection.deferral_denial` | Denegación de aplazamiento o fraccionamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 3 | Título + campos + fixture + pruebas |
| `collection.interest_assessment` | Liquidación independiente de intereses de demora | `payment-order` | Contrato sin extractor | F3 Pago/cobro | 3 | Título + campos + fixture + pruebas |
| `collection.enforcement_order` | Providencia de apremio | `payment-order` | Ejecutable · revisión | F3 Pago/cobro | 3 | Operativo sin efectos automáticos |
| `collection.offset_requested` | Compensación a instancia del obligado | `compensation` | Ejecutable · revisión | F5 Aplazamientos/compensaciones | 3 | Operativo sin efectos automáticos |
| `collection.offset_ex_officio` | Compensación de oficio | `compensation` | Ejecutable · revisión | F5 Aplazamientos/compensaciones | 3 | Operativo sin efectos automáticos |
| `refund.payment_communication` | Comunicación de pago de devolución | `refund` | Contrato sin extractor | F6 Devoluciones/recursos | 2 | Título + campos + fixture + pruebas |
| `seizure.bank_account` | Embargo de cuenta o depósito | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.movable_asset` | Embargo de bien mueble | `seizure` | Ejecutable · revisión | F1 Embargos | 3 | Operativo sin efectos automáticos |
| `seizure.real_estate` | Embargo de inmueble | `seizure` | Ejecutable · revisión | F1 Embargos | 3 | Operativo sin efectos automáticos |
| `seizure.commercial_credits` | Embargo de créditos comerciales o arrendaticios | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.compliance_reiteration` | Reiteración de obligaciones de embargo de créditos | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.release` | Levantamiento de embargo | `seizure` | Ejecutable · revisión | F1 Embargos | 3 | Operativo sin efectos automáticos |
| `payment.payment_form` | Carta o documento de pago | `payment-order` | Ejecutable · revisión | F3 Pago/cobro | 3 | Operativo sin efectos automáticos |
| `review.recurso_reposicion` | Recurso de reposición | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.economic_administrative_claim` | Reclamación económico-administrativa | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `liability.solidary` | Declaración de responsabilidad solidaria | `liability` | Contrato sin extractor | F7 Inspección/responsabilidad | 5 | Título + campos + fixture + pruebas |
| `liability.subsidiary` | Declaración de responsabilidad subsidiaria | `liability` | Contrato sin extractor | F7 Inspección/responsabilidad | 5 | Título + campos + fixture + pruebas |
| `liability.successors` | Recaudación frente a sucesores | `liability` | Contrato sin extractor | F7 Inspección/responsabilidad | 5 | Título + campos + fixture + pruebas |
| `inspection.procedure` | Procedimiento inspector | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `refund.undue_payment` | Devolución de ingresos indebidos | `refund` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `collection.precautionary_measure` | Medida cautelar de recaudación | `seizure` | Contrato sin extractor | F9 Catálogo restante | 3 | Título + campos + fixture + pruebas |
| `collection.asset_sale` | Enajenación o subasta de bienes | `seizure` | Contrato sin extractor | F9 Catálogo restante | 3 | Título + campos + fixture + pruebas |
| `payment.receipt` | Justificante o recibo de pago | `payment-evidence` | Ejecutable · revisión | F3 Pago/cobro | 4 | Operativo sin efectos automáticos |
| `payment.failed_or_reversed` | Pago fallido, rechazado, anulado o devuelto | `payment-evidence` | Ejecutable · revisión | F3 Pago/cobro | 3 | Operativo sin efectos automáticos |
| `collection.deferral_request_receipt` | Solicitud o justificante de aplazamiento o fraccionamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 4 | Título + campos + fixture + pruebas |
| `collection.deferral_substantiation_requirement` | Requerimiento de subsanación o garantía de aplazamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 3 | Título + campos + fixture + pruebas |
| `collection.deferral_inadmissibility_or_archival` | Inadmisión, desistimiento o archivo de aplazamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 4 | Título + campos + fixture + pruebas |
| `collection.deferral_breach` | Incumplimiento de aplazamiento o fraccionamiento | `deferral` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 4 | Título + campos + fixture + pruebas |
| `collection.offset_resolution` | Resolución total, parcial o denegatoria de compensación | `compensation` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 4 | Título + campos + fixture + pruebas |
| `collection.extinction_or_balance_notice` | Comunicación de extinción, aplicación o saldo pendiente | `compensation` | Contrato sin extractor | F5 Aplazamientos/compensaciones | 3 | Título + campos + fixture + pruebas |
| `assessment.procedure_start` | Inicio de verificación, comprobación o regularización | `assessment` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 4 | Título + campos + fixture + pruebas |
| `assessment.no_adjustment_resolution` | Terminación sin regularización o sin liquidación | `assessment` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 4 | Título + campos + fixture + pruebas |
| `compliance.individual_information_requirement` | Requerimiento individual de información con trascendencia tributaria | `requirement` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 3 | Título + campos + fixture + pruebas |
| `collection.late_filing_surcharge` | Liquidación de recargo por presentación fuera de plazo | `payment-order` | Contrato sin extractor | F3 Pago/cobro | 3 | Título + campos + fixture + pruebas |
| `review.suspension_request` | Solicitud o justificante de suspensión | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.suspension_decision` | Acuerdo sobre la suspensión solicitada | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.resolution` | Resolución de recurso o reclamación | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 4 | Título + campos + fixture + pruebas |
| `seizure.wages_or_pensions` | Embargo de sueldos, salarios o pensiones | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.securities_or_financial_assets` | Embargo de valores u otros activos financieros | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.cash_or_refund` | Embargo de efectivo, devolución o crédito frente a la Administración | `seizure` | Ejecutable · revisión | F1 Embargos | 3 | Operativo sin efectos automáticos |
| `seizure.tpv_receipts` | Embargo de cobros mediante terminal de punto de venta | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.business_income_or_rents` | Embargo de ingresos de actividad o rentas | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.third_party_response` | Contestación de tercero a una diligencia de embargo | `seizure` | Ejecutable · revisión | F1 Embargos | 4 | Operativo sin efectos automáticos |
| `seizure.third_party_payment` | Ingreso efectuado por receptor o tercero retenedor | `seizure` | Ejecutable · revisión | F1 Embargos | 5 | Operativo sin efectos automáticos |
| `refund.request_or_recognition` | Solicitud, propuesta o reconocimiento de devolución | `refund` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `refund.withholding_or_offset` | Retención, compensación o aplicación de una devolución | `refund` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `inspection.communication` | Comunicación de inicio, alcance o ampliación inspectora | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `inspection.diligence` | Diligencia de actuaciones inspectoras | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `inspection.act_agreement` | Acta con acuerdo | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `inspection.act_conformity` | Acta de conformidad | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `inspection.act_disagreement` | Acta de disconformidad | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `inspection.assessment` | Acuerdo o liquidación derivada de inspección | `inspection` | Contrato sin extractor | F7 Inspección/responsabilidad | 3 | Título + campos + fixture + pruebas |
| `liability.proposal` | Propuesta y audiencia de declaración de responsabilidad | `liability` | Contrato sin extractor | F7 Inspección/responsabilidad | 5 | Título + campos + fixture + pruebas |
| `liability.final_resolution` | Acuerdo final de declaración de responsabilidad | `liability` | Contrato sin extractor | F7 Inspección/responsabilidad | 5 | Título + campos + fixture + pruebas |
| `collection.external_debt` | Deuda de otro organismo recaudada por la AEAT | `payment-order` | Contrato sin extractor | F3 Pago/cobro | 3 | Título + campos + fixture + pruebas |
| `irpf.spouse_refund_suspension` | Suspensión de deuda IRPF mediante devolución del cónyuge | `refund` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `registry.census_requirement` | Requerimiento de comprobación o rectificación censal | `census-resolution` | Contrato sin extractor | F8 Certificados/censo | 3 | Título + campos + fixture + pruebas |
| `registry.census_proposal` | Propuesta de rectificación censal y alegaciones | `census-resolution` | Contrato sin extractor | F8 Certificados/censo | 3 | Título + campos + fixture + pruebas |
| `registry.tax_domicile_resolution` | Acuerdo o resolución sobre domicilio fiscal | `census-resolution` | Contrato sin extractor | F8 Certificados/censo | 3 | Título + campos + fixture + pruebas |
| `registry.nif_revocation` | Acuerdo de revocación del NIF | `census-resolution` | Contrato sin extractor | F8 Certificados/censo | 3 | Título + campos + fixture + pruebas |
| `registry.nif_rehabilitation` | Acuerdo de rehabilitación del NIF | `census-resolution` | Contrato sin extractor | F8 Certificados/censo | 3 | Título + campos + fixture + pruebas |
| `assessment.value_check` | Comprobación administrativa de valores | `assessment` | Contrato sin extractor | F2 Requerimientos/liquidaciones | 3 | Título + campos + fixture + pruebas |
| `review.material_error` | Rectificación de error material, de hecho o aritmético | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.revocation` | Procedimiento especial de revocación | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.nullity` | Revisión de acto nulo de pleno derecho | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.lesivity` | Declaración de lesividad de acto anulable | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.third_party_claim` | Tercería de dominio o de mejor derecho | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
| `review.guarantee_cost_reimbursement` | Reembolso del coste de garantías | `appeal-and-review` | Contrato sin extractor | F6 Devoluciones/recursos | 3 | Título + campos + fixture + pruebas |
## Plan por fases y dependencias

1. **F0 — Contratos y adaptadores.** Mantener inmutables `domain.v1`, límites, segmentación, registro y adaptadores. Los cuatro adaptadores existentes se reutilizan; no se reescriben.
2. **F1 — Embargos.** Completar las trece familias con títulos cerrados, campos visibles, corpus sintético, revisión y almacenamiento estructurado. La reiteración se registra como acto posterior, no como una nueva traba confirmada.
3. **F2 — Requerimientos y liquidaciones.** Priorizar `compliance.document_request`, `compliance.individual_information_requirement`, `assessment.procedure_start` y `assessment.no_adjustment_resolution` antes de variantes menos frecuentes.
4. **F3 — Órdenes y evidencias de pago.** Ampliar cobro, intereses, recargos y deuda externa sin interpretar una carta de pago como justificante.
5. **F4 — Sanciones.** Separar inicio/audiencia, resolución y pérdida de reducción; sin calcular sanciones no impresas.
6. **F5 — Aplazamientos y compensaciones.** Añadir solicitud, subsanación, archivo, incumplimiento, modificación, denegación y resolución; una cuota o fecha no prueba pago.
7. **F6 — Devoluciones, recursos y suspensión.** Distinguir solicitud, decisión y resolución. Un recurso no implica suspensión.
8. **F7 — Inspección y responsabilidad.** Separar comunicación, diligencia, actas, liquidación y derivación; partes y periodos explícitos.
9. **F8 — Certificados y censo.** Extraer hechos impresos sin inferir situación censal actual.
10. **F9 — Resto del catálogo.** Completar información, identidad, medidas cautelares y enajenación con el mismo contrato.

Dependencias obligatorias por familia: título cerrado y autoridad compatible → segmentación → extractor versionado → fixture sintético positivo/negativo/ambiguo/incompleto → proyección visible → guardado explícito → relaciones solo por referencia exacta o confirmación humana.

## Decisiones de Fase 1

- Los subtipos añadidos son clases cerradas y no se activan por palabras sueltas.
- Bienes muebles conservan descripción, matrícula/bastidor, registro, poseedor/depositario e instrucciones de depósito cuando están impresos.
- Valores conservan depositaria, activo, cuenta, cantidad y restricción de disposición cuando están impresos.
- Ingresos/rentas conservan pagador, origen, periodicidad e instrucción impresa; no calculan cuantías futuras.
- La reiteración conserva la diligencia citada, fecha y motivo impresos. No crea otra deuda ni confirma que el embargo siga vigente.
- No se persisten PDF, nombre, texto bruto, OCR, IBAN completo ni valores no confirmados.

## Pruebas, migraciones, despliegue y reversión

- Pruebas: positivas, negativas, ambiguas, incompletas, límites, cancelación, inmutabilidad, no retención de fuente, proyección visible y guardado sin efectos operativos.
- Migraciones: ninguna en F0/F1; se reutiliza el contrato estructurado versionado existente.
- Despliegue: PR atómico, suite completa, lint, typecheck, build, CodeQL, Supabase Acceptance y preview. Producción solo por la puerta explícita vigente de la orden maestra.
- Reversión: retirar del conjunto ejecutable las cuatro familias y conservar sus contratos/catálogo histórico; no borrar datos confirmados ni reinterpretar registros existentes.

## Próximo corte

Cuando F1 cierre, el siguiente PR debe abordar únicamente `compliance.document_request` y `compliance.individual_information_requirement`, con sus variantes sintéticas y sin mezclar sanciones o persistencia nueva.

