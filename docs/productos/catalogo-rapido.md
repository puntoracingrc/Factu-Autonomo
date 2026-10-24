# Factu Catálogo

Acceso web directo: `/catalogo/index.html` (también `/catalogo`). Es una shell
estática independiente del árbol Next/React de la aplicación principal. Su
buscador y sus controles están diseñados para móvil y escritorio. No carga
AppData, facturas, gastos, fiscalidad, sincronización general ni PDFs.

## Datos y permisos

- Reutiliza Supabase Auth y el dispositivo del mismo propietario de facturación.
  Muestra un selector explícito de las empresas autorizadas por el servidor.
- `GET /api/catalogo` exige identidad, empresa exacta, sesión/dispositivo vivos,
  plan cloud, rate limit y autoridad central disponible. Todas las respuestas
  son privadas, `no-store` y `noindex`.
- La lista obtiene 30 proyecciones por página sin imágenes. La búsqueda cubre
  nombre, referencias, descripciones, familias, notas y características; combina
  todos los términos, tolera mayúsculas y tildes y acota la expresión generada.
  Solo una ficha seleccionada descarga su payload completo y versión central.
- Las familias son metadata paginada; no se descarga una segunda copia de las
  fichas para construir el filtro. Puede asignarse una familia/subfamilia nueva
  escribiendo su nombre. No hay fusiones ni reorganizaciones masivas.
- Guardar reutiliza la API central existente: payload completo preservado,
  `expectedVersion`, clave idempotente y confirmación transaccional. La edición
  conserva imágenes, aliases, proveedor, conversiones e información no expuesta.
- Un conflicto de versión conserva el formulario y ofrece recargar con aviso de
  cambios sin guardar. Un resultado ambiguo mantiene solo el comando técnico en
  `sessionStorage`, aislado por actor y empresa, y repite exactamente su identidad.
  Un conflicto de idempotencia no se convierte automáticamente en otro comando.
- El éxito se muestra solo tras una confirmación central válida. Los demás
  dispositivos reciben el outbox normal del programa, sin otro escritor.

## Precios

El PVP de venta es `sales.unitPrice`, sin IVA. `pvp` es el campo heredado de
la tarifa del proveedor, nunca se interpreta como precio de venta.
`purchase.netUnitCost`/`cost` son coste neto, conservando por separado tarifa y
descuento. La unidad de compra se distingue de la de venta. Una ficha con cálculo
por medidas conserva su plantilla y no permite cambiar su unidad a otra incompatible.

No modifica históricos, gastos, documentos, numeración ni reglas globales de
margen. No requiere tablas o migraciones nuevas y no altera el contrato de
búsqueda acotada de Factu Rápido.

## Verificación

- `npm run build:catalog`: árbol de dependencias limitado, JS inicial < 100 KB gzip.
- `npx vitest run src/lib/product-catalog-lite src/app/api/catalogo`.
- `node scripts/test-catalog-local-ui.mjs --local`: base Supabase de localhost,
  usuario y productos sintéticos propios con limpieza al finalizar. No inicia,
  reinicia, migra ni detiene instancias existentes. El origen se fija a localhost.
  Verifica búsqueda/paginación, edición y readback real, conflicto entre equipos,
  respuesta perdida + recarga + replay, aislamiento y ausencia de carga de Next.
