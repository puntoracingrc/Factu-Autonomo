# Plan — diagnóstico de modelos tributarios

Estado: en ejecución. Propietario: agente principal. Actualizado: 2026-07-15.

## Punto de control — corpus sintético v1

- [x] Importar 41 documentos base sintéticos con manifiestos, huellas y
  procedencia reproducible.
- [x] Validar estructuralmente 41/41 y auditar visualmente las 162 páginas.
- [x] Añadir regresión funcional 41/41 e inferencias expresamente prohibidas.
- [x] Clasificar por estructura los modelos 036, 037 histórico, 111, 115, 130,
  303 y 390, además de las tres vistas censales actuales.
- [ ] Generar y aprobar las variantes visuales derivadas del corpus base.
- [ ] Congelar el contrato público y aprobar fiscalmente las reglas antes de
  liberar la integración de Calendar o Modelos AEAT.

## Contexto recopilado

La aplicación ya tiene una sección «Asesoría fiscal», un perfil fiscal v1, un
catálogo oficial de modelos, calendario fiscal y un motor independiente para
deducibilidad. El nuevo producto determinará obligaciones posibles sin ocultar
incertidumbre. Debe ser la primera opción del menú interno de Asesoría fiscal y
el destino del acceso global a esa sección.

La auditoría completa está en
`docs/audit/tax-model-diagnostic-initial-audit-2026-07-14.md` y la reserva de
archivos en `docs/agent-coordination.md`.

## Alcance

1. Diagnóstico completo para territorio común AEAT, versionado por ejercicio.
2. Identificación explícita de Canarias, Navarra, País Vasco por territorio
   histórico, Ceuta, Melilla, no residente o territorio dudoso, con derivación
   segura cuando el motor territorial no esté implementado.
3. Cuestionario dinámico con Sí/No/No lo sé/No aplica, ayuda, progreso,
   navegación hacia atrás, guardado y reanudación.
4. Separación entre persona física, sociedad y entidad en atribución de rentas.
5. Importación opcional de certificado censal o 036 con texto nativo, evidencia
   por campo y confirmación expresa; flujo manual siempre disponible.
6. Motor determinista con resultados aplicables, derivados, condicionales,
   descartados, discrepancias y datos pendientes.
7. Reglas y fuentes oficiales versionadas para ejercicios admitidos.
8. Resultados explicables, calendario orientativo enlazado al calendario
   versionado, impresión/exportación y aviso no vinculante.
9. Fixtures sintéticos, pruebas unitarias, combinación, extracción,
   reconciliación, E2E, accesibilidad y seguridad.

## Fuera de alcance inicial

- presentación, firma, pago o envío de modelos;
- asesoramiento fiscal vinculante o promesas de exactitud absoluta;
- decisión generativa libre;
- OCR o IA externos en producción sin consentimiento y revisión de proveedor;
- almacenamiento permanente de PDF en el MVP;
- reglas positivas para territorios forales, IGIC o IPSI antes de crear motores
  territoriales revisados;
- migrar de framework, crear un ORM o refactorizar dominios no relacionados;
- despliegue de producción sin `PUBLICAR PRODUCCIÓN` actual y explícito.

## Arquitectura propuesta

```text
/consultor-fiscal/diagnostico
        │
        ├── cuestionario y revisión documental (React)
        │       └── AppStore / BusinessProfile (solo hechos confirmados)
        │
        └── src/lib/tax-model-diagnostic (TypeScript puro)
                ├── domain/          perfiles, evidencias y resultados
                ├── questionnaire/   catálogo y selección adaptativa
                ├── documents/       intake local, clasificación y propuestas
                ├── reconciliation/  prioridad, cronología y discrepancias
                ├── rules/           registro por territorio/ejercicio
                ├── engine/          evaluación y trazas
                ├── calendar/        adaptador al calendario fiscal
                └── fixtures/        perfiles sintéticos dorados
```

`src/lib/fiscal-models` no se modifica ni ejecuta aplicabilidad. El nuevo motor
puede validar que un código existe en el inventario público mediante un adaptador
externo al catálogo, sin importar almacenamiento ni UI en ese módulo.

El perfil fiscal v1 se proyectará a un estado de diagnóstico versionado sin
reinterpretar silenciosamente valores desconocidos. Los PDF y su texto serán
efímeros; se persistirán únicamente hechos estructurados confirmados, su tipo de
fuente, página y fecha, nunca el contenido completo ni el CSV.

## Decisiones existentes que se respetan

