import type { ManualSection } from "../types";

export const gastosSection: ManualSection = {
  slug: "gastos",
  title: "Gastos y compras",
  summary: "Registra lo que gastas, filtra por periodo y exporta para tu gestor.",
  order: 8,
  steps: [
    {
      title: "1. Registrar un gasto",
      paragraphs: [
        "Ve a **Gastos** → **+ Añadir gasto**. Indica proveedor, importe base, IVA, categoría y forma de pago.",
        "Marca el **tipo de gasto**: factura de compra, compra a proveedor, ticket/gasto rápido o gasto fijo. Si escaneas un documento, la app propondrá una opción y puedes corregirla antes de guardar.",
        "Puedes escanear una factura de compra con la cámara si tienes escaneos disponibles. Pro y Pro+ IA amplían los límites mensuales.",
        "También puedes seleccionar varios PDF o imágenes a la vez. La app procesa hasta 5 archivos por tanda: revisas el primero, lo guardas y pasa al siguiente.",
        "El escaneo usa IA externa. La primera vez verás un aviso para aceptar ese tratamiento; después solo verás un recordatorio pequeño y se consumirán los créditos correspondientes.",
        "Si la IA detecta número de factura, NIF del proveedor, dirección, vencimiento o líneas de compra, esos datos quedan en el gasto y puedes corregirlos antes de guardar.",
        "En una factura con varios tipos de IVA, revisa el IVA de cada línea. Cuando las bases de las líneas cuadran con la base del gasto, la app calcula y guarda el total desde ese desglose; por ejemplo, 100 € al 21 % y 100 € al 10 % son 31 € de IVA y 231 € en total.",
        "Si un desglose mixto está incompleto o no cuadra, el documento queda como **Revisar** y no se guarda en lote ni se usa como cifra fiscal hasta corregirlo. Los gastos antiguos sin líneas conservan su cálculo de cabecera y quedan identificados como **IVA de cabecera**.",
        "En un **gasto fijo no desgravable**, el importe introducido ya es el coste íntegro: la app aplica IVA fiscal 0. Si conserva líneas escaneadas, sus tipos quedan como información documental y no cambian ese importe.",
        "Puedes vincular una compra a una factura o presupuesto en **Trabajo relacionado**. No cambia el PDF ni la numeración: solo sirve para saber qué gastos pertenecen a cada trabajo.",
        "Cuando una línea de compra se parece a algo comprado antes al mismo proveedor, la app puede avisarte si el precio o el descuento han cambiado bastante.",
        "Si el gasto trae un proveedor nuevo y la app puede identificarlo, se guarda en **Proveedores** para reutilizarlo después. La app intenta reutilizar proveedores parecidos para evitar duplicados.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-nuevo.png",
        alt: "Formulario de nuevo gasto",
      },
    },
    {
      title: "2. Filtrar por mes, trimestre o año",
      paragraphs: [
        "En el listado usa los filtros de **periodo** y **gasto**. También puedes filtrar pulsando un segmento del gráfico o su leyenda.",
        "Cada gasto muestra iconos compactos: de dónde viene (manual, escaneo, importación o fijo) y qué tipo es (factura, compra, ticket o fijo).",
        "Cuando hay líneas fiscales conciliadas verás **IVA por líneas**. **IVA de cabecera** identifica un gasto sin desglose fiscal completo; los fijos no desgravables muestran **importe íntegro** aunque conserven líneas documentales. Abre el detalle para consultar base, tipo, cuota y total de cada línea.",
        "El total gastado aparece junto a los filtros y se actualiza según lo que tengas seleccionado. Pulsa **Restablecer** en el bloque de gráficos para volver al listado completo.",
        "Los gastos se ordenan de más nuevos a más antiguos, muestran separadores por mes y cargan 30 resultados cada vez para que la página no pese con historiales grandes.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-filtros.png",
        alt: "Filtros de periodo y gráfico por proveedor",
      },
    },
    {
      title: "3. Exportar CSV",
      paragraphs: [
        "Pulsa **Exportar CSV** en el bloque de filtros para descargar un libro de gastos con cabecera de tu negocio, NIF de proveedores, totales y resumen por categoría.",
        "Cada fila indica el **tratamiento fiscal**, el coste registrado y, por separado, la base y el IVA deducibles. Un gasto **No deducible** conserva su coste, pero muestra base e IVA deducibles a cero.",
        "El CSV indica también los tipos aplicados, el desglose y si el IVA procede de líneas conciliadas, de la cabecera o del contrato de importe íntegro no deducible. Una factura con evidencia de IVA mixto que no cuadra bloquea la exportación hasta que la revises; no se sustituye silenciosamente por un único porcentaje.",
        "El archivo respeta los filtros que tengas activos.",
        "La exportación manual de copia de datos está en **Cuenta**; este CSV es el listado de gastos para revisión o gestor.",
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
        "En **Gastos fijos** defines pagos recurrentes (alquiler, software, cuota de autónomos, etc.). La app crea el gasto automáticamente cuando toca y lo verás en **Gastos y compras**.",
        "Puedes elegir **Extra no desgravable** para un coste real que quieres controlar sin tratarlo como gasto fiscal. Sigue contando en Gastos, balance y Rentabilidad Real y sí reduce el beneficio económico, pero no genera base ni IVA deducibles y no reduce la base ni la reserva estimada de IRPF.",
        "Las ocurrencias no desgravables aparecen identificadas en el listado y en los CSV/PDF fiscales.",
        "Desde esa pantalla puedes volver al listado principal con **Volver**.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-fijos.png",
        alt: "Pantalla de gastos fijos",
      },
    },
  ],
};
