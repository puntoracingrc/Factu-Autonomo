# Factu Catálogo

Acceso web directo: `/catalogo/index.html` (también `/catalogo`). Es una shell
estática independiente del árbol Next/React de la aplicación principal. Su
buscador y sus controles están diseñados para móvil y escritorio. No carga
AppData, documentos, fiscalidad, sincronización general ni PDFs. El historial de
precios consulta compras solo cuando el usuario lo solicita.

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

El precio de venta guardado es `sales.unitPrice`, sin IVA. Las tarjetas muestran
el PVP con el IVA configurado y la base sin IVA por separado; si falta el tipo
no se inventa un PVP bruto. `pvp` es el campo heredado de
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


## Origen y comparación de precios

`Product.priceSources` conserva hasta 200 ofertas o precios documentados de la
misma ficha; cada registro distingue proveedor, referencia, tarifa/descuento/coste,
unidad, factura o archivo, fecha cuando consta y momento de registro. La tarifa
puede incluir SHA-256 del original sin poner sus bytes en el repositorio o en
activos públicos. `purchasePriceSourceId` y `salePriceSourceId` vinculan el precio
vigente solo si importes, unidad y proveedor aún coinciden con su evidencia.

La lista descarga únicamente una proyección compacta de origen ligada a la firma
del precio; no descarga los historiales de 30 fichas. Si otro editor cambia el
precio sin actualizar esa proyección, se muestra origen no documentado. Leer
una ficha antigua nunca inventa una fecha, documento o alta manual para su precio.
Altas y ediciones explícitas de precio conservan los registros anteriores y
anotan la intervención manual; una oferta adicional no cambia el coste activo.
La fusión explícita preserva las fuentes de las fichas absorbidas y bloquea una
identidad de evidencia contradictoria o un historial de más de 200 registros.

La consulta optativa `action=sources` recorre 50 compras por página del mismo
propietario verificado. Solo devuelve líneas elegibles con nombre/alias completo
exacto o referencia dentro del mismo proveedor. Muestra el progreso para no
presentar una página sin coincidencias como ausencia de todo el histórico.
Conserva la unidad de cada oferta; no elige el más barato entre unidades o
características distintas. Una coincidencia de compra no se atribuye como origen
del coste guardado sin evidencia de esa selección.

## Admisión de tarifas

La pantalla Importar tarifa admite `FACTU_SUPPLIER_PRICE_CATALOG_V1`: hasta 50
referencias, precios de tarifa/venta sin IVA, descuento de compra y evidencia
por referencia. El proveedor y los datos del negocio vienen solo del archivo
privado elegido por el usuario. El coste se calcula al céntimo según el contrato
del normalizador del maestro; la tarifa y descuento originales quedan separados.

Una vista previa identifica la empresa de destino y los precios. El preflight
paginado lee solo identidades, incluidas ocultas/retiradas: una referencia ajena
o tombstone bloquea la admisión. Una tarifa ya admitida se omite sin reemplazar
su ficha. Los IDs son estables por empresa, catálogo y referencia. Todos los
productos nuevos se envían en un único `mutate-batch` existente con versión 0.
La respuesta debe confirmar cada índice y versión; pérdida de respuesta,
recarga o permiso temporal conservan exactamente el mismo lote en el sobre de
sesión aislado, sin fabricar un segundo comando ni presentar éxito parcial.
No hay nuevas tablas, migraciones, rutas de escritura ni cambios de permisos.
