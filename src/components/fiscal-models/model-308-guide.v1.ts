import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

const AEAT_DIVA_HOME =
  "https://sede.agenciatributaria.gob.es/Sede/viajeros-trabajadores-desplazados-fronterizos/devoluciones-iva-compras-viajeros.html";
const AEAT_DIVA_GENERAL =
  "https://sede.agenciatributaria.gob.es/Sede/viajeros-trabajadores-desplazados-fronterizos/devoluciones-iva-compras-viajeros/informacion-general-sobre-devolucion-iva-viajeros.html";
const AEAT_TRANSPORT_REFUND =
  "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/manual-iva-2021/capitulo-8-gestion-iva/devoluciones/devolucion-suj-pas-reg-simplif-carretera.html";
const AEAT_NEW_TRANSPORT =
  "https://sede.agenciatributaria.gob.es/Sede/vehiculos-embarcaciones/primera-matriculacion-medios-transporte/delimitacion-medios-transporte-nuevos-respecto-usados.html";
const AEAT_IVA_DEADLINES_2026 =
  "https://sede.agenciatributaria.gob.es/Sede/ayuda/calendario-contribuyente/calendario-contribuyente-2026/informacion-sobre-presentacion-modelos-no-periodicos/impuesto-sobre-valor-anadido.html";
const LIVA = "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740";
const RIVA = "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925";
const ORDER_EHA_1033_2011 =
  "https://www.boe.es/buscar/doc.php?id=BOE-A-2011-7479";

const TERRITORIAL_NOTE =
  "Esta guía se refiere al IVA aplicable en la Península y las Islas Baleares. Canarias aplica el IGIC y Ceuta y Melilla aplican el IPSI. País Vasco y Navarra pueden tener particularidades de gestión y competencia tributaria.";

