# Roadmap: compras, gastos, tickets y margen por trabajo

## Objetivo

Convertir `Gastos y compras` en una herramienta práctica para autónomos:
registrar rápido, clasificar sin fricción, vincular gastos a trabajos y detectar
si un presupuesto se queda corto antes de repetir errores.

## Fase 1: clasificación clara de gastos

- Distinguir internamente:
  - factura de compra;
  - compra a proveedor;
  - ticket / gasto rápido;
  - gasto fijo.
- Mantener una sola sección de `Gastos`, sin añadir pantallas innecesarias.
- Mostrar etiquetas compactas en el listado.
- Permitir corregir el tipo en el formulario de gasto.
- Hacer que escaneos, importaciones y gastos fijos propongan el tipo.

## Fase 2: escaneo más inteligente

- La IA debe proponer si el documento parece factura, ticket, compra o fijo.
- Avisar si el ticket no trae datos fiscales completos.
- Avisar si parece gasto recurrente para sugerir configurarlo como gasto fijo.

## Fase 3: vínculos de compras con trabajos

- Permitir enlazar un gasto/compra a:
  - cliente;
  - presupuesto;
  - factura;
  - trabajo/intervención futura.
- Empezar manual, luego sugerencias por cliente, texto, fecha y materiales.

## Fase 4: margen real por trabajo

- Calcular:
  - facturado;
  - compras asociadas;
  - gastos imputados;
  - margen aproximado.
- Mostrarlo como ayuda de gestión, no como contabilidad cerrada.

## Fase 5: avisos de precios de proveedor

- Detectar subidas relevantes en productos o proveedores frecuentes.
- Avisar cambios de descuento o precio medio.
- Sugerir revisar tarifas cuando un material sube.

## Fase 6: ayuda al presupuestar

- Al crear presupuesto, comparar con trabajos parecidos.
- Avisar si en casos similares el margen fue bajo.
- Avisar si un material ha subido desde el último presupuesto parecido.
- Avisar si se suelen infrapresupuestar horas, desplazamiento o material.

## Principio de producto

La app no debe copiar la complejidad de herramientas pyme. El autónomo sube,
escanea o escribe; la app propone una clasificación y el usuario confirma.
