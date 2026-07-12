# Follow-up de auditoría — persistencia durable de gastos fijos

Fecha: 2026-07-12.

**Estado:** reparación transplantada y validada localmente desde el
`origin/main` real de GitHub
(`5c8475df97051c53ce4b61c1492cbb3a68f96be9`), en la rama
`agent/fix-storage-durability`. El cierre definitivo requiere checks remotos
verdes, merge a `main` y verificación de producción.

## Defecto confirmado

`saveData` capturaba cualquier fallo de `localStorage` y no devolvía resultado.
Los callers podían publicar el candidato solo en memoria, cerrar el formulario
y mostrar éxito aunque cuota, permisos, serialización o escritura hubieran
impedido persistirlo. Tras recargar, el gasto fijo desaparecía.

El flujo real `imagen escaneada → gasto fijo` agravaba el problema: proveedor,
`Expense` y `RecurringExpense` podían crearse mediante pasos visibles por
separado, y el documento del buzón podía marcarse como procesado aunque el
estado local durable no estuviera confirmado.

## Contrato reparado

- `saveData` devuelve una unión discriminada `applied | blocked |
  indeterminate`, con motivos acotados y sin registrar errores, payloads ni PII;
- serialización, compresión y guard anti-vaciado terminan antes del primer
  write. El guard cubre documentos, clientes, gastos, recurrencias,
  recordatorios, proveedores, productos, cuarentena, cambios pendientes,
  contadores, cadena VeriFactu y cualquier perfil distinto del predeterminado;
- se conserva el raw anterior exacto, incluido `null`; el readback debe coincidir
  byte a byte. Un rollback de `null` usa `removeItem` y también se verifica;
- antes del write se relee el raw y, antes del rollback, solo se restaura si el
  valor sigue siendo el intento propio. Un tercer raw se conserva y devuelve
  `indeterminate/storage_state_unknown`;
- la transición durable comprueba por identidad el `AppData` esperado antes de
  construir y de nuevo inmediatamente antes de persistir. Solo tras `applied`
  actualiza `dataRef` y React; el efecto global reconoce el candidato ya
  persistido y no lo reintenta;
- el write durable comprueba además que el raw vigente normaliza exactamente al
  `AppData` esperado. Si otra pestaña ya persistió otro estado, devuelve
  `blocked/stale_precondition` sin llamar a `setItem` y la UI pide recargar;
- el store conserva separada la última base durable conocida. Si el arranque
  materializa ocurrencias recurrentes solo en memoria, el primer commit durable
  compara el raw con esa base y persiste en una única escritura la sincronización
  pendiente junto con la acción solicitada, sin mutar automáticamente al cargar;
- cualquier guardado global o remoto no aplicado invalida esa base: ningún
  commit durable posterior puede incorporar memoria fallida hasta recargar o
  completar otra persistencia confirmada. El replay solo se confirma si el
  bundle también coincide en una base durable conocida;
- `/gastos/fijos` usa el commit durable para alta, edición, pausa, activación y
  borrado. Ante bloqueo mantiene el panel abierto con error accionable; ante
  estado incierto bloquea toda nueva escritura hasta recargar;
- `/gastos/nuevo` construye un único candidato local con proveedor, gasto y
  plantilla recurrente, usa IDs deterministas y falla cerrado ante colisiones,
  precondición obsoleta, provenance incompleta o replay ambiguo;
- el replay tras recarga reconoce exactamente el bundle ya aplicado, no crea
  duplicados y reintenta únicamente el cierre del buzón;
- los guardados principal, individual y por lote quedan bloqueados tras un
  estado incierto. Un escaneo clasificado como gasto fijo nunca puede entrar en
  el guardado rápido: exige revisar frecuencia/vencimiento y pasar por la ruta
  durable;
- un bundle solo se reconoce como aplicado si el `Expense` sigue siendo
  `businessKind: fixed` y conserva una clave de ocurrencia válida con prefijo
  exacto de su recurrencia y fecha ISO real.

El manual explica el mismo comportamiento y nunca recomienda borrar datos para
recuperar cuota.

## Integridad y límites preservados

No se cambia la semántica de documentos emitidos, snapshots, sellos, hashes,
cadena VeriFactu, cálculo fiscal, IVA, deducibilidad, Supabase remoto, Stripe,
dominio, secretos ni datos reales. La regresión de integridad usa una factura
emitida con evidencia VeriFactu sintética activa y comprueba `deepEqual` de
documentos, snapshots, sellos, hashes, cadena, aislamiento de recordatorios y
cambios pendientes; el bundle no genera cambios de tipo `document`.

Se releyeron antes de editar el informe maestro de auditoría y el resumen
específico VeriFactu fail-closed. No se relaja ninguna protección implantada ni
se mezcla otro hallazgo P1/P2/P3.

## Límites explícitos del alcance

1. La atomicidad implementada abarca el almacenamiento local de proveedor,
   gasto y recurrencia. El inbox vive detrás de `/api/expense-inbox`, fuera de
   `AppData`; no existe una transacción distribuida localStorage+API dentro del
   perímetro aprobado. El cierre remoto ocurre solo después de `applied`. Si
   falla, el bundle local permanece durable, el formulario no navega y el replay
   reintenta exclusivamente el `PATCH`. Es una saga recuperable y fail-closed,
   no atomicidad distribuida literal.
2. `localStorage` no ofrece compare-and-swap ni lock síncrono entre pestañas.
   Las relecturas añadidas evitan sobrescribir cualquier cambio concurrente que
   llegue a ser observable antes del write o rollback; permanece la ventana
   irreducible entre dos operaciones síncronas. Eliminarla exigiría ampliar el
   contrato a coordinación asíncrona, por ejemplo Web Locks, y auditar todos los
   callers.

## Evidencia local

- pruebas dirigidas finales: 4 archivos y 119 pruebas aprobadas;
- suite completa en el worktree definitivo: 488 archivos aprobados y 11
  omitidos previstos; 3.566 pruebas aprobadas y 17 omitidas;
- TypeScript, ESLint dirigido, ESLint completo y `git diff --check`: correctos;
- build de producción final: correcto, 106 páginas generadas. El mock temporal
  usado durante el checkpoint inicial fue eliminado y no forma parte del diff;
- servidor de producción local: `/gastos/fijos`, `/gastos/nuevo` y
  `/ayuda/gastos` responden 200;
- convenciones Supabase: 25 migraciones y 16 rollbacks correctos, sin ejecutar
  cambios remotos;
- fixtures: 403 facturas sintéticas válidas y 0 privadas;
- contrato del manual: 6 archivos y 34 pruebas aprobadas. La cobertura visual
  continúa bloqueada honestamente con 0/30 PNG aprobados, 12 pendientes, 20
  defectuosos y 2 huérfanos, fuera de este bloque;
- casos adversariales: cuota, SecurityError, serialización/compresión, guard
  anti-vaciado, mismatch, rollback correcto/fallido, raw `null`, tercer raw,
  concurrencia observable antes de write/rollback, stale, doble submit, replay
  tras reload, raw ya divergente, primer write del workspace demo, proveedor
  nuevo/existente, mensual/trimestral/anual/no fiscal, IDs duplicados,
  provenance manipulada y bloqueo de todos los guardados ante estado incierto.

La publicación se limita a la rama y al PR de este bloque. No se han tocado
datos reales, Supabase remoto, Stripe, dominio ni despliegues manuales.
