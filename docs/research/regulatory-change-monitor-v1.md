# REGULATORY_CHANGE_MONITOR_V1 — Vigilancia normativa y técnica para Factura Autónomo

> Documento de investigación futura. No implica implementación inmediata ni
> compromiso comercial. Cualquier desarrollo derivado deberá validarse con
> revisión técnica, revisión legal/fiscal cuando aplique, fuentes oficiales,
> controles de seguridad internos y respeto a la integridad documental de
> Factura Autónomo.

## 1. Estado del documento

**Proyecto:** Factura Autónomo
**Tipo:** Documento técnico de investigación y propuesta futura
**Nombre interno sugerido:** `REGULATORY_CHANGE_MONITOR_V1`
**Nombre alternativo:** `LEGAL_TECH_WATCH_V1`
**Área relacionada:** Backoffice interno / Administración del software
**Prioridad:** Futura estratégica
**Estado:** Propuesta documental, no implementar todavía
**Uso previsto:** Herramienta interna del equipo, no función visible para clientes finales

---

## 2. Resumen ejecutivo

Factura Autónomo, como software de facturación para autónomos y pequeñas empresas en España, debe adaptarse continuamente a cambios legales, fiscales, técnicos y administrativos publicados por organismos oficiales.

Estos cambios pueden afectar a:

* VERI*FACTU;
* Sistemas Informáticos de Facturación;
* modelos tributarios;
* IVA;
* IRPF;
* libros registro;
* factura electrónica;
* esquemas XML;
* WSDL;
* validaciones técnicas;
* códigos de error;
* certificados;
* servicios web;
* Seguridad Social;
* notificaciones administrativas;
* protección de datos;
* IA;
* ciberseguridad.

La propuesta consiste en crear en el futuro un sistema interno de vigilancia normativa y técnica que recopile fuentes oficiales, detecte cambios, genere evidencia, clasifique impacto y cree tareas internas de revisión.

No debe implementar cambios legales automáticamente. La IA puede ayudar a detectar, resumir y clasificar, pero la decisión final debe ser humana.

---

## 3. Problema que resuelve

Un software de facturación puede quedarse obsoleto si no detecta a tiempo:

* una nueva obligación legal;
* una fecha de entrada en vigor;
* un cambio en los servicios web de AEAT;
* una nueva validación técnica;
* un cambio de formato XML;
* una actualización de modelos tributarios;
* una nueva interpretación oficial;
* una modificación de libros registro;
* un cambio de criterio en certificados o firma;
* una guía de protección de datos que afecte a IA, OCR o documentos sensibles.

El riesgo no es solo técnico. También puede ser comercial, legal, reputacional y de soporte.

Ejemplos de consecuencias:

* facturas generadas con formato incorrecto;
* rechazo de registros por AEAT;
* clientes confundidos por mensajes obsoletos;
* necesidad de correcciones urgentes;
* deuda técnica acumulada;
* incumplimiento de plazos;
* pérdida de confianza.

---

## 4. Objetivo

Crear una herramienta interna que permita:

1. Vigilar fuentes oficiales.
2. Detectar cambios normativos o técnicos.
3. Guardar evidencia del cambio.
4. Comparar versiones.
5. Clasificar impacto.
6. Identificar módulos afectados.
7. Generar issues internos.
8. Priorizar acciones.
9. Mantener trazabilidad.
10. Evitar que Factura Autónomo quede obsoleta.

---

## 5. Fuentes oficiales a monitorizar

### 5.1 BOE

Fuentes objetivo:

* BOE diario;
* legislación consolidada;
* alertas Mi BOE;
* API de datos abiertos;
* RSS si aplica;
* normas relacionadas con facturación, fiscalidad, autónomos, factura electrónica, IVA, IRPF, software de facturación y administración electrónica.

Palabras clave iniciales:

* factura;
* facturación;
* factura electrónica;
* sistemas informáticos de facturación;
* VeriFactu;
* VERI*FACTU;
* IVA;
* IRPF;
* autónomos;
* trabajadores autónomos;
* libros registro;
* Agencia Tributaria;
* Hacienda;
* sede electrónica;
* notificaciones electrónicas;
* software de facturación.

