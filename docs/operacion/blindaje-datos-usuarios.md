# Blindaje de datos de usuarios

Objetivo: las cuentas de usuarios reales deben sobrevivir a cambios de versión,
importaciones, sincronizaciones y despliegues sin perder datos ni modificar
documentos protegidos.

## Reglas de producto

- Las actualizaciones normales no deben borrar ni reescribir datos existentes.
- Las migraciones deben ser compatibles hacia delante: añadir campos o tablas es
  seguro; borrar, renombrar o cambiar significado requiere plan específico.
- Facturas emitidas, recibos emitidos y registros fiscales son datos protegidos.
  No se editan ni se regeneran en masa por cambios de interfaz.
- Importaciones y restauraciones deben pasar por vista previa y resumen de
  cambios antes de aplicar datos.
- La restauracion administrativa no se puede aplicar mientras no exista una
  operacion transaccional o saga reanudable que revalide la sesion admin, ligue
  el apply a la vista previa y bloquee cualquier cambio de documentos
  protegidos.
- Antes de una operación delicada debe existir copia local/exportable o punto de
  recuperación.

## Monitor de errores

El monitor guarda eventos técnicos mínimos para poder detectar fallos por
usuario:

- área de la app;
- código corto;
- mensaje breve y saneado;
- ruta;
- fecha;
- usuario autenticado, si existe.

No debe guardar:

- contraseñas;
- tokens;
- claves API;
- PDFs o imágenes;
- facturas completas;
- bases de datos completas;
- datos fiscales extensos.

Los eventos se consultan desde `/admin` en dos sitios:

- `Errores y salud`, para ver el estado general;
- `Usuarios`, para ver si una cuenta concreta acumula fallos recientes.

## Siguientes fases recomendadas

1. Diseñar y probar una RPC transaccional o saga reanudable para restauraciones,
   con idempotencia, CAS de la vista previa, rollback y evidencia indivisible.
2. Aviso admin si una cuenta acumula muchos errores de sincronización.
3. Estado de salud por usuario: último sync correcto, cambios pendientes y último
   backup Drive.
4. Botón admin de exportar diagnóstico seguro sin incluir documentos completos.
