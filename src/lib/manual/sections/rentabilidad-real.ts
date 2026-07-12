import type { ManualSection } from "../types";

export const rentabilidadRealSection: ManualSection = {
  slug: "rentabilidad-real",
  title: "Rentabilidad Real",
  summary:
    "Activa los módulos adecuados y analiza trabajos, horas, precios, informes y evolución sin crear contabilidad nueva.",
  order: 15,
  intro: [
    "Rentabilidad Real reutiliza tus presupuestos, facturas, gastos y gastos fijos para ofrecer análisis internos. Sus resultados son orientativos: no sustituyen la contabilidad, los impuestos de la app ni el criterio de tu gestor.",
    "Las respuestas del test, módulos activos, modos de análisis y preferencias se guardan localmente en este navegador. Algunos módulos requieren Pro+ cuando la facturación por planes está activa.",
  ],
  steps: [
    {
      title: "1. Entrar, activar módulos y restablecer la configuración",
      paragraphs: [
        "Abre **Rentabilidad Real** en `/rentabilidad-real`. La portada muestra el acceso de tu plan, el resultado del test, el estado de revisión con tu gestor, los módulos activos y el catálogo disponible.",
        "Si empiezas de cero, pulsa **Hacer test guiado**. Si ya conoces el módulo que necesitas, puedes activarlo desde el catálogo cuando esté incluido en tu plan. Las tarjetas de **Herramientas** abren las dos calculadoras, el simulador, los informes y la evolución.",
        "**Restablecer configuración** borra las respuestas, módulos, modos, ajustes y preferencias locales de Rentabilidad Real después de pedir confirmación. También elimina las imputaciones locales de importe y exclusiones de líneas usadas por estos cálculos. No borra facturas, presupuestos, gastos, impuestos, datos fiscales ni desvincula las relaciones persistentes de un gasto.",
        "El bloque de datos existentes te ayuda a comprobar si ya hay documentos y gastos que puedan alimentar los cálculos. Activar un módulo no modifica esas entidades.",
      ],
      tip: "Haz primero el test y valida el resumen con tu gestor si tienes dudas sobre régimen, vehículo o tratamiento fiscal.",
    },
    {
      title: "2. Completar el test guiado",
      paragraphs: [
        "En `/rentabilidad-real/test` responde las preguntas sobre forma jurídica, forma de cobrar, empleados, local, materiales, vehículos, herramientas, régimen, IVA, retenciones e intereses de análisis. El contador superior indica cuántos bloques has contestado.",
        "Las preguntas que permiten varias respuestas usan botones que puedes activar o desactivar. En materiales y vehículos, **Ninguno** excluye las demás opciones del mismo bloque.",
        "Pulsa **Ver resultado** para guardar localmente el perfil y ver nivel, modos de cálculo, complementos y módulos opcionales recomendados. Desde el resultado puedes activar los recomendados incluidos, abrir una calculadora, simular el precio mínimo, consultar informes o preparar la validación con tu gestor.",
        "Si el caso queda fuera de los niveles disponibles, la pantalla lo marca como **fase futura** y no activa módulos incompatibles. Una recomendación de vehículo o estructura sirve para rentabilidad interna y no implica deducibilidad fiscal automática.",
      ],
    },
    {
      title: "3. Validar la configuración con tu gestor",
      paragraphs: [
        "En `/rentabilidad-real/validar-configuracion` revisa el resumen generado a partir del test. Si todavía no hay test, puedes volver a hacerlo o copiar un resumen que indique los datos pendientes.",
        "**Copiar resumen para mi gestor** lleva el texto al portapapeles para que lo compartas por el canal que prefieras. Esta pantalla no envía datos, no es un portal de gestoría y no presenta liquidaciones de impuestos.",
        "Puedes marcar el estado como **Pendiente de revisar**, **Validado por mi gestor**, **Corregido por mi gestor** o **Reiniciar estado**. El estado se conserva en este navegador y vuelve a mostrarse en la portada.",
        "La marca de validación es una ayuda organizativa: no sustituye asesoramiento profesional ni cambia documentos, gastos o configuración fiscal.",
      ],
    },
    {
      title: "4. Calcular la rentabilidad de un trabajo",
      paragraphs: [
        "En `/rentabilidad-real/calculadora/trabajo` elige **Presupuesto** para comparar lo previsto o **Factura** para revisar un trabajo facturado. Busca por número, cliente, estado o importe y selecciona el documento.",
        "Revisa el **Modo de análisis**: trabajo a precio cerrado, instalación con materiales, servicio/visita o documento simple. El modo queda como preferencia local y ayuda a interpretar el trabajo; no altera el documento fiscal.",
        "La pantalla detecta presupuesto y factura relacionados, gastos enlazados y gastos fijos candidatos. En **Gastos del trabajo** puedes vincular o desvincular gastos operativos y ajustar el importe aplicado. Al vincular sin un reparto explícito se incluyen automáticamente todas las líneas disponibles; la selección parcial de líneas se gestiona desde Facturas, no desde este panel. Estas relaciones alimentan el cálculo, pero no cambian el PDF, el contenido emitido ni VeriFactu.",
        "Elige cómo imputar gastos fijos: no imputar, importe manual, peso de facturación, número de trabajos u horas. Selecciona los gastos fijos que quieras incluir y revisa la **provisión IRPF estimada**; es una reserva orientativa, no el impuesto definitivo.",
        "Los **Ajustes internos no fiscales** permiten representar costes para gestión que no deben convertirse en gasto deducible, IVA o exportación fiscal. El resultado separa ingresos, costes directos, fijos, ajustes, beneficio, margen, reserva y caja prudente, y muestra advertencias y trazabilidad.",
        "Si no existe ningún presupuesto o factura, la pantalla ofrece crear uno. Si un resultado parece incompleto, revisa primero vínculos, reparto de gastos, modo de análisis y calidad de los datos; **Limpiar filtros** recupera la lista completa de candidatos del panel de gastos.",
      ],
    },
    {
      title: "5. Calcular por horas o proyecto",
      paragraphs: [
        "En `/rentabilidad-real/calculadora/horas` usa un presupuesto o factura existente, o cambia a **Simulación manual** para probar un proyecto sin crear datos contables.",
        "Elige si cobras por horas, proyecto cerrado o iguala mensual. En modo manual indica nombre, cliente opcional, ingreso sin IVA, IVA y costes directos; en modo documento se reutilizan sus importes y relaciones existentes.",
        "Distingue **Horas facturadas** de **Horas reales trabajadas**. Puedes detallar horas no facturables, reuniones, revisiones y administración, o indicar directamente las horas reales totales.",
        "Configura el reparto de gastos fijos y la provisión orientativa de IRPF. Los resultados muestran rentabilidad total y por hora real; los costes manuales y ajustes internos permanecen como simulación local y no se exportan como contabilidad.",
      ],
    },
    {
      title: "6. Simular el precio mínimo",
      paragraphs: [
        "En `/rentabilidad-real/simulador-precio-minimo` elige **Por hora**, **Trabajo/obra**, **Proyecto cerrado** o **Mensual** según la unidad que quieras calcular.",
        "Puedes partir de una simulación manual o de un documento existente. Indica el beneficio objetivo, costes directos, ajustes internos previstos, horas o trabajos estimados y gastos fijos. También puedes cargar los gastos fijos mensuales detectados.",
        "Revisa cuota de autónomo, criterio de reparto de fijos, margen deseado, provisión IRPF e IVA aplicable. Marca **La cuota ya está incluida** cuando la cuota de autónomo ya forme parte de los gastos fijos seleccionados, para no sumarla dos veces. El simulador calcula el mínimo sin IVA y el precio final con IVA para el supuesto elegido.",
        "Cuando eliges un documento se reutilizan sus importes y gastos enlazados. El resultado no se guarda como precio contractual, factura ni verdad contable; úsalo para comparar escenarios antes de presupuestar.",
      ],
    },
    {
      title: "7. Consultar informes por documento y cliente",
      paragraphs: [
        "En `/rentabilidad-real/informes` filtra por periodo, tipo de documento, modo de análisis y reparto de gastos fijos. En periodo personalizado puedes indicar fechas desde/hasta.",
        "Decide si incluyes presupuestos todavía sin factura y ajustes internos. Configura el umbral de margen bajo y la provisión IRPF orientativa; los resultados se recalculan al momento y las preferencias quedan en este navegador.",
        "El **Informe por documento** representa una factura, un presupuesto o el par vinculado presupuesto/factura una sola vez. Puedes corregir el modo de análisis de una fila o aplicarlo en bloque.",
        "El **Informe por cliente** agrupa los documentos analizados. **Calidad de datos** señala documentos sin modo, gastos candidatos sin enlazar y otros huecos que pueden cambiar el resultado al corregirse.",
        "En móvil y tablet, los informes por documento y cliente se presentan como tarjetas con las mismas cifras, alertas y acciones. En pantallas grandes se mantiene la tabla completa; si alguna columna queda fuera, desplázala horizontalmente.",
        "Si el filtro no encuentra filas, revisa fechas, tipo de documento y si existen facturas o presupuestos analizables. El informe no duplica ni reescribe la contabilidad.",
      ],
    },
    {
      title: "8. Revisar la evolución",
      paragraphs: [
        "En `/rentabilidad-real/evolucion` agrupa la lectura por mes, trimestre, cliente o modo de análisis. Acota fechas y, si lo necesitas, filtra por cliente o modo.",
        "Elige el reparto de gastos fijos y si incluyes presupuestos sin factura, ajustes internos o solo periodos con margen bajo. **Ver todo** elimina únicamente las fechas Desde/Hasta; conserva la agrupación, el cliente, el modo, los fijos y los demás interruptores.",
        "Las tarjetas resumen ingresos sin IVA, costes directos, fijos, beneficio documentado e interno, margen, caja prudente y reservas estimadas. En móvil y tablet, cada periodo o grupo se presenta también como una tarjeta con sus modos y alertas; en pantallas grandes se muestra la tabla completa.",
        "Evolución recalcula sobre los datos actuales y no guarda snapshots contables. IVA e IRPF son referencias orientativas; la ausencia de filas significa que el rango o filtro no contiene documentos analizables.",
      ],
    },
  ],
};