### 5.2 AEAT / Agencia Tributaria

Fuentes objetivo:

* RSS de novedades AEAT;
* todas las novedades;
* páginas de Sistemas Informáticos de Facturación;
* información técnica VERI*FACTU;
* portal de pruebas;
* diseños de registro;
* WSDL;
* esquemas XML;
* documentos de validaciones y errores;
* algoritmos de hash;
* especificaciones de firma;
* FAQs;
* manuales técnicos;
* avisos para desarrolladores.

Áreas a vigilar:

* cambios en XML;
* cambios en WSDL;
* nuevos códigos de error;
* cambios en validaciones;
* cambios en QR;
* cambios en firma;
* cambios en fechas obligatorias;
* cambios en entorno de pruebas;
* cambios en documentación de remisión;
* cambios en modelos tributarios.

### 5.3 Seguridad Social / TGSS

Fuentes objetivo:

* RSS Seguridad Social;
* Boletines de Noticias RED;
* Avisos RED;
* Sistema RED;
* SILTRA;
* FIE;
* novedades legislativas;
* comunicaciones sobre autónomos;
* cambios RETA;
* bases de cotización;
* regularizaciones;
* notificaciones electrónicas.

Impacto probable:

* módulo futuro de notificaciones administrativas;
* posibles resúmenes para autónomos;
* cambios relevantes para cuotas;
* obligaciones futuras si la app se amplía a gestión laboral o asesoría.

### 5.4 AEPD / Protección de datos

Fuentes objetivo:

* guías de privacidad desde el diseño;
* guías sobre IA;
* guías sobre tratamientos de datos personales;
* notas técnicas;
* recomendaciones de seguridad;
* documentación sobre privacidad y desarrollo de software.

Impacto probable:

* OCR;
* IA;
* importadores;
* adjuntos;
* documentos fiscales;
* notificaciones administrativas;
* logs;
* auditoría;
* retención de documentos;
* cifrado;
* tratamiento de datos sensibles.

### 5.5 INCIBE / CCN-CERT / Seguridad

Fuentes objetivo:

* avisos de seguridad;
* vulnerabilidades;
* recomendaciones SaaS;
* certificados;
* phishing;
* identidad digital;
* ciberseguridad para empresas.

Impacto probable:

* autenticación;
* certificados;
* gestión de secretos;
* documentos sensibles;
* alertas de phishing;
* seguridad del backoffice.

### 5.6 Otras fuentes futuras

* Ministerio de Hacienda;
* Ministerio de Transformación Digital;
* Red.es;
* Portal de Administración Electrónica;
* DEHú;
* datos.gob.es;
* DOUE si afecta a factura electrónica europea o IVA UE;
* DGT/TEAC si se amplía a doctrina tributaria.

---

## 6. Arquitectura conceptual

Flujo propuesto:

```text
Fuentes oficiales
→ recolector
→ normalizador
→ detector de cambios
→ almacenamiento de evidencias
→ clasificador de impacto
→ resumen IA
→ revisión humana
→ issue interno
→ planificación técnica
→ implementación
→ validación
→ release
→ cierre con evidencia
```

El sistema no debe saltar de “cambio detectado” a “código modificado”. Debe existir revisión humana obligatoria.

---

## 7. Componentes funcionales

### 7.1 Source Registry

Registro de fuentes oficiales.

Campos sugeridos:

* nombre;
* organismo;
* URL;
* tipo de fuente;
* frecuencia de revisión;
* área afectada;
* prioridad;
* propietario interno;
* estado activo/inactivo;
* última revisión;
* último cambio detectado.

Tipos de fuente:

* RSS;
* API;
* HTML;
* PDF;
* XML;
* WSDL;
* ZIP;
* boletín;
* página técnica;
* norma legal;
* guía.

### 7.2 Fetcher

Componente que descarga o consulta fuentes.

Debe:

* respetar robots y límites razonables;
* usar fuentes oficiales;
* guardar fecha de consulta;
* guardar hash;
* guardar tamaño;
* detectar errores;
* no depender de scraping agresivo si existe RSS/API;
* no usar credenciales privadas.

