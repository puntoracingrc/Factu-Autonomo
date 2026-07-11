# Alcance de copia y preferencias locales de Rentabilidad Real

## Decisión segura aplicada

Las copias manuales y de Google Drive siguen exportando el contrato `AppData`
versionado actual: perfil, documentos, gastos, recurrencias, recordatorios,
clientes, proveedores, productos, contadores y cadena VeriFactu. La metadata de
sincronización (`AppData.meta`) no forma parte del archivo restaurable.

Las claves `fa_rentabilidad_real_*` de `localStorage` no se añaden de forma
implícita. La interfaz y el aviso incluido en cada JSON explican ahora esta
exclusión de forma expresa.

## Por qué no se incorporan sin una decisión de producto

Ese prefijo mezcla preferencias propias del dispositivo con datos que afectan a
cálculos: módulos activos, respuestas del asistente, ajustes de cálculo y horas,
modos de análisis, ajustes internos, repartos de costes, candidatos ocultos,
preferencias de informes y simulador y validación del asesor. Copiarlos todos a
ciegas cambiaría el contrato de restauración y podría sobrescribir decisiones
locales sin vista previa, validación ni política de mezcla.

Si se decide hacerlos portables, el cambio debe definir una lista permitida,
separar preferencias de datos de cálculo, introducir un esquema de copia nuevo y
compatible, mostrar el contenido en la vista previa y elegir explícitamente si
se reemplaza o se combina cada grupo. Ese trabajo no requiere migrar los datos
actuales para corregir la detección automática de cambios ni para informar con
precisión del alcance vigente.
