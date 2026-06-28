import type { ManualSection } from "../types";

export const importacionSection: ManualSection = {
  slug: "importacion",
  title: "Importar datos",
  summary: "Trae clientes, facturas y presupuestos desde otros programas.",
  order: 11,
  intro: [
    "El importador está pensado para migrar datos desde programas antiguos o externos. Cada origen guarda la información de una forma distinta, por eso primero se elige o detecta el programa de origen.",
    "La importación de bases de datos externas es una función Pro. Puedes revisar la pantalla y los orígenes disponibles, pero para analizar e importar necesitas Pro o la prueba Pro activa.",
  ],
  steps: [
    {
      title: "1. Elegir el programa de origen",
      paragraphs: [
        "En **Importar datos**, usa **Programa de origen**. Puedes dejar **Detectar automáticamente** o elegir un conector concreto si sabes de dónde viene la copia.",
        "Cada conector interpreta una estructura concreta. Otros orígenes aparecerán cuando tengan importador propio.",
      ],
      tip: "No todos los archivos sirven para todos los conectores. Usa el origen que corresponda a la copia que quieres traer.",
    },
    {
      title: "2. Subir el archivo de datos",
      paragraphs: [
        "Selecciona el archivo principal generado por el programa de origen. La app analiza el archivo y muestra una previsualización antes de importar nada.",
        "La previsualización indica empresa detectada, clientes, facturas, presupuestos, líneas y avisos si hay datos antiguos que no se pueden casar con documentos activos.",
      ],
    },
    {
      title: "3. Archivo auxiliar opcional",
      paragraphs: [
        "Algunos orígenes permiten añadir un archivo auxiliar. Suele estar junto al archivo principal y puede guardar ajustes como numeraciones configuradas por el usuario.",
        "No es obligatorio. Si lo tienes, ayuda a continuar con el siguiente número de factura, presupuesto o recibo usando el formato anterior.",
      ],
      tip: "Si el origen elegido no necesita archivo auxiliar, puedes seguir solo con el archivo principal.",
    },
    {
      title: "4. Aplicar la importación",
      paragraphs: [
        "Cuando la previsualización sea correcta, pulsa **Importar a esta cuenta**. Si ya habías importado ese origen antes, la app reemplaza esa importación para evitar duplicados.",
        "Si el archivo trae facturas antiguas marcadas como impagadas, la app te preguntará si quieres mantener ese estado o marcarlas como pagadas al importar.",
        "Los datos creados manualmente en Factura Autónomo se conservan. Si tienes sesión en la nube y plan Pro, los cambios se sincronizan con tus otros dispositivos.",
      ],
    },
  ],
};
