import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_030_GUIDE_V1 = {
  code: "030",
  intro: [
    "El Modelo 030 permite a determinadas personas físicas comunicar a la Agencia Tributaria su alta en el Censo de Obligados Tributarios, cambios de domicilio y variaciones de sus datos personales.",
    "Es una comunicación censal: no calcula ni paga un impuesto. Tampoco es el formulario habitual para darse de alta como autónomo ni para cambiar datos relacionados con una actividad económica; para esas situaciones se utiliza normalmente el Modelo 036.",
  ],
  notices: [
    {
      title: "No es el alta habitual de autónomos",
      paragraphs: [
        "Está destinado principalmente a personas físicas que no desarrollan actividades empresariales o profesionales y no pagan rentas sujetas a retención.",
        "Si ya formas parte del Censo de empresarios, profesionales y retenedores, los cambios de actividad y de domicilio fiscal se comunican normalmente mediante el Modelo 036.",
      ],
    },
  ],
  actions: [
    {
      label: "Presentar o modificar el Modelo 030",
      href: "https://www1.agenciatributaria.gob.es/wlpl/BU36-ASIS/M030/index.zul",
      primary: true,
    },
    {
      label: "Consultar y modificar domicilios",
      href: "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/domicilio-ciudadanos/comunicar-cambio-domicilio-fiscal.html",
      primary: true,
    },
    {
      label: "Consultar el procedimiento oficial",
      sourceId: "aeat.model-030.procedure-home.2026-07-10",
    },
    {
      label: "Descargar el Modelo 030 oficial",
      href: "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G321/mod030_es_es.pdf",
    },
    {
      label: "Ver las instrucciones oficiales",
      sourceId: "aeat.model-030.instructions.2026-07-10",
    },
    {
      label: "Consultar la documentación necesaria",
      href: "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/censos-nif-domicilio-fiscal/censos/modelo-030-censo_____de-domicilio-variacion-personales_/documentacion-modelo-030.html",
    },
    {
      label: "Pedir cita en la AEAT",
      href: "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC29.shtml",
    },
  ],
  quickSummaryTitle: "El Modelo 030 en pocas palabras",
  quickFacts: [
    { label: "Qué es", value: "Una declaración censal de datos personales de personas físicas." },
    { label: "Quién", value: "Principalmente, personas que no forman parte del censo de empresarios, profesionales y retenedores." },
    { label: "Para qué", value: "Alta censal, NIF en determinados casos, domicilio, estado civil y otros datos personales." },
    { label: "Cambio de domicilio", value: "Con carácter general, dentro de los tres meses desde el cambio." },
    { label: "Actividad económica", value: "No. Para el alta y los cambios de una actividad se utiliza normalmente el Modelo 036." },
    { label: "Canales", value: "Internet y, cuando proceda, impreso ante la AEAT o por correo certificado." },
  ],
  sections: [
    {
      id: "model-030-chooser",
      title: "¿Necesitas el Modelo 030 o el Modelo 036?",
      cards: [
        {
          title: "Modelo 030",
          paragraphs: ["Datos personales y domicilio de una persona física que, con carácter general, no desarrolla una actividad económica ni satisface rentas sujetas a retención."],
          links: [{ label: "Estás en la ficha del Modelo 030", href: "/consultor-fiscal/modelos/030" }],
        },
        {
          title: "Modelo 036",
          paragraphs: ["Alta, cambios o baja de autónomos, empresas, entidades y retenedores, incluidas sus actividades y obligaciones fiscales."],
          links: [{ label: "Ver el Modelo 036", href: "/consultor-fiscal/modelos/036" }],
        },
      ],
      note: "El antiguo Modelo 037 ya no está vigente. Las gestiones censales empresariales se canalizan actualmente mediante el Modelo 036.",
    },
    {
      id: "model-030-purpose",
      title: "Para qué sirve",
      cards: [
        { title: "Alta y NIF", bullets: ["Alta en el Censo de Obligados Tributarios.", "Solicitud de NIF por españoles sin DNI o personas extranjeras sin NIE cuando vayan a realizar operaciones de naturaleza tributaria y no deban formar parte del censo empresarial.", "Solicitud de una nueva tarjeta acreditativa del NIF."] },
        { title: "Datos personales", bullets: ["Cambio de nombre o apellidos.", "Estado civil y datos del cónyuge.", "Fecha y lugar de nacimiento, nacionalidad y residencia fiscal.", "Teléfono, correo electrónico y otros datos de contacto."] },
        { title: "Domicilios", bullets: ["Domicilio fiscal.", "Domicilio a efectos de notificaciones.", "Domicilio en el extranjero cuando corresponda."] },
      ],
      note: "El teléfono y el correo sirven para avisos informativos. No sustituyen una notificación tributaria formal.",
    },
    {
      id: "model-030-not-for",
      title: "No utilices el Modelo 030 para…",
      cards: [
        { title: "Iniciar o modificar una actividad", bullets: ["Darte de alta como autónomo.", "Añadir o cesar una actividad económica.", "Cambiar el domicilio fiscal si formas parte del censo empresarial.", "Comunicar obligaciones de IVA, IRPF, retenciones u otros datos de actividad."], links: [{ label: "Ir al Modelo 036", href: "/consultor-fiscal/modelos/036" }] },
      ],
    },
    {
      id: "model-030-who",
      title: "Quién puede utilizarlo",
      accordions: [
        { question: "Persona física sin actividad económica", paragraphs: ["Es el supuesto habitual cuando necesita actualizar sus datos censales y no forma parte del Censo de empresarios, profesionales y retenedores."] },
        { question: "Persona con NIF K, L o M", paragraphs: ["Puede utilizarlo para solicitar el alta, el NIF o comunicar cambios cuando cumple los requisitos del modelo y no debe pertenecer al censo empresarial."] },
        { question: "Presentación conjunta con el cónyuge", paragraphs: ["Puede incluirse a ambos cónyuges cuando comuniquen el mismo domicilio fiscal o de notificaciones, o soliciten simultáneamente determinados cambios previstos en el formulario. Deben cumplimentarse los datos de ambos y firmar los dos."] },
        { question: "Persona ya incluida en el censo empresarial", paragraphs: ["Solo puede utilizar el 030 de forma excepcional para determinados cambios de estado civil o datos identificativos. Los datos vinculados a la actividad y el domicilio fiscal se comunican con el 036."] },
      ],
    },
    {
      id: "model-030-documentation",
      title: "Documentación que puede necesitarse",
      cards: [
        { title: "Identidad y representación", bullets: ["Documento de identidad o pasaporte.", "Documento que acredite la representación, cuando presente otra persona.", "Documentación consular o equivalente en los supuestos que correspondan."] },
        { title: "Cambio comunicado", bullets: ["Justificante del domicilio cuando la AEAT lo solicite.", "Documento acreditativo del estado civil o de los datos modificados.", "Documentos necesarios para la asignación de NIF en el supuesto concreto."] },
      ],
      note: "La AEAT puede pedir documentación adicional para comprobar el dato comunicado.",
    },
    {
      id: "model-030-errors",
      title: "Errores habituales",
      cards: [
        { title: "Elegir el modelo equivocado", bullets: ["Usar el 030 para iniciar una actividad económica.", "Usarlo para cambios empresariales que corresponden al 036.", "Confundir domicilio fiscal con domicilio de notificaciones."] },
        { title: "Dar por terminado el trámite demasiado pronto", bullets: ["Descargar o rellenar un PDF no equivale a presentarlo.", "El correo electrónico no sustituye una notificación.", "Una presentación con documentación pendiente puede requerir subsanación."] },
      ],
    },
  ],
  fillingTitle: "Cómo rellenarlo y presentarlo",
  fillingSteps: [
    { title: "1. Elige la causa", paragraphs: ["Marca únicamente las causas que describen el alta o el cambio que vas a comunicar."] },
    { title: "2. Identifica al interesado", paragraphs: ["Revisa NIF, nombre, residencia fiscal y demás datos identificativos. Si interviene el cónyuge, comprueba que se cumple el supuesto conjunto y que ambos firman."] },
    { title: "3. Completa domicilios y contacto", paragraphs: ["Distingue el domicilio fiscal del domicilio de notificaciones y revisa la fecha de efectos. Los datos electrónicos sirven para avisos informativos."] },
    { title: "4. Presenta", paragraphs: ["Puedes usar el trámite electrónico de la AEAT. Cuando esté permitida la vía impresa, entrega el modelo firmado en la oficina competente o envíalo por correo certificado."] },
    { title: "5. Conserva el justificante", paragraphs: ["Guarda el recibo o copia registrada y atiende cualquier petición de documentación de la AEAT."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Registro", description: "La AEAT registra la comunicación y genera el justificante correspondiente." },
    { title: "Comprobación", description: "Puede comprobar la información y pedir documentos adicionales." },
    { title: "Actualización censal", description: "El dato queda incorporado o modificado cuando el trámite se procesa correctamente." },
  ],
  comparison: {
    title: "Modelos relacionados",
    current: { title: "Modelo 030", description: "Datos censales personales de quien, con carácter general, no pertenece al censo empresarial." },
    related: { title: "Modelo 036", description: "Alta, modificación y baja de empresarios, profesionales, entidades y retenedores.", href: "/consultor-fiscal/modelos/036", label: "Ver Modelo 036" },
    conclusion: "Si el cambio está relacionado con una actividad económica o con obligaciones como IVA, IRPF o retenciones, consulta el Modelo 036.",
  },
  pdfNotice: [
    "El PDF oficial puede requerir Adobe Acrobat Reader para cumplimentarse correctamente. Si el navegador no permite rellenarlo o guardarlo, descárgalo y ábrelo con Acrobat; la AEAT recomienda navegadores actuales como Chrome o Edge para acceder a sus servicios.",
    "Descargar, guardar o imprimir el formulario no equivale a presentarlo.",
  ],
  documents: [{ label: "Ver el formulario oficial publicado en el BOE", sourceId: "boe.model-030.form-image.2025-01-09" }],
  officialLinks: [
    { label: "Ficha completa del procedimiento", sourceId: "aeat.model-030.procedure-record.2026-07-10" },
    { label: "Ayuda para la presentación electrónica", sourceId: "aeat.model-030.electronic-help.2026-06-26" },
    { label: "Procedimiento extraordinario por Internet", href: "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-030/procedimiento-extraordinario-presentacion-modelo-030-internet.html" },
  ],
  legalLinks: [{ label: "Orden HAC/1526/2024", sourceId: "boe.order-hac-1526-2024.2025-01-09" }],
  faq: [
    { question: "¿Sirve para darme de alta como autónomo?", answer: "No. Para iniciar una actividad económica debes utilizar normalmente el Modelo 036." },
    { question: "¿Puedo utilizarlo si ya soy autónomo?", answer: "Solo de manera excepcional para determinados cambios de estado civil o datos identificativos. Los cambios relacionados con la actividad y el domicilio fiscal se comunican mediante el Modelo 036." },
    { question: "¿Puedo cambiar el domicilio fiscal por Internet?", answer: "Sí. La AEAT permite presentar el Modelo 030 y también dispone de una gestión específica dentro de sus servicios censales." },
    { question: "¿El domicilio fiscal y el de notificaciones tienen que ser iguales?", answer: "No necesariamente. El fiscal identifica la residencia habitual a efectos tributarios; el de notificaciones puede ser otro lugar señalado para recibir comunicaciones." },
    { question: "¿El correo electrónico sustituye una notificación?", answer: "No. El correo o el teléfono permiten recibir avisos informativos, pero no sustituyen una notificación tributaria formal." },
    { question: "¿Puede presentarlo otra persona por mí?", answer: "Sí, si dispone de representación válida y aporta la acreditación que corresponda." },
    { question: "¿Puedo presentar un único modelo con mi cónyuge?", answer: "Solo en los supuestos previstos, por ejemplo cuando ambos comuniquen el mismo domicilio. Deben cumplimentarse los datos correspondientes y firmar los dos." },
    { question: "¿Cuánto tiempo tengo para cambiar el domicilio?", answer: "Con carácter general, tres meses desde el cambio si no formas parte del censo empresarial. Si antes termina el plazo de Renta, debe comunicarse en esa declaración salvo que ya se haya hecho." },
    { question: "¿Cuánto tarda Hacienda?", answer: "No existe un tiempo único para toda comunicación. La actualización puede requerir comprobaciones o documentación adicional." },
    { question: "¿Descargar el PDF significa que ya está presentado?", answer: "No. Debes completar el canal de presentación y conservar un justificante de registro." },
  ],
  sourceIds: [
    "aeat.model-030.procedure-home.2026-07-10",
    "aeat.model-030.procedure-record.2026-07-10",
    "aeat.model-030.instructions.2026-07-10",
    "aeat.model-030.electronic-help.2026-06-26",
    "boe.order-hac-1526-2024.2025-01-09",
    "boe.model-030.form-image.2025-01-09",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
