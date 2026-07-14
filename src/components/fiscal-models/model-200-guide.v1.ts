import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_200_GUIDE_V1 = {
  code: "200",
  taxPeriodYear: 2025,
  filingYear: 2026,
  lastVerifiedAt: "2026-07-14",
  requiresAnnualReview: true,
  intro: [
    "El Modelo 200 es la declaración anual del Impuesto sobre Sociedades. Lo presenta la sociedad, que es un contribuyente distinto de sus socios, no el autónomo persona física por su actividad individual.",
    "Parte de la contabilidad, pero el beneficio contable no equivale siempre a la base imponible: la ley fiscal exige ajustes, límites, compensaciones y comprobaciones antes de calcular la cuota.",
    "Esta guía explica la campaña del ejercicio 2025, presentada en 2026. Los tipos y reglas cambian por ejercicio y deben revisarse cada año.",
  ],
  notices: [
    {
      title: "Una sociedad inactiva normalmente sigue declarando",
      paragraphs: [
        "No facturar ni tener movimientos no equivale por sí solo a quedar dispensada del Modelo 200 mientras la entidad continúe existiendo.",
      ],
    },
    {
      title: "Tener pérdidas no elimina la obligación",
      paragraphs: [
        "Una base imponible negativa puede no generar ingreso, pero debe declararse y puede requerir ajustes y seguimiento de bases negativas.",
      ],
    },
    {
      title: "El tipo no se elige",
      paragraphs: [
        "Depende del ejercicio, la cifra de negocios, la naturaleza y circunstancias de la entidad. Esta ficha no determina el tipo aplicable a una sociedad concreta.",
      ],
    },
  ],
  actions: [
    {
      label: "Abrir el procedimiento oficial del Modelo 200",
      sourceId: "aeat.models-200-206.procedure-home.2026-07-01",
      primary: true,
    },
    {
      label: "Acceder a Sociedades WEB",
      sourceId: "aeat.models-200-206.management.2026-07-01",
      primary: true,
    },
    {
      label: "Consultar el Manual de Sociedades 2025",
      sourceId: "aeat.corporate-tax-2025.manual.2026-07-02",
    },
    {
      label: "Ver el Modelo 202 relacionado",
      internalHref: "/consultor-fiscal/modelos/202",
    },
    {
      label: "Ver el Modelo 232 relacionado",
      internalHref: "/consultor-fiscal/modelos/232",
    },
  ],
  quickSummaryTitle: "El Modelo 200 en pocas palabras",
  quickFacts: [
    {
      label: "Qué es",
      value: "La declaración anual del Impuesto sobre Sociedades.",
    },
    {
      label: "Quién lo presenta",
      value: "Sociedades y demás contribuyentes incluidos en su ámbito.",
    },
    {
      label: "Ejercicio explicado",
      value: "Periodos iniciados en 2025, con presentación general en 2026.",
    },
    {
      label: "Resultado",
      value: "Puede ser a ingresar, a devolver o sin ingreso.",
    },
    {
      label: "Canal",
      value:
        "Presentación electrónica mediante Sociedades WEB o fichero admitido.",
    },
    {
      label: "Plazo general",
      value:
        "Los 25 días naturales siguientes a los seis meses posteriores al cierre.",
    },
    {
      label: "Pago anticipado",
      value: "Los pagos del Modelo 202 se descuentan en la liquidación anual.",
    },
    {
      label: "Cuentas anuales",
      value:
        "El Modelo 200 no sustituye su formulación, aprobación y depósito.",
    },
  ],
  sections: [
    {
      id: "model-200-person-company",
      title: "Autónomo persona física y sociedad limitada",
      cards: [
        {
          title: "Autónomo persona física",
          bullets: [
            "La actividad pertenece a la persona.",
            "Declara normalmente el rendimiento en el IRPF y en el Modelo 100.",
            "Puede presentar los Modelos 130 o 131.",
            "No presenta el 200 por su actividad individual.",
          ],
        },
        {
          title: "Sociedad limitada",
          bullets: [
            "Tiene personalidad jurídica propia.",
            "Sus ingresos y gastos pertenecen a la sociedad.",
            "Declara su resultado mediante el Modelo 200.",
            "Puede presentar los Modelos 202 y 232.",
          ],
        },
        {
          title: "Socio o administrador",
          bullets: [
            "Puede recibir nómina, retribución de administrador, dividendos o facturar servicios si corresponde.",
            "Cada relación debe documentarse y tratarse conforme a su naturaleza.",
            "El dinero de la sociedad no es dinero personal del socio.",
          ],
        },
      ],
    },
    {
      id: "model-200-accounting-tax",
      title: "Del resultado contable a la base imponible",
      cards: [
        {
          title: "Resultado contable",
          paragraphs: [
            "Es el beneficio o pérdida obtenido aplicando la normativa contable y cerrando correctamente el ejercicio.",
          ],
        },
        {
          title: "Ajustes fiscales",
          paragraphs: [
            "Corrigen diferencias entre contabilidad y fiscalidad. Un gasto contabilizado puede no ser fiscalmente deducible, o serlo en un periodo distinto.",
          ],
          bullets: [
            "Multas, sanciones y determinados donativos.",
            "Gastos sin justificación o no vinculados a la actividad.",
            "Retribuciones de fondos propios y determinadas liberalidades.",
            "Amortizaciones o deterioros con límites fiscales.",
          ],
        },
        {
          title: "Base imponible y cuota",
          paragraphs: [
            "Tras los ajustes se aplican, cuando corresponda, compensaciones, reducciones, tipo de gravamen, deducciones, bonificaciones, retenciones y pagos fraccionados.",
          ],
        },
      ],
      note: "No es seguro calcular el impuesto aplicando un porcentaje directamente al beneficio contable.",
    },
    {
      id: "model-200-types-2025",
      title: "Tipos para periodos iniciados en 2025",
      cards: [
        {
          title: "Tipo general",
          paragraphs: [
            "25 %, salvo que corresponda un tipo diferente por la clase y circunstancias de la entidad.",
          ],
        },
        {
          title: "Entidades con cifra de negocios inferior a 1 millón",
          paragraphs: [
            "Para 2025, la escala transitoria es 21 % por los primeros 50.000 € de base imponible y 22 % por el resto, si se cumplen los requisitos y no corresponde otro tipo.",
          ],
        },
        {
          title: "Empresas de reducida dimensión",
          paragraphs: [
            "Para periodos iniciados en 2025, el tipo transitorio es 24 % cuando se cumplen los requisitos del artículo 101 de la ley y no procede otro tipo.",
          ],
        },
        {
          title: "Entidades de nueva creación",
          paragraphs: [
            "Pueden aplicar el 15 % en el primer periodo con base positiva y el siguiente si cumplen todos los requisitos. No se aplica automáticamente a una sociedad recién inscrita.",
          ],
        },
      ],
      note: "Los tipos transitorios de 2026 son distintos. La ficha está versionada para el periodo 2025 y requiere revisión anual.",
    },
    {
      id: "model-200-partners",
      title: "Operaciones entre socio y sociedad",
      cards: [
        {
          title: "Separación patrimonial",
          bullets: [
            "Cuenta bancaria separada.",
            "Gastos personales fuera de la contabilidad de la sociedad.",
            "Préstamos y cuentas con socios documentados.",
            "Acuerdos societarios y justificantes coherentes.",
          ],
        },
        {
          title: "Valor de mercado",
          paragraphs: [
            "Los servicios, alquileres, préstamos, ventas y otras operaciones vinculadas deben valorarse conforme a las reglas aplicables y conservar soporte suficiente.",
          ],
        },
        {
          title: "Modelo 232",
          paragraphs: [
            "Determinadas operaciones vinculadas deben informarse además en el Modelo 232.",
          ],
          links: [
            {
              label: "Ver guía del Modelo 232",
              href: "/consultor-fiscal/modelos/232",
            },
          ],
        },
      ],
    },
    {
      id: "model-200-losses-reserves",
      title: "Pérdidas, bases negativas y reservas fiscales",
      cards: [
        {
          title: "Pérdida contable",
          paragraphs: [
            "No implica necesariamente una base imponible negativa: los ajustes fiscales pueden cambiar el resultado.",
          ],
        },
        {
          title: "Bases imponibles negativas",
          paragraphs: [
            "Pueden compensarse en periodos posteriores con los límites y requisitos vigentes. Deben conservarse declaraciones, contabilidad y soporte de su origen.",
          ],
        },
        {
          title: "Reservas fiscales",
          paragraphs: [
            "La reserva de capitalización y, cuando proceda, la de nivelación exigen requisitos propios, dotación contable y seguimiento. No son descuentos automáticos.",
          ],
        },
      ],
    },
    {
      id: "model-200-deadline-result",
      title: "Plazo, resultado y pago",
      cards: [
        {
          title: "Plazo ligado al cierre",
          paragraphs: [
            "Se presenta dentro de los 25 días naturales siguientes a los seis meses posteriores al cierre. Julio es el periodo habitual solo para entidades cuyo ejercicio termina el 31 de diciembre.",
          ],
        },
        {
          title: "Resultado",
          bullets: [
            "A ingresar: se paga o reconoce la deuda por el canal admitido.",
            "A devolver: se solicita la devolución que proceda.",
            "Cuota cero o negativa: sigue existiendo presentación si la entidad está obligada.",
          ],
        },
        {
          title: "Pagos fraccionados",
          paragraphs: [
            "Los importes ingresados mediante el Modelo 202 son pagos a cuenta que se deducen en el Modelo 200.",
          ],
          links: [
            {
              label: "Ver guía del Modelo 202",
              href: "/consultor-fiscal/modelos/202",
            },
          ],
        },
      ],
    },
    {
      id: "model-200-correction",
      title: "Cómo corregir errores",
      cards: [
        {
          title: "Rectificación",
          paragraphs: [
            "La normativa vigente utiliza la autoliquidación rectificativa en los supuestos aplicables. Debe revisarse el ejercicio, el efecto del error y el trámite que ofrece la AEAT.",
          ],
        },
        {
          title: "No alteres solo una cifra",
          paragraphs: [
            "Un cambio contable puede afectar ajustes, bases negativas, deducciones, pagos a cuenta, resultado y datos informativos. Revisa el conjunto.",
          ],
        },
      ],
    },
    {
      id: "model-200-territory",
      title: "Ámbito territorial",
      note: "Esta guía se refiere principalmente al Impuesto sobre Sociedades estatal. Las entidades sometidas a normativa del País Vasco o Navarra deben comprobar las reglas y modelos de la Hacienda foral competente. Determinadas entidades pueden tributar conjuntamente al Estado y a una Hacienda foral; los formularios estatales pueden solicitar el porcentaje correspondiente al territorio común.",
    },
  ],
  fillingTitle: "Cómo preparar y presentar el Modelo 200",
  fillingSteps: [
    {
      title: "1. Cierra la contabilidad",
      paragraphs: [
        "Conciliación bancaria, facturas, nóminas, inmovilizado, amortizaciones, provisiones, socios y cierre contable.",
      ],
    },
    {
      title: "2. Revisa identificación y régimen",
      paragraphs: [
        "Periodo, CNAE, socios, administradores, grupo, cifra de negocios, tipo de entidad y caracteres especiales.",
      ],
    },
    {
      title: "3. Importa o incorpora datos",
      paragraphs: [
        "Accede a Sociedades WEB y revisa los datos trasladados; una importación correcta no sustituye la comprobación fiscal.",
      ],
    },
    {
      title: "4. Calcula ajustes y base",
      paragraphs: [
        "Documenta diferencias permanentes y temporarias, bases negativas, reservas, deducciones y límites.",
      ],
    },
    {
      title: "5. Comprueba pagos a cuenta",
      paragraphs: [
        "Contrasta retenciones y Modelos 202 con la información de la AEAT y la contabilidad.",
      ],
    },
    {
      title: "6. Valida y revisa el borrador",
      paragraphs: [
        "La vista previa sirve para revisar, pero no acredita presentación.",
      ],
    },
    {
      title: "7. Firma, presenta y conserva",
      paragraphs: [
        "Guarda justificante, CSV, declaración, cuentas, libros, cálculos y documentación soporte.",
      ],
    },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    {
      title: "Pago o devolución",
      description:
        "El justificante refleja el resultado; una devolución queda sujeta a comprobación.",
    },
    {
      title: "Comprobaciones",
      description:
        "La AEAT puede contrastar la declaración con contabilidad, otras declaraciones y datos de terceros.",
    },
    {
      title: "Archivo",
      description:
        "Conserva trazabilidad de cada ajuste, incentivo, base negativa y operación vinculada.",
    },
  ],
  comparison: {
    title: "Modelos 200, 202 y 232",
    current: {
      title: "Modelo 200",
      description: "Liquida anualmente el Impuesto sobre Sociedades.",
    },
    related: {
      title: "Modelo 202",
      description: "Anticipa pagos a cuenta durante el ejercicio.",
      href: "/consultor-fiscal/modelos/202",
      label: "Ver Modelo 202",
    },
    additional: [
      {
        title: "Modelo 232",
        description:
          "Informa determinadas operaciones vinculadas y situaciones internacionales.",
        href: "/consultor-fiscal/modelos/232",
        label: "Ver Modelo 232",
      },
    ],
    conclusion:
      "Son obligaciones distintas: presentar uno no sustituye los otros cuando correspondan.",
  },
  pdfNotice: [
    "El PDF de vista previa o el documento de ingreso no sustituyen la presentación electrónica ni el justificante de Sociedades WEB.",
  ],
  documents: [
    {
      label: "Documento oficial de ingreso o devolución del Modelo 200 · 2025",
      sourceId: "aeat.model-200.form-pdf.2026-06-22",
    },
  ],
  officialLinks: [
    {
      label: "Ficha administrativa de los Modelos 200 y 206",
      sourceId: "aeat.models-200-206.procedure-record.2026-07-01",
    },
    {
      label: "Ayuda oficial de Sociedades WEB",
      sourceId: "aeat.model-200.sociedades-web-help.2026-07-01",
    },
    {
      label: "Campaña de Sociedades 2025",
      sourceId: "aeat.corporate-tax-2025.campaign.2026-07-01",
    },
    {
      label: "Información de ejercicios anteriores",
      sourceId: "aeat.model-200.previous-exercises.2026-07-01",
    },
  ],
  legalLinks: [
    {
      label: "Orden HAC/529/2026",
      sourceId: "boe.models-200-206.order-hac-529-2026",
    },
    {
      label: "Ley 27/2014 del Impuesto sobre Sociedades",
      href: "https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328",
    },
  ],
  faq: [
    {
      question: "¿Un autónomo persona física presenta el Modelo 200?",
      answer:
        "No por su actividad individual. Lo presenta la sociedad u otro contribuyente del Impuesto sobre Sociedades.",
    },
    {
      question: "¿Una sociedad sin actividad debe presentarlo?",
      answer:
        "Con carácter general, sí mientras continúe existiendo y sea contribuyente, aunque debe revisarse su situación concreta.",
    },
    {
      question: "¿Se presenta si hay pérdidas?",
      answer: "Sí. Las pérdidas no eliminan por sí solas la obligación.",
    },
    {
      question: "¿Beneficio contable y base imponible son lo mismo?",
      answer: "No necesariamente; se aplican ajustes fiscales y otras reglas.",
    },
    {
      question: "¿Cuál es el tipo general?",
      answer:
        "El 25 %, sin perjuicio de tipos distintos según entidad, ejercicio y requisitos.",
    },
    {
      question: "¿Qué tipo tienen las microempresas en 2025?",
      answer:
        "Para periodos iniciados en 2025, 21 % hasta 50.000 € de base y 22 % sobre el resto, si cumplen los requisitos y no procede otro tipo.",
    },
    {
      question: "¿Una sociedad nueva aplica siempre el 15 %?",
      answer:
        "No. Debe cumplir los requisitos legales y no ser una mera continuación de otra actividad, entre otras condiciones.",
    },
    {
      question: "¿Cuándo se presenta?",
      answer:
        "Dentro de los 25 días naturales siguientes a los seis meses posteriores al cierre del periodo.",
    },
    {
      question: "¿Siempre se presenta en julio?",
      answer:
        "No. Julio es habitual para entidades que cierran el 31 de diciembre.",
    },
    {
      question: "¿Qué relación tiene con el Modelo 202?",
      answer:
        "Los pagos fraccionados del 202 se descuentan en la liquidación anual del 200.",
    },
    {
      question: "¿Sustituye a las cuentas anuales?",
      answer: "No. Son obligaciones diferentes.",
    },
    {
      question: "¿Puede salir a devolver?",
      answer:
        "Sí, por ejemplo cuando pagos a cuenta y retenciones superan la cuota, sujeto a comprobación.",
    },
    {
      question: "¿Los gastos personales del socio son deducibles?",
      answer:
        "No deben tratarse como gastos de la sociedad sin una relación real, justificación y tratamiento correcto.",
    },
    {
      question: "¿Cómo se corrige un error?",
      answer:
        "Debe revisarse el procedimiento vigente de autoliquidación rectificativa y el efecto completo del cambio.",
    },
    {
      question: "¿La vista previa acredita la presentación?",
      answer:
        "No. Hace falta firmar, enviar y conservar el justificante con CSV.",
    },
  ],
  sourceIds: [
    "aeat.models.index.2026-07-08",
    "aeat.models-200-206.procedure-home.2026-07-01",
    "aeat.models-200-206.procedure-record.2026-07-01",
    "aeat.models-200-206.management.2026-07-01",
    "aeat.corporate-tax-2025.campaign.2026-07-01",
    "aeat.corporate-tax-2025.manual.2026-07-02",
    "aeat.model-200.sociedades-web-help.2026-07-01",
    "aeat.model-200.form-pdf.2026-06-22",
    "aeat.model-200.previous-exercises.2026-07-01",
    "boe.models-200-206.order-hac-529-2026",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
