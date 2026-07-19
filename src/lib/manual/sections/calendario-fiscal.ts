import type { ManualSection } from "../types";

export const calendarioFiscalSection: ManualSection = {
  slug: "calendario-fiscal",
  title: "Calendario fiscal",
  summary:
    "Consulta vencimientos publicados por la AEAT, organiza tus modelos y prepara recordatorios.",
  order: 9.25,
  intro: [
    "El **Calendario fiscal** reúne los vencimientos publicados por la AEAT para las categorías y fechas que elijas. La vista **Todos** mantiene siempre disponible el calendario completo.",
    "Si has guardado un diagnóstico fiscal compatible, **Mis obligaciones** organiza el contenido alrededor de los modelos recomendados y de los que hayas añadido manualmente. Esta vista no modifica el calendario de la AEAT ni presenta declaraciones por ti.",
  ],
  steps: [
    {
      title: "1. Abrir el calendario y elegir la vista",
      paragraphs: [
        "Abre **Asesoría fiscal → Calendario fiscal**. Empieza en **Todos** para consultar los vencimientos cargados sin personalización.",
        "Si ya has guardado un diagnóstico fiscal compatible, puedes cambiar a **Mis obligaciones**. Esta vista destaca y organiza los eventos según los modelos recomendados y los que hayas añadido manualmente. Si todavía no está disponible, pulsa **Abrir diagnóstico**, complétalo y vuelve al calendario.",
        "El número de **Mis obligaciones** cuenta modelos únicos. El número de **Todos** cuenta los vencimientos cargados para el rango y las categorías seleccionados; por eso ambos contadores pueden ser distintos.",
      ],
      tip: "Puedes volver a Todos en cualquier momento para recuperar el calendario completo.",
    },
    {
      title: "2. Filtrar fechas y categorías",
      paragraphs: [
        "Indica las fechas **Desde** y **Hasta**, deja marcada al menos una categoría y pulsa **Aplicar filtros**.",
        "La AEAT publica **Renta**, **Renta y Sociedades** y **Sociedades** como calendarios separados. **Renta y Sociedades** no es un duplicado: reúne vencimientos que la fuente asigna a ambos ámbitos. También puedes consultar **IVA** y **Declaraciones informativas**.",
        "Si la carga falla, pulsa **Reintentar**. Si el rango devuelve demasiados resultados, acótalo y vuelve a aplicar los filtros.",
      ],
    },
    {
      title: "3. Leer cada vencimiento y abrir un modelo",
      paragraphs: [
        "Cada tarjeta muestra la categoría, la fecha publicada, el estado disponible y el texto de la fuente.",
        "En **Mis obligaciones**, las líneas relacionadas con tus modelos quedan a la vista y las referencias a otros modelos pueden agruparse bajo **Otros modelos publicados por la AEAT**. Pulsa **Mostrar** para recuperarlas; no se eliminan. Volver a **Todos** presenta de nuevo el contenido íntegro y en el orden original.",
        "Pulsa el número de un modelo para abrir el catálogo de **Modelos AEAT** desplazado hasta su ficha y resaltarla. Desde esa tarjeta puedes entrar en el detalle y usar **Volver al Calendario** para regresar. Las referencias que no se reconocen con seguridad permanecen como texto, sin fabricar un enlace.",
        "Si una tarjeta indica **Revisar con gestor**, **Por confirmar** o un estado provisional, conserva esa cautela al actuar. Al final de la página puedes comprobar la **Fuente** y la **Última consulta**.",
      ],
    },
    {
      title: "4. Preparar un recordatorio",
      paragraphs: [
        "Pulsa **Crear recordatorio** en un vencimiento para abrir **Avisos** con un borrador personal que incluye el texto y la fecha publicados.",
        "El borrador no se guarda automáticamente. Revisa el campo **Qué quieres recordar**, corrige el texto o la fecha si hace falta y guarda el recordatorio de forma explícita.",
      ],
      tip: "El calendario informa y organiza. No presenta modelos, no paga impuestos y no marca un trámite como realizado.",
    },
  ],
};
