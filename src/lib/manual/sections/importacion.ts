import type { ManualSection } from "../types";

export const importacionSection: ManualSection = {
  slug: "importacion",
  title: "Importar contactos",
  summary: "Trae clientes y proveedores desde otros programas.",
  order: 14,
  intro: [
    "El importador sirve para traer la agenda comercial desde un programa antiguo o externo. Solo aplica fichas de clientes y proveedores.",
    "Facturas, presupuestos, recibos, gastos, productos, numeración, datos de empresa y ajustes nunca cambian mediante esta pantalla. La restauración de una copia de seguridad es una operación distinta.",
    "La importación desde programas externos requiere Pro o una prueba Pro activa.",
  ],
  steps: [
    {
      title: "1. Elegir el programa de origen",
      paragraphs: [
        "En **Importar clientes y proveedores**, elige el programa que creó el archivo. Cada conector reconoce una estructura concreta.",
        "También puedes usar listados de contactos en Excel, Word o PDF cuando su estructura sea reconocible.",
      ],
      tip: "Selecciona el origen correcto para evitar que los nombres de columnas se interpreten mal.",
    },
    {
      title: "2. Revisar los contactos",
      paragraphs: [
        "La app analiza el archivo y muestra cuántos clientes y proveedores ha detectado antes de guardar nada.",
        "Aunque el archivo incluya ventas, compras u otros datos, esa información se ignora al aplicar la importación.",
      ],
    },
    {
      title: "3. Aplicar la importación",
      paragraphs: [
        "Pulsa **Importar clientes y proveedores** cuando los recuentos sean correctos. Justo antes de guardar, la app vuelve a comprobar que la cuenta no haya cambiado.",
        "Si ya habías importado contactos desde ese origen, sus fichas se actualizan para evitar duplicados. Los contactos creados manualmente se conservan.",
        "En Pro o Pro+, los clientes y proveedores importados se sincronizan con los dispositivos activos de la cuenta.",
      ],
    },
  ],
};
