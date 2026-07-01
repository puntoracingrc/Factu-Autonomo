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
        "No tienes que dar de alta productos uno a uno. Cuando una compra trae líneas claras, la app agrupa conceptos parecidos y muestra precio, descuento, proveedor habitual y volumen comprado.",
      ],
    },
    {
      title: "2. Qué puedes revisar",
      paragraphs: [
        "Puedes buscar por producto, familia o proveedor. También puedes filtrar por familia y por proveedor habitual.",
        "Cada ficha muestra el último coste, precio medio, descuento habitual, volumen comprado y total comprado.",
        "Si un producto aparece también en facturas, presupuestos o recibos, verás un PVP detectado y un margen orientativo. Si no aparece aún en ventas, se mostrará como pendiente.",
      ],
    },
    {
      title: "3. Para qué sirve",
      paragraphs: [
        "Esta base te ayuda a ver qué compras más, a qué proveedor se lo compras y si los precios o descuentos empiezan a moverse.",
        "Más adelante servirá para reutilizar productos directamente al crear presupuestos, facturas y recibos.",
      ],
      tip: "Si un producto aparece raro, revisa la línea original en el gasto: esta pantalla se alimenta de esos textos.",
    },
  ],
};