### 7.3 Change Detector

Compara estado actual contra versión anterior.

Debe detectar:

* nueva publicación;
* cambio de contenido;
* cambio de PDF;
* cambio de WSDL;
* cambio de XML/XSD;
* cambio de fecha;
* cambio de título;
* cambio de texto técnico;
* eliminación o sustitución de documento.

### 7.4 Evidence Store

Almacén interno de evidencias.

Debe guardar:

* fuente;
* URL;
* fecha de publicación si existe;
* fecha de detección;
* hash anterior;
* hash nuevo;
* diff;
* copia o referencia archivada;
* metadatos;
* clasificación;
* decisión humana;
* issue vinculado.

### 7.5 Classifier

Clasifica el impacto.

Niveles sugeridos:

| Nivel   | Significado                                                          |
| ------- | -------------------------------------------------------------------- |
| Info    | Cambio informativo sin acción inmediata                              |
| Bajo    | Conviene revisar, pero no afecta al producto                         |
| Medio   | Puede afectar documentación, UI o soporte                            |
| Alto    | Puede afectar lógica fiscal, modelos, validaciones o compliance      |
| Crítico | Puede romper cumplimiento, remisión, XML, firma, plazos o producción |

### 7.6 AI Summary

La IA puede generar:

* resumen claro;
* áreas afectadas;
* posibles módulos implicados;
* riesgos;
* preguntas para revisión humana;
* checklist de validación;
* propuesta de issue.

Debe marcar incertidumbre y nunca tomar decisiones legales.

### 7.7 Human Review

Un responsable interno debe decidir:

* ignorar;
* monitorizar;
* abrir issue;
* pedir revisión legal/fiscal;
* pedir revisión técnica;
* abrir PR documental;
* abrir PR funcional;
* actualizar tests;
* actualizar compliance.

### 7.8 Issue Generator

Debe crear una tarea interna con:

* título;
* fuente oficial;
* resumen;
* impacto;
* módulos afectados;
* fecha límite;
* evidencia;
* checklist;
* propietario;
* prioridad;
* estado.

Estados sugeridos:

* detected;
* triage;
* needs legal review;
* needs technical review;
* accepted;
* in progress;
* implemented;
* validated;
* released;
* archived;
* dismissed.

---

## 8. Categorías de impacto

### 8.1 VERI*FACTU / SIF

Impacto crítico si cambia:

* XML;
* WSDL;
* validaciones;
* errores;
* hash;
* firma;
* QR;
* servicios web;
* portal de pruebas;
* fechas de obligación;
* requisitos del sistema informático de facturación.

### 8.2 Factura electrónica

Impacto alto/crítico si cambia:

* formatos;
* obligatoriedad;
* plazos;
* destinatarios;
* plataformas;
* Facturae;
* B2B;
* B2G;
* requisitos de conservación.

### 8.3 Modelos tributarios

Impacto alto si cambia:

* IVA;
* IRPF;
* modelo 303;
* modelo 130;
* modelo 111;
* modelo 190;
* libros registro;
* retenciones;
* recargo de equivalencia;
* regímenes especiales.

### 8.4 Seguridad Social

Impacto medio/alto si cambia:

* RETA;
* bases de cotización;
* regularización;
* notificaciones;
* Sistema RED;
* SILTRA;
* boletines RED;
* obligaciones para autónomos.

### 8.5 Privacidad e IA

Impacto alto si afecta a:

* OCR;
* IA;
* adjuntos;
* documentos administrativos;
* retención;
* logs;
* cifrado;
* minimización;
* derechos del usuario;
* tratamiento de datos sensibles.

---

## 9. Modelo conceptual de datos

### 9.1 `regulatory_sources`

| Campo           | Descripción                            |
| --------------- | -------------------------------------- |
| id              | Identificador                          |
| name            | Nombre de fuente                       |
| authority       | BOE, AEAT, TGSS, AEPD, etc.            |
| source_type     | RSS, API, HTML, PDF, XML, WSDL         |
| url             | URL oficial                            |
| category        | Fiscal, técnico, privacidad, seguridad |
| priority        | Baja, media, alta, crítica             |
| active          | Activa/inactiva                        |
| check_frequency | Diario, semanal, mensual               |
| last_checked_at | Última revisión                        |
| last_changed_at | Último cambio detectado                |

