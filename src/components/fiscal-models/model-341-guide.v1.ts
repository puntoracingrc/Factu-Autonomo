import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const AEAT_REAGP =
  "https://sede.agenciatributaria.gob.es/Sede/iva/regimenes-tributacion-iva/regimen-especial-agricultura-ganaderia-pesca.html";
const AEAT_REAGP_OVERVIEW =
  "https://sede.agenciatributaria.gob.es/Sede/iva/regimenes-tributacion-iva/regimen-especial-agricultura-ganaderia-pesca/que-consiste-regimen-especial-agricultura-pesca.html";
const AEAT_REAGP_COMPENSATION =
  "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2025/capitulo-06-regimenes-especiales-iva/regimen-especial-agricultura-ganaderia-pesca/calculo-reintegro-compensacion.html";
const AEAT_REGISTER_DESIGNS =
  "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-300-399.html";
const LIVA = "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740";
const RIVA = "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925";
const ORDER_EHA_3212_2004 =
  "https://www.boe.es/buscar/doc.php?id=BOE-A-2004-17306";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al IVA aplicable en la Península y las Islas Baleares. Canarias aplica el IGIC y Ceuta y Melilla aplican el IPSI. País Vasco y Navarra pueden tener particularidades de gestión y competencia tributaria. Las operaciones con destino a otros Estados miembros o fuera del territorio de aplicación del IVA deben analizarse según las reglas de transporte, exportación y localización de servicios.";

