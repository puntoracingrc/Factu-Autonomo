export const MODEL_01_GUIDE_V1 = {
  intro:
    "El Modelo 01 sirve para pedir a la Agencia Tributaria un documento oficial que acredite determinados datos sobre la situación fiscal de una persona, autónomo o empresa. No es una declaración de impuestos y no sirve para realizar un pago.",
  importantNotice:
    "El Modelo 01 no sirve únicamente para solicitar el certificado de estar al corriente. El formulario oficial permite pedir distintos tipos de certificados tributarios.",
  actions: {
    procedure: {
      label: "Solicitar certificado en la AEAT",
      sourceId: "aeat.model-01.procedure-home.2025-11-21",
    },
    form: {
      label: "Descargar Modelo 01 oficial",
      sourceId: "aeat.model-01.form-pdf.2022-07-26",
    },
    instructions: {
      label: "Ver instrucciones oficiales",
      sourceId: "aeat.model-01.instructions-pdf.2022-07-26",
    },
  },
  quickFacts: [
    {
      label: "Qué es",
      value: "Una solicitud para que Hacienda expida un certificado tributario.",
    },
    {
      label: "Quién puede solicitarlo",
      value:
        "La persona, autónomo o empresa interesada, o su representante autorizado.",
    },
    {
      label: "Para qué sirve",
      value: "Para demostrar oficialmente determinados datos fiscales.",
    },
    {
      label: "Cómo se solicita",
      value:
        "Por internet mediante el trámite del certificado o, cuando proceda, en una oficina con el Modelo 01.",
    },
    {
      label: "Plazo de G304",
      value:
        "20 días hábiles para el procedimiento de estar al corriente; algunos certificados electrónicos pueden ser inmediatos.",
    },
    {
      label: "Validez general",
      value:
        "12 meses para obligaciones periódicas y 3 meses para las no periódicas, si no cambian las circunstancias.",
    },
  ],
  purpose: {
    body: "El Modelo 01 se utiliza para pedir a Hacienda que confirme oficialmente información de sus bases de datos. Por ejemplo, permite acreditar la presentación de una declaración, el alta en una actividad o el cumplimiento de obligaciones tributarias.",
    clarification:
      "El Modelo 01 es la solicitud. El documento que finalmente acredita la información es el certificado expedido por la Agencia Tributaria.",
  },
  certificateTypes: [
    {
      title: "Identificación o situación censal",
      description:
        "Acredita datos que constan en el censo de la AEAT, como el NIF, el domicilio fiscal o la situación censal.",
    },
    {
      title: "Presentación o no presentación de una declaración",
      description:
        "Permite demostrar si se presentó una declaración concreta. En el formulario se indican su modelo y ejercicio.",
    },
    {
      title: "Copia certificada de una declaración",
      description:
        "Permite pedir una copia oficial de una declaración presentada anteriormente, identificando modelo y ejercicio.",
    },
    {
      title: "Presentación de autoliquidaciones",
      description:
        "Sirve para acreditar la presentación de autoliquidaciones, indicando el modelo tributario y el ejercicio.",
    },
    {
      title: "Alta o baja en el IAE",
      description:
        "Acredita el alta o la baja en una actividad económica. Puede requerir epígrafe o grupo y periodo.",
    },
    {
      title: "Estar al corriente de las obligaciones tributarias",
      description:
        "Acredita el cumplimiento de obligaciones con Hacienda para la finalidad indicada en la solicitud.",
      examples: [
        "Contratar con el sector público.",
        "Obtener autorizaciones de transporte.",
        "Solicitar subvenciones o ayudas públicas.",
        "Realizar determinados trámites de extranjería.",
        "Otra finalidad que se describa en la solicitud.",
      ],
    },
    {
      title: "Residencia fiscal en España",
      description:
        "Permite acreditar la residencia fiscal en España según la información de la Agencia Tributaria.",
    },
    {
      title: "Entidades sin fines lucrativos",
      description:
        "Acredita la opción por el régimen fiscal especial de las entidades sin fines lucrativos.",
    },
    {
      title: "Otros certificados",
      description:
        "El formulario permite describir otro certificado. Si existe un trámite electrónico específico, la AEAT indica que se utilice ese trámite.",
    },
  ],
  fillingSteps: [
    {
      title: "1. Datos del interesado",
      description:
        "Completa el NIF, nombre y apellidos o razón social, domicilio, código postal, municipio, provincia y teléfono.",
    },
    {
      title: "2. Datos del representante",
      description:
        "Rellena este apartado solo si otra persona presenta la solicitud. El formulario pide su NIF, nombre o razón social, domicilio y teléfono.",
    },
    {
      title: "3. Tipo de certificado",
      description:
        "Marca el certificado que necesitas. Según la opción, añade el modelo y ejercicio de la declaración, el epígrafe o grupo del IAE, el periodo o la finalidad.",
    },
    {
      title: "4. Destinatario y finalidad",
      description:
        "Indica ante qué organismo, empresa o entidad presentarás el certificado y para qué trámite lo necesitas.",
      example:
        "Ejemplo: para ser presentado ante el Ayuntamiento, a efectos de solicitar una subvención para trabajadores autónomos.",
    },
    {
      title: "5. Fecha y firma",
      description:
        "La solicitud debe llevar fecha y la firma del interesado o de su representante. El PDF incluye un ejemplar para la Administración y otro para el interesado.",
    },
  ],
  channels: [
    {
      title: "Por internet",
      description:
        "Se utiliza normalmente el trámite electrónico del certificado concreto; por lo general no hace falta descargar y subir el PDF del Modelo 01.",
      bullets: [
        "Identificación con Cl@ve, certificado electrónico o DNI electrónico, según el trámite.",
        "Puede actuar un representante autorizado y, en los casos admitidos, un colaborador social.",
        "El botón principal lleva a las gestiones oficiales de la AEAT; Factu no inicia ni envía la solicitud.",
      ],
    },
    {
      title: "En una oficina",
      description:
        "Quienes puedan utilizar la vía presencial pueden presentar el Modelo 01 en una Delegación o Administración de la AEAT.",
      bullets: [
        "La AEAT recomienda pedir cita antes de acudir.",
        "Lleva la documentación de identificación y, si corresponde, la acreditación de la representación.",
      ],
    },
  ],
  pdfNotice: {
    title: "Antes de rellenar el PDF",
    paragraphs: [
      "La AEAT recomienda descargar el archivo en el ordenador y abrirlo con Adobe Acrobat Reader. Si se abre dentro de Chrome o Edge, puede quedar inactiva la opción que genera el número de justificante.",
      "Esos navegadores pueden mostrar, para este formulario concreto, un aviso de documento alterado. La AEAT atribuye ese mensaje al código del propio PDF que genera el justificante y el código de barras. Esta explicación no se aplica a otros avisos de seguridad ni a otros archivos.",
    ],
  },
  currentStatusResults: [
    {
      title: "Positivo",
      description:
        "La persona o empresa está al corriente de sus obligaciones tributarias.",
    },
    {
      title: "Negativo por deudas",
      description: "Constan deudas pendientes del solicitante.",
    },
    {
      title: "Negativo por declaraciones",
      description: "Falta presentar alguna declaración obligatoria.",
    },
    {
      title: "Negativo por ambos motivos",
      description: "Constan deudas y también declaraciones pendientes.",
    },
  ],
  afterRequest: [
    {
      title: "Cuánto tarda",
      paragraphs: [
        "En el procedimiento del certificado de estar al corriente, el plazo oficial de resolución es de 20 días hábiles.",
        "Determinadas solicitudes electrónicas pueden generar el certificado de inmediato. Si necesitan tramitación, se consultan posteriormente en la sede electrónica.",
      ],
    },
    {
      title: "Cómo se recibe",
      paragraphs: [
        "Si se genera inmediatamente, se descarga desde la sede electrónica. Si requiere tramitación, puede consultarse en Mis expedientes o en la consulta de certificados expedidos.",
        "Según el caso, puede quedar disponible en la DEHú. Si la persona no está obligada a relacionarse electrónicamente, también puede enviarse por correo postal.",
      ],
    },
    {
      title: "Cuánto tiempo es válido",
      paragraphs: [
        "Como regla general, el certificado vale 12 meses si se refiere a obligaciones periódicas y 3 meses si se refiere a una obligación puntual. Una norma específica puede fijar otro plazo.",
        "Puede dejar de representar la situación real antes de ese plazo si cambian las circunstancias; por ejemplo, si aparece una deuda después de su expedición.",
      ],
    },
  ],
  correction: {
    title: "Si el certificado contiene un error",
    description:
      "El certificado tiene carácter informativo y no se recurre directamente, pero puedes comunicar tu disconformidad en los 10 días siguientes, contados desde el día posterior a su recepción.",
    bullets: [
      "Dirige el escrito al órgano que expidió el certificado.",
      "Solicita expresamente la modificación.",
      "Adjunta los documentos o pruebas que acrediten el error.",
    ],
    example:
      "Ejemplo: si aparece una deuda que ya pagaste, puedes pedir la corrección y aportar el justificante de pago.",
  },
  csv: {
    title: "Cómo comprobar que es auténtico",
    description:
      "Los certificados incorporan un Código Seguro de Verificación (CSV). El cotejo oficial permite comprobar que el documento coincide con el conservado por la AEAT y verificar su contenido, autenticidad e integridad.",
    note:
      "Las copias producen los mismos efectos cuando pueden comprobarse con el CSV. Trátalo con cautela: quien lo conozca podría acceder al documento.",
    sourceId: "aeat.model-01.csv-check.2025-06-24",
  },
  comparison: {
    model01:
      "Solicitud general de distintos certificados tributarios.",
    model01c:
      "Solicitud específica del certificado de contratistas y subcontratistas.",
    warning:
      "No utilices el Modelo 01 general cuando el trámite requiera expresamente el Modelo 01C.",
    model01cHref: "/consultor-fiscal/modelos/01C",
  },
  faq: [
    {
      question: "¿El Modelo 01 es una declaración de impuestos?",
      answer:
        "No. Es una solicitud para que Hacienda expida un certificado. No sirve para declarar ni pagar un impuesto.",
    },
    {
      question: "¿Solo sirve para demostrar que estoy al corriente?",
      answer:
        "No. También permite solicitar certificados censales, sobre declaraciones, autoliquidaciones, IAE, residencia fiscal y otros.",
    },
    {
      question: "¿Tengo que subir el PDF para pedirlo por internet?",
      answer:
        "Normalmente no. Por internet se utiliza el trámite electrónico correspondiente al certificado.",
    },
    {
      question: "¿Puede presentarlo otra persona por mí?",
      answer:
        "Sí, siempre que tenga autorización o pueda acreditar la representación.",
    },
    {
      question: "¿Un certificado negativo significa siempre que tengo deudas?",
      answer:
        "No. También puede deberse a que falta presentar alguna declaración, o a ambos motivos.",
    },
    {
      question: "¿Cuánto tarda?",
      answer:
        "Para el certificado de estar al corriente, el plazo oficial es de 20 días hábiles, aunque en determinados casos la respuesta electrónica puede ser inmediata.",
    },
    {
      question: "¿Cuánto tiempo es válido?",
      answer:
        "Como regla general, 12 meses para obligaciones periódicas y 3 meses para obligaciones no periódicas, siempre que no cambien las circunstancias.",
    },
    {
      question: "¿Qué hago si contiene un error?",
      answer:
        "Puedes solicitar su modificación en el plazo de 10 días y aportar las pruebas correspondientes.",
    },
  ],
  sourceIds: [
    "aeat.model-01.procedure-home.2025-11-21",
    "aeat.model-01.procedure-record.2025-11-21",
    "aeat.model-01.what-certifies.2025-11-21",
    "aeat.model-01.where-obtained.2025-11-21",
    "aeat.model-01.download.2026-06-04",
    "aeat.model-01.general-faq.2025-03-03",
    "aeat.model-01.certificate-status.2025-12-02",
    "aeat.model-01.csv-check.2025-06-24",
    "aeat.model-01.census-certificates.2025-09-02",
    "aeat.model-01.form-pdf.2022-07-26",
    "aeat.model-01.instructions-pdf.2022-07-26",
    "boe.rd-1065-2007.article-70",
  ],
} as const;
