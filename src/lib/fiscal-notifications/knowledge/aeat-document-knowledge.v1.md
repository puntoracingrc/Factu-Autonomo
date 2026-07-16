# Paquete de conocimiento AEAT para notificaciones y expedientes

**Versión:** 1.0.0 · **Fecha:** 16 de julio de 2026 · **Familias:** 87

> Este documento es una especificación funcional ya investigada para implementación. Los documentos reales se utilizaron únicamente para entender estructuras y cadenas. No contiene nombres, NIF, domicilios, cuentas, CSV, NRC ni referencias reales.

## 1. Contrato universal de salida

- Qué te está diciendo este documento
- Por qué lo has recibido
- Resultado
- Datos clave
- Qué tienes que hacer
- Plazo
- Qué puede pasar si no se atiende
- Qué no demuestra este documento
- Cómo encaja con tus otros documentos
- Fuentes oficiales

Cada afirmación debe quedar marcada como `EXPLICIT_IN_DOCUMENT`, `CALCULATED_FROM_PRINTED_VALUES`, `OFFICIAL_CONTEXT` o `NOT_PROVEN_BY_DOCUMENT`. El documento es siempre la fuente primaria; las fuentes AEAT/BOE aportan contexto y no sustituyen lo impreso.

## 2. Relación y cronología

- Clave de índice: `ownerScope|issuerNormalized|referenceType|normalizedReference`.
- Relación exacta: Mismo ownerScope.
- Relación exacta: Referencia oficial exacta normalizada o cita origen→destino exacta.
- Relación exacta: Emisor compatible.
- Relación exacta: Tipo y alcance de referencia compatibles.
- Fechas, importes, modelo, ejercicio y período solo ayudan a orientar o desempatar.
- Nunca enlazar de forma exacta por nombre, NIF, título, importe, fecha aproximada, modelo/período o similitud textual.
- Orden de fecha documental: emisión → firma → acto → notificación efectiva. Nunca fecha de subida o escaneo.

## 3. Frases canónicas de relación

| Relación | Frase exacta |
|---|---|
| `ANNEX_OF` | Este anexo forma parte del documento relacionado y desarrolla sus datos, importes o efectos. |
| `NOTIFICATION_EVIDENCE_FOR` | Este justificante acredita cómo o cuándo se puso a disposición, se accedió o se notificó el acto relacionado. No modifica su contenido. |
| `PUBLICATION_NOTIFIES` | Esta publicación o certificación fija la notificación del acto relacionado en la fecha que aparece expresamente indicada. |
| `CONTINUES` | Este documento continúa el expediente iniciado o tramitado en el documento anterior. |
| `RESPONSE_TO` | Este documento responde al requerimiento o trámite identificado en el documento anterior. |
| `RESOLVES` | Esta resolución decide la solicitud, propuesta, recurso o trámite identificado en el documento anterior. |
| `REPLACES` | Este documento sustituye al anterior en los extremos que indica. Para el estado actual debe atenderse al más reciente, conservando el anterior en la cronología. |
| `CORRECTS` | Este documento corrige datos concretos del anterior; el resto solo cambia si se indica expresamente. |
| `CANCELS` | Este documento deja sin efecto total o parcialmente el acto anterior en el alcance que imprime. |
| `REFERS_TO_DEBT` | Ambos documentos se refieren a la misma deuda o vencimiento identificado. |
| `PAYMENT_FORM_FOR` | Este es el documento para pagar la deuda o liquidación relacionada. No acredita que el pago ya se haya realizado. |
| `PAYMENT_EVIDENCE_FOR` | Este justificante acredita un ingreso aplicado a la deuda, liquidación o autoliquidación relacionada por el importe que identifica. |
| `PAYMENT_FAILED_FOR` | El intento de pago relacionado no se completó, fue rechazado, anulado o devuelto según el resultado impreso. |
| `REQUESTS_DEFERRAL_FOR` | Esta solicitud pide aplazar o fraccionar las deudas identificadas. No demuestra que el aplazamiento haya sido concedido. |
| `CREATES_PAYMENT_PLAN_FOR` | Este acuerdo concede un calendario de pago para las deudas identificadas. Cada cuota sigue pendiente hasta que exista pago o conciliación. |
| `MODIFIES_PAYMENT_PLAN` | Este acuerdo modifica el calendario o las condiciones del aplazamiento anterior y conserva su historial. |
| `DENIES_DEFERRAL_FOR` | Este acuerdo deniega la solicitud de aplazamiento de las deudas identificadas y abre los efectos o plazos impresos. |
| `CLAIMS_UNPAID_INSTALLMENT` | Este documento reclama una cuota concreta del aplazamiento que figura incumplida o vencida. |
| `LIQUIDATES_INTEREST_FOR` | Esta liquidación calcula intereses derivados del acto, deuda o aplazamiento identificado. No es una nueva deuda principal. |
| `INITIATES_ENFORCEMENT` | Esta providencia inicia o continúa el cobro ejecutivo de la deuda identificada. |
| `COMPENSATES` | Este acuerdo aplica un crédito reconocido a las deudas o cuotas listadas, por los importes impresos. |
| `LEAVES_PENDING_BALANCE` | Después de la aplicación o compensación queda el saldo pendiente que imprime el documento. |
| `RECOGNIZES_REFUND` | Este documento reconoce o propone una devolución por el importe impreso. No acredita todavía una transferencia bancaria. |
| `WITHHOLDS_REFUND` | Este documento retiene, deduce, embarga o compensa parte de la devolución reconocida por los conceptos impresos. |
| `PAYS_REFUND` | Esta comunicación ordena o confirma el pago del importe líquido de la devolución relacionada, según el alcance impreso. |
| `ENFORCES` | Esta diligencia ejecuta el cobro sobre el bien, crédito o derecho indicado y deriva de la deuda o providencia relacionada. |
| `ORDERS_SEIZURE` | Este documento ordena retener o trabar el bien, crédito o derecho descrito hasta el límite indicado. |
| `RESPONDS_TO_SEIZURE` | Un tercero responde a la diligencia de embargo identificada. La respuesta no constituye por sí sola un ingreso. |
| `TRANSFERS_SEIZED_FUNDS` | Un tercero ingresó fondos retenidos por la diligencia de embargo relacionada, por el importe acreditado. |
| `RELEASES_SEIZURE` | Este documento levanta total o parcialmente el embargo identificado. No demuestra por sí solo que la deuda se haya pagado. |
| `APPEALS` | Este recurso o reclamación impugna el acto identificado. Su presentación no demuestra por sí sola que el cobro esté suspendido. |
| `REQUESTS_SUSPENSION` | Esta solicitud pide suspender los efectos del acto o deuda relacionados. No acredita que la suspensión haya sido concedida. |
| `DECIDES_SUSPENSION` | Este acuerdo concede, deniega o modifica la suspensión solicitada en el alcance que imprime. |
| `DECIDES_REVIEW` | Esta resolución estima, desestima, inadmite, archiva o resuelve parcialmente el recurso o reclamación identificado. |
| `PROPOSES_LIABILITY` | Este documento propone atribuir responsabilidad por deudas ajenas y abre el trámite de audiencia indicado. Todavía no es el acuerdo final. |
| `DECLARES_LIABILITY` | Este acuerdo declara la responsabilidad en el alcance y por las deudas que identifica, manteniendo separado al deudor principal. |
| `CONTINUES_AGAINST_SUCCESSOR` | Este documento continúa la recaudación frente a un sucesor por las obligaciones que identifica, sin convertirlas en obligaciones originalmente propias. |
| `INITIATES_INSPECTION` | Esta comunicación inicia o amplía actuaciones inspectoras sobre los conceptos, períodos y alcance indicados. |
| `RECORDS_INSPECTION` | Esta diligencia deja constancia de actuaciones, manifestaciones o documentación dentro del procedimiento inspector relacionado. |
| `PROPOSES_INSPECTION_RESULT` | Esta acta propone el resultado de la inspección con el grado de acuerdo indicado; no debe confundirse con cualquier sanción separada. |
| `ASSESSES_FROM_INSPECTION` | Esta liquidación determina el resultado tributario derivado de las actuaciones inspectoras identificadas. |
| `RECTIFIES_CENSUS` | Este acto propone o acuerda modificar datos censales en el alcance y desde la fecha de efectos impresos. |
| `DECIDES_TAX_DOMICILE` | Este acuerdo confirma o rectifica el domicilio fiscal en los términos impresos. |
| `REVOKES_NIF` | Este acuerdo revoca el NIF en los términos y desde los efectos impresos. No borra el historial previo. |
| `REHABILITATES_NIF` | Este acuerdo rehabilita el NIF revocado en el alcance y desde la fecha de efectos impresos. |
| `INFORMATIONAL_CONTEXT_FOR` | Este documento aporta información de contexto para el ejercicio, modelo o trámite relacionado, pero no prueba su presentación, pago o resultado. |
| `CERTIFIES_STATUS` | Este certificado acredita el resultado y alcance impresos en la fecha o período que indica; no garantiza situaciones posteriores. |
| `REIMBURSES_GUARANTEE_COST_FOR` | Este documento resuelve o paga el reembolso de los costes de garantía vinculados al acto que fue declarado improcedente. |

## 4. Cadenas documentales

### Evidencia de entrega o publicación del acto (`notification_to_act`)
- `notification.delivery_attempt` → `ANY_ADMINISTRATIVE_ACT` · `NOTIFICATION_EVIDENCE_FOR`
- `notification.dehu_envelope` → `ANY_ADMINISTRATIVE_ACT` · `NOTIFICATION_EVIDENCE_FOR`
- `notification.publication_or_appearance` → `ANY_ADMINISTRATIVE_ACT` · `PUBLICATION_NOTIFIES`

### Aviso, requerimiento y posible sanción por presentación (`missing_return_to_sanction`)
- `information.model_filing_reminder` → `compliance.informal_missing_return_notice` · `CONTINUES`
- `compliance.informal_missing_return_notice` → `compliance.formal_filing_requirement` · `CONTINUES`
- `compliance.formal_filing_requirement` → `sanction.initiation_and_hearing` · `CONTINUES`
- `sanction.initiation_and_hearing` → `sanction.resolution` · `RESOLVES`
- `sanction.resolution` → `sanction.loss_of_reduction` · `CONTINUES`

### Inicio, propuesta y resolución de comprobación (`assessment_chain`)
- `assessment.procedure_start` → `compliance.document_request` · `CONTINUES`
- `assessment.procedure_start` → `assessment.allegations_and_proposal` · `CONTINUES`
- `assessment.allegations_and_proposal` → `assessment.final_provisional_assessment` · `RESOLVES`
- `assessment.procedure_start` → `assessment.no_adjustment_resolution` · `RESOLVES`

### Liquidación, pago, aplazamiento, compensación o apremio (`assessment_to_collection`)
- `assessment.final_provisional_assessment` → `payment.payment_form` · `PAYMENT_FORM_FOR`
- `payment.payment_form` → `payment.receipt` · `PAYMENT_EVIDENCE_FOR`
- `payment.payment_form` → `payment.failed_or_reversed` · `PAYMENT_FAILED_FOR`
- `assessment.final_provisional_assessment` → `collection.deferral_request_receipt` · `REQUESTS_DEFERRAL_FOR`
- `assessment.final_provisional_assessment` → `collection.offset_requested` · `COMPENSATES`
- `assessment.final_provisional_assessment` → `collection.enforcement_order` · `INITIATES_ENFORCEMENT`

### Solicitud, subsanación, resolución, modificación e incumplimiento de aplazamiento (`deferral_chain`)
- `collection.deferral_request_receipt` → `collection.deferral_substantiation_requirement` · `CONTINUES`
- `collection.deferral_request_receipt` → `collection.deferral_grant` · `CREATES_PAYMENT_PLAN_FOR`
- `collection.deferral_request_receipt` → `collection.deferral_denial` · `DENIES_DEFERRAL_FOR`
- `collection.deferral_request_receipt` → `collection.deferral_inadmissibility_or_archival` · `RESOLVES`
- `collection.deferral_grant` → `collection.deferral_modification` · `MODIFIES_PAYMENT_PLAN`
- `collection.deferral_grant` → `collection.deferral_breach` · `CLAIMS_UNPAID_INSTALLMENT`
- `collection.deferral_grant` → `collection.interest_assessment` · `LIQUIDATES_INTEREST_FOR`
- `collection.deferral_breach` → `collection.enforcement_order` · `INITIATES_ENFORCEMENT`

### Reconocimiento de devolución, compensación y pago del residual (`offset_refund_chain`)
- `refund.request_or_recognition` → `collection.offset_requested` · `COMPENSATES`
- `refund.request_or_recognition` → `collection.offset_ex_officio` · `COMPENSATES`
- `collection.offset_requested` → `collection.offset_resolution` · `RESOLVES`
- `collection.offset_resolution` → `collection.extinction_or_balance_notice` · `LEAVES_PENDING_BALANCE`
- `refund.request_or_recognition` → `refund.withholding_or_offset` · `WITHHOLDS_REFUND`
- `collection.offset_resolution` → `refund.payment_communication` · `PAYS_REFUND`
- `refund.withholding_or_offset` → `refund.payment_communication` · `PAYS_REFUND`

### Apremio, embargo, contestación, ingreso, levantamiento y subasta (`enforcement_seizure_chain`)
- `collection.enforcement_order` → `ANY_SEIZURE` · `ENFORCES`
- `seizure.commercial_credits` → `seizure.compliance_reiteration` · `CONTINUES`
- `ANY_THIRD_PARTY_SEIZURE` → `seizure.third_party_response` · `RESPONDS_TO_SEIZURE`
- `seizure.third_party_response` → `seizure.third_party_payment` · `TRANSFERS_SEIZED_FUNDS`
- `ANY_SEIZURE` → `seizure.release` · `RELEASES_SEIZURE`
- `ANY_ASSET_SEIZURE` → `collection.asset_sale` · `CONTINUES`

### Recurso o reclamación, suspensión y resolución (`review_suspension_chain`)
- `ANY_APPEALABLE_ACT` → `review.recurso_reposicion` · `APPEALS`
- `ANY_APPEALABLE_ACT` → `review.economic_administrative_claim` · `APPEALS`
- `review.recurso_reposicion` → `review.suspension_request` · `REQUESTS_SUSPENSION`
- `review.economic_administrative_claim` → `review.suspension_request` · `REQUESTS_SUSPENSION`
- `review.suspension_request` → `review.suspension_decision` · `DECIDES_SUSPENSION`
- `review.recurso_reposicion` → `review.resolution` · `DECIDES_REVIEW`
- `review.economic_administrative_claim` → `review.resolution` · `DECIDES_REVIEW`

### Propuesta, acuerdo y recaudación frente a responsable o sucesor (`liability_chain`)
- `liability.proposal` → `liability.final_resolution` · `DECLARES_LIABILITY`
- `liability.final_resolution` → `collection.enforcement_order` · `INITIATES_ENFORCEMENT`
- `liability.successors` → `collection.enforcement_order` · `INITIATES_ENFORCEMENT`

### Inicio, diligencias, actas y liquidación inspectora (`inspection_chain`)
- `inspection.procedure` → `inspection.communication` · `INITIATES_INSPECTION`
- `inspection.communication` → `inspection.diligence` · `RECORDS_INSPECTION`
- `inspection.diligence` → `inspection.act_agreement` · `PROPOSES_INSPECTION_RESULT`
- `inspection.diligence` → `inspection.act_conformity` · `PROPOSES_INSPECTION_RESULT`
- `inspection.diligence` → `inspection.act_disagreement` · `PROPOSES_INSPECTION_RESULT`
- `inspection.act_agreement` → `inspection.assessment` · `ASSESSES_FROM_INSPECTION`
- `inspection.act_conformity` → `inspection.assessment` · `ASSESSES_FROM_INSPECTION`
- `inspection.act_disagreement` → `inspection.assessment` · `ASSESSES_FROM_INSPECTION`

### Requerimiento, propuesta y resolución censal (`census_chain`)
- `registry.census_requirement` → `registry.census_proposal` · `RECTIFIES_CENSUS`
- `registry.census_proposal` → `registry.tax_registration_resolution` · `RECTIFIES_CENSUS`
- `registry.census_proposal` → `registry.tax_domicile_resolution` · `DECIDES_TAX_DOMICILE`

### Revocación y rehabilitación del NIF (`nif_chain`)
- `registry.nif_revocation` → `registry.nif_rehabilitation` · `REHABILITATES_NIF`

### Corrección y revisión especial de actos (`special_review_chain`)
- `ANY_ADMINISTRATIVE_ACT` → `review.material_error` · `CORRECTS`
- `ANY_ADMINISTRATIVE_ACT` → `review.revocation` · `CANCELS`
- `ANY_ADMINISTRATIVE_ACT` → `review.nullity` · `CANCELS`
- `ANY_FAVORABLE_ACT` → `review.lesivity` · `CONTINUES`

### Tercería sobre bien embargado (`third_party_claim_chain`)
- `ANY_ASSET_SEIZURE` → `review.third_party_claim` · `CONTINUES`
- `review.third_party_claim` → `seizure.release` · `RELEASES_SEIZURE`

### Resolución favorable y reembolso de garantías (`guarantee_reimbursement_chain`)
- `review.resolution` → `review.guarantee_cost_reimbursement` · `REIMBURSES_GUARANTEE_COST_FOR`
- `review.guarantee_cost_reimbursement` → `refund.payment_communication` · `PAYS_REFUND`

## 5. Perfiles por familia

# Notificación y entrega

