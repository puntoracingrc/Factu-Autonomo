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
        "Ahora mismo el conector disponible es **PC Facturación 3.0**. Otros orígenes, como PrestaShop o Excel/CSV, aparecerán cuando tengan importador propio.",
      ],
      tip: "No todos los archivos sirven para todos los conectores. Una base de PC Facturación no tiene la misma estructura que una tienda PrestaShop.",
    },
    {
      title: "2. Subir el archivo de datos",
      paragraphs: [
        "Para PC Facturación, selecciona la copia **MDB** del programa antiguo. La app analiza el archivo y muestra una previsualización antes de importar nada.",
        "La previsualización indica empresa detectada, clientes, facturas, presupuestos, líneas y avisos si hay datos antiguos que no se pueden casar con documentos activos.",
      ],
    },
    {
      title: "3. Archivo DWI opcional en PC Facturación",
      paragraphs: [
        "Si eliges **PC Facturación 3.0**, aparece el campo **Archivo DWI opcional**. Ese archivo suele estar junto al MDB y guarda la numeración configurada por el usuario.",
        "No es obligatorio. Si lo tienes, ayuda a continuar con el siguiente número de factura, presupuesto o recibo usando el formato del programa antiguo.",
      ],
      tip: "El DWI solo aparece para PC Facturación porque es un archivo propio de ese programa.",
    },
    {
      title: "4. Aplicar la importación",
      paragraphs: [
        "Cuando la previsualización sea correcta, pulsa **Importar a esta cuenta**. Si ya habías importado ese origen antes, la app reemplaza esa importación para evitar duplicados.",
        "Los datos creados manualmente en Factura Autónomo se conservan. Si tienes sesión en la nube y plan Pro, los cambios se sincronizan con tus otros dispositivos.",
      ],
    },
  ],
};