- ADR-0001/0002: procedencia, reversibilidad, confirmación y fail-closed.
- `/consultor-fiscal` conserva deducibilidad; `/modelos` conserva información.
- AppStore/local-first y sincronización Supabase JSON por usuario.
- fuentes ejecutables oficiales y verificadas; reglas nuevas comienzan bajo
  revisión hasta aprobación fiscal.
- ningún dato desconocido se convierte a cero, falso o “no aplica”.
- calendario versionado, no fechas perpetuas en componentes.
- feature flags por entorno, apagados por defecto en producción.

## División por fases

### Fase 0 — coordinación

- [x] Auditar repositorio, Git, PR/issues, worktrees, arquitectura y CI.
- [x] Crear worktree/rama propios.
- [x] Registrar coordinación, auditoría y plan persistente.

### Fase 1 — contratos e investigación

- [ ] Definir esquema de perfil, evidencia, regla, resultado y sesión.
- [ ] Crear árbol y catálogo completo de preguntas/documentos/modelos.
- [ ] Verificar reglas con AEAT/BOE y registrar localización concreta.
- [ ] Añadir validación de integridad del registro.

### Fase 2 — MVP manual

- [ ] Ruta `/consultor-fiscal/diagnostico` y primera opción del menú.
- [ ] Destino global «Asesoría fiscal» al diagnóstico.
- [ ] Cuestionario adaptativo, progreso, volver, guardar y reanudar.
- [ ] Motor común para 130, 131, 100, 303, 390, 309, 111, 190, 115,
  180, 123, 193, 216, 296, 349, 035, 369, 347, 200, 202, 184, 720,
  721, 714 y 036, usando estados conservadores cuando falten hechos.
- [ ] Separación de sujetos, actividad, entidad y obligaciones personales.

### Fase 3 — documentos y reconciliación

- [ ] PDF nativo local con límites, hash efímero y evidencia por página.
- [ ] Clasificación de certificado censal/036 y cronología.
- [ ] Revisión campo a campo: confirmar, corregir o desconocido.
- [ ] Reconciliar censo actual, historial, hechos y declaraciones anteriores.
- [ ] Borrar documento y datos propuestos de la sesión.
- [ ] Puerto OCR deshabilitado y preparado para revisión futura.

### Fase 4 — resultados y calendario

- [ ] Resumen por sujeto y categoría, modelos descartados y discrepancias.
- [ ] Fuente, versión, última verificación, periodicidad y periodos.
- [ ] Adaptador al calendario fiscal versionado.
- [ ] Impresión/exportación sin persistir documentos.

### Fase 5 — endurecimiento y entrega

- [ ] Perfiles dorados 1–27 y matrices de reglas.
- [ ] Integración, extracción/reconciliación, E2E, accesibilidad y seguridad.
- [ ] Threat model, privacidad, mantenimiento anual y runbooks.
- [ ] Suite completa, revisión de cambios de base, commits pequeños.
- [ ] Push, PR revisable y preview solo cuando los controles estén verdes.

## Dependencias

- contenido y procedimientos oficiales AEAT/BOE;
- `pdfjs-dist` existente;
- AppStore, `BusinessProfile` y sincronización existentes;
- calendario fiscal versionado y fichas oficiales como enlaces informativos;
- revisión fiscal humana antes de aprobar reglas;
- revisión de privacidad/proveedor antes de cualquier OCR externo.

No se añadirá una dependencia sin evaluar mantenimiento, licencia, tamaño y
seguridad. El MVP no necesita una nueva dependencia de producción.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Confundir obligación censada con obligación real | Conservar ambas y emitir `CENSUS_MISMATCH` |
| Tratar un 036 antiguo como vigente | Prioridad al censo actual, cronología y confirmación |
| Reglas fiscales obsoletas | Ejercicio/territorio/vigencia/fuente/verificación obligatorios |
| Falsa certeza territorial | `TERRITORY_NOT_SUPPORTED` antes de evaluar modelos estatales |
| Filtrar datos fiscales | Procesamiento local, minimización y telemetría allowlisted |
| Solapar catálogo fiscal | Módulo nuevo fuera de `src/lib/fiscal-models` |
| Regresión de perfil v1 | Proyección migrable y fixtures de compatibilidad |
| Fechas erróneas | Adaptador al calendario versionado; sin fechas perpetuas |
| Despliegue accidental a producción | No push a main; gate `PUBLICAR PRODUCCIÓN` y revisión del workflow |
| Worktrees sucios | Rama/worktree aislados y comparación contra `origin/main` |

