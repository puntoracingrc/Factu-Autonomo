import type { ManualSection } from "../types";

export const productosSection: ManualSection = {
  slug: "productos",
  title: "Productos",
  summary: "Consulta materiales y servicios detectados en tus compras.",
  order: 8,
  steps: [
    {
      title: "1. Cómo se crea la lista",
      paragraphs: [
        "La sección **Productos** se genera automáticamente con las líneas de compra que la app detecta al escanear facturas de proveedor.",
        "También puedes crear un producto manualmente desde **Nuevo producto** si quieres tener controlado un material o servicio antes de que aparezca en una compra.",
        "Cuando una compra trae líneas claras, la app agrupa conceptos parecidos y muestra precio, descuento, proveedor habitual y volumen comprado.",
      ],
    },
    {
      title: "2. Qué puedes revisar",
      paragraphs: [
        "Puedes buscar por producto, familia o proveedor. También puedes filtrar por familia y por proveedor habitual, y ordenar por última compra, más comprados, menos comprados o importe comprado.",
        "Cada ficha muestra el último coste real, coste medio, descuento habitual, volumen comprado y total comprado.",
        "El PVP proveedor es la tarifa antes del descuento del distribuidor. El coste es lo que realmente pagas después de aplicar ese descuento.",
      ],
    },
    {
      title: "3. Editar y unificar",
      paragraphs: [
        "Pulsa **Editar** en una ficha para corregir nombre, familia o unidad. Si asignas una familia manualmente, Factu la recordará en futuros escaneos del mismo producto.",
        "Si ves dos productos que en realidad son el mismo, usa **Unificar producto** dentro de la ficha que quieres conservar. Puedes buscar el duplicado por nombre, familia o proveedor antes de fusionarlo.",
      ],
    },
    {
      title: "4. Para qué sirve",
      paragraphs: [
        "Esta base te ayuda a ver qué compras más, a qué proveedor se lo compras y si los precios o descuentos empiezan a moverse.",
        "Al crear presupuestos, facturas y recibos, escribe el producto en una línea y elige una sugerencia para insertarlo. La app prioriza el PVP proveedor; si no existe, avisa de que solo está usando el coste como referencia.",
        "También puedes seleccionar varios productos desde **Productos** y abrir una factura, presupuesto o recibo con esas líneas ya preparadas. Todo queda editable: cantidad, unidad, precio, IVA e incremento.",
      ],
      tip: "Si un producto aparece raro, revisa la línea original en el gasto: esta pantalla se alimenta de esos textos.",
    },
  ],
};