### 9.2 `regulatory_snapshots`

| Campo        | Descripción                   |
| ------------ | ----------------------------- |
| id           | Identificador                 |
| source_id    | Fuente                        |
| fetched_at   | Fecha de descarga             |
| content_hash | Hash del contenido            |
| content_type | Tipo                          |
| content_size | Tamaño                        |
| storage_ref  | Referencia a copia archivada  |
| status       | OK, error, unchanged, changed |

### 9.3 `regulatory_changes`

| Campo                 | Descripción                                        |
| --------------------- | -------------------------------------------------- |
| id                    | Identificador                                      |
| source_id             | Fuente                                             |
| previous_snapshot_id  | Versión anterior                                   |
| new_snapshot_id       | Nueva versión                                      |
| detected_at           | Fecha de detección                                 |
| published_at          | Fecha publicación si existe                        |
| title                 | Título                                             |
| summary               | Resumen                                            |
| diff_summary          | Resumen de cambios                                 |
| impact_level          | Info, bajo, medio, alto, crítico                   |
| affected_modules      | Módulos afectados                                  |
| requires_human_review | Sí/no                                              |
| status                | detected, triage, accepted, dismissed, implemented |

### 9.4 `regulatory_change_reviews`

| Campo       | Descripción                             |
| ----------- | --------------------------------------- |
| id          | Identificador                           |
| change_id   | Cambio                                  |
| reviewer_id | Revisor                                 |
| decision    | Ignorar, vigilar, issue, legal, técnico |
| notes       | Comentarios                             |
| created_at  | Fecha                                   |

### 9.5 `regulatory_change_issues`

| Campo              | Descripción                |
| ------------------ | -------------------------- |
| id                 | Identificador              |
| change_id          | Cambio                     |
| external_issue_url | GitHub/Jira/etc.           |
| status             | Abierto, en curso, cerrado |
| priority           | Prioridad                  |
| owner              | Responsable                |
| created_at         | Fecha                      |

---

## 10. Integración con backoffice interno

Sí, Factura Autónomo debería tener una sección interna de administración.

Nombre sugerido:

`ADMIN_CONSOLE_V1`

o:

`INTERNAL_OPERATIONS_BACKOFFICE_V1`

Esta sección no debe ser visible para clientes finales. Debe estar protegida por roles internos y auditoría.

---

# ADMIN_CONSOLE_V1 — Backoffice interno de Factura Autónomo

## 11. Objetivo del backoffice

Crear una zona interna para operar el software desde detrás, con seguridad y trazabilidad.

Debe permitir gestionar:

* vigilancia normativa;
* evidencias oficiales;
* compliance;
* salud del sistema;
* releases;
* migraciones;
* staging;
* incidencias;
* auditoría;
* usuarios de soporte;
* planes y permisos, con límites;
* jobs;
* alertas internas.

No debe ser una herramienta para modificar datos fiscales de clientes sin controles extremos.

---

## 12. Módulos del backoffice

### 12.1 Regulatory Watch

Panel de vigilancia normativa.

Funciones:

* ver fuentes monitorizadas;
* ver cambios detectados;
* filtrar por impacto;
* abrir issue;
* marcar como revisado;
* adjuntar evidencia;
* generar resumen;
* vincular a PR o release.

### 12.2 Compliance Evidence

Panel de evidencias de cumplimiento.

Funciones:

* ver documentos de compliance;
* ver hitos de proyecto;
* ver validaciones;
* vincular PRs;
* vincular fuentes oficiales;
* marcar estado:

  * pendiente;
  * en revisión;
  * aceptado;
  * obsoleto.

### 12.3 Migration & Staging Control

Panel de migraciones y staging.

Funciones:

* listar migraciones;
* listar rollbacks manuales;
* ver checks;
* ver estado local/staging/producción;
* registrar baseline;
* registrar autorización manual.

