# Costes del catálogo desde gastos

El guardado explícito de una compra con líneas puede actualizar las fichas existentes de la empresa activa. La lectura, sincronización o importación pendiente no reescribe precios por sí sola. No se recalculan gastos antiguos ni se trasladan gastos entre empresas.

## Identificación y revisión

- La coincidencia exige proveedor, referencia exacta (si ambos la tienen) o nombre/alias completo, y la misma unidad de compra. Se conservan todos los números del modelo. La búsqueda flexible del catálogo no decide escrituras de coste.
- Las coincidencias ambiguas, unidades diferentes, netos incoherentes, abonos y facturas anteriores a una referencia vigente conservan el coste. Un producto sin coincidencia sigue el flujo de admisión existente; este cambio no crea fichas nuevas.
- Se compara con compras anteriores válidas del mismo proveedor y producto o con la ficha vigente. Una fuente de ficha documentada más reciente prevalece sobre facturas anteriores.
- Hay aviso desde un 15 % de variación de tarifa o coste neto, desde 5 puntos de variación de descuento, y siempre que desaparece un descuento anterior distinto de cero.
- Los cambios con aviso conservan el coste por defecto. La casilla «Actualizar coste» permite aceptar expresamente una variación válida o conservar el coste incluso ante una variación pequeña. Distintos precios del mismo producto en una factura requieren elegir una sola línea.
- La revisión del lote vuelve a comprobar los datos más recientes antes de guardar: una factura anterior del mismo lote puede haber cambiado la referencia de comparación.

## Persistencia y procedencia

En empresas centrales, gasto, proveedor nuevo (si procede) y fichas modificadas viajan en una sola transacción con versiones esperadas. Un conflicto revierte el conjunto. La caché solo cambia tras confirmación del servidor. Los reintentos conservan identidad, fechas y petición exacta; un fallo de red no se presenta como guardado.

Cada coste adoptado añade una fuente con proveedor, referencia, factura, fecha, línea, tarifa, descuento, neto y unidad, conservando fuentes anteriores. El límite de 200 fuentes no elimina historial automáticamente. El precio de venta, familias, subfamilias, características, imágenes y datos manuales se conservan. `Product.pvp` es el campo heredado de tarifa del proveedor; el PVP de venta está en `sales.unitPrice`.

## Verificación

Pruebas de dominio: descuentos ausentes, costes pequeños/grandes, modelos y proveedores distintos, unidades, créditos, cronología, varias líneas por ficha, procedencia y reintentos con reloj avanzado. Componentes: avisos, casilla por defecto y decisión explícita. La aceptación PostgreSQL local prueba confirmación conjunta, replay y rollback ante una versión de producto obsoleta; CI usa únicamente datos sintéticos y localhost. No se guardan facturas de prueba en producción.
