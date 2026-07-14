# ADR-0006: Fiabilidad del maestro de clientes

- Estado: aceptado
- Versión: 1
- Fecha: 2026-07-14

## Contexto

Clientes es un maestro operativo compartido por facturas, presupuestos, recibos,
recordatorios, búsquedas, copias y sincronización. Una ficha puede crearse desde
su listado o mientras se prepara un documento. Los documentos emitidos, en
cambio, conservan un snapshot histórico del cliente que no debe reescribirse al
editar o eliminar la ficha maestra.

El blindaje debe evitar duplicados, asociaciones incorrectas y pérdidas de
historial sin añadir pasos, permisos o bloqueos visibles al trabajo normal del
usuario.

## Decisión

### Uso normal sin fricción

1. Crear, editar, buscar, ordenar y cargar más clientes conserva la experiencia
   directa existente. Este contrato no añade permisos, confirmaciones,
   suscripciones, avisos ni campos obligatorios nuevos al usuario.
2. La búsqueda recorre la colección completa antes de paginar y tolera tildes,
   mayúsculas, espacios y puntuación de NIF o teléfono. Ordenar o cambiar el
   filtro reinicia la ventana visible sin eliminar ni duplicar resultados.
3. El listado puede mostrar clientes por tramos para mantener buen rendimiento;
   cargar todos los tramos debe producir exactamente la colección ordenada.

### Identidad y escritura

1. El NIF normalizado es único cuando está informado. Dos NIF no vacíos y
   distintos nunca se consideran la misma ficha solo porque coincida el nombre.
2. Una identidad exacta normalizada evita duplicados involuntarios, también
   cuando un particular solo tiene nombre. Un nombre sin apellidos no colisiona
   con otra persona que sí tiene apellidos.
3. El alta o edición se valida dentro de la misma transición contra la colección
   vigente. Dos clics, dos renders o un guardado desde documento no pueden crear
   dos fichas por haber validado una copia antigua.
4. Un fallo de persistencia o una escritura que no se aplica nunca se comunica
   como éxito ni navega o cierra el formulario como si hubiese guardado.
5. Crear o actualizar desde un documento usa la misma transición atómica del
   maestro. La validación fiscal del documento se ejecuta antes de modificar el
   cliente, para que un documento rechazado no deje una ficha fantasma.

### Documentos e historial

1. Editar una ficha maestra modifica los datos futuros y permite vaciar campos
   opcionales. Nunca reescribe el snapshot, PDF, sello, hash, estado o evidencia
   de un documento ya emitido.
2. Eliminar una ficha maestra desvincula referencias operativas mediante el
   comando de borrado existente, pero conserva el cliente congelado y toda la
   evidencia de cada documento.
3. Fusionar duplicados conserva aliases de las fichas absorbidas. Los documentos
   emitidos mantienen su snapshot original; solo los borradores pueden adoptar
   datos actuales cuando el usuario lo elige expresamente.
4. Totales y vínculos priorizan `customerId`. La compatibilidad con documentos
   antiguos sin vínculo nunca atribuye un documento a una ficha cuyo NIF
   informado contradice el snapshot.

### Persistencia y aislamiento

1. Las mutaciones de clientes siguen los contratos generales de almacenamiento,
   nube, copia y tenant. No introducen almacenamiento paralelo ni datos reales
   en fixtures, logs o pruebas.
2. Exportar, importar o sincronizar conserva IDs, aliases y referencias. La
   deduplicación automática nunca mezcla dos usuarios ni dos NIF contradictorios.

## Consecuencias

- El usuario mantiene el flujo sencillo que ya conoce.
- Los duplicados por carreras y las asociaciones por nombre con NIF distinto
  quedan bloqueados internamente.
- El historial fiscal emitido sigue siendo inmutable aunque cambie el maestro.
- Los cambios futuros en Clientes deben demostrar creación, edición, borrado,
  búsqueda, orden, paginación, alta desde documentos y no duplicación.

## Regresiones obligatorias

Los cambios en Clientes, AppStore, formularios de documentos, borrado/fusión,
copias o sincronización deben superar:

- `src/lib/customer-master-reliability-contract.test.ts`
- `src/lib/customers.test.ts`
- `src/lib/customer-document-links.test.ts`
- `src/lib/document-integrity/customer-merge.test.ts`
- `src/lib/master-record-deletion.test.ts`
- `src/lib/cloud/diff.test.ts`
- `src/lib/cloud/sync.test.ts`
- `src/lib/backup.test.ts`

Una auditoría o refactor no puede relajar estas garantías ni convertir el
blindaje interno en fricción de usuario sin una nueva decisión de producto
versionada y autorización expresa.
