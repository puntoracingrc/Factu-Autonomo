import type { ManualSection } from "../types";

export const gastosSection: ManualSection = {
  slug: "gastos",
  title: "Gastos y compras",
  summary: "Registra lo que gastas, filtra por periodo y exporta para tu gestor.",
  order: 7,
  steps: [
    {
      title: "1. Registrar un gasto",
      paragraphs: [
        "Ve a **Gastos** → **+ Añadir gasto**. Indica proveedor, importe base, IVA, categoría y forma de pago.",
        "Puedes escanear una factura de compra con la cámara si tienes escaneos disponibles (plan Pro).",
        "El escaneo usa IA externa. La primera vez verás un aviso para aceptar ese tratamiento; después solo verás un recordatorio pequeño y se consumirán los créditos correspondientes.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-nuevo.png",
        alt: "Formulario de nuevo gasto",
      },
    },
    {
      title: "2. Filtrar por mes, trimestre o año",
      paragraphs: [
        "En el listado usa los filtros de **periodo** y, si quieres, filtra por **proveedor** pulsando el gráfico circular.",
        "El total gastado se actualiza según los filtros activos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-filtros.png",
        alt: "Filtros de periodo y gráfico por proveedor",
      },
    },
    {
      title: "3. Exportar CSV",
      paragraphs: [
        "Pulsa **Exportar CSV** para descargar un libro de gastos con cabecera de tu negocio, NIF de proveedores, totales y resumen por categoría.",
        "El archivo respeta los filtros que tengas activos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-exportar.png",
        alt: "Botón exportar CSV en gastos",
      },
      tip: "El CSV usa separador ; y decimales con coma para abrirlo bien en Excel en español.",
    },
    {
      title: "4. Gastos fijos",
      paragraphs: [
        "En **Gastos fijos** defines pagos recurrentes (alquiler, software, etc.). La app te avisará cuando toque registrarlos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-fijos.png",
        alt: "Pantalla de gastos fijos",
      },
    },
  ],
};