export const MODEL_341_GUIDE_V1 = {
  code: "341",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los formularios y trámites se abren en la sede oficial. Factu no firma, presenta ni envía solicitudes o documentos a la Agencia Tributaria y no almacena facturas, datos de explotaciones, operaciones agrarias ni cuentas bancarias desde esta guía.",
  intro: [
    "El Modelo 341 permite que un agricultor, ganadero, silvicultor o pescador incluido en el régimen especial solicite a Hacienda el reintegro de determinadas compensaciones vinculadas a exportaciones, expediciones a otros Estados miembros y ciertos servicios prestados a destinatarios establecidos fuera del territorio del IVA español.",
    "No se utiliza para todas las ventas del sector agrario. En muchas operaciones nacionales la compensación la paga directamente el comprador, no Hacienda.",
  ],
  notices: [
    {
      title: "Solo para titulares incluidos en el REAGP",
      paragraphs: [
        "Estar en módulos de IRPF no demuestra por sí solo la inclusión en el régimen especial de agricultura, ganadería y pesca del IVA. Comprueba la situación censal y las exclusiones aplicables.",
      ],
    },
    {
      title: "Hacienda no paga todas las compensaciones",
      paragraphs: [
        "El Modelo 341 se reserva a determinadas operaciones exteriores. En las ventas nacionales ordinarias, la compensación suele reintegrarla el adquirente mediante el recibo correspondiente.",
      ],
    },
    {
      title: "No devuelve cada factura de gasto",
      paragraphs: [
        "La compensación es a tanto alzado y se calcula sobre determinadas ventas o servicios. No equivale al IVA exacto soportado en cada compra.",
      ],
    },
    {
      title: "Porcentajes revisables",
      paragraphs: [
        "Los porcentajes del 12 % y 10,5 % se han verificado para 2026, pero deben revisarse cuando cambie la normativa o la actividad declarada mediante el Modelo 036.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar si mi operación permite el reintegro",
      sourceId: "aeat.model-341.procedure-home.2026-02-13",
      primary: true,
    },
    {
      label: "Consultar las instrucciones oficiales",
      sourceId: "aeat.model-341.instructions.2026-06-09",
    },
    { label: "Consultar el régimen especial agrario", href: AEAT_REAGP },
    {
      label: "Consultar declaraciones presentadas",
      sourceId: "aeat.model-341.procedure-home.2026-02-13",
    },
    {
      label: "Consultar el estado de tramitación",
      sourceId: "aeat.model-341.procedure-home.2026-02-13",
    },
    {
      label: "Contestar requerimientos o aportar documentos",
      sourceId: "aeat.model-341.procedure-home.2026-02-13",
    },
  ],
  quickSummaryTitle: "El Modelo 341 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una solicitud de reintegro de compensaciones del régimen especial agrario." },
    { label: "Quién lo presenta", value: "Titulares de explotaciones incluidos en el REAGP cuando la operación permite solicitar el reintegro a Hacienda." },
    { label: "Operaciones", value: "Exportaciones, expediciones a otros Estados miembros y determinados servicios a destinatarios fuera del territorio del IVA español." },
    { label: "Ventas nacionales", value: "Normalmente la compensación la paga el comprador; no se solicita mediante el 341." },
    { label: "Agricultura y silvicultura", value: "12 %, verificado para 2026 y sujeto a revisión normativa." },
    { label: "Ganadería y pesca", value: "10,5 %, verificado para 2026 y sujeto a revisión normativa." },
    { label: "Periodicidad", value: "Trimestral, solo cuando existen operaciones por las que Hacienda debe reintegrar compensación." },
    { label: "Plazos", value: "20 días naturales tras 1T, 2T y 3T; 30 días naturales de enero para 4T." },
    { label: "Presentación", value: "Electrónica; certificado para todos y Cl@ve para personas físicas según las instrucciones vigentes." },
  ],
  sections: [
    {
      id: "model-341-reagp",
      title: "Qué es el REAGP y cómo funciona",
      intro: [
        "REAGP significa régimen especial de la agricultura, ganadería y pesca. Puede aplicarse a determinadas explotaciones agrícolas, forestales, ganaderas o pesqueras y a ciertos servicios accesorios cuando se cumplen sus condiciones.",
      ],
      cards: [
        {
          title: "Funcionamiento general",
          bullets: [
            "En las operaciones incluidas no se repercute ni se liquida el IVA como en el régimen general.",
            "No se deducen normalmente las cuotas soportadas en bienes y servicios empleados en la actividad incluida.",
            "A cambio, se percibe una compensación a tanto alzado.",
            "Deben conservarse libros, facturas, recibos y pruebas de las operaciones.",
          ],
        },
        {
          title: "Quién puede presentar el 341",
          bullets: [
            "Titular de una explotación incluida en el REAGP.",
            "Operación que genera derecho a compensación.",
            "Operación cuyo reintegro corresponde a Hacienda.",
            "Documentación suficiente y presentación dentro del trimestre correcto.",
          ],
        },
        {
          title: "No confundir con módulos",
          paragraphs: [
            "El Modelo 131 es un pago fraccionado del IRPF en estimación objetiva. El Modelo 341 pertenece al IVA. Una persona puede tener ambos porque atienden impuestos distintos.",
          ],
          links: [{ label: "Ver Modelo 131", href: "/consultor-fiscal/modelos/131" }],
        },
        {
          title: "Situación censal",
          paragraphs: [
            "El alta, la renuncia y los regímenes declarados deben ser coherentes con el Modelo 036. Si la situación real no coincide con el censo, revísala antes de solicitar el reintegro.",
          ],
          links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }],
        },
      ],
    },
    {
      id: "model-341-who-pays",
      title: "Quién paga cada compensación",
      cards: [
        {
          title: "La Hacienda Pública",
          bullets: [
            "Exportaciones de productos naturales fuera de la Unión Europea.",
            "Entregas con expedición o transporte a otro Estado miembro.",
            "Servicios comprendidos en el régimen prestados a destinatarios establecidos fuera del territorio del IVA español.",
          ],
        },
        {
          title: "El comprador o destinatario",
          paragraphs: [
            "En las demás entregas y servicios incluidos, como ocurre normalmente en ventas nacionales a empresarios establecidos en el territorio del IVA español, la compensación la reintegra el adquirente o destinatario.",
          ],
          bullets: [
            "El comprador expide el recibo.",
            "El titular de la explotación lo firma y recibe una copia.",
            "La compensación no se vuelve a solicitar a Hacienda.",
          ],
        },
      ],
      note: "Una compensación pagada por el comprador no se solicita otra vez mediante el Modelo 341. Evita cualquier duplicidad.",
    },
    {
      id: "model-341-operations",
      title: "Operaciones que pueden dar lugar al Modelo 341",
      cards: [
        {
          title: "Exportación",
          paragraphs: [
            "Entrega de productos naturales que salen fuera de la Unión Europea, con prueba aduanera y de transporte suficiente.",
          ],
        },
        {
          title: "Entrega intracomunitaria",
          paragraphs: [
            "Expedición o transporte de productos a otro Estado miembro cuando se cumplen las condiciones del IVA. El domicilio extranjero del cliente no basta por sí solo.",
          ],
        },
        {
          title: "Servicios accesorios exteriores",
          paragraphs: [
            "Servicios legalmente comprendidos en el régimen prestados a destinatarios establecidos fuera del territorio de aplicación del IVA español.",
          ],
        },
        {
          title: "Sin operación, no hay modelo",
          paragraphs: [
            "No se presenta un 341 vacío. Si durante el trimestre no hay operaciones por las que Hacienda deba reintegrar una compensación, no existe solicitud que formular.",
          ],
        },
      ],
      accordions: [
        {
          question: "Casos en los que puede no existir derecho",
          paragraphs: [
            "La lista no es exhaustiva y debe contrastarse con la normativa del régimen.",
          ],
          bullets: [
            "Entrega a otro operador del mismo régimen que utiliza los productos en una actividad también incluida.",
            "Adquirente que realiza exclusivamente determinadas operaciones interiores exentas sin derecho a deducción.",
            "Productos procedentes de una actividad a la que no resultaba aplicable el régimen.",
            "Servicio que no tiene la consideración legal de accesorio.",
            "Exportación o transporte intracomunitario no suficientemente acreditados.",
          ],
        },
      ],
    },
    {
      id: "model-341-rates",
      title: "Porcentajes y base de la compensación",
      cards: [
        {
          title: "Agricultura y silvicultura · 12 %",
          paragraphs: [
            "Se aplica a entregas de productos naturales obtenidos en explotaciones agrícolas o forestales y a los servicios accesorios de esas explotaciones, cuando la operación genera derecho.",
          ],
        },
        {
          title: "Ganadería y pesca · 10,5 %",
          paragraphs: [
            "Se aplica a entregas de productos naturales obtenidos en explotaciones ganaderas o pesqueras y a sus servicios accesorios, cuando procede.",
          ],
        },
        {
          title: "Base de cálculo",
          paragraphs: [
            "Se parte del precio de venta de los productos o servicios incluidos. En operaciones sin precio en dinero se utiliza el valor de mercado.",
          ],
          bullets: [
            "No incluye IVA u otros tributos indirectos.",
            "No incluye comisiones, embalajes, portes, transportes, seguros, gastos financieros u otros accesorios cargados separadamente.",
          ],
        },
        {
          title: "Revisión anual",
          paragraphs: [
            "Los porcentajes están verificados el 15 de julio de 2026. El aplicable es el vigente cuando nace el derecho y una explotación puede reunir actividades con porcentajes distintos.",
          ],
        },
      ],
      accordions: [
        {
          question: "Ejemplo agrícola",
          paragraphs: [
            "Productos: 10.000 €. Transporte facturado separadamente: 500 €. Base: 10.000 €. Al 12 %, la compensación sería 1.200 €, siempre que la operación esté incluida y documentada.",
          ],
        },
        {
          question: "Ejemplo ganadero",
          paragraphs: [
            "Productos: 8.000 €. Al 10,5 %, la compensación sería 840 €, sin analizar aquí exclusiones, conversión de moneda o servicios accesorios.",
          ],
        },
      ],
    },
    {
      id: "model-341-accessory-services",
      title: "Servicios accesorios del régimen",
      intro: [
        "Solo se incluyen los servicios que cumplen la definición y condiciones legales. La etiqueta «agrario» o la profesión del prestador no bastan.",
      ],
      accordions: [
        {
          question: "Ejemplos que pueden estar comprendidos",
          paragraphs: [
            "Según las condiciones reglamentarias, pueden comprender trabajos directamente relacionados con la producción agraria.",
          ],
          bullets: [
            "Plantación, siembra, cultivo y recolección.",
            "Transporte, embalaje, acondicionamiento, secado, limpieza y almacenamiento.",
            "Cría, guarda y engorde de animales.",
            "Arrendamiento de herramientas, maquinaria e instalaciones normalmente utilizadas en la explotación.",
            "Fumigación, eliminación de plantas o animales dañinos y ciertos servicios forestales.",
          ],
        },
        {
          question: "Asistencia técnica",
          paragraphs: [
            "La asistencia profesional de ingenieros o técnicos agrícolas no se considera automáticamente un servicio accesorio incluido. Debe revisarse la naturaleza real del servicio.",
          ],
        },
      ],
    },
    {
      id: "model-341-related",
      title: "Relación con otros modelos",
      cards: [
        {
          title: "Modelo 036",
          paragraphs: ["Comunica actividades, régimen y cambios censales."],
          links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }],
        },
        {
          title: "Modelo 131",
          paragraphs: ["Pago fraccionado del IRPF de determinadas actividades en módulos; no es IVA."],
          links: [{ label: "Ver Modelo 131", href: "/consultor-fiscal/modelos/131" }],
        },
        {
          title: "Modelo 303",
          paragraphs: ["Una actividad exclusivamente en REAGP no deduce allí su IVA soportado, pero otras actividades del titular sí pueden obligar al 303."],
          links: [{ label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }],
        },
        {
          title: "Modelo 349",
          paragraphs: ["Puede informar determinadas operaciones intracomunitarias. El 341 no lo sustituye."],
          links: [{ label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" }],
        },
      ],
      note: "Mantén separados los sectores y libros de una actividad REAGP y de otras actividades sometidas a regímenes distintos.",
    },
    {
      id: "model-341-documents",
      title: "Libros y documentación",
      cards: [
        {
          title: "Operación y destinatario",
          bullets: [
            "Factura, documento de venta, contrato y albarán.",
            "NIF o NIF-IVA, país, condición y establecimiento del destinatario.",
            "Descripción de productos o servicios y actividad de procedencia.",
          ],
        },
        {
          title: "Salida y transporte",
          bullets: [
            "Documentos aduaneros y prueba de exportación.",
            "Documentos de expedición o transporte a otro Estado miembro.",
            "Certificados de entrega y justificantes relacionados.",
          ],
        },
        {
          title: "Base y compensación",
          bullets: [
            "Precio, gastos separados, conversión a euros y porcentaje aplicado.",
            "Recibos de compensación emitidos por compradores nacionales.",
            "Justificantes de cobro y declaraciones anteriores.",
          ],
        },
        {
          title: "Registros",
          bullets: [
            "Libro registro exigido para las operaciones del régimen especial.",
            "Libros separados cuando existen otras actividades o sectores diferenciados.",
            "Cuenta bancaria propia para el abono cuando corresponda.",
          ],
        },
      ],
    },
    {
      id: "model-341-deadlines",
      title: "Plazos y presentación electrónica",
      cards: [
        { title: "Primer trimestre", paragraphs: ["Primeros 20 días naturales de abril."] },
        { title: "Segundo trimestre", paragraphs: ["Primeros 20 días naturales de julio."] },
        { title: "Tercer trimestre", paragraphs: ["Primeros 20 días naturales de octubre."] },
        { title: "Cuarto trimestre", paragraphs: ["Primeros 30 días naturales de enero del año siguiente."] },
      ],
      note: "Si el último día es inhábil, consulta el calendario oficial. No reutilices los plazos de otro modelo sin verificar el ejercicio y el trámite.",
    },
    {
      id: "model-341-corrections",
      title: "Requerimientos, correcciones y cobros indebidos",
      accordions: [
        {
          question: "Error antes de que se resuelva",
          paragraphs: [
            "Consulta la declaración y utiliza los trámites de aportación de documentos o alegaciones. Si el formulario permite modificación, sigue su ayuda vigente; no inventes una complementaria o sustitutiva.",
          ],
        },
        {
          question: "Compensación cobrada indebidamente",
          paragraphs: [
            "Puede deberse a falta de derecho, porcentaje o base incorrectos, duplicidad, operación anulada o pago tanto por el comprador como por Hacienda.",
            "Debe reintegrarse por el procedimiento oficial que corresponda. No presentes otro Modelo 341 con importe negativo como solución automática.",
          ],
        },
        {
          question: "Errores habituales",
          paragraphs: [
            "Presentarlo sin REAGP, pedir el IVA exacto de los gastos, solicitar todas las ventas, usar el porcentaje equivocado, incluir portes separados, no probar la salida, olvidar el 349, mezclar sectores o duplicar la compensación.",
          ],
        },
      ],
    },
    {
      id: "model-341-which-vat-model",
      title: "Modelo 303, 308, 309 o 341",
      cards: [
        { title: "Modelo 303", paragraphs: ["Autoliquidación periódica ordinaria del IVA."], links: [{ label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }] },
        { title: "Modelo 308", paragraphs: ["Solicitud especial de devolución para viajeros, determinados transportistas y entregas ocasionales de medios nuevos."], links: [{ label: "Ver Modelo 308", href: "/consultor-fiscal/modelos/308" }] },
        { title: "Modelo 309", paragraphs: ["Autoliquidación no periódica para ingresar IVA en determinados casos especiales."], links: [{ label: "Ver Modelo 309", href: "/consultor-fiscal/modelos/309" }] },
        { title: "Modelo 341", paragraphs: ["Reintegro de compensaciones REAGP que corresponde pagar a Hacienda."], links: [{ label: "Ver Modelo 341", href: "/consultor-fiscal/modelos/341" }] },
      ],
      note: "El Modelo 341 no devuelve facturas de gastos una por una y no se elige solo porque se espere cobrar una cantidad.",
    },
    { id: "model-341-territory", title: "Ámbito territorial", note: TERRITORIAL_NOTE },
  ],
  fillingTitle: "Cómo preparar el Modelo 341",
  fillingSteps: [
    { title: "1. Confirma régimen y trimestre", paragraphs: ["Verifica inclusión en REAGP, ejercicio, trimestre y que existan operaciones reintegrables por Hacienda."] },
    { title: "2. Clasifica la operación", paragraphs: ["Distingue exportación, entrega intracomunitaria o servicio a destinatario situado fuera del territorio del IVA español."] },
    { title: "3. Identifica al destinatario", paragraphs: ["Comprueba NIF o NIF-IVA, nombre, país, dirección y condición empresarial cuando corresponda."] },
    { title: "4. Reúne la prueba", paragraphs: ["Conserva producto o servicio, fecha, importe, actividad y documentos de aduana, transporte o localización."] },
    { title: "5. Determina la base", paragraphs: ["Excluye tributos indirectos y accesorios cobrados separadamente; usa valor de mercado si no hay precio dinerario."] },
    { title: "6. Aplica el porcentaje vigente", paragraphs: ["Distingue 12 % para agricultura/silvicultura y 10,5 % para ganadería/pesca, comprobando actividad y fecha."] },
    { title: "7. Informa la cuenta y valida", paragraphs: ["Usa una cuenta propia, revisa destinatario, trimestre, base, porcentaje e importe solicitado."] },
    { title: "8. Firma y conserva", paragraphs: ["Presenta en la AEAT y conserva justificante, número de registro y Código Seguro de Verificación (CSV). Factu no realiza el envío."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Registro", description: "La solicitud queda registrada con su justificante oficial." },
    { title: "Comprobación", description: "La AEAT revisa régimen, operaciones, destinatarios, transporte, bases, porcentajes y documentos." },
    { title: "Requerimiento", description: "Puede pedir pruebas; responde mediante el trámite y plazo indicados." },
    { title: "Resolución", description: "Puede aceptar el reintegro completo, una parte o denegarlo." },
    { title: "Abono", description: "El pago se realiza cuando procede. Presentar la solicitud no significa que esté aprobada." },
  ],
  comparison: {
    title: "Modelos 341, 349 y 131",
    current: { title: "Modelo 341", description: "Solicitud trimestral de determinadas compensaciones REAGP que debe reintegrar Hacienda." },
    related: { title: "Modelo 349", description: "Declaración informativa de determinadas operaciones intracomunitarias; puede coexistir con el 341.", href: "/consultor-fiscal/modelos/349", label: "Ver Modelo 349" },
    additional: [
      { title: "Modelo 131", description: "Pago fraccionado del IRPF por módulos; regula un impuesto distinto.", href: "/consultor-fiscal/modelos/131", label: "Ver Modelo 131" },
      { title: "Modelo 303", description: "Autoliquidación ordinaria del IVA para otras actividades o regímenes; no duplica la compensación REAGP.", href: "/consultor-fiscal/modelos/303", label: "Ver Modelo 303" },
    ],
    conclusion: "Una misma operación puede exigir información intracomunitaria y solicitud de compensación, pero cada modelo conserva su finalidad.",
  },
  pdfNotice: [
    "La ficha ofrece información y enlaces oficiales. No genera una solicitud, no calcula automáticamente la compensación y no sustituye la revisión de la operación y del porcentaje vigente.",
  ],
  documents: [],
  officialLinks: [
    { label: "Página oficial del Modelo 341", sourceId: "aeat.model-341.procedure-home.2026-02-13" },
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-341.procedure-record.2026-06-09" },
    { label: "Instrucciones oficiales del Modelo 341", sourceId: "aeat.model-341.instructions.2026-06-09" },
    { label: "Régimen especial de agricultura, ganadería y pesca", href: AEAT_REAGP_OVERVIEW },
    { label: "Cálculo y reintegro de la compensación", href: AEAT_REAGP_COMPENSATION },
    { label: "Diseños de registro de los modelos 300 a 399", href: AEAT_REGISTER_DESIGNS },
  ],
  legalLinks: [
    { label: "Ley 37/1992 del IVA consolidada", href: LIVA },
    { label: "Reglamento del IVA consolidado", href: RIVA },
    { label: "Orden de 15 de diciembre de 2000", sourceId: "boe.model-341.order-2000-12-15.original" },
    { label: "Orden EHA/3212/2004", href: ORDER_EHA_3212_2004 },
  ],
  faq: [
    { question: "¿Lo presenta cualquier agricultor?", answer: "No. Debe estar incluido en el REAGP y realizar una operación cuyo reintegro corresponda a Hacienda." },
    { question: "¿Sirve para recuperar el IVA exacto de mis gastos?", answer: "No. Aplica una compensación a tanto alzado sobre determinadas ventas o servicios." },
    { question: "¿Qué porcentaje se aplica a agricultura y silvicultura?", answer: "El 12 %, verificado para 2026 y sujeto a revisión si cambia la normativa." },
    { question: "¿Qué porcentaje se aplica a ganadería y pesca?", answer: "El 10,5 %, verificado para 2026 y sujeto a revisión si cambia la normativa." },
    { question: "¿La base incluye transporte facturado separadamente?", answer: "No. Los gastos accesorios cobrados separadamente se excluyen con carácter general." },
    { question: "¿Se presenta por una venta nacional ordinaria?", answer: "Normalmente no; en ese caso la compensación la paga el comprador mediante el recibo correspondiente." },
    { question: "¿Cuándo paga Hacienda?", answer: "En exportaciones, expediciones o transportes a otro Estado miembro y determinados servicios a destinatarios fuera del territorio del IVA español." },
    { question: "¿Tengo que presentar también el Modelo 349?", answer: "Puede corresponder en determinadas operaciones intracomunitarias; el Modelo 341 no lo sustituye." },
    { question: "¿Puede coexistir con el Modelo 131?", answer: "Sí. El 131 corresponde al IRPF y el 341 al IVA." },
    { question: "¿Se presenta sin operaciones?", answer: "No. Solo se presenta cuando existen operaciones por las que Hacienda debe reintegrar compensación." },
    { question: "¿Cuándo se presenta?", answer: "En los 20 días naturales posteriores a los tres primeros trimestres y durante los 30 primeros días de enero para el cuarto." },
    { question: "¿Qué hago si cobré una compensación indebida?", answer: "Debe regularizarse por el procedimiento oficial aplicable; no se corrige automáticamente con otro 341 negativo." },
  ],
  sourceIds: [
    "aeat.model-341.procedure-home.2026-02-13",
    "aeat.model-341.procedure-record.2026-06-09",
    "aeat.model-341.instructions.2026-06-09",
    "boe.model-341.order-2000-12-15.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