export const MODEL_308_GUIDE_V1 = {
  code: "308",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "Los formularios y trámites se abren en la sede oficial. Factu no firma, presenta ni envía solicitudes o documentos a la Agencia Tributaria y no almacena pasaportes, facturas, matrículas, bastidores ni datos bancarios desde esta guía.",
  intro: [
    "El Modelo 308 permite solicitar una devolución de IVA en situaciones especiales relacionadas con el recargo de equivalencia y viajeros, determinados transportistas en régimen simplificado y la entrega ocasional de medios de transporte nuevos a otro Estado miembro.",
    "No es la autoliquidación ordinaria de IVA, no sustituye al Modelo 303 y no sirve para recuperar cualquier cuota soportada. Cada supuesto tiene requisitos, documentación y plazo propios.",
  ],
  notices: [
    {
      title: "No sirve para cualquier IVA a devolver",
      paragraphs: [
        "El resultado económico no decide el modelo. Primero debe existir uno de los supuestos legales y después debe acreditarse la cuota cuya devolución se solicita.",
      ],
    },
    {
      title: "Tres casos prácticos para autónomos",
      paragraphs: [
        "Esta guía desarrolla los tres casos con mayor interés para autónomos: comercio en recargo y viajeros, transporte por carretera en régimen simplificado y entrega ocasional intracomunitaria de un medio de transporte nuevo.",
        "La orden también contempla un supuesto institucional para entes públicos o establecimientos privados de carácter social en determinadas entregas humanitarias. No se presenta aquí como caso propio de un autónomo.",
      ],
    },
    {
      title: "No dupliques la recuperación",
      paragraphs: [
        "Una cuota solicitada mediante el Modelo 308 no debe deducirse también en otra autoliquidación. Facturas, libros y solicitud deben ser coherentes.",
      ],
    },
  ],
  actions: [
    {
      label: "Comprobar qué supuesto me corresponde",
      sourceId: "aeat.model-308.procedure-home.2026-06-09",
      primary: true,
    },
    {
      label: "Consultar la ayuda del formulario",
      sourceId: "aeat.model-308.browser-help.2026-06-19",
    },
    { label: "Consultar DIVA y viajeros", href: AEAT_DIVA_HOME },
    {
      label: "Consultar declaraciones presentadas",
      sourceId: "aeat.model-308.procedure-home.2026-06-09",
    },
    {
      label: "Aportar documentación complementaria",
      sourceId: "aeat.model-308.procedure-home.2026-06-09",
    },
    { label: "Consultar los plazos oficiales de 2026", href: AEAT_IVA_DEADLINES_2026 },
  ],
  quickSummaryTitle: "El Modelo 308 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una solicitud especial de devolución de IVA." },
    { label: "Periodicidad", value: "No es un modelo periódico ordinario; el plazo depende del supuesto." },
    { label: "Casos explicados", value: "Viajeros, transportistas en régimen simplificado y entregas ocasionales de medios de transporte nuevos." },
    { label: "Genera un pago", value: "No. Solicita una devolución, que la AEAT debe comprobar." },
    { label: "Presentación", value: "Electrónica con Cl@ve, certificado o DNI electrónico, directamente o mediante representante autorizado." },
    { label: "Cuenta", value: "Cuenta propia en España o, cuando el formulario lo admite, cuenta extranjera UE/SEPA con IBAN y BIC." },
    { label: "Plazo de transportistas", value: "Primeros 20 días naturales del mes siguiente a la adquisición." },
    { label: "Plazo del medio nuevo", value: "30 días naturales desde la entrega ocasional." },
    { label: "Corrección", value: "El formulario permite recuperar una presentación y utilizar la opción «Modificar»." },
  ],
  sections: [
    {
      id: "model-308-scenarios",
      title: "Los tres supuestos explicados",
      intro: [
        "Seleccionar correctamente el tipo de tributación es el primer control. El formulario cambia los datos solicitados según el supuesto.",
      ],
      cards: [
        {
          title: "1. Comercio, recargo de equivalencia y viajeros",
          paragraphs: [
            "Un comerciante que realiza exclusivamente actividades en recargo de equivalencia puede pedir el reintegro de cuotas que ya haya devuelto a viajeros por ventas exentas con salida acreditada de los bienes fuera de la Unión Europea.",
          ],
          bullets: [
            "No basta con vender a una persona extranjera.",
            "Debe existir factura y Documento Electrónico de Reembolso (DER).",
            "La salida debe estar validada y el IVA ya debe haberse reembolsado de forma acreditable.",
          ],
        },
        {
          title: "2. Transportista en régimen simplificado",
          paragraphs: [
            "Quien realiza transporte de viajeros o mercancías por carretera y tributa por esa actividad en el régimen simplificado puede solicitar anticipadamente la devolución de la cuota deducible soportada al adquirir un medio de transporte afecto.",
          ],
          bullets: [
            "No convierte en transportista a quien solo usa un coche para visitar clientes.",
            "No cubre combustible, reparaciones, seguros, peajes ni gastos corrientes.",
            "No puede solicitarse y deducirse de nuevo la misma cuota.",
          ],
        },
        {
          title: "3. Entrega ocasional de un medio de transporte nuevo",
          paragraphs: [
            "Una persona puede ser empresario o profesional solo a efectos de una entrega ocasional exenta de un medio de transporte nuevo enviado a otro Estado miembro y solicitar la devolución limitada del IVA soportado relacionado con esa entrega.",
          ],
          bullets: [
            "No es cualquier venta de un vehículo usado a una persona extranjera.",
            "Debe acreditarse la expedición o transporte a otro Estado miembro.",
            "La documentación técnica determina si el medio tiene la condición de nuevo.",
          ],
        },
      ],
      note: "La orden del modelo incluye además un supuesto para entes públicos o entidades sociales en determinadas operaciones humanitarias. Si ese es el caso, consulta la orden y el plazo institucional específico; esta guía no lo trata como una actividad autónoma.",
    },
    {
      id: "model-308-diva",
      title: "Viajeros, DER y sistema DIVA",
      intro: [
        "DIVA es el sistema electrónico de devolución del IVA a viajeros. El DER es el Documento Electrónico de Reembolso que acompaña a la factura y permite validar la salida.",
      ],
      cards: [
        {
          title: "Condiciones esenciales",
          bullets: [
            "Identidad y residencia habitual del viajero comprobadas en la venta.",
            "Residencia fuera de la Unión Europea en los términos del régimen de viajeros.",
            "Factura y DER correctamente expedidos.",
            "Bienes transportados fuera de la Unión dentro de los tres meses siguientes a la compra.",
            "Visado aduanero electrónico o validación admisible.",
            "Reembolso previo y suficientemente acreditado.",
          ],
        },
        {
          title: "Plazo y prueba del reembolso",
          paragraphs: [
            "Recibido el DER visado, el proveedor devuelve la cuota dentro del plazo reglamentario de 15 días mediante un medio que permita probar el pago, como transferencia, tarjeta, cheque u otro medio trazable.",
            "La tienda o entidad colaboradora debe comprobar el visado antes de pagar y comunicar electrónicamente que el reembolso se ha hecho efectivo.",
          ],
        },
      ],
      accordions: [
        {
          question: "Flujo simplificado de una venta tax free",
          paragraphs: [
            "La tienda identifica al viajero, emite factura y DER; el viajero presenta bienes y DER al salir; la aduana valida; el proveedor comprueba el visado, devuelve el IVA, comunica el reembolso y después incluye la cuota reembolsada en el Modelo 308 del periodo correspondiente.",
          ],
          bullets: [
            "Un DER no validado no acredita por sí solo la salida.",
            "En el 308 solo se computan cuotas efectivamente reembolsadas durante el trimestre declarado.",
          ],
        },
        {
          question: "Documentación que debe conservar el comercio",
          paragraphs: [
            "La conservación corresponde al obligado y debe realizarse por canales seguros, no dentro de esta ficha informativa.",
          ],
          bullets: [
            "Factura y DER validado.",
            "Prueba de la salida y del reembolso.",
            "Identificación y residencia comprobadas conforme al procedimiento.",
            "Cuota, fecha, bienes y datos de la entidad colaboradora cuando exista.",
            "Libros y registros que permitan evitar duplicidades.",
          ],
        },
        {
          question: "Qué queda fuera",
          paragraphs: [
            "No se incluyen servicios, ventas ordinarias, bienes que no salen de la Unión, documentos sin validación, cuotas aún no devueltas ni compras de mercancía del comerciante.",
          ],
        },
      ],
    },
    {
      id: "model-308-transport",
      title: "Transportistas y adquisición del vehículo",
      cards: [
        {
          title: "Requisitos del solicitante",
          bullets: [
            "Actividad real de transporte de viajeros o mercancías por carretera.",
            "Tributación de esa actividad en el régimen simplificado del IVA.",
            "Medio de transporte afecto a la actividad.",
            "Factura válida a nombre del solicitante y cuota deducible.",
            "Decisión de no consignar esa misma cuota en las autoliquidaciones del régimen simplificado.",
          ],
        },
        {
          title: "Vehículos de mercancías",
          bullets: [
            "Categoría N1 con masa máxima autorizada de al menos 2.500 kg.",
            "Categorías N2 y N3.",
            "Categoría y masa comprobadas en la documentación técnica vigente.",
            "Un turismo o una N1 por debajo del umbral no deben incluirse automáticamente.",
          ],
        },
        {
          title: "Transporte de viajeros",
          paragraphs: [
            "El vehículo debe estar realmente afecto a una actividad de transporte de viajeros por carretera incluida en el régimen simplificado, como puede ocurrir en taxi u otras actividades de transporte comprendidas en la normativa.",
            "Transportar ocasionalmente clientes o trabajadores no basta.",
          ],
        },
        {
          title: "Documentos de control",
          bullets: [
            "Factura, proveedor, fecha y cuota de IVA.",
            "Tarjeta ITV o documento técnico, categoría, masa, matrícula y bastidor.",
            "Alta censal, epígrafe, régimen y prueba de afectación.",
            "Cuenta de devolución y control de no deducción por otra vía.",
          ],
        },
      ],
      note: "Plazo específico: primeros 20 días naturales del mes siguiente a la adquisición. No apliques este plazo a los demás supuestos del Modelo 308.",
    },
    {
      id: "model-308-new-means",
      title: "Entrega ocasional de un medio de transporte nuevo",
      cards: [
        {
          title: "Qué medios de transporte entran",
          bullets: [
            "Vehículo terrestre a motor: cilindrada superior a 48 cm³ o potencia superior a 7,2 kW.",
            "Embarcación: eslora máxima superior a 7,5 m, con las excepciones legales.",
            "Aeronave: peso total al despegue superior a 1.550 kg, con las excepciones legales.",
          ],
        },
        {
          title: "Cuándo se considera nuevo",
          bullets: [
            "Vehículo terrestre: menos de seis meses desde la primera puesta en servicio o no más de 6.000 km.",
            "Embarcación: menos de tres meses o no más de 100 horas de navegación.",
            "Aeronave: menos de tres meses o no más de 40 horas de vuelo.",
            "Basta con que se cumpla una de las dos condiciones aplicables; no tienen que cumplirse ambas.",
          ],
        },
        {
          title: "Pruebas necesarias",
          bullets: [
            "Factura original de adquisición y cuota soportada.",
            "Factura de la entrega ocasional e identificación del comprador.",
            "Características técnicas, primera puesta en servicio y kilómetros u horas.",
            "Matrícula, bastidor o identificación equivalente.",
            "Prueba de expedición o transporte a otro Estado miembro y de la exención.",
          ],
        },
        {
          title: "Límite y plazo",
          paragraphs: [
            "La devolución está limitada por las reglas de deducción aplicables a esa entrega ocasional; no debe prometerse la recuperación íntegra de todo el IVA pagado.",
            "El plazo oficial verificado para este supuesto es de 30 días naturales desde la entrega.",
          ],
        },
      ],
    },
    {
      id: "model-308-deadlines",
      title: "Plazos separados según el supuesto",
      cards: [
        {
          title: "Viajeros y recargo",
          paragraphs: [
            "Primeros 20 días naturales del mes siguiente al final de cada trimestre; el cuarto trimestre, durante los primeros 30 días naturales de enero. Solo incluye cuotas reembolsadas en ese trimestre.",
          ],
        },
        {
          title: "Transportistas",
          paragraphs: [
            "Primeros 20 días naturales del mes siguiente a la adquisición del vehículo. Por ejemplo, una compra del 12 de mayo se solicita durante los primeros 20 días naturales de junio.",
          ],
        },
        {
          title: "Medio de transporte nuevo",
          paragraphs: [
            "30 días naturales desde la entrega ocasional intracomunitaria.",
          ],
        },
        {
          title: "Supuesto institucional",
          paragraphs: [
            "La AEAT publica un plazo de tres meses desde la entrega que origina el derecho para el supuesto humanitario de entes públicos o establecimientos sociales. No se aplica a los tres casos de autónomos por analogía.",
          ],
        },
      ],
      note: "Si el vencimiento coincide con día inhábil, consulta el calendario oficial. Nunca uses un único plazo para todo el Modelo 308.",
    },
    {
      id: "model-308-which-vat-model",
      title: "¿Qué modelo de IVA necesito?",
      cards: [
        { title: "Modelo 303", paragraphs: ["Autoliquidación periódica ordinaria del IVA."], links: [{ label: "Ver Modelo 303", href: "/consultor-fiscal/modelos/303" }] },
        { title: "Modelo 308", paragraphs: ["Solicitud especial de devolución para los supuestos legalmente delimitados."], links: [{ label: "Ver Modelo 308", href: "/consultor-fiscal/modelos/308" }] },
        { title: "Modelo 309", paragraphs: ["Autoliquidación no periódica para ingresar IVA en determinados casos especiales."], links: [{ label: "Ver Modelo 309", href: "/consultor-fiscal/modelos/309" }] },
        { title: "Modelo 341", paragraphs: ["Reintegro de compensaciones del régimen especial agrario en determinadas operaciones."], links: [{ label: "Ver Modelo 341", href: "/consultor-fiscal/modelos/341" }] },
        { title: "Modelo 349", paragraphs: ["Declaración informativa de determinadas operaciones intracomunitarias."], links: [{ label: "Ver Modelo 349", href: "/consultor-fiscal/modelos/349" }] },
        { title: "Modelo 036", paragraphs: ["Comunica actividades, regímenes y obligaciones censales."], links: [{ label: "Ver Modelo 036", href: "/consultor-fiscal/modelos/036" }] },
      ],
      note: "No debe elegirse un modelo únicamente porque su resultado sea una devolución. Cada modelo tiene supuestos legales concretos y el Modelo 131 es un pago fraccionado de IRPF, no un modelo de IVA.",
    },
    {
      id: "model-308-refund-meaning",
      title: "Devolución, deducción y reintegro no son lo mismo",
      cards: [
        { title: "Deducción", paragraphs: ["Resta IVA soportado deducible del IVA repercutido en una autoliquidación como el Modelo 303."] },
        { title: "Devolución", paragraphs: ["Solicita que Hacienda abone una cuota que la normativa permite recuperar en un supuesto concreto."] },
        { title: "Reintegro agrario", paragraphs: ["Solicita a Hacienda la compensación a tanto alzado del régimen agrario en determinadas operaciones mediante el Modelo 341."] },
      ],
    },
    {
      id: "model-308-errors",
      title: "Correcciones y errores habituales",
      accordions: [
        {
          question: "Cómo corregir una solicitud presentada",
          paragraphs: [
            "La ayuda actual permite volver al formulario, recuperar una declaración presentada y elegir «Modificar». Corrige, valida, vuelve a firmar y conserva el nuevo justificante.",
            "No copies el sistema de autoliquidación rectificativa del Modelo 303 ni presentes una complementaria sin que el formulario o la norma lo indiquen. Si solo falta una prueba, utiliza la aportación de documentación cuando corresponda.",
          ],
        },
        {
          question: "Errores del supuesto de viajeros",
          paragraphs: [
            "Solicitar antes de reembolsar, carecer de DER validado, no conservar prueba del pago, confundir nacionalidad con residencia o tratar una venta ordinaria como exportación.",
          ],
        },
        {
          question: "Errores del supuesto de transporte",
          paragraphs: [
            "Incluir combustible o reparaciones, usar un turismo ordinario, no comprobar categoría y masa, presentar fuera de plazo o deducir de nuevo la misma cuota.",
          ],
        },
        {
          question: "Errores del medio de transporte nuevo",
          paragraphs: [
            "Confundir recién comprado con nuevo a efectos de IVA, exigir simultáneamente edad y uso, no conservar las dos facturas o no acreditar el transporte a otro Estado miembro.",
          ],
        },
      ],
    },
    { id: "model-308-territory", title: "Ámbito territorial", note: `${TERRITORIAL_NOTE} Las ventas a viajeros deben cumplir las reglas de salida del territorio de la Unión Europea y del sistema electrónico de reembolso.` },
  ],
  fillingTitle: "Cómo preparar el Modelo 308",
  fillingSteps: [
    { title: "1. Selecciona el supuesto", paragraphs: ["Distingue recargo y viajeros, artículo 30 bis para transportistas o sujeto pasivo ocasional. La selección cambia el formulario."] },
    { title: "2. Revisa identificación y periodo", paragraphs: ["Comprueba NIF, nombre, ejercicio y periodo compatible con el plazo específico."] },
    { title: "3. Reúne los datos de la operación", paragraphs: ["Factura y DER, vehículo adquirido o medio nuevo vendido, fechas, cuota, contrapartes y documentación técnica según el caso."] },
    { title: "4. Limita el importe", paragraphs: ["Incluye solo la cuota legalmente recuperable y verifica que no se ha deducido por otra vía."] },
    { title: "5. Informa una cuenta propia", paragraphs: ["Usa una cuenta de la que seas titular. Para cuenta extranjera UE/SEPA, el formulario solicita IBAN y SWIFT-BIC."] },
    { title: "6. Aporta documentación cuando proceda", paragraphs: ["Utiliza el trámite oficial de documentación complementaria; no cargues documentos sensibles en Factu."] },
    { title: "7. Valida", paragraphs: ["Corrige errores, revisa avisos y confirma supuesto, periodo, importe y cuenta."] },
    { title: "8. Firma y conserva", paragraphs: ["Firma y envía en la AEAT; guarda el PDF justificante, número de registro, justificante y Código Seguro de Verificación (CSV). Una sesión guardada no es una presentación."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Registro", description: "La solicitud queda registrada con el justificante oficial." },
    { title: "Comprobación", description: "La AEAT puede revisar facturas, régimen, actividad, salida, reembolso, afectación y documentación técnica." },
    { title: "Requerimiento", description: "Puede pedir pruebas adicionales; responde por el trámite y plazo indicados en la notificación." },
    { title: "Resolución", description: "La devolución puede aceptarse totalmente, parcialmente o denegarse." },
    { title: "Abono", description: "Si procede, se abona en la cuenta comunicada. Presentar no garantiza que la devolución sea reconocida." },
  ],
  comparison: {
    title: "Modelos 303, 308 y 309",
    current: { title: "Modelo 308", description: "Solicitud especial de devolución para supuestos legalmente delimitados." },
    related: { title: "Modelo 303", description: "Autoliquidación periódica ordinaria del IVA; no debe duplicar la cuota solicitada en el 308.", href: "/consultor-fiscal/modelos/303", label: "Ver Modelo 303" },
    additional: [
      { title: "Modelo 309", description: "Autoliquidación no periódica para ingresar IVA en operaciones especiales; no es una solicitud de devolución.", href: "/consultor-fiscal/modelos/309", label: "Ver Modelo 309" },
      { title: "Modelo 349", description: "Declaración informativa que puede coexistir con una entrega intracomunitaria; no sustituye el 308.", href: "/consultor-fiscal/modelos/349", label: "Ver Modelo 349" },
    ],
    conclusion: "Distingue siempre autoliquidación periódica, ingreso no periódico y solicitud especial de devolución antes de elegir modelo.",
  },
  pdfNotice: [
    "Los PDF registrados por la AEAT en esta ficha corresponden a periodos anteriores y pueden contener campos activos. No se presentan como formulario vigente ni se ejecutan dentro de Factu.",
  ],
  documents: [],
  officialLinks: [
    { label: "Página oficial del Modelo 308", sourceId: "aeat.model-308.procedure-home.2026-06-09" },
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-308.procedure-record.2025-09-29" },
    { label: "Ayuda técnica del formulario", sourceId: "aeat.model-308.browser-help.2026-06-19" },
    { label: "Información general sobre DIVA", href: AEAT_DIVA_GENERAL },
    { label: "Devolución para transportistas en régimen simplificado", href: AEAT_TRANSPORT_REFUND },
    { label: "Cuándo un medio de transporte se considera nuevo", href: AEAT_NEW_TRANSPORT },
    { label: "Plazos oficiales de IVA no periódico en 2026", href: AEAT_IVA_DEADLINES_2026 },
    { label: "Documentos oficiales de periodos anteriores", sourceId: "aeat.model-308.previous-periods-downloads.2026-06-09" },
  ],
  legalLinks: [
    { label: "Ley 37/1992 del IVA consolidada", href: LIVA },
    { label: "Reglamento del IVA consolidado", href: RIVA },
    { label: "Orden EHA/3786/2008", sourceId: "boe.models-303-308.order-eha-3786-2008.original" },
    { label: "Orden EHA/1033/2011", href: ORDER_EHA_1033_2011 },
    { label: "Orden HAP/2194/2013", sourceId: "boe.electronic-tax-filing.order-hap-2194-2013.original" },
  ],
  faq: [
    { question: "¿Lo presenta cualquier autónomo con IVA a devolver?", answer: "No. Solo corresponde cuando existe uno de los supuestos legales del Modelo 308." },
    { question: "¿Sirve para recuperar el IVA de compras ordinarias?", answer: "No. No sustituye la deducción periódica del Modelo 303." },
    { question: "¿Puede utilizarlo un comercio en recargo de equivalencia?", answer: "Sí, en el caso específico de cuotas ya devueltas a viajeros y correctamente acreditadas, no por sus compras ordinarias." },
    { question: "¿Qué debe ocurrir antes de incluir una venta tax free?", answer: "El DER debe estar validado y el comercio debe haber devuelto la cuota al viajero de forma acreditable." },
    { question: "¿Cuándo presenta el comercio las cuotas de viajeros?", answer: "En los primeros 20 días posteriores al trimestre, salvo el cuarto trimestre, que se presenta durante los primeros 30 días de enero." },
    { question: "¿Puede utilizarlo un transportista?", answer: "Sí, si la actividad tributa en régimen simplificado, el vehículo está afecto y se cumplen los requisitos de deducción y categoría." },
    { question: "¿Sirve para combustible y reparaciones?", answer: "No. El procedimiento del artículo 30 bis se refiere a la adquisición del medio de transporte." },
    { question: "¿Qué vehículos de mercancías pueden entrar?", answer: "Determinados N1 con al menos 2.500 kg de masa máxima autorizada y los N2 y N3, previa comprobación técnica." },
    { question: "¿Cuál es el plazo del transportista?", answer: "Los primeros 20 días naturales del mes siguiente a la adquisición." },
    { question: "¿Cuándo se considera nuevo un vehículo, embarcación o aeronave?", answer: "Cuando cumple cualquiera de los límites alternativos de tiempo o utilización establecidos para su clase." },
    { question: "¿Qué plazo tiene la entrega ocasional de un medio nuevo?", answer: "30 días naturales desde la entrega, según el calendario oficial del IVA no periódico." },
    { question: "¿La presentación garantiza la devolución?", answer: "No. La AEAT comprueba la solicitud y puede aceptarla total o parcialmente o denegarla." },
  ],
  sourceIds: [
    "aeat.model-308.procedure-home.2026-06-09",
    "aeat.model-308.procedure-record.2025-09-29",
    "aeat.model-308.browser-help.2026-06-19",
    "aeat.model-308.previous-periods-downloads.2026-06-09",
    "boe.models-303-308.order-eha-3786-2008.original",
    "boe.electronic-tax-filing.order-hap-2194-2013.original",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