## Intento, reenvío o carátula de notificación (`notification.delivery_attempt`)

**Naturaleza:** `NOTIFICATION_EVIDENCE` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una carátula o constancia de un intento de entrega. El asunto real está en el acto al que acompaña.

**Por qué llega.** Se genera porque la Administración ha intentado entregar, reenviar o identificar una notificación.

**Resultado.** Indica el canal, intento o estado de entrega que figure impreso; no decide el fondo del expediente.

**Qué hacer.** Localiza el acto adjunto o citado y comprueba si existe una fecha efectiva de notificación.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si el intento no culmina, la Administración puede acudir a otros medios de notificación; no lo afirmes como ocurrido sin documento posterior.

**No demuestra.** Que el acto haya sido recibido.; Que haya empezado un plazo.; Que exista deuda o sanción.

**Referencias:** NOTIFICATION_ID; ACT_ID; PROCEDURE_ID; CSV; OTHER_OFFICIAL_REFERENCE

**Fechas:** ISSUE_DATE; AVAILABILITY_DATE; ACCESS_DATE; REJECTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** NOTIFICATION_CHANNEL; PRINTED_NOTIFICATION_STATE; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PRECEDES:ANY_ADMINISTRATIVE_ACT; RELATION:NOTIFICATION_EVIDENCE_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Notificaciones y comunicaciones de la AEAT (AEAT_NOTIFICATIONS); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Puede incluir varias páginas de sobre, reenvío o instrucciones sin contener el acto principal.

---

## Publicación o comparecencia para notificación (`notification.publication_or_appearance`)

**Naturaleza:** `NOTIFICATION_EVIDENCE` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una citación o certificación de notificación mediante publicación y comparecencia.

**Por qué llega.** Se utiliza cuando el acto no ha podido notificarse por las vías ordinarias o así lo declara el documento.

**Resultado.** Si el documento certifica publicación, falta de comparecencia y fecha efectiva, esa fecha puede servir como notificación del acto citado.

**Qué hacer.** Abre el acto subyacente y usa la fecha efectiva solo cuando aparezca expresamente certificada.

**Plazo.** Usa la fecha efectiva de notificación que certifique expresamente la publicación o comparecencia. Una fecha de publicación sin declaración de efecto no basta para calcular el plazo del acto subyacente.

**Si no se atiende.** La falta de comparecencia puede hacer que el acto se tenga por notificado en la fecha indicada por la certificación.

**No demuestra.** El contenido del acto.; Que la simple publicación ya haya producido efecto si falta la certificación o el plazo.; Un vencimiento calculado desde la fecha de firma.

**Referencias:** NOTIFICATION_ID; ACT_ID; PROCEDURE_ID; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; AVAILABILITY_DATE; EXPIRATION_DATE; EFFECTIVE_NOTIFICATION_DATE; SIGNING_DATE

**Hechos:** NOTIFICATION_CHANNEL; PRINTED_NOTIFICATION_STATE; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PRECEDES:ANY_ADMINISTRATIVE_ACT; RELATION:PUBLICATION_NOTIFIES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Notificaciones y comunicaciones de la AEAT (AEAT_NOTIFICATIONS); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Existen comunicaciones previas, anuncios y certificados posteriores; solo el certificado puede imprimir la fecha efectiva.

---

## Sobre, acuse o evidencia DEHú/Notific@ (`notification.dehu_envelope`)

**Naturaleza:** `NOTIFICATION_EVIDENCE` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la evidencia electrónica de puesta a disposición, acceso, rechazo o notificación de un acto.

**Por qué llega.** Se genera por la entrega electrónica de una notificación administrativa.

**Resultado.** Explica el estado electrónico y las fechas impresas; no cambia el contenido del acto.

**Qué hacer.** Relaciona esta evidencia con el acto citado y conserva por separado puesta a disposición, acceso y notificación efectiva.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La falta de acceso puede producir los efectos que indique la normativa o la propia evidencia, pero el motor solo debe afirmar la fecha efectiva cuando esté acreditada.

**No demuestra.** Que el usuario esté conforme.; Que el acto esté pagado o respondido.; Que disponibilidad y notificación efectiva sean la misma fecha.

**Referencias:** NOTIFICATION_ID; ACT_ID; PROCEDURE_ID; CSV

**Fechas:** AVAILABILITY_DATE; ACCESS_DATE; REJECTION_DATE; EFFECTIVE_NOTIFICATION_DATE; ISSUE_DATE

**Hechos:** NOTIFICATION_CHANNEL; PRINTED_NOTIFICATION_STATE; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PRECEDES:ANY_ADMINISTRATIVE_ACT; RELATION:NOTIFICATION_EVIDENCE_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Notificaciones y comunicaciones de la AEAT (AEAT_NOTIFICATIONS); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** La evidencia puede ir separada del PDF del acto y debe ser el origen de fechas jurídicas.

---

# Información tributaria

## Datos fiscales (`information.tax_data_report`)

**Naturaleza:** `INFORMATIONAL` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un informe informativo con datos que la AEAT tiene asociados a un ejercicio, normalmente para ayudar a preparar una declaración.

**Por qué llega.** Se facilita a petición del contribuyente o dentro de la campaña tributaria correspondiente.

**Resultado.** Resume información disponible en una fecha concreta; puede estar incompleta y no vincula por sí sola una comprobación posterior.

**Qué hacer.** Compáralo con la contabilidad y la documentación real antes de preparar la declaración.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que una declaración haya sido presentada.; Que exista una deuda.; Que todos los datos sean completos o definitivos.; Que los importes de terceros deban persistirse con su identidad.

**Referencias:** OTHER_OFFICIAL_REFERENCE; MODEL; FISCAL_YEAR; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE

**Importes:** DOCUMENT_TOTAL; PAYMENT_ON_ACCOUNT; RETAINED_AMOUNT

**Hechos:** DOCUMENT_STATUS; FACT_OR_GROUND; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY; ISSUING_AUTHORITY

**Relaciones:** RELATION:INFORMATIONAL_CONTEXT_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Campaña de Renta y consulta de datos fiscales (AEAT_RENTA); Ley 35/2006, del IRPF (IRPF_LAW); Real Decreto 439/2007, Reglamento del IRPF (IRPF_REG)

**Patrones observados:** Hay plantillas históricas en castellano y catalán, informes individuales y conjuntos, y tablas de pagadores, pagos fraccionados, cotizaciones e inmuebles.

---

## Comunicación informativa de cambio normativo o de canal (`information.regulatory_change`)

**Naturaleza:** `INFORMATIONAL` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una comunicación general sobre una novedad normativa, técnica o de canal.

**Por qué llega.** Se envía para informar de un cambio que puede afectar trámites futuros.

**Resultado.** Describe el cambio y su fecha o ámbito si están impresos; no demuestra que el usuario esté obligado en un caso concreto.

**Qué hacer.** Revisa el ámbito, ejercicio y fecha de aplicación antes de cambiar procesos.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Una obligación individual.; Un vencimiento personal.; Que el cambio se aplique retroactivamente.

**Referencias:** ACT_ID; OTHER_OFFICIAL_REFERENCE; MODEL; FISCAL_YEAR; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE

**Hechos:** NOTIFICATION_SUBJECT; REASON; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** RELATION:INFORMATIONAL_CONTEXT_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Ley 39/2015, Procedimiento Administrativo Común (LPAC)

---

## Recordatorio de obligación de presentar un modelo (`information.model_filing_reminder`)

**Naturaleza:** `INFORMATIONAL` · **Fase:** `F9` · **Prioridad:** `P2` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un aviso o recordatorio sobre un modelo y período, no necesariamente un requerimiento formal.

**Por qué llega.** Se envía porque la AEAT considera útil recordar una posible obligación o una fecha de campaña.

**Resultado.** Identifica el modelo, ejercicio y período mencionados; su fuerza y urgencia dependen de si el texto es meramente informativo o formal.

**Qué hacer.** Comprueba si la declaración ya fue presentada o si realmente corresponde presentarla.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Un recordatorio ignorado puede ir seguido de un requerimiento formal, pero este documento no prueba que vaya a ocurrir.

**No demuestra.** Una deuda.; Una sanción.; Que no presentar el modelo sea ya una infracción declarada.; Un plazo formal si solo contiene una fecha orientativa.

**Referencias:** MODEL; FISCAL_YEAR; TAX_PERIOD; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; EXPIRATION_DATE

**Hechos:** OBLIGATION; NOTIFICATION_SUBJECT; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PRECEDES:compliance.formal_filing_requirement; RELATION:INFORMATIONAL_CONTEXT_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Campaña de Renta y consulta de datos fiscales (AEAT_RENTA); Ley 58/2003, General Tributaria (LGT)

**Patrones observados:** Un solo aviso puede mencionar varios modelos o períodos; deben representarse por separado.

---

# Identidad y acceso

## Justificante de alta en Cl@ve (`identity.clave_registration_receipt`)

**Naturaleza:** `REGISTRATION_EVIDENCE` · **Fase:** `F8` · **Prioridad:** `P2` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un justificante de que se ha completado o iniciado una modalidad de registro en Cl@ve.

**Por qué llega.** Se genera al tramitar el alta o una actuación de registro en el sistema de identificación.

**Resultado.** Indica la modalidad, fecha y estado que aparezcan impresos.

**Qué hacer.** Conserva únicamente el estado y la referencia necesaria; no guardes códigos de activación ni secretos.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que cualquier factor esté activo si el justificante no lo afirma.; Una contraseña, PIN o secreto reutilizable.

**Referencias:** REGISTRY_ID; FILING_RECEIPT_ID; OTHER_OFFICIAL_REFERENCE

**Fechas:** ISSUE_DATE; ACTION_DATE

**Hechos:** DOCUMENT_STATUS; REASON

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Registro en Cl@ve (CLAVE_REGISTRATION); Ley 39/2015, Procedimiento Administrativo Común (LPAC)

---

# Certificados

## Certificado de estar al corriente (`certificate.tax_compliance`)

**Naturaleza:** `CERTIFICATE` · **Fase:** `F8` · **Prioridad:** `P2` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un certificado que declara si, para el alcance y fecha indicados, el titular figura al corriente de determinadas obligaciones tributarias.

**Por qué llega.** Se emite tras una solicitud o consulta de certificado.

**Resultado.** El resultado puede ser positivo o negativo y solo vale para el alcance y momento impresos.

**Qué hacer.** Comprueba el resultado, la finalidad, la fecha y cualquier circunstancia negativa detallada.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si el certificado contiene datos incorrectos, el procedimiento oficial contempla un escrito de disconformidad dentro del plazo indicado; no lo confundas con un recurso ordinario contra una liquidación.

**No demuestra.** Que no existan otras obligaciones fuera de su alcance.; Que el estado siga igual en el futuro.; Que un resultado negativo sea una liquidación.

**Referencias:** REGISTRY_ID; PROCEDURE_ID; CSV; OTHER_OFFICIAL_REFERENCE

**Fechas:** ISSUE_DATE; SIGNING_DATE; EXPIRATION_DATE

**Hechos:** DOCUMENT_STATUS; REASON; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** RELATION:CERTIFIES_STATUS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Certificados tributarios: estar al corriente (AEAT_CERTIFICATE_COMPLIANCE); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

# Censo y perfil tributario

## Resolución censal o registral (`registry.tax_registration_resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una resolución que acuerda, confirma o rechaza un alta, baja o modificación en un registro o censo tributario.

**Por qué llega.** Se emite al resolver una solicitud o un procedimiento censal.

**Resultado.** El resultado y la fecha de efectos son los que figuran expresamente en la resolución.

**Qué hacer.** Revisa qué datos, actividades, regímenes o registros se modifican y desde cuándo.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se cumple una obligación censal posterior, pueden existir procedimientos distintos; no los deduzcas de esta resolución.

**No demuestra.** La situación actual fuera de la fecha de efectos.; Que se hayan presentado modelos posteriores.; Cambios no incluidos en el acuerdo.