Prohibición inicial:

* no ejecutar migraciones productivas desde el backoffice en V1.

### 12.4 System Health

Panel de salud.

Funciones:

* estado de jobs;
* errores recientes;
* colas;
* envíos pendientes;
* fallos de IA/OCR si aplica;
* fallos de importadores;
* tiempos de respuesta;
* almacenamiento;
* límites de planes.

### 12.5 Audit Log

Panel de auditoría.

Debe registrar:

* accesos internos;
* cambios de configuración;
* revisiones de compliance;
* cambios de estado;
* consultas sensibles;
* acciones de soporte;
* generación de informes;
* descargas internas;
* errores críticos.

### 12.6 Support Console

Panel de soporte.

Funciones muy limitadas:

* buscar usuario por email/id;
* ver estado de cuenta;
* ver plan;
* ver métricas no sensibles;
* ver errores técnicos asociados;
* no ver facturas, documentos, XML o datos fiscales completos salvo permiso excepcional.

### 12.7 Release Control

Panel de releases.

Funciones:

* ver versión actual;
* ver PRs incluidos;
* ver checks;
* ver migraciones pendientes;
* ver notas de release;
* ver cambios legales asociados;
* marcar release como:

  * planned;
  * staging;
  * ready;
  * released;
  * rollback needed.

---

## 13. Roles internos

Roles sugeridos:

| Rol                 | Acceso                                                 |
| ------------------- | ------------------------------------------------------ |
| owner               | Acceso completo interno                                |
| admin               | Operación general                                      |
| compliance_reviewer | Legal/compliance/evidencias                            |
| technical_reviewer  | Migraciones, checks, staging                           |
| support_agent       | Soporte limitado                                       |
| readonly_auditor    | Solo lectura de auditoría                              |
| developer           | Logs técnicos y releases, sin datos fiscales sensibles |

Regla clave:

> Ningún rol interno debe tener acceso libre a documentos fiscales completos de usuarios sin justificación, permiso y auditoría.

---

## 14. Seguridad del backoffice

### 14.1 Acceso

Requisitos mínimos:

* autenticación fuerte;
* 2FA obligatorio;
* allowlist opcional por IP;
* sesiones cortas;
* roles internos;
* auditoría de accesos;
* bloqueo por intentos fallidos.

### 14.2 Datos sensibles

El backoffice no debe exponer por defecto:

* XML fiscal completo;
* PDFs de facturas;
* snapshots documentales;
* respuestas AEAT completas;
* NIF/CIF completos si no es necesario;
* datos bancarios;
* documentos administrativos subidos;
* textos OCR completos;
* secretos;
* certificados;
* tokens.

### 14.3 Acciones peligrosas

Acciones que deben requerir doble confirmación:

* cambiar plan de usuario;
* desactivar cuenta;
* acceder a datos sensibles;
* marcar incidencia como crítica;
* tocar configuración fiscal;
* modificar fuente normativa;
* cerrar alerta crítica;
* preparar release productiva.

Acciones que no deberían existir en V1:

* ejecutar migraciones productivas;
* borrar datos fiscales;
* modificar facturas de usuario;
* alterar registros fiscales;
* reabrir documentos bloqueados;
* editar XML fiscal;
* enviar a AEAT;
* usar certificados.

---

## 15. Relación con los planes de pago

El backoffice debe permitir ver o gestionar planes, pero con cuidado.

Puede mostrar:

* plan activo;
* límites;
* consumo;
* estado de suscripción;
* módulos habilitados;
* fecha de renovación;
* incidencias de pago.

No debe mezclar todavía:

* cambios automáticos de compliance;
* habilitación productiva de VeriFactu;
* módulos legales sin validación.

Para futuras funciones premium como el lector de notificaciones administrativas, el backoffice podría mostrar:

* análisis usados;
* límite mensual;
* errores OCR;
* almacenamiento;
* alertas de privacidad;
* incidencias.

---

## 16. Automatización recomendada

Primera fase manual/asistida:

1. Recolectar fuentes oficiales.
2. Detectar cambios.
3. Generar resumen.
4. Crear alerta interna.
5. Revisión humana.
6. Issue técnico si procede.

