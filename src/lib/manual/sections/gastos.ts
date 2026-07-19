import type { ManualSection } from "../types";

export const gastosSection: ManualSection = {
  slug: "gastos",
  title: "Gastos y compras",
  summary:
    "Registra lo que gastas, filtra por periodo y exporta para tu gestor.",
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
        "Si el documento es un **abono, devolución o saldo a favor**, conserva el importe base y las líneas con signo negativo. La app exige revisión manual, no lo autoguarda y lo identifica como **Abono · saldo a favor**. Al guardarlo reduce el gasto neto y, si es deducible, su base e IVA; solo revierte el coste de un trabajo cuando está vinculado a él. Nunca crea productos ni altera sus precios.",
        "Las líneas firmadas también admiten varios tipos: -100 € al 21 % y -100 € al 10 % producen base -200 €, IVA -31 € y total -231 €. Un signo neto opuesto o una evidencia de tipos conflictivos incompleta, inválida o descuadrada bloquean el gasto; un detalle legacy incompleto que no contradice la cabecera conserva ese cálculo.",
        "Si un desglose mixto está incompleto o no cuadra, el documento queda como **Revisar** y no se guarda en lote ni se usa como cifra fiscal hasta corregirlo. Los gastos antiguos sin líneas conservan su cálculo de cabecera y quedan identificados como **IVA de cabecera**.",
        "En un **gasto fijo no desgravable**, el importe introducido ya es el coste íntegro: la app aplica IVA fiscal 0. Si conserva líneas escaneadas, sus tipos quedan como información documental y no cambian ese importe.",
        "Si un resumen de proveedor incluye **recargo de equivalencia**, la app conserva base, IVA y recargo por separado y respeta el total documental. Por ejemplo, 100 € + 21 € de IVA + 5,20 € de recargo forman un coste de 126,20 €. Como el IVA y el recargo no son recuperables en esta compra, la base e IVA deducibles en IVA son cero y el importe completo alimenta el coste y el gasto orientativo de IRPF.",
        "Si la base, el IVA, el tipo o cuota de recargo y el total del resumen no cuadran, el gasto queda **por revisar** y la exportación fiscal se bloquea. La app no inventa un recargo a partir de una diferencia ambigua.",
        "Puedes vincular una compra a una factura o presupuesto en **Trabajo relacionado**. No cambia el PDF ni la numeración: solo sirve para saber qué gastos pertenecen a cada trabajo.",
        "Cuando una línea de compra se parece a algo comprado antes al mismo proveedor, la app puede avisarte si el precio o el descuento han cambiado bastante.",
        "Si el gasto trae un proveedor nuevo y la app puede identificarlo, se guarda en **Proveedores** para reutilizarlo después. Al guardar varias facturas de una tanda, todas comprueban el maestro actualizado: el mismo NIF o nombre normalizado reutiliza una sola alta. Dos NIF distintos nunca se fusionan solo porque el nombre coincida; si la factura trae NIF y un maestro antiguo no lo tiene, la app mantiene una alta separada para que puedas revisarla con seguridad.",
        "Cuando conviertes un documento escaneado en **gasto fijo**, proveedor, gasto y regla recurrente se confirman juntos en el almacenamiento del navegador. Solo después se marca el documento del buzón como procesado. Si ese cierre posterior falla, el gasto fijo ya guardado se reconoce por su operación y el siguiente intento repite únicamente el cierre del buzón, sin crear otro gasto. Si el guardado local se bloquea, el formulario permanece abierto y el documento no se marca como procesado; si la app no puede confirmar en qué estado quedó el almacenamiento, recarga y exporta una copia desde **Cuenta** antes de continuar.",
        "El **Buzón inteligente** muestra solo documentos abiertos. Al guardar un gasto, su entrada se cierra y desaparece; **Descartar** hace lo mismo sin crear un gasto. Si el cierre falla después de guardar, el gasto conserva el vínculo de origen y el siguiente intento cierra únicamente el buzón, sin duplicarlo. Cuando Datos de empresa contiene un email válido, la app envía además una copia con los adjuntos desde su propio dominio verificado, sin depender del servidor que reenvió el mensaje original.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-nuevo.png",
        alt: "Formulario de nuevo gasto",
      },
    },
    {
      title: "2. Clasificar el uso del gasto",
      paragraphs: [
        "En **Uso del gasto** elige una sola clasificación: **Empresa y deducible**, **Empresa, no deducible** o **Personal / no empresarial**. El selector único evita combinaciones contradictorias.",
        "Elige **Empresa y deducible** cuando el gasto pertenece a la actividad y lo vas a tratar como fiscalmente deducible. Es la opción incluida inicialmente al preparar una exportación para el gestor.",
        "Elige **Empresa, no deducible** cuando el gasto pertenece al negocio pero no debe reducir la base ni el IVA deducibles. Sigue contando como coste económico de la empresa y puedes incluirlo al exportar **Todos los gastos de empresa**.",
        "Elige **Personal / no empresarial** solo para conservar el movimiento como referencia. Queda fuera de los totales y cálculos de la actividad y solo se exporta cuando seleccionas expresamente **Todos los gastos**.",
        "Los gastos anteriores que todavía no tenían esta clasificación conservan su tratamiento histórico de empresa y deducible. Puedes abrir su ficha y cambiarlo sin alterar el documento original.",
        "La clasificación ayuda a ordenar y exportar, pero no sustituye la revisión fiscal de cada factura. Si tienes dudas sobre si un gasto es deducible, consúltalo con tu gestor.",
      ],
    },
    {
      title: "3. Filtrar por mes, trimestre o año",
      paragraphs: [
        "En el listado usa los filtros de **periodo** y **gasto**. También puedes filtrar pulsando un segmento del gráfico o su leyenda.",
        "Cada gasto muestra iconos compactos: de dónde viene (manual, escaneo, importación o fijo) y qué tipo es (factura, compra, ticket o fijo).",
        "Cuando hay líneas fiscales conciliadas verás **IVA por líneas**. **IVA de cabecera** identifica un gasto sin desglose fiscal completo; los fijos no desgravables muestran **importe íntegro** aunque conserven líneas documentales. Abre el detalle para consultar base, tipo, cuota y total de cada línea.",
        "El **Gasto neto** aparece junto a los filtros y descuenta los abonos del periodo. Si los abonos superan las compras, verás **Saldo a favor**. Los gráficos circulares solo representan saldos netos positivos para no convertir un abono en gasto; el listado y el total firmado siempre conservan todos los movimientos.",
        "Los gastos se ordenan de más nuevos a más antiguos, muestran separadores por mes y cargan 30 resultados cada vez para que la página no pese con historiales grandes.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-filtros.png",
        alt: "Filtros de periodo y gráfico por proveedor",
      },
    },
    {
      title: "4. Exportar y enviar al gestor",
      paragraphs: [
        "Pulsa **Exportar CSV** en el bloque de filtros para descargar un libro de gastos con cabecera de tu negocio, NIF de proveedores, totales y resumen por categoría.",
        "Cada fila indica el **tratamiento fiscal**, el coste registrado y, por separado, la base y el IVA deducibles. Un gasto **Empresa, no deducible** o **Personal / no empresarial** conserva su coste, pero muestra base e IVA deducibles a cero.",
        "Los abonos aparecen como **Abono / saldo a favor**, con importes negativos, y se descuentan de los totales del libro.",
        "El CSV indica también los tipos aplicados, el desglose y si el IVA procede de líneas conciliadas, de la cabecera o del contrato de importe íntegro no deducible. Una factura con evidencia de IVA mixto que no cuadra bloquea la exportación hasta que la revises; no se sustituye silenciosamente por un único porcentaje.",
        "Cuando existe recargo de equivalencia, el CSV lo publica en columnas separadas con su tipo y cuota. También diferencia el gasto deducible en IRPF de la base deducible en IVA; el total registrado incluye base, IVA y recargo una sola vez.",
        "La exportación respeta primero los filtros de periodo y proveedor que tengas activos. En **Qué incluir**, la opción inicial es **Solo empresa y deducibles**. También puedes elegir **Todos los gastos de empresa** o, de forma expresa, **Todos los gastos** para incluir los personales.",
        "El mismo alcance se aplica al CSV, al ZIP de gastos y originales y a **Exportar y enviar al gestor**. Incluir un gasto no deducible o personal no cambia su clasificación: seguirá identificado como tal dentro del archivo.",
        "Con **Exportar gastos y originales**, selecciona un mes o trimestre para descargar un ZIP. Incluye cada PDF o imagen que se archivó voluntariamente en Google Drive y un **Resumen Gastos** en PDF con todos los movimientos filtrados, sus totales y una marca clara para los gastos que todavía no tienen original archivado.",
        "Antes de incluir un original, Factu relee desde Drive su política, carpeta, tipo, tamaño y huella SHA-256. Si un archivo ya no coincide, bloquea el ZIP completo; no entrega un paquete parcial ni sustituye el original por un PDF inventado.",
        "**Exportar y enviar al gestor** descarga el mismo ZIP y prepara un correo para el contacto guardado en **Ajustes → Gestor**. Puedes usar Gmail, el correo del dispositivo o Compartir y recordar la elección. Gmail y el correo del dispositivo no adjuntan archivos automáticamente: adjunta el ZIP descargado antes de enviar; Compartir sí incluye el ZIP cuando el sistema lo admite.",
        "La exportación de originales está limitada a un mes o trimestre. Si tienes seleccionado un año completo, cambia el periodo para evitar paquetes demasiado grandes.",
        "La exportación manual de copia de datos está en **Cuenta**; este CSV es el listado de gastos para revisión o gestor.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-exportar.png",
        alt: "Botón exportar CSV en gastos",
      },
      tip: "El CSV usa separador ; y decimales con coma para abrirlo bien en Excel en español. El ZIP conserva los originales exactamente como estaban en Drive.",
    },
    {
      title: "5. Gastos fijos",
      paragraphs: [
        "En **Gastos fijos** defines pagos recurrentes (alquiler, software, cuota de autónomos, etc.). La app crea el gasto automáticamente cuando toca y lo verás en **Gastos y compras**.",
        "Cada gasto fijo utiliza el mismo selector **Uso del gasto**. Las ocurrencias que se creen heredarán esa clasificación y el exportador las incluirá o excluirá con las mismas reglas que un gasto normal.",
        "En una frecuencia **anual**, elige el mes y el vencimiento: día 1, día 15, último día o un día concreto. Las cuatro opciones se guardan y se repiten cada año; si el día concreto no existe en ese mes, se ajusta a su último día.",
        "Al editar una regla eliges desde qué fecha se aplican los cambios y la cadencia mensual o trimestral conserva su ancla. Si ya existen cargos, exclusiones o vínculos ambiguos desde el corte, la vista previa bloquea la operación: ningún gasto ya creado se borra, desplaza ni reescribe. Elige una fecha posterior o revisa esas ocurrencias por separado.",
        "Puedes elegir **Extra no desgravable** para un coste real que quieres controlar sin tratarlo como gasto fiscal. Un cargo positivo sí reduce el beneficio económico; un abono negativo revierte ese coste. Ambos siguen en Gastos, balance y Rentabilidad Real, pero aportan base e IVA deducibles cero: este tratamiento no reduce la base ni la reserva estimada de IRPF.",
        "Las ocurrencias no desgravables aparecen identificadas en el listado y en los CSV/PDF fiscales.",
        "Si faltan proveedor, concepto, importe o una fecha válida, el formulario permanece abierto y muestra un resumen de errores. Cada mensaje lleva al campo correspondiente para que puedas corregirlo sin perder el contexto.",
        "Una creación, edición, pausa, activación o borrado solo se refleja en la lista cuando el navegador confirma el guardado. Ante falta de espacio o permisos de almacenamiento, la regla anterior permanece en la sesión y verás un aviso para corregirlo y reintentar. Si el estado no se puede determinar con seguridad, recarga antes de seguir.",
        "Desde esa pantalla puedes volver al listado principal con **Volver**.",
      ],
      screenshot: {
        src: "/ayuda/capturas/gastos-fijos.png",
        alt: "Pantalla de gastos fijos",
      },
    },
  ],
};