**Referencias:** REGISTRY_ID; PROCEDURE_ID; ACT_ID; CSV; MODEL; FISCAL_YEAR

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** DOCUMENT_STATUS; REASON; FACT_OR_GROUND; OBLIGATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:registry.census_requirement; SUCCESSOR_OF:registry.census_proposal; RELATION:RECTIFIES_CENSUS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Rectificación censal (AEAT_CENSUS_RECTIFICATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Requerimiento de comprobación o rectificación censal (`registry.census_requirement`)

**Naturaleza:** `FORMAL_REQUEST` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un requerimiento para comprobar o corregir datos del censo tributario.

**Por qué llega.** Se emite porque la AEAT aprecia una posible diferencia en actividades, obligaciones, domicilios, locales o registros.

**Resultado.** Indica qué dato debe justificarse o modificarse y el plazo para responder.

**Qué hacer.** Comprueba el dato maestro y aporta la documentación solicitada sin actualizar automáticamente el perfil.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se responde, la AEAT puede continuar el procedimiento censal con la información disponible.

**No demuestra.** Una modificación censal ya acordada.; La baja de una actividad.; Un cambio de domicilio o NIF.

**Referencias:** REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; REGISTRY_ID; MODEL; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** DOCUMENTATION_REQUIRED; FACT_OR_GROUND; OBLIGATION; RESPONSE_CHANNEL

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:registry.census_proposal; PREDECESSOR_OF:registry.tax_registration_resolution; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Rectificación censal (AEAT_CENSUS_RECTIFICATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Propuesta de rectificación censal y alegaciones (`registry.census_proposal`)

**Naturaleza:** `PROPOSAL` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una propuesta de la AEAT para modificar datos censales y abre un trámite de alegaciones.

**Por qué llega.** Se emite cuando la AEAT considera que debe rectificarse la situación censal.

**Resultado.** Describe la modificación propuesta y la fecha de efectos prevista, pero aún no es la resolución final.

**Qué hacer.** Revisa actividades, epígrafes, regímenes, obligaciones, domicilios o registros afectados y formula alegaciones si procede.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se alega, la AEAT puede dictar la resolución con la propuesta disponible.

**No demuestra.** Una modificación definitiva.; La obligación de presentar modelos no citados.; La actualización automática del maestro de empresa.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; REGISTRY_ID; MODEL; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; ACTION_DATE

**Hechos:** FACT_OR_GROUND; REASON; DOCUMENT_STATUS; OBLIGATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:registry.census_requirement; PREDECESSOR_OF:registry.tax_registration_resolution; RELATION:RECTIFIES_CENSUS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Rectificación censal (AEAT_CENSUS_RECTIFICATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acuerdo o resolución sobre domicilio fiscal (`registry.tax_domicile_resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el acuerdo que confirma o rectifica el domicilio fiscal después de una comprobación.

**Por qué llega.** Se emite porque la Administración ha revisado dónde debe considerarse situado el domicilio fiscal.

**Resultado.** Fija el resultado y la fecha de efectos que aparecen expresamente.

**Qué hacer.** Compara el dato con el maestro de empresa y solicita confirmación antes de actualizarlo.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El domicilio fijado puede afectar a comunicaciones y competencias posteriores, dentro del alcance legal.

**No demuestra.** Que la dirección postal de todos los establecimientos cambie.; Que el usuario haya actualizado sus facturas.; La identidad de terceros residentes.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** DOCUMENT_STATUS; REASON; FACT_OR_GROUND

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:registry.census_requirement; SUCCESSOR_OF:registry.census_proposal; RELATION:DECIDES_TAX_DOMICILE

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Comprobación del domicilio fiscal (AEAT_TAX_DOMICILE); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acuerdo de revocación del NIF (`registry.nif_revocation`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el acuerdo que revoca un NIF y declara los efectos registrales que correspondan.

**Por qué llega.** Se emite tras el procedimiento y audiencia por las causas impresas.

**Resultado.** Debe identificar causa, fecha de efectos, estado y consecuencias registrales.

**Qué hacer.** Trátalo como una incidencia crítica del perfil, pero exige revisión humana antes de bloquear operaciones.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La revocación puede publicarse y producir efectos sobre registros y trámites según el acuerdo.

**No demuestra.** La desaparición de la persona o entidad.; La anulación de documentos históricos.; La rehabilitación futura.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** DOCUMENT_STATUS; REASON; FACT_OR_GROUND; EXPLICIT_CONSEQUENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:registry.nif_rehabilitation; RELATION:REVOKES_NIF

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Revocación del NIF (AEAT_NIF_REVOCATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acuerdo de rehabilitación del NIF (`registry.nif_rehabilitation`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F8` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la solicitud o resolución para recuperar la validez de un NIF previamente revocado.

**Por qué llega.** Se tramita cuando se acredita que han desaparecido las causas de revocación o concurren los requisitos indicados.

**Resultado.** Debe distinguir solicitud, requerimiento, archivo, denegación y acuerdo favorable con fecha de efectos.

**Qué hacer.** Relaciona con la revocación exacta y actualiza el estado solo con resolución favorable confirmada.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Una solicitud incompleta puede archivarse; una denegación mantiene la revocación.

**No demuestra.** La rehabilitación por la mera solicitud.; La validez retroactiva si no se imprime.; La eliminación del historial de revocación.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; REGISTRY_ID; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** DOCUMENT_STATUS; REASON; DOCUMENTATION_REQUIRED; EXPLICIT_CONSEQUENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:registry.nif_revocation; RELATION:REHABILITATES_NIF

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Rehabilitación del NIF (AEAT_NIF_REHABILITATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

# Requerimientos y cumplimiento

## Carta de aviso por declaraciones no registradas (`compliance.informal_missing_return_notice`)

**Naturaleza:** `INFORMATIONAL_WARNING` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un aviso de que la AEAT no localiza una o varias declaraciones que esperaba encontrar.

**Por qué llega.** Se envía para que el titular compruebe si debía presentar esos modelos o justifique por qué no correspondían.

**Resultado.** Enumera modelos, ejercicios y períodos candidatos; no es todavía una liquidación ni una sanción.

**Qué hacer.** Comprueba cada modelo y período por separado y conserva los justificantes si ya se presentó.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Puede ir seguido de un requerimiento formal si la situación no se aclara, pero el aviso no demuestra que ese paso se haya iniciado.

**No demuestra.** Que exista una deuda.; Que la declaración esté omitida de forma definitiva.; Que haya sanción o procedimiento formal.

**Referencias:** OTHER_OFFICIAL_REFERENCE; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE

**Hechos:** OBLIGATION; REASON; RESPONSE_CHANNEL; NOTIFICATION_SUBJECT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PRECEDES:compliance.formal_filing_requirement; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Requerimiento por declaraciones o autoliquidaciones no presentadas (AEAT_OMITTED_RETURNS); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Puede mencionar varias combinaciones modelo/período en un solo documento.

---

## Requerimiento formal de presentación (`compliance.formal_filing_requirement`)

**Naturaleza:** `FORMAL_REQUEST` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una petición formal para presentar una declaración o explicar por qué no existe obligación.

**Por qué llega.** Se inicia porque la AEAT no tiene registrada la presentación que identifica.

**Resultado.** El documento fija los modelos, períodos, canal y plazo de respuesta.

**Qué hacer.** Presenta lo solicitado o aporta la justificación y conserva el justificante de registro.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** No atenderlo puede terminar en actuaciones de comprobación o en un procedimiento sancionador, según el caso y lo que impriman documentos posteriores.

**No demuestra.** Que la declaración haya sido presentada.; Que exista una cuota a pagar.; Que la sanción ya haya sido impuesta.

**Referencias:** REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** OBLIGATION; RESPONSE_CHANNEL; EXPLICIT_CONSEQUENCE; DOCUMENTATION_REQUIRED

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:sanction.initiation_and_hearing; PREDECESSOR_OF:assessment.procedure_start; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Requerimiento por declaraciones o autoliquidaciones no presentadas (AEAT_OMITTED_RETURNS); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Un requerimiento real puede referirse a varios modelos y períodos; cada uno necesita estado propio.

---

## Requerimiento de documentación (`compliance.document_request`)

**Naturaleza:** `FORMAL_REQUEST` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una petición formal de documentos, explicaciones o justificantes concretos.

**Por qué llega.** Se emite para completar o comprobar un expediente identificado.

**Resultado.** Indica exactamente qué debe aportarse, por qué canal y dentro de qué plazo.

**Qué hacer.** Prepara solo la documentación solicitada y guarda el justificante de presentación.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** No responder puede permitir que la Administración resuelva con los datos disponibles y, cuando proceda, iniciar consecuencias adicionales.

**No demuestra.** Que la documentación falte realmente.; Que el expediente vaya a terminar con deuda.; Que enviar documentos equivalga a aceptar los hechos.

**Referencias:** REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV; MODEL; FISCAL_YEAR; TAX_PERIOD

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** DOCUMENTATION_REQUIRED; OBLIGATION; RESPONSE_CHANNEL; EXPLICIT_CONSEQUENCE; FACT_OR_GROUND

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:assessment.allegations_and_proposal; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Requerimiento de información de Recaudación (AEAT_INFORMATION_REQUEST); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** La lista solicitada puede abarcar varias páginas y anexos; no guardar texto libre no tipado.

---

## Requerimiento individual de información con trascendencia tributaria (`compliance.individual_information_requirement`)

**Naturaleza:** `FORMAL_REQUEST` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un requerimiento para que una persona o entidad aporte información fiscalmente relevante, a menudo sobre terceros u operaciones.

**Por qué llega.** Se envía porque la AEAT necesita datos individualizados para una actuación de gestión, inspección o recaudación.

**Resultado.** Define las preguntas, registros o datos que deben comunicarse y el plazo correspondiente.

**Qué hacer.** Responde únicamente a lo pedido, respetando el canal y conservando el justificante.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El incumplimiento puede originar actuaciones sancionadoras o de responsabilidad cuando proceda; el motor solo debe mostrar la consecuencia impresa o el contexto general claramente etiquetado.

**No demuestra.** Que el destinatario sea el deudor investigado.; Que la información solicitada ya conste en poder de la AEAT.; Una deuda propia.

**Referencias:** REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV; THIRD_PARTY_RESPONSE_ID

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** DOCUMENTATION_REQUIRED; OBLIGATION; RESPONSE_CHANNEL; EXPLICIT_CONSEQUENCE; FACT_OR_GROUND

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:seizure.third_party_response; RELATION:RESPONSE_TO

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Requerimiento de información de Recaudación (AEAT_INFORMATION_REQUEST); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

# Comprobación y liquidación

## Inicio de verificación, comprobación o regularización (`assessment.procedure_start`)

**Naturaleza:** `PROCEDURE_START` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la comunicación que inicia una verificación de datos, comprobación limitada u otra regularización.

**Por qué llega.** Se envía porque la AEAT va a revisar un impuesto, ejercicio, período o aspecto concreto.

**Resultado.** Delimita el alcance y puede pedir datos, pero todavía no fija una liquidación final.

**Qué hacer.** Revisa el alcance, prepara la documentación solicitada y controla la fecha efectiva de notificación.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se aporta lo pedido, la comprobación puede continuar con la información disponible.

**No demuestra.** Una deuda definitiva.; Una sanción.; Que todos los ejercicios o conceptos estén bajo revisión si no aparecen en el alcance.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** FACT_OR_GROUND; DOCUMENTATION_REQUIRED; OBLIGATION; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:assessment.allegations_and_proposal; PREDECESSOR_OF:assessment.no_adjustment_resolution; PREDECESSOR_OF:assessment.final_provisional_assessment; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); IRPF: verificación de datos y comprobación limitada (AEAT_IRPF_CHECK); IVA: verificación de datos y comprobación limitada (AEAT_VAT_CHECK); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Trámite de alegaciones y propuesta de liquidación (`assessment.allegations_and_proposal`)

**Naturaleza:** `PROPOSAL` · **Fase:** `F2` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una propuesta de regularización que muestra el cálculo de la AEAT y abre un trámite para alegar.

**Por qué llega.** Se emite después o al inicio de una comprobación cuando la AEAT aprecia diferencias.

**Resultado.** Los importes son propuestos, no una deuda definitiva, hasta que exista una resolución posterior.

**Qué hacer.** Compara hechos y cálculos, prepara alegaciones o documentación y no marques el importe como deuda exigible.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se presentan alegaciones, la AEAT puede resolver con los datos disponibles.

**No demuestra.** Una liquidación final.; Un pago exigido salvo que el documento lo disponga de forma independiente.; Una sanción ya iniciada.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Importes:** PROPOSED_QUOTA; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; APPEAL_INFORMATION; DOCUMENTATION_REQUIRED; OBLIGATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:assessment.procedure_start; PREDECESSOR_OF:assessment.final_provisional_assessment; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); IRPF: verificación de datos y comprobación limitada (AEAT_IRPF_CHECK); IVA: verificación de datos y comprobación limitada (AEAT_VAT_CHECK); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Puede contener comunicación, motivación, tablas y formulario de alegaciones dentro del mismo PDF.

---

## Resolución con liquidación provisional (`assessment.final_provisional_assessment`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F2` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la resolución que fija el resultado de una comprobación y puede determinar una cantidad a ingresar, devolver o cero.

**Por qué llega.** Se emite al finalizar la fase de comprobación descrita.

**Resultado.** Debe mostrar cuota, intereses, total, motivo y alcance; crea o actualiza una deuda solo cuando el acto lo determina.

**Qué hacer.** Revisa el resultado, el plazo de pago y las vías de revisión; una liquidación no acredita el pago.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si resulta a ingresar y no se paga, aplaza, compensa o suspende en plazo, puede pasar a período ejecutivo.

**No demuestra.** Que la deuda esté pagada.; Que sea firme si existe recurso o suspensión.; Que no pueda haber comprobaciones posteriores fuera del alcance.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** FINAL_QUOTA; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL; OUTSTANDING_PRINCIPAL

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS; APPEAL_INFORMATION; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:assessment.allegations_and_proposal; PREDECESSOR_OF:payment.payment_form; PREDECESSOR_OF:collection.deferral_request_receipt; PREDECESSOR_OF:collection.offset_requested; PREDECESSOR_OF:collection.enforcement_order; RELATION:RESOLVES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); IRPF: verificación de datos y comprobación limitada (AEAT_IRPF_CHECK); IVA: verificación de datos y comprobación limitada (AEAT_VAT_CHECK); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

**Patrones observados:** Las plantillas separan cuota, intereses y total y declaran el cierre de la verificación o comprobación.

---

## Terminación sin regularización o sin liquidación (`assessment.no_adjustment_resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una resolución que cierra la comprobación sin practicar una regularización o liquidación.

**Por qué llega.** Se emite cuando el procedimiento termina sin modificar el resultado revisado.

**Resultado.** El expediente queda cerrado en el alcance indicado, sin crear una nueva deuda.

**Qué hacer.** Conserva la resolución como cierre y relaciona cualquier procedimiento posterior solo si existe referencia y nuevo alcance.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** Que todas las obligaciones del contribuyente estén revisadas.; Que nunca pueda abrirse otra actuación por hechos o alcance distintos.; Un pago.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** DOCUMENT_STATUS; FACT_OR_GROUND; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:assessment.procedure_start; RELATION:RESOLVES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); IRPF: verificación de datos y comprobación limitada (AEAT_IRPF_CHECK); IVA: verificación de datos y comprobación limitada (AEAT_VAT_CHECK); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Comprobación administrativa de valores (`assessment.value_check`)

**Naturaleza:** `PROPOSAL_OR_RESOLUTION` · **Fase:** `F2` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una actuación en la que la Administración revisa el valor declarado de un bien, derecho u operación.

**Por qué llega.** Se inicia porque el valor declarado se contrasta con métodos administrativos de valoración.

**Resultado.** Puede contener una propuesta de valoración y regularización o una resolución posterior; ambas fases deben diferenciarse.

**Qué hacer.** Revisa el bien, método, valor declarado, valor comprobado y el trámite disponible.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** No atender el trámite puede llevar a que se dicte la liquidación con los datos disponibles.

**No demuestra.** Que una propuesta de valor sea ya una liquidación final.; Que pueda recurrirse aisladamente la valoración en todos los casos.; La titularidad de terceros no necesaria.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; APPEAL_DEADLINE

**Importes:** PROPOSED_QUOTA; FINAL_QUOTA; DOCUMENT_TOTAL; VALUATION

**Hechos:** FACT_OR_GROUND; REASON; APPEAL_INFORMATION; DOCUMENTATION_REQUIRED

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:assessment.final_provisional_assessment; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Comprobación administrativa de valores (AEAT_VALUE_CHECK); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

# Sanciones

## Inicio de expediente sancionador y audiencia (`sanction.initiation_and_hearing`)

**Naturaleza:** `PROCEDURE_START_OR_PROPOSAL` · **Fase:** `F4` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es el inicio de un procedimiento sancionador y, cuando procede, la propuesta sobre una posible infracción.

**Por qué llega.** Se emite porque la AEAT considera que unos hechos pueden constituir infracción.

**Resultado.** Expone hechos, norma, sanción propuesta y trámite de alegaciones; todavía no es la resolución final.

**Qué hacer.** Revisa los hechos imputados, reducciones condicionadas y plazo de alegaciones.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se formulan alegaciones, la resolución puede dictarse con los datos disponibles.

**No demuestra.** Una sanción firme.; Una deuda pagadera si el documento solo inicia/propuesta.; Que el recurso contra la liquidación suspenda automáticamente la sanción o viceversa.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; REQUEST_NUMBER; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Importes:** SANCTION_INITIAL; SANCTION_REDUCTION; SANCTION_REDUCED

**Hechos:** FACT_OR_GROUND; REASON; APPEAL_INFORMATION; OBLIGATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:compliance.formal_filing_requirement; SUCCESSOR_OF:assessment.final_provisional_assessment; PREDECESSOR_OF:sanction.resolution; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento sancionador general de Gestión Tributaria (AEAT_SANCTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 2063/2004, régimen sancionador tributario (SANCTION_REG)

**Patrones observados:** Puede citar exactamente un requerimiento o una liquidación anterior y declarar un plazo máximo del procedimiento.

---

## Resolución sancionadora (`sanction.resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F4` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la resolución que decide el expediente sancionador y fija, reduce, anula o no impone la sanción.

**Por qué llega.** Se emite después de la instrucción y del trámite de audiencia o alegaciones.

**Resultado.** El resultado, la sanción exigible y las reducciones dependen de lo que imprima la resolución.

**Qué hacer.** Comprueba importe, condiciones de reducción, pago, recursos y fecha de notificación.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si la sanción exigible no se paga o suspende, puede entrar en recaudación ejecutiva.

**No demuestra.** Que la reducción sea definitiva si está condicionada.; Que la sanción esté pagada.; Que el acto tributario principal sea firme.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** SANCTION_INITIAL; SANCTION_REDUCTION; SANCTION_REDUCED; DOCUMENT_TOTAL

**Hechos:** DOCUMENT_STATUS; FACT_OR_GROUND; APPEAL_INFORMATION; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:sanction.initiation_and_hearing; PREDECESSOR_OF:sanction.loss_of_reduction; PREDECESSOR_OF:payment.payment_form; PREDECESSOR_OF:collection.enforcement_order; RELATION:RESOLVES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento sancionador general de Gestión Tributaria (AEAT_SANCTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 2063/2004, régimen sancionador tributario (SANCTION_REG); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Exigencia de reducción de sanción perdida (`sanction.loss_of_reduction`)

**Naturaleza:** `RESOLUTION_OR_COLLECTION_ACT` · **Fase:** `F4` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un acto que reclama una reducción de sanción que antes se aplicó de forma condicionada y ahora se considera perdida.

**Por qué llega.** Se emite porque la AEAT aprecia que no se cumplieron las condiciones de la reducción.

**Resultado.** Genera un importe adicional vinculado a la sanción original, sin sustituirla.

**Qué hacer.** Comprueba la sanción de origen, la condición incumplida, el importe recuperado y las vías de revisión.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se paga o suspende, el nuevo importe puede pasar a período ejecutivo.

**No demuestra.** Una nueva infracción distinta.; Que la sanción original desaparezca.; Que la pérdida sea correcta sin revisar la condición y el acto citado.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** SANCTION_REDUCTION; DOCUMENT_TOTAL; OUTSTANDING_PRINCIPAL

**Hechos:** REASON; FACT_OR_GROUND; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:sanction.resolution; PREDECESSOR_OF:collection.enforcement_order; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento sancionador general de Gestión Tributaria (AEAT_SANCTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 2063/2004, régimen sancionador tributario (SANCTION_REG)

**Patrones observados:** La referencia puede incorporar la de la sanción original; el importe recuperado debe mantenerse como componente separado.

---

# Recaudación y deuda

## Solicitud o justificante de aplazamiento o fraccionamiento (`collection.deferral_request_receipt`)

**Naturaleza:** `APPLICATION_RECEIPT` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la constancia de que se ha solicitado pagar una o varias deudas más tarde o en cuotas.

**Por qué llega.** Se genera al presentar la solicitud de aplazamiento o fraccionamiento.

**Resultado.** Identifica deudas, importe solicitado y condiciones propuestas; no significa que la AEAT lo haya concedido.

**Qué hacer.** Conserva el justificante y espera la resolución o un requerimiento de subsanación.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** La solicitud puede ser requerida, inadmitida, archivada, concedida o denegada.

**No demuestra.** La suspensión automática en todos los casos.; Un plan concedido.; Cuotas definitivas.; Pago de la deuda.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; ACTION_DATE

**Importes:** ORIGINAL_TAX_PRINCIPAL; DOCUMENT_TOTAL

**Hechos:** OBLIGATION; PAYMENT_TIME; PAYMENT_MEDIUM; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:collection.deferral_substantiation_requirement; PREDECESSOR_OF:collection.deferral_grant; PREDECESSOR_OF:collection.deferral_denial; PREDECESSOR_OF:collection.deferral_inadmissibility_or_archival; RELATION:REQUESTS_DEFERRAL_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Requerimiento de subsanación o garantía de aplazamiento (`collection.deferral_substantiation_requirement`)

**Naturaleza:** `FORMAL_REQUEST` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un requerimiento para completar la solicitud de aplazamiento, aportar documentación o constituir una garantía.

**Por qué llega.** Se emite porque la solicitud necesita datos, documentos o garantías adicionales.

**Resultado.** Enumera lo que falta y el plazo para aportarlo.

**Qué hacer.** Entrega exactamente lo solicitado y conserva el justificante de presentación.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se subsana, la solicitud puede archivarse, tenerse por desistida o resolverse según el defecto indicado.

**No demuestra.** La concesión del aplazamiento.; Que todas las deudas queden suspendidas.; Que el defecto sea insubsanable si no lo dice.

**Referencias:** REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** DOCUMENTATION_REQUIRED; OBLIGATION; REASON; EXPLICIT_CONSEQUENCE; RESPONSE_CHANNEL

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_request_receipt; PREDECESSOR_OF:collection.deferral_grant; PREDECESSOR_OF:collection.deferral_denial; PREDECESSOR_OF:collection.deferral_inadmissibility_or_archival; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Concesión de aplazamiento o fraccionamiento (`collection.deferral_grant`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la resolución que acepta pagar las deudas identificadas según un calendario y unas condiciones.

**Por qué llega.** Se emite al resolver favorablemente la solicitud.

**Resultado.** Fija cuotas, vencimientos, principal, intereses y condiciones; cada cuota continúa pendiente hasta pago o conciliación.

**Qué hacer.** Revisa el calendario, la cuenta de cargo y las condiciones de incumplimiento.

**Plazo.** Cada cuota tiene su propio vencimiento impreso. Una fecha general del acuerdo no sustituye los vencimientos de las cuotas.

**Si no se atiende.** El impago de una cuota puede iniciar o continuar la vía ejecutiva sobre esa cuota o sobre el saldo, según el acuerdo y la normativa aplicable.

**No demuestra.** Que las cuotas estén pagadas.; Un gasto recurrente.; Que una cuenta bancaria impresa siga vigente.; Que el plan cubra deudas no listadas.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; INSTALLMENT_DUE_DATE; START_DATE; END_DATE

**Importes:** ORIGINAL_TAX_PRINCIPAL; DEFERRAL_INTEREST; DOCUMENT_TOTAL

**Hechos:** PAYMENT_SCOPE; PAYMENT_TIME; PAYMENT_MEDIUM; DOCUMENT_STATUS; EXPLICIT_CONSEQUENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_request_receipt; SUCCESSOR_OF:collection.deferral_substantiation_requirement; PREDECESSOR_OF:collection.deferral_modification; PREDECESSOR_OF:collection.deferral_breach; PREDECESSOR_OF:collection.interest_assessment; RELATION:CREATES_PAYMENT_PLAN_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Los acuerdos reales pueden contener varias deudas, calendarios largos, principal e interés por cuota y una cuenta domiciliada.

---

## Modificación de aplazamiento o fraccionamiento (`collection.deferral_modification`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una resolución que cambia el calendario, las condiciones o el alcance de un aplazamiento anterior.

**Por qué llega.** Se emite por una solicitud de modificación o por una actuación posterior sobre el plan.

**Resultado.** El nuevo calendario sustituye al anterior solo desde el alcance y la fecha impresos.

**Qué hacer.** Conserva ambos calendarios y marca cuál está vigente; no borres cuotas históricas.

**Plazo.** Cada cuota tiene su propio vencimiento impreso. Una fecha general del acuerdo no sustituye los vencimientos de las cuotas.

**Si no se atiende.** El incumplimiento del calendario modificado puede producir los efectos impresos o los previstos para el plan.

**No demuestra.** Que el plan original nunca existiera.; Que cuotas ya vencidas se borren.; Que deudas no citadas queden modificadas.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; INSTALLMENT_DUE_DATE

**Importes:** ORIGINAL_TAX_PRINCIPAL; DEFERRAL_INTEREST; DOCUMENT_TOTAL

**Hechos:** REASON; PAYMENT_SCOPE; PAYMENT_TIME; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_grant; PREDECESSOR_OF:collection.deferral_breach; RELATION:MODIFIES_PAYMENT_PLAN

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Denegación de aplazamiento o fraccionamiento (`collection.deferral_denial`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la resolución que rechaza la solicitud de aplazamiento o fraccionamiento.

**Por qué llega.** Se emite porque la AEAT considera que no se cumplen los requisitos o concurre el motivo indicado.

**Resultado.** Deja sin conceder el plan y aplica los efectos o plazos que dependan de la fase en que se solicitó.

**Qué hacer.** Revisa el motivo, la situación de cada deuda, el nuevo plazo de pago y las vías de revisión.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si la deuda estaba en voluntaria, la denegación puede abrir un plazo de ingreso; si estaba en ejecutiva, la recaudación puede continuar. Usa el efecto impreso del documento concreto.

**No demuestra.** Un pago.; Que todas las deudas estén ya en apremio.; Que recurrir suspenda automáticamente.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL

**Hechos:** REJECTION_REASON; REASON; APPEAL_INFORMATION; EXPLICIT_CONSEQUENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_request_receipt; SUCCESSOR_OF:collection.deferral_substantiation_requirement; PREDECESSOR_OF:collection.enforcement_order; RELATION:DENIES_DEFERRAL_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

**Patrones observados:** Los motivos pueden ser económicos, documentales, legales o de deuda no aplazable; no generalizar un motivo a todas las solicitudes.

---

## Inadmisión, desistimiento o archivo de aplazamiento (`collection.deferral_inadmissibility_or_archival`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acto que no entra a conceder el plan porque inadmite, tiene por desistida o archiva la solicitud.

**Por qué llega.** Se emite por una causa procesal o por falta de subsanación, según el documento.

**Resultado.** El resultado termina esa solicitud, pero no extingue las deudas.

**Qué hacer.** Revisa la causa, la situación recaudatoria y si existe recurso o posibilidad de nueva solicitud.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La deuda puede seguir su curso de cobro según la fase en que se encuentre.

**No demuestra.** Una denegación sobre el fondo.; La cancelación de la deuda.; Un pago o plan vigente.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Hechos:** REJECTION_REASON; REASON; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_request_receipt; SUCCESSOR_OF:collection.deferral_substantiation_requirement; PREDECESSOR_OF:collection.enforcement_order; RELATION:RESOLVES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Incumplimiento de aplazamiento o fraccionamiento (`collection.deferral_breach`)

**Naturaleza:** `COLLECTION_ACT` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una comunicación o actuación que declara incumplida una cuota o el plan de aplazamiento.

**Por qué llega.** Se emite porque una cuota no consta atendida o se ha producido la causa de incumplimiento indicada.

**Resultado.** Debe identificar la cuota o saldo afectado y los efectos sobre el resto del plan.

**Qué hacer.** Comprueba pagos, devoluciones bancarias, referencias y si se acelera solo una cuota o el principal restante.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Puede provocar apremio de la cuota, vencimiento anticipado o continuación del cobro, según el acuerdo y la normativa.

**No demuestra.** Que todo el principal sea exigible si no se imprime.; Que la cuota no se pagó solo por falta de justificante.; La suma de intereses futuros como principal acelerado.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; PAYMENT_RECEIPT_ID; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE; INSTALLMENT_DUE_DATE

**Importes:** OUTSTANDING_PRINCIPAL; DEFERRAL_INTEREST; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL

**Hechos:** REASON; EXPLICIT_CONSEQUENCE; PAYMENT_RESULT; PAYMENT_SCOPE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_grant; SUCCESSOR_OF:collection.deferral_modification; PREDECESSOR_OF:collection.enforcement_order; RELATION:CLAIMS_UNPAID_INSTALLMENT

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Aplazamiento y fraccionamiento de deudas (AEAT_DEFERRAL); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Liquidación independiente de intereses de demora (`collection.interest_assessment`)

**Naturaleza:** `ASSESSMENT` · **Fase:** `F3` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una liquidación separada que calcula intereses derivados de una deuda, devolución, aplazamiento u otro acto anterior.

**Por qué llega.** Se emite porque ha transcurrido el período que genera intereses según el acto de origen.

**Resultado.** Fija base, fechas, días, tipos e importe de intereses; no sustituye el principal original.

**Qué hacer.** Comprueba el acto de origen, el período de cálculo y la suma de los tramos.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si el importe liquidado no se paga o suspende, puede seguir la recaudación correspondiente.

**No demuestra.** Una nueva deuda principal.; Que el principal siga pendiente si el documento no lo dice.; Que todos los tramos usen el mismo tipo.

**Referencias:** ACT_ID; AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; INTEREST_START_DATE; INTEREST_END_DATE; VOLUNTARY_PAYMENT_DEADLINE

**Importes:** LATE_PAYMENT_INTEREST; DEFERRAL_INTEREST; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; APPEAL_INFORMATION; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.deferral_grant; SUCCESSOR_OF:assessment.final_provisional_assessment; PREDECESSOR_OF:payment.payment_form; PREDECESSOR_OF:collection.enforcement_order; RELATION:LIQUIDATES_INTEREST_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Liquidación de intereses de demora de Gestión Tributaria (AEAT_INTEREST_ASSESSMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Ejemplos reales citan el acuerdo de aplazamiento y la liquidación de origen mediante referencias concatenadas.

---

## Providencia de apremio (`collection.enforcement_order`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F3` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es el acto que inicia o continúa la vía ejecutiva para cobrar una deuda que la AEAT considera pendiente.

**Por qué llega.** Se emite porque la deuda no consta ingresada en período voluntario o ha pasado a ejecutiva por el motivo indicado.

**Resultado.** Identifica principal, recargos alternativos, total, clave de liquidación y plazo ejecutivo.

**Qué hacer.** Comprueba si existe pago, compensación, aplazamiento, recurso o suspensión y atiende el plazo impreso.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se paga dentro del plazo de la providencia, puede continuar el embargo y generarse intereses o costas.

**No demuestra.** Que la deuda sea correcta o firme.; Que no exista un pago anterior.; Que el importe máximo y el importe reducido sean sumables.; Un embargo ya practicado.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; EXECUTIVE_SURCHARGE_5; EXECUTIVE_SURCHARGE_10; EXECUTIVE_SURCHARGE_20; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST; COSTS; DOCUMENT_TOTAL

**Hechos:** PAYMENT_SCOPE; PAYMENT_MEDIUM; APPEAL_INFORMATION; EXPLICIT_CONSEQUENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:assessment.final_provisional_assessment; SUCCESSOR_OF:sanction.resolution; SUCCESSOR_OF:collection.deferral_breach; PREDECESSOR_OF:seizure.bank_account; PREDECESSOR_OF:seizure.movable_asset; PREDECESSOR_OF:seizure.real_estate; PREDECESSOR_OF:seizure.commercial_credits; RELATION:INITIATES_ENFORCEMENT

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Un mismo PDF puede contener providencia, carta de pago y copias para entidad; son un acto y un instrumento lógico, no varias deudas.

---

## Medida cautelar de recaudación (`collection.precautionary_measure`)

**Naturaleza:** `PRECAUTIONARY_ACT` · **Fase:** `F9` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una medida provisional para asegurar el cobro mientras se tramita o protege una deuda potencial o existente.

**Por qué llega.** Se adopta cuando la AEAT aprecia riesgo para la recaudación y debe motivarlo.

**Resultado.** Indica el bien, derecho, importe, motivo, duración y alcance provisional.

**Qué hacer.** Revisa la motivación, proporcionalidad, duración y si fue levantada, sustituida o convertida.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Puede mantenerse durante el período legal o convertirse en una medida definitiva si existe un acto posterior.

**No demuestra.** Un embargo definitivo.; Una deuda firme.; Que dure indefinidamente.; Que el bien haya sido vendido.

**Referencias:** ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; SEIZURE_ORDER_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EXPIRATION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** SEIZED_AMOUNT; RETAINED_AMOUNT; DOCUMENT_TOTAL

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:seizure.release; PREDECESSOR_OF:collection.asset_sale; RELATION:ORDERS_SEIZURE

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Recaudación: medidas cautelares (AEAT_PRECAUTIONARY); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Enajenación o subasta de bienes (`collection.asset_sale`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F9` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una actuación para vender bienes embargados o aportados como garantía y aplicar el producto al procedimiento.

**Por qué llega.** Se emite porque el procedimiento ha avanzado a la fase de realización del bien.

**Resultado.** Debe identificar lote, bien, valoración, cargas, fechas y estado de la subasta o adjudicación.

**Qué hacer.** Comprueba si es anuncio, apertura, adjudicación, pago del precio o cancelación; son fases distintas.

**Plazo.** Usa exclusivamente el vencimiento o calendario impreso. Si el vencimiento no se lee con exactitud, déjalo como pendiente de revisión.

**Si no se atiende.** La falta de pago del adjudicatario o la ausencia de pujas produce los efectos que indique la fase concreta.

**No demuestra.** Que el bien ya se haya vendido por existir anuncio.; Que la deuda quede saldada por el valor de tasación.; Que el importe de adjudicación sea el saldo aplicado.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; SEIZURE_ORDER_ID; REGISTRY_ID; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; AVAILABILITY_DATE; EXPIRATION_DATE; PAYMENT_DATE

**Importes:** VALUATION; CHARGES; REMITTED_AMOUNT; DOCUMENT_TOTAL

**Hechos:** DOCUMENT_STATUS; SEIZED_RIGHT; OWNERSHIP_SHARE; REASON

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.bank_account; SUCCESSOR_OF:seizure.movable_asset; SUCCESSOR_OF:seizure.real_estate; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Enajenación de bienes mediante subasta (AEAT_AUCTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Liquidación de recargo por presentación fuera de plazo (`collection.late_filing_surcharge`)

**Naturaleza:** `ASSESSMENT` · **Fase:** `F3` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una liquidación de recargo por haber presentado una declaración o autoliquidación fuera de plazo sin requerimiento previo, según el acto.

**Por qué llega.** Se emite porque la AEAT aprecia una presentación extemporánea y calcula el recargo correspondiente.

**Resultado.** Separa base, recargo, posibles reducciones e intereses y lo vincula a la presentación original.

**Qué hacer.** Comprueba fecha de presentación, período, existencia de requerimiento previo y cálculo impreso.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se paga o recurre/suspende, el recargo puede pasar a vía ejecutiva.

**No demuestra.** Una sanción.; Que la declaración no se presentara.; Que no existiera requerimiento previo si el documento no lo acredita.

**Referencias:** ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; LIQUIDATION_KEY; FILING_RECEIPT_ID; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; FILING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE

**Importes:** ORIGINAL_TAX_PRINCIPAL; EXECUTIVE_SURCHARGE_PRINTED; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; REASON; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:payment.receipt; PREDECESSOR_OF:collection.enforcement_order; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Liquidación de recargos por presentación fuera de plazo (AEAT_LATE_SURCHARGE); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Deuda de otro organismo recaudada por la AEAT (`collection.external_debt`)

**Naturaleza:** `COLLECTION_ACT` · **Fase:** `F3` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una actuación de cobro de una deuda originada por otro organismo cuya recaudación gestiona la AEAT.

**Por qué llega.** Se emite porque el organismo de origen ha remitido la deuda para su cobro.

**Resultado.** Separa claramente organismo de origen, acto original y actuaciones recaudatorias de la AEAT.

**Qué hacer.** Para discutir el origen consulta las instrucciones del organismo competente; para pagar o gestionar el cobro sigue el canal indicado por la AEAT.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se atiende, la AEAT puede continuar la recaudación en los términos del acto.

**No demuestra.** Que la AEAT haya dictado el acto original.; Que todos los recursos se presenten ante la AEAT.; Que sea un tributo estatal.

**Referencias:** ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST; COSTS; DOCUMENT_TOTAL

**Hechos:** ISSUING_AUTHORITY; REASON; APPEAL_INFORMATION; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY; ORIGINATING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.bank_account; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Deudas de otros organismos recaudadas por la AEAT (AEAT_EXTERNAL_DEBT); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

# Compensación y extinción

## Compensación a instancia del obligado (`collection.offset_requested`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la solicitud o el acuerdo para usar un crédito reconocido por la AEAT y cancelar deudas concretas.

**Por qué llega.** Se produce porque el titular pidió compensar una devolución u otro crédito con deudas identificadas.

**Resultado.** En una solicitud no hay resultado todavía; en el acuerdo se aplican importes fila a fila y se muestran saldos.

**Qué hacer.** Comprueba si es solicitud o resolución, qué crédito se usa, qué deudas afecta y cuánto queda pendiente.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si la compensación es parcial o denegada, la parte no cubierta puede seguir su curso de cobro según la fase de la deuda.

**No demuestra.** Un pago bancario.; La compensación de deudas no listadas.; Que el crédito residual haya sido transferido sin comunicación de pago.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** REFUND_CREDIT; CREDIT_TOTAL; OFFSET_APPLIED; TOTAL_BEFORE_OFFSET; REMAINING_AFTER_OFFSET; NET_REFUND_PAYMENT

**Hechos:** PAYMENT_SCOPE; DOCUMENT_STATUS; OFFSET_EFFECT_MEANING; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:refund.request_or_recognition; PREDECESSOR_OF:collection.offset_resolution; PREDECESSOR_OF:collection.extinction_or_balance_notice; RELATION:COMPENSATES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Compensación a instancia del obligado (AEAT_OFFSET_REQUESTED); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Los acuerdos pueden listar un crédito y varias cuotas de una misma deuda con secuencias distintas.

---

## Compensación de oficio (`collection.offset_ex_officio`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un acuerdo por el que la AEAT aplica de oficio un crédito reconocido a deudas pendientes.

**Por qué llega.** Se emite al coincidir una deuda cobrable y un crédito a favor del mismo obligado.

**Resultado.** Puede extinguir deudas total o parcialmente; el exceso de crédito y el saldo de deuda deben quedar separados.

**Qué hacer.** Revisa cada deuda, el efecto impreso, los recargos/intereses y si queda crédito o deuda residual.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La deuda residual continúa en la fase indicada; el crédito excedente puede pagarse mediante comunicación posterior.

**No demuestra.** Un pago voluntario.; La extinción total de todas las deudas si alguna fila queda pendiente.; Que el exceso de crédito se haya transferido.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** REFUND_CREDIT; CREDIT_TOTAL; OFFSET_APPLIED; TOTAL_BEFORE_OFFSET; REMAINING_AFTER_OFFSET; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST

**Hechos:** OFFSET_EFFECT_MEANING; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:refund.request_or_recognition; PREDECESSOR_OF:collection.extinction_or_balance_notice; PREDECESSOR_OF:refund.payment_communication; RELATION:COMPENSATES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Compensación de oficio (AEAT_OFFSET_EX_OFFICIO); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Una misma resolución puede extinguir una cuota totalmente y otra parcialmente, con códigos de efecto diferentes.

---

## Resolución total, parcial o denegatoria de compensación (`collection.offset_resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la resolución que decide una solicitud de compensación y declara si se acepta total, parcialmente o se deniega.

**Por qué llega.** Se emite al finalizar la tramitación de la solicitud.

**Resultado.** Debe distinguir crédito admitido, importe aplicado, deudas afectadas, saldos y motivo de denegación cuando exista.

**Qué hacer.** Revisa el resultado por deuda, la situación recaudatoria y las vías de revisión.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Una denegación o compensación parcial puede abrir o continuar plazos de pago distintos según la fase de la deuda.

**No demuestra.** La transferencia de un crédito sobrante.; La cancelación de deudas no incluidas.; Un pago si solo hay compensación.

**Referencias:** AGREEMENT_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE

**Importes:** CREDIT_TOTAL; OFFSET_APPLIED; TOTAL_BEFORE_OFFSET; REMAINING_AFTER_OFFSET; NET_REFUND_PAYMENT

**Hechos:** DOCUMENT_STATUS; REJECTION_REASON; OFFSET_EFFECT_MEANING; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.offset_requested; PREDECESSOR_OF:collection.extinction_or_balance_notice; PREDECESSOR_OF:refund.payment_communication; RELATION:RESOLVES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Compensación a instancia del obligado (AEAT_OFFSET_REQUESTED); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Comunicación de extinción, aplicación o saldo pendiente (`collection.extinction_or_balance_notice`)

**Naturaleza:** `STATUS_NOTICE` · **Fase:** `F5` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una comunicación que informa de cómo ha quedado una deuda o crédito después de un pago, compensación, aplicación u otra causa.

**Por qué llega.** Se emite para dejar constancia del saldo y del efecto de una actuación anterior.

**Resultado.** Debe indicar qué partida queda extinguida, parcialmente cubierta o pendiente.

**Qué hacer.** Comprueba la referencia de origen y no extrapoles el estado a otras deudas.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Si queda saldo pendiente, seguirá el procedimiento o plazo que identifique el documento relacionado.

**No demuestra.** La causa del cierre si no está impresa.; Que todas las deudas estén canceladas.; Un pago bancario.

**Referencias:** ACT_ID; AGREEMENT_ID; DEBT_KEY; LIQUIDATION_KEY; PAYMENT_RECEIPT_ID; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; PAYMENT_DATE

**Importes:** OFFSET_APPLIED; PAYMENT_CONFIRMED; TOTAL_BEFORE_OFFSET; REMAINING_AFTER_OFFSET; DOCUMENT_TOTAL

**Hechos:** DOCUMENT_STATUS; PAYMENT_RESULT; OFFSET_EFFECT_MEANING

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.offset_requested; SUCCESSOR_OF:collection.offset_ex_officio; SUCCESSOR_OF:payment.receipt; RELATION:LEAVES_PENDING_BALANCE

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Compensación a instancia del obligado (AEAT_OFFSET_REQUESTED); Compensación de oficio (AEAT_OFFSET_EX_OFFICIO); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

# Devoluciones

## Solicitud, propuesta o reconocimiento de devolución (`refund.request_or_recognition`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una solicitud, propuesta o acto que reconoce una cantidad a devolver.

**Por qué llega.** Se genera porque una declaración, solicitud o revisión puede dar lugar a un crédito a favor del titular.

**Resultado.** Debe distinguir importe solicitado, propuesto, reconocido y pendiente de pago.

**Qué hacer.** Comprueba la fase y no marques la devolución como pagada hasta una orden o evidencia de pago.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La devolución puede ser comprobada, retenida, compensada o pagada según actos posteriores.

**No demuestra.** Una transferencia bancaria.; Que el importe solicitado sea el reconocido.; Que una devolución neta cero sea denegación.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; OTHER_OFFICIAL_REFERENCE; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** REFUND_CREDIT; CREDIT_TOTAL; NET_REFUND_PAYMENT

**Hechos:** DOCUMENT_STATUS; FACT_OR_GROUND; PAYMENT_RESULT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:refund.withholding_or_offset; PREDECESSOR_OF:collection.offset_requested; PREDECESSOR_OF:collection.offset_ex_officio; PREDECESSOR_OF:refund.payment_communication; RELATION:RECOGNIZES_REFUND

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Devolución derivada de la normativa del tributo (AEAT_REFUND_TAX); Devolución de ingresos indebidos (AEAT_REFUND_UNDUE); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Comunicación de pago de devolución (`refund.payment_communication`)

**Naturaleza:** `PAYMENT_NOTICE` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es la comunicación que ordena o informa del pago del importe líquido de una devolución.

**Por qué llega.** Se emite después de reconocer la devolución y aplicar, en su caso, deducciones, embargos o compensaciones.

**Resultado.** Separa devolución bruta, deducciones, importe ordenado e importe líquido.

**Qué hacer.** Comprueba la referencia del crédito y el importe líquido; una orden de pago puede requerir conciliación bancaria para confirmar recepción efectiva.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que el banco ya haya abonado el importe si solo se ordena el pago.; Que las deducciones sean gastos nuevos.; Que la devolución bruta coincida con el neto.

**Referencias:** ACT_ID; PAYMENT_RECEIPT_ID; OTHER_OFFICIAL_REFERENCE; AGREEMENT_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; PAYMENT_DATE; ACTION_DATE

**Importes:** REFUND_CREDIT; CREDIT_TOTAL; OFFSET_APPLIED; RETAINED_AMOUNT; NET_REFUND_PAYMENT; PAYMENT_CONFIRMED

**Hechos:** PAYMENT_RESULT; PAYMENT_MEDIUM; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:refund.request_or_recognition; SUCCESSOR_OF:refund.withholding_or_offset; SUCCESSOR_OF:collection.offset_requested; SUCCESSOR_OF:collection.offset_ex_officio; RELATION:PAYS_REFUND

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Devolución derivada de la normativa del tributo (AEAT_REFUND_TAX); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT); Ley 58/2003, General Tributaria (LGT)

**Patrones observados:** Una comunicación real enlaza por la referencia del crédito con un acuerdo de compensación y confirma el residual exacto.

---

## Devolución de ingresos indebidos (`refund.undue_payment`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el procedimiento para recuperar un ingreso duplicado, excesivo, prescrito o indebidamente realizado.

**Por qué llega.** Se inicia por solicitud o de oficio cuando se aprecia un ingreso indebido.

**Resultado.** Puede contener propuesta, resolución total/parcial/denegatoria y, después, pago.

**Qué hacer.** Revisa el ingreso original, causa, importe reconocido, intereses y estado de pago.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La falta de documentación puede provocar requerimiento o resolución con los datos disponibles.

**No demuestra.** Que todo pago discutido sea indebido.; Una transferencia por la mera solicitud.; La anulación automática del acto original.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; PAYMENT_RECEIPT_ID; NRC; LIQUIDATION_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; PAYMENT_DATE

**Importes:** PAYMENT_CONFIRMED; REFUND_CREDIT; LATE_PAYMENT_INTEREST; NET_REFUND_PAYMENT

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:refund.payment_communication; RELATION:RECOGNIZES_REFUND

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Devolución de ingresos indebidos (AEAT_REFUND_UNDUE); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Retención, compensación o aplicación de una devolución (`refund.withholding_or_offset`)

**Naturaleza:** `STATUS_NOTICE_OR_RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acto que destina total o parcialmente una devolución reconocida a deudas, embargos u otras deducciones.

**Por qué llega.** Se emite porque existe una causa que afecta al pago íntegro del crédito.

**Resultado.** Debe mostrar devolución bruta, destino de cada deducción y neto restante.

**Qué hacer.** Relaciona cada deducción con su deuda u organismo y evita duplicar gastos o pagos.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Si queda deuda residual o crédito residual, su tratamiento dependerá de los documentos posteriores.

**No demuestra.** Que la devolución se haya denegado.; Que el neto cero sea falta de derecho a devolución.; Que todas las deducciones pertenezcan a la AEAT.

**Referencias:** ACT_ID; AGREEMENT_ID; DEBT_KEY; LIQUIDATION_KEY; SEIZURE_ORDER_ID; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE

**Importes:** REFUND_CREDIT; CREDIT_TOTAL; OFFSET_APPLIED; RETAINED_AMOUNT; NET_REFUND_PAYMENT; REMAINING_AFTER_OFFSET

**Hechos:** PAYMENT_SCOPE; OFFSET_EFFECT_MEANING; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:refund.request_or_recognition; PREDECESSOR_OF:refund.payment_communication; RELATION:WITHHOLDS_REFUND

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Devolución derivada de la normativa del tributo (AEAT_REFUND_TAX); Compensación de oficio (AEAT_OFFSET_EX_OFFICIO); Tipos de embargo (AEAT_SEIZURE_TYPES); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Suspensión de deuda IRPF mediante devolución del cónyuge (`irpf.spouse_refund_suspension`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es el acuerdo que aplica la devolución de un cónyuge al ingreso suspendido de la declaración del otro.

**Por qué llega.** Se emite al resolver la solicitud prevista para declaraciones de IRPF vinculadas entre cónyuges.

**Resultado.** Puede extinguir total o parcialmente el ingreso suspendido y dejar devolución o deuda residual.

**Qué hacer.** Comprueba ambos importes y la relación multiparte, pero persiste solo roles y resultados, no identidades de terceros.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Si la devolución es insuficiente, puede quedar una parte pendiente del ingreso; si es superior, puede quedar un neto a devolver.

**No demuestra.** Un pago bancario entre cónyuges.; Que ambas declaraciones pertenezcan al mismo titular de cuenta.; Que la deuda desaparezca si el crédito es insuficiente.

**Referencias:** AGREEMENT_ID; ACT_ID; OTHER_OFFICIAL_REFERENCE; MODEL; FISCAL_YEAR; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE

**Importes:** REFUND_CREDIT; OFFSET_APPLIED; REMAINING_AFTER_OFFSET; NET_REFUND_PAYMENT

**Hechos:** DOCUMENT_STATUS; OFFSET_EFFECT_MEANING

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY_SPOUSE; ISSUING_AUTHORITY

**Relaciones:** RELATION:COMPENSATES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Suspensión de ingreso de deuda IRPF mediante devolución del cónyuge (AEAT_SPOUSE_SUSPENSION); Ley 35/2006, del IRPF (IRPF_LAW); Real Decreto 439/2007, Reglamento del IRPF (IRPF_REG)

**Patrones observados:** Los ejemplos históricos muestran documentos en castellano/catalán y relaciones multiparte sin movimiento bancario.

---

## Reembolso del coste de garantías (`review.guarantee_cost_reimbursement`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el procedimiento para recuperar los costes de una garantía cuando el acto o deuda garantizados fueron declarados improcedentes total o parcialmente.

**Por qué llega.** Se inicia por solicitud del interesado después de una resolución favorable sobre el acto garantizado.

**Resultado.** Puede reconocer, reducir o denegar el reembolso y, después, ordenar su pago.

**Qué hacer.** Relaciona costes, garantía y resolución de origen; separa reconocimiento de pago.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** Que cualquier recurso dé derecho al reembolso.; Que el coste esté pagado por la mera solicitud.; La anulación del acto si no existe resolución de origen.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; PAYMENT_RECEIPT_ID; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; PAYMENT_DATE

**Importes:** COSTS; REFUND_CREDIT; LATE_PAYMENT_INTEREST; NET_REFUND_PAYMENT

**Hechos:** REASON; DOCUMENT_STATUS; PAYMENT_RESULT

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:review.resolution; PREDECESSOR_OF:refund.payment_communication; RELATION:REIMBURSES_GUARANTEE_COST_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Reembolso del coste de garantías (AEAT_GUARANTEE_COST); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

# Documentos y evidencias de pago

## Carta o documento de pago (`payment.payment_form`)

**Naturaleza:** `PAYMENT_INSTRUMENT` · **Fase:** `F3` · **Prioridad:** `P1` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es un documento con referencias, importe, vencimiento y canales para realizar un ingreso.

**Por qué llega.** Se entrega junto a una liquidación, providencia, sanción, cuota u otra obligación.

**Resultado.** Permite pagar, pero no acredita que el pago ya se haya realizado.

**Qué hacer.** Comprueba referencia, importe y vencimiento y espera un NRC, recibo o conciliación para confirmar el pago.

**Plazo.** Usa exclusivamente el vencimiento o calendario impreso. Si el vencimiento no se lee con exactitud, déjalo como pendiente de revisión.

**Si no se atiende.** Si no se paga dentro del plazo aplicable, la deuda puede seguir la fase de cobro correspondiente.

**No demuestra.** Un pago confirmado.; La presentación de un modelo.; Que varias copias sean varias deudas.

**Referencias:** LIQUIDATION_KEY; DEBT_KEY; PAYMENT_RECEIPT_ID; BANK_REFERENCE; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; EXPIRATION_DATE; VOLUNTARY_PAYMENT_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST; COSTS; DOCUMENT_TOTAL

**Hechos:** PAYMENT_MEDIUM; PAYMENT_TIME; PAYMENT_SCOPE; BARCODE_REFERENCE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:assessment.final_provisional_assessment; SUCCESSOR_OF:sanction.resolution; SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:payment.receipt; PREDECESSOR_OF:payment.failed_or_reversed; RELATION:PAYMENT_FORM_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT); Pago y justificante NRC (AEAT_NRC); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** El PDF puede incluir copia para el interesado y para la entidad colaboradora; forman un único instrumento lógico.

---

## Justificante o recibo de pago (`payment.receipt`)

**Naturaleza:** `PAYMENT_EVIDENCE` · **Fase:** `F3` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una evidencia de ingreso cuando identifica operación, importe, fecha y deuda o autoliquidación.

**Por qué llega.** Se genera después de completar un pago por un canal admitido.

**Resultado.** Puede acreditar pago total o parcial; el alcance depende de la referencia y el resultado impreso.

**Qué hacer.** Relaciona el justificante solo con la deuda o modelo exactos y calcula saldo únicamente si es trazable.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** La presentación de una declaración.; El pago de otras deudas con el mismo importe.; Que un NRC sea válido para cualquier operación.

**Referencias:** PAYMENT_RECEIPT_ID; NRC; LIQUIDATION_KEY; DEBT_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; BANK_REFERENCE; CSV

**Fechas:** PAYMENT_DATE; ISSUE_DATE

**Importes:** PAYMENT_CONFIRMED; DOCUMENT_TOTAL

**Hechos:** PAYMENT_RESULT; PAYMENT_MEDIUM; PAYMENT_SCOPE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:payment.payment_form; RELATION:PAYMENT_EVIDENCE_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT); Pago y justificante NRC (AEAT_NRC); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Pago fallido, rechazado, anulado o devuelto (`payment.failed_or_reversed`)

**Naturaleza:** `PAYMENT_EVIDENCE` · **Fase:** `F3` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una evidencia de que una orden de pago no terminó correctamente o fue anulada o devuelta.

**Por qué llega.** Se genera por un fallo, rechazo, anulación o devolución de una operación.

**Resultado.** Conserva el intento y su resultado; no debe registrarse como pago válido.

**Qué hacer.** Revisa el motivo, la referencia y si hace falta repetir el pago dentro del plazo vigente.

**Plazo.** Usa exclusivamente el vencimiento o calendario impreso. Si el vencimiento no se lee con exactitud, déjalo como pendiente de revisión.

**Si no se atiende.** La deuda puede seguir pendiente y generar consecuencias si el plazo vence sin pago válido.

**No demuestra.** Un pago confirmado.; Que el banco sea culpable.; Que una nueva operación se haya realizado.

**Referencias:** PAYMENT_RECEIPT_ID; NRC; LIQUIDATION_KEY; DEBT_KEY; BANK_REFERENCE; CSV

**Fechas:** PAYMENT_DATE; ISSUE_DATE; EXPIRATION_DATE

**Importes:** DOCUMENT_TOTAL; REMITTED_AMOUNT

**Hechos:** PAYMENT_RESULT; REJECTION_REASON; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:payment.payment_form; PREDECESSOR_OF:collection.enforcement_order; RELATION:PAYMENT_FAILED_FOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT); Pago y justificante NRC (AEAT_NRC)

---

# Embargos

## Embargo de cuenta o depósito (`seizure.bank_account`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una diligencia que ordena retener dinero en una cuenta o depósito para cobrar deudas en vía ejecutiva.

**Por qué llega.** Se emite porque la AEAT ha dirigido el embargo a una entidad financiera.

**Resultado.** Debe separar total pendiente, límite a embargar e importe efectivamente retenido.

**Qué hacer.** Comprueba la deuda, diligencia, entidad y alcance; no conserves los dígitos de la cuenta.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si la deuda no queda cubierta, pueden existir otros embargos o actuaciones posteriores.

**No demuestra.** Que la deuda esté pagada por existir una retención.; Que el importe máximo sea el efectivamente ingresado.; El IBAN.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; SEIZURE_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT; COSTS; LATE_PAYMENT_INTEREST

**Hechos:** FINANCIAL_ENTITY; ACCOUNT_OR_DEPOSIT; SEIZED_RIGHT; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; FINANCIAL_ENTITY; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.release; PREDECESSOR_OF:collection.asset_sale; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Los anexos reales muestran importe total a embargar e importe retenido por la entidad, que pueden ser diferentes.

---

## Embargo de bien mueble (`seizure.movable_asset`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una diligencia que traba un vehículo u otro bien mueble para asegurar o ejecutar el cobro.

**Por qué llega.** Se emite dentro del procedimiento de apremio sobre bienes identificados.

**Resultado.** Describe el bien, registro, depósito, valoración e importe cubierto cuando están impresos.

**Qué hacer.** Comprueba el bien concreto, sus cargas y si existe anotación, depósito, subasta o levantamiento posterior.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El bien puede anotarse, depositarse o venderse en actuaciones posteriores.

**No demuestra.** Que el bien ya se haya vendido.; Que su valoración sea el pago aplicado.; Que el embargo cubra toda la deuda.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SEIZURE_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; SEIZED_AMOUNT; VALUATION; CHARGES

**Hechos:** SEIZED_RIGHT; PROPERTY_NUMBER; LAND_REGISTRY; VALUATION; CHARGES

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.release; PREDECESSOR_OF:collection.asset_sale; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Embargo de inmueble (`seizure.real_estate`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una diligencia que traba un inmueble o derecho sobre él dentro del procedimiento de apremio.

**Por qué llega.** Se emite para asegurar el cobro mediante anotación y posible realización posterior.

**Resultado.** Identifica finca, derecho, porcentaje, registro, valoración, cargas e importe de la deuda.

**Qué hacer.** Revisa el inmueble y si se exige aportar títulos o se ordena anotación registral.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Puede producir anotación preventiva y, si continúa, valoración y enajenación.

**No demuestra.** Que el inmueble se haya vendido.; Que la deuda quede pagada.; Que la dirección deba persistirse fuera del original.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SEIZURE_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; SEIZED_AMOUNT; VALUATION; CHARGES; COSTS

**Hechos:** PROPERTY_HOLDER; PROPERTY_ADDRESS; CADASTRAL_REFERENCE; LAND_REGISTRY; PROPERTY_NUMBER; SEIZED_RIGHT; OWNERSHIP_SHARE; VALUATION; CHARGES

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.release; PREDECESSOR_OF:collection.asset_sale; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Las diligencias pueden exigir títulos y anunciar anotación preventiva; el levantamiento posterior cita la misma diligencia.

---

## Embargo de créditos comerciales o arrendaticios (`seizure.commercial_credits`)

**Naturaleza:** `THIRD_PARTY_ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es una orden dirigida a un tercero para que informe, retenga y, cuando corresponda, ingrese cantidades que debe al deudor.

**Por qué llega.** Se envía porque la AEAT cree que el destinatario mantiene o puede mantener pagos pendientes con el deudor.

**Resultado.** El destinatario no es el deudor tributario: debe responder y solo retener o ingresar si existen créditos en los términos impresos.

**Qué hacer.** Contesta dentro del plazo, identifica si hay facturas o rentas pendientes y no pagues al deudor las cantidades afectadas.

**Plazo.** La obligación nace cuando ocurra el evento descrito, por ejemplo cuando un crédito sea exigible. No inventes una fecha fija si el documento vincula el cumplimiento a un hecho futuro.

**Si no se atiende.** No contestar, no retener o pagar al deudor después de recibir la diligencia puede generar sanciones o responsabilidad en los términos legales y documentales.

**No demuestra.** Una deuda tributaria propia del destinatario.; Que exista crédito sin comprobar facturas o contratos.; Un ingreso por la mera contestación.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; LIQUIDATION_KEY; THIRD_PARTY_RESPONSE_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; SEIZURE_DATE; PAYMENT_DATE

**Importes:** OUTSTANDING_PRINCIPAL; SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT

**Hechos:** CREDIT_DEBTOR; CONTRACT_OR_INVOICE; PROHIBITION_TO_PAY_DEBTOR; SEIZURE_INSTRUCTIONS; EXPLICIT_CONSEQUENCE; SEIZURE_RECIPIENT_ROLE

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY_DEBTOR; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.compliance_reiteration; PREDECESSOR_OF:seizure.third_party_response; PREDECESSOR_OF:seizure.third_party_payment; PREDECESSOR_OF:seizure.release; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Requerimiento de información de Recaudación (AEAT_INFORMATION_REQUEST)

**Patrones observados:** Los documentos reales exigen respuesta desde recepción y el ingreso cuando el crédito sea exigible; las relaciones continuadas pueden requerir retenciones sucesivas.

---

## Reiteración de obligaciones de embargo de créditos (`seizure.compliance_reiteration`)

**Naturaleza:** `THIRD_PARTY_FOLLOWUP` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un recordatorio o requerimiento posterior para cumplir una diligencia de embargo de créditos ya enviada.

**Por qué llega.** Se emite porque la AEAT no tiene constancia suficiente de la respuesta, retención o ingreso exigidos.

**Resultado.** Debe citar la diligencia anterior, indicar qué falta y fijar un nuevo plazo o advertencia.

**Qué hacer.** Revisa la diligencia original y responde o acredita el cumplimiento.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La persistencia del incumplimiento puede originar sanción o responsabilidad; conserva solo lo impreso y el contexto oficial etiquetado.

**No demuestra.** Una nueva deuda tributaria.; Un segundo embargo distinto si cita la misma diligencia.; Que el primer documento siga vigente si existe levantamiento.

**Referencias:** SEIZURE_ORDER_ID; REQUEST_NUMBER; PROCEDURE_ID; EXPEDIENTE_ID; THIRD_PARTY_RESPONSE_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** SEIZURE_INSTRUCTIONS; REASON; EXPLICIT_CONSEQUENCE; DOCUMENTATION_REQUIRED

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY_DEBTOR; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.commercial_credits; PREDECESSOR_OF:seizure.third_party_response; PREDECESSOR_OF:seizure.third_party_payment; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Levantamiento de embargo (`seizure.release`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F1` · **Prioridad:** `P0` · **Cobertura:** `REAL_EXAMPLE_AND_OFFICIAL`

**Qué es.** Es el documento que deja sin efecto total o parcialmente un embargo concreto.

**Por qué llega.** Se emite porque la AEAT acuerda liberar el bien o derecho por la causa y alcance que figuren.

**Resultado.** Debe identificar la diligencia levantada, el bien y si el levantamiento es total o parcial.

**Qué hacer.** Relaciona el levantamiento con el embargo exacto y conserva ambos en la cronología.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que la deuda haya sido pagada.; La causa del levantamiento si no se imprime.; El levantamiento de otros embargos sobre la misma deuda.

**Referencias:** SEIZURE_ORDER_ID; ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; RELEASE_DATE; ACTION_DATE

**Importes:** SEIZED_AMOUNT; RELEASED_AMOUNT

**Hechos:** RELEASED_ASSET_OR_RIGHT; EXPLICIT_RELEASE_REASON; RELEASE_EXTENT; LAND_REGISTRY

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.bank_account; SUCCESSOR_OF:seizure.movable_asset; SUCCESSOR_OF:seizure.real_estate; SUCCESSOR_OF:seizure.commercial_credits; RELATION:RELEASES_SEIZURE

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

**Patrones observados:** Hay levantamientos de inmuebles y muebles que ordenan cancelar anotaciones registrales y citan la diligencia original.

---

## Embargo de sueldos, salarios o pensiones (`seizure.wages_or_pensions`)

**Naturaleza:** `THIRD_PARTY_ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una orden a un pagador para retener parte de una remuneración dentro de los límites aplicables.

**Por qué llega.** Se envía porque el destinatario paga salarios, pensiones u otras retribuciones al deudor.

**Resultado.** Debe indicar pagador, periodicidad, límite, cálculo o cuantía y obligación de responder.

**Qué hacer.** Aplica únicamente la retención impresa o validada y conserva el historial de cada período.

**Plazo.** La obligación nace cuando ocurra el evento descrito, por ejemplo cuando un crédito sea exigible. No inventes una fecha fija si el documento vincula el cumplimiento a un hecho futuro.

**Si no se atiende.** No responder o incumplir la orden puede generar consecuencias para el pagador.

**No demuestra.** Que todo el salario sea embargable.; Una deuda fiscal propia del empleador.; Una retención ya ingresada si solo se ordena.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; THIRD_PARTY_RESPONSE_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; PAYMENT_DATE

**Importes:** SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT

**Hechos:** REMUNERATION_TYPE; PRINTED_WITHHOLDING_LIMIT; SEIZURE_INSTRUCTIONS; SEIZURE_RECIPIENT_ROLE

**Roles:** ACCOUNT_HOLDER; EMPLOYER_OR_PAYER; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.third_party_response; PREDECESSOR_OF:seizure.third_party_payment; PREDECESSOR_OF:seizure.release; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Embargo de valores u otros activos financieros (`seizure.securities_or_financial_assets`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una diligencia dirigida a una entidad depositaria para inmovilizar o realizar valores y activos financieros.

**Por qué llega.** Se emite porque la AEAT localiza activos financieros vinculados al deudor.

**Resultado.** Identifica entidad, activo, cuenta o depósito, cantidad y restricción de disposición.

**Qué hacer.** Comprueba el activo concreto y diferencia inmovilización, realización e ingreso.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** Que los activos ya se hayan vendido.; Que su valor estimado sea el importe aplicado a la deuda.; Los números de cuenta completos.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; REGISTRY_ID; CSV

**Fechas:** ISSUE_DATE; SEIZURE_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT; VALUATION

**Hechos:** FINANCIAL_ENTITY; ACCOUNT_OR_DEPOSIT; SEIZED_RIGHT; VALUATION

**Roles:** ACCOUNT_HOLDER; FINANCIAL_ENTITY; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.third_party_payment; PREDECESSOR_OF:seizure.release; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Embargo de efectivo, devolución o crédito frente a la Administración (`seizure.cash_or_refund`)

**Naturaleza:** `ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una diligencia que aplica dinero, una devolución o un crédito frente a la Administración al cobro de deudas.

**Por qué llega.** Se emite porque existe un importe líquido susceptible de retención o aplicación.

**Resultado.** Debe separar crédito bruto, importe retenido, aplicado y residual.

**Qué hacer.** Relaciona el crédito con la deuda exacta y no confundas retención con pago bancario.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que la devolución haya sido denegada.; Que toda la deuda quede pagada.; Que el residual haya sido transferido.

**Referencias:** SEIZURE_ORDER_ID; DEBT_KEY; LIQUIDATION_KEY; OTHER_OFFICIAL_REFERENCE; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE

**Importes:** REFUND_CREDIT; SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT; REMAINING_AFTER_OFFSET

**Hechos:** SEIZED_RIGHT; PAYMENT_SCOPE; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; SUCCESSOR_OF:refund.request_or_recognition; PREDECESSOR_OF:refund.payment_communication; RELATION:WITHHOLDS_REFUND

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Devolución derivada de la normativa del tributo (AEAT_REFUND_TAX)

---

## Embargo de cobros mediante terminal de punto de venta (`seizure.tpv_receipts`)

**Naturaleza:** `THIRD_PARTY_ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una orden al proveedor de pagos para retener cobros realizados mediante TPV u otros servicios de pago.

**Por qué llega.** Se emite porque el deudor recibe cobros a través de un intermediario.

**Resultado.** Debe identificar proveedor, comercio, terminal o flujo, porcentaje o límite y cantidades retenidas.

**Qué hacer.** Comprueba la referencia de la diligencia y diferencia orden, retención e ingreso.

**Plazo.** La obligación nace cuando ocurra el evento descrito, por ejemplo cuando un crédito sea exigible. No inventes una fecha fija si el documento vincula el cumplimiento a un hecho futuro.

**No demuestra.** Una deuda fiscal del proveedor de pagos.; Que todos los cobros estén afectados sin límite impreso.; Un pago a la AEAT si solo hay retención.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; THIRD_PARTY_RESPONSE_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; PAYMENT_DATE

**Importes:** SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT

**Hechos:** PAYMENT_SERVICE_PROVIDER; TERMINAL_OR_MERCHANT; SEIZURE_INSTRUCTIONS

**Roles:** ACCOUNT_HOLDER; PAYMENT_SERVICE_PROVIDER; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.third_party_response; PREDECESSOR_OF:seizure.third_party_payment; PREDECESSOR_OF:seizure.release; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Embargo de ingresos de actividad o rentas (`seizure.business_income_or_rents`)

**Naturaleza:** `THIRD_PARTY_ENFORCEMENT_ACT` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una orden para retener ingresos periódicos de una actividad, alquiler u otra renta.

**Por qué llega.** Se emite porque un tercero paga o gestiona ingresos que corresponden al deudor.

**Resultado.** Debe identificar origen, pagador, periodicidad, límite y obligación de ingreso.

**Qué hacer.** Responde y retén solo en los términos del documento; no calcules rentas futuras no impresas.

**Plazo.** La obligación nace cuando ocurra el evento descrito, por ejemplo cuando un crédito sea exigible. No inventes una fecha fija si el documento vincula el cumplimiento a un hecho futuro.

**Si no se atiende.** No contestar o pagar al deudor cantidades afectadas puede generar consecuencias para el tercero.

**No demuestra.** Una deuda fiscal propia del pagador.; La existencia de rentas futuras.; Un ingreso ya realizado.

**Referencias:** SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; DEBT_KEY; THIRD_PARTY_RESPONSE_ID; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; PAYMENT_DATE

**Importes:** SEIZED_AMOUNT; RETAINED_AMOUNT; REMITTED_AMOUNT

**Hechos:** CREDIT_DEBTOR; REMUNERATION_TYPE; CONTRACT_OR_INVOICE; SEIZURE_INSTRUCTIONS

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY_PAYER; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:collection.enforcement_order; PREDECESSOR_OF:seizure.third_party_response; PREDECESSOR_OF:seizure.third_party_payment; PREDECESSOR_OF:seizure.release; RELATION:ENFORCES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Contestación de tercero a una diligencia de embargo (`seizure.third_party_response`)

**Naturaleza:** `RESPONSE_EVIDENCE` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la respuesta de un banco, cliente, empleador, arrendatario u otro tercero a una diligencia de embargo.

**Por qué llega.** Se presenta para indicar si existe relación, saldo, crédito, salario, renta o bien afectable.

**Resultado.** Puede declarar saldo cero, existencia de crédito, impedimentos o retenciones; no es un pago por sí sola.

**Qué hacer.** Relaciona la respuesta con la diligencia exacta y conserva solo el rol y la respuesta tipada.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Un ingreso.; Una deuda tributaria del tercero.; Que la respuesta sea aceptada por la AEAT.; La identidad del tercero.

**Referencias:** THIRD_PARTY_RESPONSE_ID; SEIZURE_ORDER_ID; PROCEDURE_ID; EXPEDIENTE_ID; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; ACTION_DATE

**Importes:** RETAINED_AMOUNT; DOCUMENT_TOTAL

**Hechos:** THIRD_PARTY_RESPONSE; SEIZURE_RECIPIENT_ROLE; REASON

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.commercial_credits; SUCCESSOR_OF:seizure.wages_or_pensions; SUCCESSOR_OF:seizure.tpv_receipts; SUCCESSOR_OF:seizure.business_income_or_rents; PREDECESSOR_OF:seizure.third_party_payment; RELATION:RESPONDS_TO_SEIZURE

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Ingreso efectuado por receptor o tercero retenedor (`seizure.third_party_payment`)

**Naturaleza:** `PAYMENT_EVIDENCE` · **Fase:** `F1` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el justificante de que un tercero ha ingresado cantidades retenidas por una diligencia de embargo.

**Por qué llega.** Se genera al transferir al Tesoro fondos que el tercero debía retener.

**Resultado.** Debe acreditar diligencia, importe, fecha, justificante y, solo si es trazable, saldo restante.

**Qué hacer.** Relaciona el ingreso con la diligencia exacta y evita contarlo de nuevo como gasto o pago del titular.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** Que toda la deuda quede saldada.; Que el tercero sea el deudor tributario.; Que un importe retenido sea igual al ingresado si no lo acredita.

**Referencias:** PAYMENT_RECEIPT_ID; NRC; SEIZURE_ORDER_ID; THIRD_PARTY_RESPONSE_ID; DEBT_KEY; CSV

**Fechas:** PAYMENT_DATE; ISSUE_DATE

**Importes:** REMITTED_AMOUNT; PAYMENT_CONFIRMED; REMAINING_AFTER_OFFSET

**Hechos:** TRANSFER_RECEIPT; PAYMENT_RESULT; SEIZURE_RECIPIENT_ROLE

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.third_party_response; SUCCESSOR_OF:seizure.commercial_credits; SUCCESSOR_OF:seizure.wages_or_pensions; SUCCESSOR_OF:seizure.tpv_receipts; SUCCESSOR_OF:seizure.business_income_or_rents; RELATION:TRANSFERS_SEIZED_FUNDS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tipos de embargo (AEAT_SEIZURE_TYPES); Recursos contra diligencias de embargo (AEAT_SEIZURE_RESOURCES); Procedimiento de apremio (AEAT_ENFORCEMENT); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Pagar, aplazar y consultar deudas e ingresos realizados (AEAT_PAYMENT)

---

# Recursos y revisión

## Recurso de reposición (`review.recurso_reposicion`)

**Naturaleza:** `APPEAL` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un recurso administrativo ante el mismo órgano que dictó el acto.

**Por qué llega.** Se presenta para pedir que ese órgano revise un acto identificado.

**Resultado.** El recurso puede estar pendiente, estimado, parcialmente estimado, desestimado, inadmitido o archivado.

**Qué hacer.** Conserva el acto original y no marques suspensión salvo que exista un acuerdo específico.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La falta de resolución dentro del plazo legal puede permitir continuar por otras vías según el caso; no automatices esa conclusión sin regla revisada.

**No demuestra.** La suspensión del cobro.; La anulación del acto.; La presentación simultánea de reclamación económico-administrativa.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Importes:** DOCUMENT_TOTAL

**Hechos:** APPEAL_INFORMATION; FACT_OR_GROUND; DOCUMENTATION_REQUIRED; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_APPEALABLE_ACT; PREDECESSOR_OF:review.suspension_request; PREDECESSOR_OF:review.resolution; RELATION:APPEALS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Recurso de reposición (AEAT_RECONSIDERATION); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Reclamación económico-administrativa (`review.economic_administrative_claim`)

**Naturaleza:** `APPEAL` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una reclamación ante el Tribunal Económico-Administrativo competente para revisar un acto tributario.

**Por qué llega.** Se presenta cuando el interesado impugna el acto por esta vía.

**Resultado.** Puede estar pendiente o terminar estimada, parcialmente estimada, desestimada, inadmitida o archivada.

**Qué hacer.** Relaciona la reclamación con el acto y gestiona la suspensión por separado.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** La suspensión automática.; La anulación del acto.; Que el órgano que dictó el acto resuelva el fondo.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; APPEAL_DEADLINE

**Importes:** DOCUMENT_TOTAL

**Hechos:** APPEAL_INFORMATION; FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_APPEALABLE_ACT; PREDECESSOR_OF:review.suspension_request; PREDECESSOR_OF:review.resolution; RELATION:APPEALS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Reclamación económico-administrativa (AEAT_ECON_ADMIN); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Solicitud o justificante de suspensión (`review.suspension_request`)

**Naturaleza:** `APPLICATION_RECEIPT` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una solicitud para que el acto o la deuda recurridos no produzcan temporalmente determinados efectos.

**Por qué llega.** Se presenta junto a un recurso o reclamación, o dentro del procedimiento previsto.

**Resultado.** Solo prueba que se pidió la suspensión y, en su caso, que se aportó una garantía.

**Qué hacer.** Espera el acuerdo de suspensión y mantén el estado como solicitado o pendiente.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**Si no se atiende.** Mientras no exista acuerdo, el efecto de la solicitud depende de la normativa y del caso; no lo generalices.

**No demuestra.** La suspensión concedida.; La paralización de todas las actuaciones.; La aceptación de la garantía.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE

**Importes:** DOCUMENT_TOTAL; COSTS

**Hechos:** PAYMENT_SCOPE; DOCUMENT_STATUS; DOCUMENTATION_REQUIRED; REASON

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:review.recurso_reposicion; SUCCESSOR_OF:review.economic_administrative_claim; PREDECESSOR_OF:review.suspension_decision; RELATION:REQUESTS_SUSPENSION

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Suspensión del procedimiento de recaudación (AEAT_SUSPENSION); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Acuerdo sobre la suspensión solicitada (`review.suspension_decision`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la resolución que concede, deniega, condiciona, modifica o levanta una suspensión solicitada.

**Por qué llega.** Se emite al decidir la solicitud de suspensión.

**Resultado.** Debe indicar alcance, garantía, fecha de efectos y actos afectados.

**Qué hacer.** Actualiza solo los actos y deudas citados y conserva la solicitud anterior.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Una denegación o levantamiento puede permitir continuar la recaudación; una concesión puede paralizarla dentro del alcance impreso.

**No demuestra.** La resolución del recurso principal.; La suspensión de actos no citados.; Que una garantía esté ejecutada.

**Referencias:** ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** DOCUMENT_TOTAL; COSTS

**Hechos:** DOCUMENT_STATUS; PAYMENT_SCOPE; REASON; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:review.suspension_request; PREDECESSOR_OF:review.resolution; RELATION:DECIDES_SUSPENSION

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Suspensión del procedimiento de recaudación (AEAT_SUSPENSION); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Resolución de recurso o reclamación (`review.resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la decisión sobre un recurso o reclamación contra un acto anterior.

**Por qué llega.** Se emite al finalizar la revisión administrativa o económico-administrativa.

**Resultado.** Puede confirmar, anular, modificar, retrotraer, inadmitir o estimar parcialmente.

**Qué hacer.** Aplica el resultado al acto exacto sin borrarlo de la cronología y revisa la ejecución posterior.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El acto puede requerir una nueva liquidación, devolución o actuación de ejecución según el fallo.

**No demuestra.** Que todos los actos relacionados queden anulados.; Una devolución pagada.; La ejecución material del fallo.

**Referencias:** ACT_ID; PROCEDURE_ID; EXPEDIENTE_ID; LIQUIDATION_KEY; DEBT_KEY; FILING_RECEIPT_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** DOCUMENT_TOTAL; REFUND_CREDIT

**Hechos:** DOCUMENT_STATUS; REASON; FACT_OR_GROUND; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:review.recurso_reposicion; SUCCESSOR_OF:review.economic_administrative_claim; SUCCESSOR_OF:review.suspension_decision; PREDECESSOR_OF:refund.undue_payment; PREDECESSOR_OF:review.guarantee_cost_reimbursement; RELATION:DECIDES_REVIEW

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Recurso de reposición (AEAT_RECONSIDERATION); Reclamación económico-administrativa (AEAT_ECON_ADMIN); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Rectificación de error material, de hecho o aritmético (`review.material_error`)

**Naturaleza:** `APPLICATION_OR_RESOLUTION` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una vía limitada para corregir errores evidentes de escritura, hecho o cálculo, no para reabrir todo el fondo.

**Por qué llega.** Se inicia a solicitud o de oficio cuando se aprecia un error de esa naturaleza.

**Resultado.** Puede proponer la corrección y después estimarla o denegarla.

**Qué hacer.** Compara el dato anterior y el corregido y limita el cambio a los extremos expresos.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** Una revisión completa de la legalidad.; La suspensión automática.; La anulación total del acto.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Importes:** DOCUMENT_TOTAL

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_ADMINISTRATIVE_ACT; RELATION:CORRECTS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Rectificación de errores de actos de Recaudación (AEAT_MATERIAL_ERROR); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Procedimiento especial de revocación (`review.revocation`)

**Naturaleza:** `SPECIAL_REVIEW` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un procedimiento excepcional para que la Administración revoque un acto en los supuestos legalmente previstos.

**Por qué llega.** Puede iniciarse de oficio cuando concurre una causa de revocación.

**Resultado.** El acto sigue existiendo hasta que una resolución lo revoque total o parcialmente.

**Qué hacer.** Conserva la fase y no lo trates como un recurso ordinario del interesado.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** La revocación automática por una solicitud.; La suspensión del acto.; La anulación total si solo es parcial.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_ADMINISTRATIVE_ACT; RELATION:CANCELS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimientos especiales de revisión (AEAT_SPECIAL_REVIEW); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Revisión de acto nulo de pleno derecho (`review.nullity`)

**Naturaleza:** `SPECIAL_REVIEW` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un procedimiento excepcional para declarar la nulidad de un acto por causas especialmente graves.

**Por qué llega.** Se tramita de oficio o a instancia en los supuestos legales.

**Resultado.** Debe diferenciar solicitud, admisión, instrucción y resolución de nulidad o denegación.

**Qué hacer.** Relaciona el resultado con el acto concreto y conserva su historia.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** La nulidad por la mera solicitud.; La suspensión automática.; La nulidad de actos no citados.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_ADMINISTRATIVE_ACT; RELATION:CANCELS

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimientos especiales de revisión (AEAT_SPECIAL_REVIEW); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Declaración de lesividad de acto anulable (`review.lesivity`)

**Naturaleza:** `SPECIAL_REVIEW` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acto por el que la Administración declara perjudicial para el interés público un acto favorable para poder impugnarlo ante la jurisdicción competente.

**Por qué llega.** Se emite como paso previo a la impugnación judicial del acto anulable.

**Resultado.** La declaración de lesividad no anula por sí sola el acto; prepara su impugnación.

**Qué hacer.** Conserva el acto como vigente salvo resolución posterior que cambie su estado.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** La anulación del acto.; Una deuda nueva.; La suspensión automática.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Hechos:** REASON; FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:ANY_FAVORABLE_ACT; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimientos especiales de revisión (AEAT_SPECIAL_REVIEW); Ley 58/2003, General Tributaria (LGT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

## Tercería de dominio o de mejor derecho (`review.third_party_claim`)

**Naturaleza:** `THIRD_PARTY_REVIEW` · **Fase:** `F6` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una reclamación de un tercero que afirma ser dueño del bien embargado o tener mejor derecho a cobrar con su producto.

**Por qué llega.** Se presenta dentro del procedimiento de recaudación respecto de un embargo concreto.

**Resultado.** Debe distinguir tercería de dominio y de mejor derecho y su efecto procesal.

**Qué hacer.** Relaciona la tercería con el bien y la diligencia exactos sin atribuir la deuda al tercero.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**No demuestra.** Que el embargo quede levantado por la mera presentación.; Una deuda tributaria del tercero.; La estimación de la tercería.

**Referencias:** FILING_RECEIPT_ID; PROCEDURE_ID; EXPEDIENTE_ID; SEIZURE_ORDER_ID; REGISTRY_ID; CSV

**Fechas:** FILING_DATE; ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** VALUATION; CHARGES; DOCUMENT_TOTAL

**Hechos:** SEIZED_RIGHT; REASON; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; THIRD_PARTY; TAX_DEBTOR; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:seizure.movable_asset; SUCCESSOR_OF:seizure.real_estate; PREDECESSOR_OF:seizure.release; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Tercerías de dominio y de mejor derecho (AEAT_THIRD_PARTY_CLAIM); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

# Responsabilidad tributaria

## Propuesta y audiencia de declaración de responsabilidad (`liability.proposal`)

**Naturaleza:** `PROPOSAL` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es una propuesta para atribuir a una persona o entidad responsabilidad por deudas de otro obligado y abre audiencia.

**Por qué llega.** Se emite porque la AEAT considera que pueden concurrir los hechos y el fundamento legal de responsabilidad indicados.

**Resultado.** Enumera deudor principal, responsable propuesto, deudas, alcance y hechos; todavía no es el acuerdo final.

**Qué hacer.** Revisa hechos, fundamento, deudas y plazo de alegaciones manteniendo separados deudor y responsable.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si no se presentan alegaciones, la resolución puede dictarse con los datos disponibles.

**No demuestra.** Una deuda propia originaria del responsable.; Una responsabilidad definitiva.; La firmeza de las deudas derivadas.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST; SANCTION_INITIAL; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; REASON; DOCUMENTATION_REQUIRED; OBLIGATION

**Roles:** ACCOUNT_HOLDER; PRIMARY_DEBTOR; LIABLE_PARTY; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:liability.final_resolution; RELATION:PROPOSES_LIABILITY

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Declaración de responsabilidad solidaria (AEAT_LIABILITY_SOLIDARY); Declaración de responsabilidad subsidiaria (AEAT_LIABILITY_SUBSIDIARY); Recaudación frente a sucesores (AEAT_SUCCESSORS); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Acuerdo final de declaración de responsabilidad (`liability.final_resolution`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el acuerdo que declara o rechaza la responsabilidad por deudas de un deudor principal.

**Por qué llega.** Se emite al terminar el procedimiento de derivación.

**Resultado.** Debe fijar tipo, fundamento, alcance, deudas, importes, estado y plazo de pago o recurso.

**Qué hacer.** Actualiza al responsable solo por las deudas listadas y conserva separado al deudor principal.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Si el acuerdo exige pago y no se atiende o suspende, puede continuar la recaudación contra el responsable.

**No demuestra.** Que las deudas sean originariamente propias del responsable.; La presentación de modelos por el responsable.; La extinción de la deuda del principal.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; EXECUTIVE_SURCHARGE_PRINTED; LATE_PAYMENT_INTEREST; SANCTION_INITIAL; DOCUMENT_TOTAL

**Hechos:** DOCUMENT_STATUS; FACT_OR_GROUND; REASON; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; PRIMARY_DEBTOR; LIABLE_PARTY; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:liability.proposal; PREDECESSOR_OF:collection.enforcement_order; RELATION:DECLARES_LIABILITY

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Declaración de responsabilidad solidaria (AEAT_LIABILITY_SOLIDARY); Declaración de responsabilidad subsidiaria (AEAT_LIABILITY_SUBSIDIARY); Recaudación frente a sucesores (AEAT_SUCCESSORS); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Declaración de responsabilidad solidaria (`liability.solidary`)

**Naturaleza:** `PROPOSAL_OR_RESOLUTION` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un procedimiento para exigir a un responsable solidario deudas de otro obligado en los supuestos legales indicados.

**Por qué llega.** Se inicia porque la AEAT atribuye hechos que podrían justificar responsabilidad solidaria.

**Resultado.** Debe distinguir audiencia/propuesta de acuerdo final y limitarse a las deudas y hechos impresos.

**Qué hacer.** Revisa fundamento, alcance, deudor principal y fase del procedimiento.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El acuerdo final puede abrir un plazo de pago y, si no se atiende, recaudación ejecutiva.

**No demuestra.** Una deuda originaria propia.; Responsabilidad definitiva en la fase de audiencia.; Responsabilidad por deudas no listadas.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; LATE_PAYMENT_INTEREST; EXECUTIVE_SURCHARGE_PRINTED; SANCTION_INITIAL; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; REASON; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; PRIMARY_DEBTOR; LIABLE_PARTY; ISSUING_AUTHORITY

**Relaciones:** SPECIALIZATION_OF:liability.proposal; SPECIALIZATION_OF:liability.final_resolution; RELATION:DECLARES_LIABILITY

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Declaración de responsabilidad solidaria (AEAT_LIABILITY_SOLIDARY); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Declaración de responsabilidad subsidiaria (`liability.subsidiary`)

**Naturaleza:** `PROPOSAL_OR_RESOLUTION` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un procedimiento para exigir deudas a un responsable subsidiario después de los presupuestos y actuaciones previas aplicables.

**Por qué llega.** Se inicia porque la AEAT considera que concurren las condiciones de responsabilidad subsidiaria.

**Resultado.** Debe separar audiencia, declaración de fallido cuando proceda, acuerdo final y deuda derivada.

**Qué hacer.** Comprueba los actos previos, fundamento y alcance antes de atribuir importes.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El acuerdo final puede abrir pago y recaudación contra el responsable subsidiario.

**No demuestra.** Que el deudor principal sea insolvente solo por aparecer la palabra subsidiaria.; Una deuda propia originaria.; Responsabilidad definitiva en la propuesta.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; LATE_PAYMENT_INTEREST; EXECUTIVE_SURCHARGE_PRINTED; SANCTION_INITIAL; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; REASON; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; PRIMARY_DEBTOR; LIABLE_PARTY; ISSUING_AUTHORITY

**Relaciones:** SPECIALIZATION_OF:liability.proposal; SPECIALIZATION_OF:liability.final_resolution; RELATION:DECLARES_LIABILITY

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Declaración de responsabilidad subsidiaria (AEAT_LIABILITY_SUBSIDIARY); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

## Recaudación frente a sucesores (`liability.successors`)

**Naturaleza:** `COLLECTION_ACT` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la continuación de la recaudación frente a un sucesor por obligaciones de una persona o entidad anterior.

**Por qué llega.** Se emite por fallecimiento, extinción, transformación u otro supuesto sucesorio indicado.

**Resultado.** Debe identificar causante o entidad originaria, sucesor, deudas, alcance y estado.

**Qué hacer.** Separa obligaciones originarias y posición sucesoria; no atribuyas al sucesor la presentación original de modelos.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Las deudas incluidas pueden continuar su recaudación frente al sucesor en el alcance legal y documental.

**No demuestra.** Una deuda generada personalmente por el sucesor.; La aceptación de herencia o sucesión si no consta.; Deudas no listadas.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; DEBT_KEY; LIQUIDATION_KEY; CSV

**Fechas:** ISSUE_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** OUTSTANDING_PRINCIPAL; LATE_PAYMENT_INTEREST; EXECUTIVE_SURCHARGE_PRINTED; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; REASON; DOCUMENT_STATUS; APPEAL_INFORMATION

**Roles:** ACCOUNT_HOLDER; PRIMARY_DEBTOR; SUCCESSOR; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:collection.enforcement_order; RELATION:CONTINUES_AGAINST_SUCCESSOR

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Recaudación frente a sucesores (AEAT_SUCCESSORS); Ley 58/2003, General Tributaria (LGT); Real Decreto 939/2005, Reglamento General de Recaudación (RGR)

---

# Inspección

## Procedimiento inspector (`inspection.procedure`)

**Naturaleza:** `PROCEDURE_CONTAINER` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es el expediente general de comprobación e investigación inspectora sobre uno o varios impuestos y períodos.

**Por qué llega.** Se inicia porque la Inspección abre actuaciones con un alcance determinado.

**Resultado.** Contiene comunicaciones, diligencias, actas y liquidaciones; no debe convertirse todo el expediente en una única deuda.

**Qué hacer.** Organiza por impuesto, período, actuación y resultado, conservando cada acto por separado.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La falta de colaboración puede generar consecuencias específicas, pero cada una necesita su acto correspondiente.

**No demuestra.** Una deuda definitiva.; Una sanción.; Que todos los impuestos del titular estén inspeccionados.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE; START_DATE; END_DATE

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS; DOCUMENTATION_REQUIRED; OBLIGATION

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** PREDECESSOR_OF:inspection.communication; PREDECESSOR_OF:inspection.diligence; PREDECESSOR_OF:inspection.act_agreement; PREDECESSOR_OF:inspection.act_conformity; PREDECESSOR_OF:inspection.act_disagreement; PREDECESSOR_OF:inspection.assessment; RELATION:CONTINUES

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Comunicación de inicio, alcance o ampliación inspectora (`inspection.communication`)

**Naturaleza:** `PROCEDURE_START` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la comunicación que inicia, concreta o amplía el alcance de unas actuaciones inspectoras.

**Por qué llega.** Se emite para informar de los impuestos, períodos, alcance y primeras actuaciones.

**Resultado.** Define qué se revisa y desde cuándo; no determina todavía un resultado tributario.

**Qué hacer.** Revisa alcance, lugar, fecha, documentación y obligaciones de comparecencia.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** No atender una citación o requerimiento puede producir consecuencias separadas según el acto posterior.

**No demuestra.** Una liquidación.; Una sanción.; La ampliación a conceptos no impresos.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Hechos:** FACT_OR_GROUND; DOCUMENTATION_REQUIRED; OBLIGATION; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:inspection.procedure; PREDECESSOR_OF:inspection.diligence; PREDECESSOR_OF:inspection.act_agreement; PREDECESSOR_OF:inspection.act_conformity; PREDECESSOR_OF:inspection.act_disagreement; RELATION:INITIATES_INSPECTION

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Diligencia de actuaciones inspectoras (`inspection.diligence`)

**Naturaleza:** `PROCEDURAL_RECORD` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acta de constancia de hechos, manifestaciones, comparecencias o documentación durante la inspección.

**Por qué llega.** Se emite para documentar una actuación concreta del procedimiento.

**Resultado.** Registra lo ocurrido, pero no suele ser por sí sola la liquidación ni la sanción final.

**Qué hacer.** Comprueba fecha, asistentes por rol, documentos aportados y hechos expresamente consignados.

**Plazo.** Este documento no crea por sí solo un plazo operativo. No muestres un vencimiento salvo que el propio documento imprima una fecha o una regla aplicable.

**No demuestra.** La conformidad del titular con una liquidación.; Una deuda.; Una sanción.; La veracidad definitiva de toda manifestación.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; CSV

**Fechas:** ISSUE_DATE; ACTION_DATE; SIGNING_DATE

**Hechos:** FACT_OR_GROUND; DOCUMENTATION_REQUIRED; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; REPRESENTATIVE; ISSUING_AUTHORITY; THIRD_PARTY

**Relaciones:** SUCCESSOR_OF:inspection.communication; PREDECESSOR_OF:inspection.act_agreement; PREDECESSOR_OF:inspection.act_conformity; PREDECESSOR_OF:inspection.act_disagreement; RELATION:RECORDS_INSPECTION

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acta con acuerdo (`inspection.act_agreement`)

**Naturaleza:** `INSPECTION_ACT` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acta inspectora con acuerdo sobre determinados hechos, valoración o aplicación de la norma en los términos legales.

**Por qué llega.** Se formaliza cuando la Administración y el obligado alcanzan el acuerdo previsto para esa modalidad.

**Resultado.** Propone el resultado y sigue el régimen temporal propio del acta con acuerdo.

**Qué hacer.** Revisa bases, cuota, intereses, garantías, reducciones y fecha de efectos.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** El acta puede convertirse en liquidación en el plazo y condiciones previstos; no anticipes el estado antes de que corresponda.

**No demuestra.** Una sanción separada salvo que se incluya expresamente.; Un pago.; La extensión del acuerdo a períodos no listados.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** PROPOSED_QUOTA; FINAL_QUOTA; LATE_PAYMENT_INTEREST; SANCTION_INITIAL; SANCTION_REDUCTION; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS; PAYMENT_SCOPE

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:inspection.communication; SUCCESSOR_OF:inspection.diligence; PREDECESSOR_OF:inspection.assessment; RELATION:PROPOSES_INSPECTION_RESULT

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acta de conformidad (`inspection.act_conformity`)

**Naturaleza:** `INSPECTION_ACT` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acta en la que el obligado manifiesta conformidad con la propuesta inspectora.

**Por qué llega.** Se formaliza después de las actuaciones cuando existe conformidad con la regularización propuesta.

**Resultado.** Propone cuota e intereses y puede producir una liquidación conforme al régimen temporal aplicable.

**Qué hacer.** Revisa la fecha de firma, importes y si existe liquidación expresa posterior.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La falta de actuación expresa dentro del período previsto puede producir el efecto legal del acta; el motor debe usar una regla revisada y fechas exactas.

**No demuestra.** Un pago.; Una sanción automáticamente incluida.; La firmeza inmediata si falta la fecha necesaria.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; ACTION_DATE; EFFECTIVE_NOTIFICATION_DATE

**Importes:** PROPOSED_QUOTA; FINAL_QUOTA; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:inspection.communication; SUCCESSOR_OF:inspection.diligence; PREDECESSOR_OF:inspection.assessment; RELATION:PROPOSES_INSPECTION_RESULT

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acta de disconformidad (`inspection.act_disagreement`)

**Naturaleza:** `INSPECTION_ACT` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es un acta en la que el obligado no presta conformidad con la propuesta inspectora.

**Por qué llega.** Se formaliza cuando existen discrepancias sobre hechos o regularización.

**Resultado.** Contiene propuesta y alegaciones o informe complementario; necesita una liquidación expresa posterior.

**Qué hacer.** Revisa motivos de disconformidad, bases, importes y trámite de alegaciones.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** La Inspección dictará la liquidación que corresponda después de tramitar las alegaciones.

**No demuestra.** Una liquidación final.; Un pago exigible por el acta sola.; Una sanción.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; RESPONSE_DEADLINE

**Importes:** PROPOSED_QUOTA; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS; DOCUMENTATION_REQUIRED

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:inspection.communication; SUCCESSOR_OF:inspection.diligence; PREDECESSOR_OF:inspection.assessment; RELATION:PROPOSES_INSPECTION_RESULT

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT)

---

## Acuerdo o liquidación derivada de inspección (`inspection.assessment`)

**Naturaleza:** `RESOLUTION` · **Fase:** `F7` · **Prioridad:** `P1` · **Cobertura:** `OFFICIAL_ONLY`

**Qué es.** Es la resolución que fija el resultado tributario derivado de las actuaciones inspectoras.

**Por qué llega.** Se emite para aprobar, modificar o resolver la propuesta contenida en el acta.

**Resultado.** Determina cuota, intereses, resultado y vías de revisión para cada impuesto y período.

**Qué hacer.** Relaciona la liquidación con el acta exacta y crea deudas separadas por concepto o período cuando proceda.

**Plazo.** El plazo empieza desde la recepción o notificación efectiva indicada, no desde la firma ni desde el escaneo. Falta la fecha de recepción o notificación efectiva; no calcules el último día.

**Si no se atiende.** Los importes a ingresar pueden pasar a recaudación si no se pagan, aplazan, compensan o suspenden.

**No demuestra.** Una sanción, salvo procedimiento sancionador separado.; Un pago.; La deuda agregada de toda la inspección si existen varias liquidaciones.

**Referencias:** PROCEDURE_ID; EXPEDIENTE_ID; ACT_ID; LIQUIDATION_KEY; DEBT_KEY; MODEL; FISCAL_YEAR; TAX_PERIOD; CSV

**Fechas:** ISSUE_DATE; SIGNING_DATE; EFFECTIVE_NOTIFICATION_DATE; VOLUNTARY_PAYMENT_DEADLINE; APPEAL_DEADLINE

**Importes:** FINAL_QUOTA; LATE_PAYMENT_INTEREST; DOCUMENT_TOTAL; OUTSTANDING_PRINCIPAL

**Hechos:** FACT_OR_GROUND; DOCUMENT_STATUS; APPEAL_INFORMATION; PAYMENT_MEDIUM

**Roles:** ACCOUNT_HOLDER; ISSUING_AUTHORITY

**Relaciones:** SUCCESSOR_OF:inspection.act_agreement; SUCCESSOR_OF:inspection.act_conformity; SUCCESSOR_OF:inspection.act_disagreement; PREDECESSOR_OF:payment.payment_form; PREDECESSOR_OF:collection.enforcement_order; RELATION:ASSESSES_FROM_INSPECTION

**Fuentes:** El propio documento analizado (DOC_PRIMARY); Procedimiento inspector de comprobación e investigación (AEAT_INSPECTION); Ley 58/2003, General Tributaria (LGT); Real Decreto 1065/2007, gestión e inspección tributaria (RGAT); Real Decreto 520/2005, revisión en vía administrativa (RGREV)

---

# 6. Fuentes oficiales

- **DOC_PRIMARY:** El propio documento analizado.
- **LGT:** Ley 58/2003, General Tributaria — https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186
- **RGR:** Real Decreto 939/2005, Reglamento General de Recaudación — https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803
- **RGAT:** Real Decreto 1065/2007, gestión e inspección tributaria — https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984
- **RGREV:** Real Decreto 520/2005, revisión en vía administrativa — https://www.boe.es/buscar/act.php?id=BOE-A-2005-8662
- **SANCTION_REG:** Real Decreto 2063/2004, régimen sancionador tributario — https://www.boe.es/buscar/act.php?id=BOE-A-2004-18398
- **LPAC:** Ley 39/2015, Procedimiento Administrativo Común — https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565
- **IRPF_LAW:** Ley 35/2006, del IRPF — https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764
- **IRPF_REG:** Real Decreto 439/2007, Reglamento del IRPF — https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820
- **AEAT_NOTIFICATIONS:** Notificaciones y comunicaciones de la AEAT — https://sede.agenciatributaria.gob.es/Sede/notificaciones.html
- **AEAT_RENTA:** Campaña de Renta y consulta de datos fiscales — https://sede.agenciatributaria.gob.es/Sede/Renta.html
- **CLAVE_REGISTRATION:** Registro en Cl@ve — https://clave.gob.es/clave_Home/registro.html
- **AEAT_CERTIFICATE_COMPLIANCE:** Certificados tributarios: estar al corriente — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml
- **AEAT_CENSUS_RECTIFICATION:** Rectificación censal — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC25.shtml
- **AEAT_TAX_DOMICILE:** Comprobación del domicilio fiscal — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G300.shtml
- **AEAT_NIF_REVOCATION:** Revocación del NIF — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ76.shtml
- **AEAT_NIF_REHABILITATION:** Rehabilitación del NIF — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ77.shtml
- **AEAT_OMITTED_RETURNS:** Requerimiento por declaraciones o autoliquidaciones no presentadas — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G223.shtml
- **AEAT_INFORMATION_REQUEST:** Requerimiento de información de Recaudación — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA10.shtml
- **AEAT_IRPF_CHECK:** IRPF: verificación de datos y comprobación limitada — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml
- **AEAT_VAT_CHECK:** IVA: verificación de datos y comprobación limitada — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G202.shtml
- **AEAT_VALUE_CHECK:** Comprobación administrativa de valores — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ22.shtml
- **AEAT_SANCTION:** Procedimiento sancionador general de Gestión Tributaria — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ69.shtml
- **AEAT_DEFERRAL:** Aplazamiento y fraccionamiento de deudas — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RB01.shtml
- **AEAT_OFFSET_REQUESTED:** Compensación a instancia del obligado — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC01.shtml
- **AEAT_OFFSET_EX_OFFICIO:** Compensación de oficio — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC02.shtml
- **AEAT_INTEREST_ASSESSMENT:** Liquidación de intereses de demora de Gestión Tributaria — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ88.shtml
- **AEAT_ENFORCEMENT:** Procedimiento de apremio — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml
- **AEAT_PRECAUTIONARY:** Recaudación: medidas cautelares — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA09.shtml
- **AEAT_AUCTION:** Enajenación de bienes mediante subasta — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RF02.shtml
- **AEAT_PAYMENT:** Pagar, aplazar y consultar deudas e ingresos realizados — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/pagar-aplazar-consultar/que-puedo-pagar-aplazar-consultar.html
- **AEAT_NRC:** Pago y justificante NRC — https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/pago-autoliquidaciones-tarjeta.html
- **AEAT_REFUND_UNDUE:** Devolución de ingresos indebidos — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA03.shtml
- **AEAT_REFUND_TAX:** Devolución derivada de la normativa del tributo — https://sede.agenciatributaria.gob.es/Sede/procedimientos/G220.shtml
- **AEAT_GUARANTEE_COST:** Reembolso del coste de garantías — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA04.shtml
- **AEAT_SPOUSE_SUSPENSION:** Suspensión de ingreso de deuda IRPF mediante devolución del cónyuge — https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c01-campana-declaracion-renta/pago-deuda-tributaria-irpf/procedimiento-suspension-ingreso-deuda-tributaria.html
- **AEAT_RECONSIDERATION:** Recurso de reposición — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ52.shtml
- **AEAT_ECON_ADMIN:** Reclamación económico-administrativa — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ53.shtml
- **AEAT_SUSPENSION:** Suspensión del procedimiento de recaudación — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA02.shtml
- **AEAT_MATERIAL_ERROR:** Rectificación de errores de actos de Recaudación — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RH10.shtml
- **AEAT_SPECIAL_REVIEW:** Procedimientos especiales de revisión — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/recursos/procedimientos-especiales-revision.html
- **AEAT_THIRD_PARTY_CLAIM:** Tercerías de dominio y de mejor derecho — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/recursos/terceria.html
- **AEAT_LIABILITY_SOLIDARY:** Declaración de responsabilidad solidaria — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG01.shtml
- **AEAT_LIABILITY_SUBSIDIARY:** Declaración de responsabilidad subsidiaria — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG02.shtml
- **AEAT_SUCCESSORS:** Recaudación frente a sucesores — https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG03.shtml
- **AEAT_INSPECTION:** Procedimiento inspector de comprobación e investigación — https://sede.agenciatributaria.gob.es/Sede/procedimientos/IZ01.shtml
- **AEAT_SEIZURE_TYPES:** Tipos de embargo — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/tipos-embargo.html
- **AEAT_SEIZURE_RESOURCES:** Recursos contra diligencias de embargo — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/recursos.html
- **AEAT_EXTERNAL_DEBT:** Deudas de otros organismos recaudadas por la AEAT — https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/apremios/deudas-externas.html
- **AEAT_LATE_SURCHARGE:** Liquidación de recargos por presentación fuera de plazo — https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ71.shtml

# 7. Aprendizajes transversales del corpus real, ya anonimizados

- **MULTIPART_PDF:** Un PDF puede contener carátula, acto principal, anexos, instrucciones, carta de pago y copias. Debe segmentarse en partes lógicas y deduplicar copias.
- **BASE_REFERENCE_WITH_INSTALLMENT_SUFFIX:** Varias cuotas pueden compartir una referencia base y diferenciarse por secuencia o vencimiento. Cada cuota debe mantenerse independiente.
- **PROPOSAL_NOT_FINAL:** Las propuestas de liquidación incluyen cálculos y formularios de alegaciones, pero no crean deuda definitiva.
- **FINAL_ASSESSMENT_NOT_PAYMENT:** La liquidación final fija cuota e intereses, pero necesita carta de pago o evidencia posterior para acreditar ingreso.
- **SANCTION_SEPARATE_FROM_TAX:** La sanción y la cuota regularizada son procedimientos y componentes distintos; la pérdida de reducción crea un importe vinculado adicional.
- **DEFERRAL_SCHEDULE:** Los acuerdos de aplazamiento contienen varias cuotas con principal, interés y vencimiento; una cuota no prueba pago ni todo incumplimiento acelera necesariamente el saldo.
- **INTEREST_CITES_ORIGIN:** La liquidación de intereses puede citar simultáneamente acuerdo de aplazamiento y liquidación de origen; ambas referencias deben conservarse.
- **OFFSET_ROW_LEVEL_EFFECTS:** Un acuerdo de compensación puede extinguir unas cuotas totalmente y otras parcialmente; efectos y saldos se interpretan fila a fila.
- **REFUND_RESIDUAL:** El crédito no consumido puede calcularse con cifras impresas, pero solo una comunicación posterior confirma su orden o pago.
- **THIRD_PARTY_NOT_TAX_DEBTOR:** En embargos de créditos, sueldos, rentas o TPV, el destinatario puede ser un tercero obligado a responder y retener, no el deudor tributario.
- **SEIZURE_ORDER_RETENTION_PAYMENT:** Orden de embargo, importe retenido e ingreso al Tesoro son estados diferentes y requieren evidencias distintas.
- **RELEASE_NOT_PAYMENT:** El levantamiento cierra o reduce una medida concreta, pero no prueba por sí solo la extinción de la deuda.
- **PUBLICATION_DATE:** La fecha de publicación no sustituye automáticamente a la fecha efectiva; algunos certificados posteriores imprimen expresamente cuándo se produjo la notificación.
- **TAX_DATA_INFORMATIONAL:** Los datos fiscales son una fotografía informativa, pueden ser conjuntos y contener información de terceros; no prueban presentación, deuda ni exactitud definitiva.
- **DUPLICATE_REAL_FILES:** Pueden existir copias idénticas o exportaciones repetidas. El SHA-256 evita duplicar documentos, pero las relaciones semánticas usan referencias oficiales.

La especificación JSON adjunta es la fuente de verdad para generación de código, pruebas y validadores.