Fase posterior:

1. Diff automático de documentos.
2. Clasificación IA.
3. Priorización.
4. Propuesta de checklist.
5. Vinculación a PR.
6. Evidencia en compliance.

Nunca automatizar:

```text
Cambio legal detectado → código modificado → deploy automático
```

---

## 17. Roadmap propuesto

### Fase A — Documental

* Crear documento `regulatory-change-monitor-v1.md`.
* Crear documento `admin-console-v1.md`.
* Definir fuentes oficiales.
* Definir roles internos.
* Definir datos prohibidos.
* Definir criterios de alerta.

### Fase B — Backoffice mínimo

* Login interno seguro.
* Roles internos.
* Audit log.
* Panel básico de fuentes.
* Registro manual de cambios detectados.
* Checklist manual.

### Fase C — Monitor automático básico

* RSS BOE/AEAT/Seguridad Social.
* API BOE.
* Hash de páginas/documentos.
* Alertas por palabras clave.
* Resumen IA interno.

### Fase D — Issue workflow

* Crear issue interno desde alerta.
* Vincular fuente oficial.
* Vincular PR.
* Vincular release.
* Estado de revisión.

### Fase E — Compliance operativo

* Dossier vivo.
* Evidencias.
* Validaciones.
* Releases.
* Auditoría.
* Estado de adaptación normativa.

---

## 18. Criterios de aceptación futuros

`REGULATORY_CHANGE_MONITOR_V1` será aceptable si:

* usa fuentes oficiales;
* guarda evidencia;
* detecta cambios;
* clasifica impacto;
* no implementa cambios automáticamente;
* requiere revisión humana;
* crea issues trazables;
* permite auditoría;
* no expone secretos;
* no accede a datos de clientes.

`ADMIN_CONSOLE_V1` será aceptable si:

* tiene roles internos;
* tiene auditoría;
* limita datos sensibles;
* separa soporte de compliance;
* no permite mutaciones fiscales peligrosas;
* no ejecuta producción sin controles;
* no modifica documentos reales;
* no reabre facturas bloqueadas;
* no altera registros fiscales.

---

## 19. Riesgos

| Riesgo                                  | Severidad | Mitigación                                       |
| --------------------------------------- | --------: | ------------------------------------------------ |
| No detectar cambio legal importante     |      Alta | Fuentes oficiales + alertas + revisión periódica |
| Falso positivo constante                |     Media | Clasificación por impacto                        |
| IA resume mal una norma                 |      Alta | Revisión humana obligatoria                      |
| Automatizar cambio legal sin control    |   Crítica | Prohibido                                        |
| Backoffice expone datos fiscales        |      Alta | Roles, vistas seguras, auditoría                 |
| Soporte toca datos de cliente           |      Alta | Permisos mínimos                                 |
| Producción se modifica desde backoffice |   Crítica | No permitir en V1                                |
| Fuentes cambian HTML/RSS                |     Media | Monitorizar errores de fetch                     |
| Evidencias no guardadas                 |     Media | Hash + snapshot + trazabilidad                   |
| Equipo ignora alertas                   |      Alta | Owner y SLA interno                              |

---

## 20. Recomendación final

Factura Autónomo debería crear en el futuro un sistema interno de vigilancia normativa y técnica. No es una función comercial directa para el usuario final, pero es crítica para mantener el producto vivo y adaptado.

También debería existir un backoffice interno, pero con alcance muy controlado. El backoffice debe servir para operar, revisar y auditar el producto, no para manipular datos fiscales de clientes sin garantías.

La combinación recomendada es:

```text
ADMIN_CONSOLE_V1
└── REGULATORY_CHANGE_MONITOR_V1
```

Primero se debe documentar. Después se puede implementar una versión manual. Más adelante se puede automatizar la recopilación, el diff, la clasificación y la creación de issues internos.

No debe abrirse esta implementación antes de tener bien cerrados:

* seguridad interna;
* roles;
* auditoría;
* RLS;
* entorno staging;
* compliance;
* backups;
* política de datos sensibles.