## Plan de pruebas

- Unitarias: positivo, negativo, excepción, incompleto, contradicción y cambio de
  ejercicio por rama ejecutable.
- Integridad: regla activa sin territorio, ejercicio, fuente, verificación,
  pruebas o modelo válido debe fallar.
- Combinación: multi-actividad, IVA mixto, persona/entidad, cambios temporales,
  internacional, alquiler y retenciones.
- Documentos: solo fixtures sintéticos; PDF nativo, escaneado, torcido,
  incompleto, cronología 036, baja posterior, baja confianza, contradicción,
  otro ejercicio/persona e ilegible.
- Reconciliación: censo/036/hechos/declaraciones previas.
- E2E Playwright: manual, documento, corrección, resultado, impresión, borrado,
  reanudación, expiración y acceso invitado.
- Accesibilidad: teclado, foco, etiquetas, lector, contraste y estados no
  dependientes del color.
- Seguridad: owner isolation, IDs manipulados, archivos inválidos/grandes,
  contenido hostil, logs, variables, URLs y borrado.

## Migración

1. Mantener `BusinessFiscalProfile` v1 legible.
2. Introducir estado diagnóstico con `schemaVersion` propio y normalizador
   allowlist.
3. Proyectar campos v1 como hechos de prioridad conocida, dejando lo no
   representable como desconocido.
4. No migrar al cargar mediante efectos secundarios; solo normalizar.
5. Si en una fase futura se guardan documentos, usar migración Supabase
   versionada con RLS, bucket privado, TTL, borrado y down/rollback probado.

## Despliegue y reversión

- Flag general del diagnóstico apagado por defecto en producción.
- Flags independientes para documentos, OCR, calendario y exportación.
- Preview: flujo manual, documento sintético, auth, aislamiento, borrado,
  responsive, accesibilidad, errores y logs saneados.
- Producción: solo tras PR aprobado, CI verde, revisión fiscal/privacidad,
  variables y rollback preparados, y autorización `PUBLICAR PRODUCCIÓN`.
- Reversión inmediata: apagar flag y redesplegar. Reversión de código mediante
  revert del PR. La fase local no necesita migración destructiva ni conserva
  binarios, por lo que el perfil previo permanece compatible.

## Criterios de aceptación

- [ ] Funciona sin documentos.
- [ ] Es la primera opción de Asesoría fiscal y configura el tipo/perfil.
- [ ] Acepta censo actual o 036, con confirmación de campos.
- [ ] No trata un 036 antiguo como situación actual.
- [ ] Omite preguntas acreditadas y pregunta ante dudas/contradicciones.
- [ ] Cada resultado incluye sujeto, motivo, evidencia, periodicidad y fuente.
- [ ] Separa persona/entidad y actividad/obligaciones personales.
- [ ] Reglas por ejercicio con fuentes oficiales e integridad validada.
- [ ] Territorios no implementados no reciben respuestas estatales engañosas.
- [ ] Pasan perfiles 1–27, lint, typecheck, unitarias, integración, E2E y build.
- [ ] No hay documentos reales ni datos fiscales sensibles en logs.
- [ ] Interfaz móvil y accesible, documentación y rollback actualizados.
- [ ] No se sobrescribe trabajo ajeno ni se despliega producción sin permiso.

## Primer conjunto de archivos

1. `src/lib/tax-model-diagnostic/**`: contratos, catálogo de preguntas, fuentes,
   reglas, motor e integridad.
2. `src/app/consultor-fiscal/diagnostico/page.tsx` y
   `src/components/tax-model-diagnostic/**`: flujo manual inicial.
3. `src/components/consultor-fiscal/AdvisorAreaNavigation.tsx` y
   `src/components/layout/app-navigation.ts`: primera opción y destino global.
4. Tipos/normalizadores mínimos de perfil y sus pruebas.
5. Documentación de arquitectura, seguridad, cuestionario y actualización anual.

## Verificación fiscal pendiente

Antes de marcar una regla como aprobada se comprobarán, por ejercicio: sujeto,
hecho imponible u obligación, excepción, umbral, periodicidad, fecha de efecto,
exoneración y relación con 036. Prioridad inicial: 130/131/100; 303/390/309;
111/190; 115/180; 349/ROI; 347; 035/369; 200/202; 184; 216/296; 123/193 y
obligaciones personales 720/721/714. Los plazos se verifican aparte en el
calendario oficial de cada ejercicio.
