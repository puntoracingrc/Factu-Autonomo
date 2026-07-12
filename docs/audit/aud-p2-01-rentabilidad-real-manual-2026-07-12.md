# Reparación AUD-P2-01 — manual de Rentabilidad Real

Fecha: 2026-07-12.

**Estado:** reparación validada localmente desde `origin/main`
(`9a60f4fa9d674230e84805ba4e9f49eb62bc7b5c`). El cierre definitivo requiere
checks remotos verdes, merge a `main` y verificación de producción.

## Defecto confirmado

Rentabilidad Real expone ocho rutas y numerosos controles visibles, pero el
manual no tenía sección, entrada por ruta ni mapeo contextual. El botón de
ayuda de cualquiera de esas pantallas abría el índice general y obligaba al
usuario a interpretar por su cuenta conceptos como beneficio, caja prudente,
provisión IRPF, gastos vinculados y ajustes internos.

## Contrato reparado

Se añade una sección **Rentabilidad Real**, ordenada como siguiente bloque
entero libre (`order: 15`), con exactamente una entrada para cada ruta/control:

1. `/rentabilidad-real`: acceso, módulos, test y restablecimiento solo local;
2. `/rentabilidad-real/test`: once preguntas, selección y recomendaciones;
3. `/rentabilidad-real/validar-configuracion`: resumen, copia y estados de
   revisión con el gestor;
4. `/rentabilidad-real/calculadora/trabajo`: documento, modo, gastos, fijos,
   ajustes, resultados y trazabilidad;
5. `/rentabilidad-real/calculadora/horas`: documento o simulación, horas reales
   y facturadas y modelos de cobro;
6. `/rentabilidad-real/simulador-precio-minimo`: hora, trabajo, proyecto o
   mensual, costes, margen e impuestos orientativos;
7. `/rentabilidad-real/informes`: filtros, documentos, clientes y calidad de
   datos;
8. `/rentabilidad-real/evolucion`: agrupaciones, filtros, resumen y tabla.

El texto refleja además los límites exactos de los controles: el reset elimina
también repartos locales sin desvincular gastos persistentes; la selección
parcial de líneas se realiza desde Facturas; el simulador evita duplicar la
cuota de autónomo ya incluida en fijos; y **Ver todo** en Evolución limpia solo
el rango de fechas.

Las ocho rutas resuelven al slug `rentabilidad-real`, el enlace contextual
conserva cada `from` exacto y el retorno muestra **Rentabilidad Real**. La
coincidencia de ruta es cerrada al segmento y no captura prefijos ajenos como
`/rentabilidad-realidad`.

El registro convive de forma aditiva con Consultor fiscal: se conserva su
sección condicional en `order: 9.5` y Rentabilidad Real utiliza `order: 15`, sin
renumerar ni ocultar secciones existentes.

## Límites fiscales e integridad preservados

El manual distingue de forma explícita:

- análisis orientativo frente a contabilidad e impuestos de la app;
- IVA frente a beneficio y provisión estimada de IRPF;
- preferencias locales frente a documentos y datos reales;
- ajustes internos no fiscales frente a gastos deducibles o exportables;
- relaciones operativas de gastos frente al contenido fiscal inmutable.

Vincular, desvincular o repartir un gasto puede cambiar su relación operativa
con un trabajo, pero no su PDF, el contenido de un documento emitido, sus
snapshots, sellos, hashes ni VeriFactu. No se modifican cálculos, datos reales,
Supabase remoto, Stripe, dominio ni secretos.

## Separación de capturas

AUD-P2-01 cierra el defecto de contenido y contexto medido por la auditoría
como «una entrada por ruta/control». No añade ni regenera PNG: no existe una
captura válida de estas rutas y el controlador visual integrado requerido para
verificarlas no está disponible en este entorno.

La matriz, metadatos, generación y revisión visual de capturas siguen
deliberadamente en AUD-P2-03/AUD-P2-04. No se declara QA visual ni se introducen
referencias a imágenes sin comprobar; el manual continúa superando su
verificador con todas las capturas que sí referencia.

## Evidencia local

- sección con ocho pasos y ocho rutas únicas;
- regresiones de controles, estados vacíos y separación fiscal/integridad;
- regresiones de mapeo contextual, conservación de `from`, límite de prefijo,
  cobertura y etiqueta de retorno;
- registro conjunto probado con Consultor fiscal apagado y encendido, sin
  perder su orden `9.5` ni el orden `15` de Rentabilidad Real;
- documentación técnica y mapa de rutas alineados;
- verificador completo del manual: 6 archivos y 23 pruebas aprobadas;
- suite completa: 479 archivos aprobados y 11 omitidos previstos; 3.418
  pruebas aprobadas y 17 omitidas;
- TypeScript, ESLint completo/dirigido y `git diff --check`: correctos;
- build de producción: correcto;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 sintéticos válidos y 0 privados;
- servidor de producción local: la nueva ayuda y las ocho rutas de
  Rentabilidad Real responden 200; el HTML contiene el título y los pasos
  inicial/final;
- revisión adversarial cerrada tras precisar reparto por líneas, alcance del
  reset local, prevención de doble cuota y el control **Ver todo**.

Quedan pendientes el commit de integración, PR, checks remotos, merge a `main`
y verificación pública posterior al despliegue.
