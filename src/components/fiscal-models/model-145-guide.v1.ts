import type { FiscalModelPracticalGuideV1 } from "./fiscal-model-practical-guide.types";

export const MODEL_145_GUIDE_V1 = {
  code: "145",
  effectiveYear: 2026,
  lastVerifiedAt: "2026-07-15",
  requiresAnnualReview: true,
  externalActionNotice:
    "El documento se descarga desde la AEAT, pero debe entregarse al pagador. Factu no recibe ni almacena sus datos.",
  intro: [
    "El Modelo 145 permite que una persona trabajadora comunique a su empresa o pagador sus circunstancias personales y familiares para calcular la retención del Impuesto sobre la Renta de las Personas Físicas (IRPF) de su nómina.",
    "No se presenta ante la Agencia Tributaria (AEAT). La persona trabajadora lo entrega al pagador, y el pagador debe conservar la comunicación.",
  ],
  notices: [
    {
      title: "No lo envíes a Hacienda",
      paragraphs: ["La propia AEAT indica que este trámite se realiza entre la persona interesada y el pagador. La sede solo ofrece el documento y la información oficial."],
    },
    {
      title: "Datos personales sensibles",
      paragraphs: ["El formulario puede contener datos familiares, de discapacidad o derivados de resoluciones judiciales. Factu no los solicita, recibe ni almacena en esta ficha."],
    },
  ],
  actions: [
    { label: "Descargar Modelo 145 oficial", sourceId: "aeat.model-145.form-pdf.captured-2026-07-13", primary: true },
    { label: "Consultar instrucciones de descarga", sourceId: "aeat.model-145.download.2026-06-09", primary: true },
    { label: "Ver ficha oficial del procedimiento", sourceId: "aeat.model-145.procedure-record.2026-06-09" },
    { label: "Abrir servicio oficial de cálculo de retenciones", href: "https://sede.agenciatributaria.gob.es/Sede/Retenciones.shtml" },
  ],
  quickSummaryTitle: "El Modelo 145 en pocas palabras",
  quickFacts: [
    { label: "Quién lo rellena", value: "La persona que recibe rendimientos del trabajo." },
    { label: "A quién se entrega", value: "A la empresa, empleador u otro pagador de las retribuciones." },
    { label: "Dónde se presenta", value: "No se presenta a la AEAT; el pagador conserva la comunicación." },
    { label: "Para qué sirve", value: "Para calcular o regularizar correctamente la retención de IRPF de la nómina." },
    { label: "Cuándo se renueva", value: "Al iniciar la relación y cuando cambian circunstancias relevantes; no necesariamente cada año." },
    { label: "Relación fiscal", value: "El pagador ingresa las retenciones mediante el 111 y las resume en el 190." },
  ],
  sections: [
    {
      id: "model-145-who",
      title: "Quién lo usa y quién lo conserva",
      cards: [
        { title: "Persona trabajadora", paragraphs: ["Comunica los datos que influyen en el cálculo de la retención. Debe firmar y entregar la comunicación al pagador por el canal que este establezca."] },
        { title: "Pagador o empleador", paragraphs: ["Recibe la comunicación, la conserva debidamente firmada y calcula la retención aplicable. No la reenvía periódicamente a la AEAT."] },
        { title: "Autónomo con empleados", paragraphs: ["Para el autónomo empleador es un documento laboral-fiscal que recibe y custodia. No sustituye el cálculo de nóminas ni los Modelos 111 y 190."] },
        { title: "Autónomo sin nómina", paragraphs: ["No se utiliza para calcular la retención de las propias facturas profesionales del autónomo."] },
      ],
    },
    {
      id: "model-145-when",
      title: "Cuándo se comunica",
      cards: [
        { title: "Al comenzar", paragraphs: ["Se entrega al pagador para que disponga de los datos necesarios antes de calcular las retenciones de la relación laboral."] },
        { title: "Si cambian las circunstancias", paragraphs: ["Las variaciones que puedan aumentar el tipo deben comunicarse en el plazo de diez días. Las que puedan reducirlo pueden comunicarse para regularizar."] },
        { title: "Efecto en la nómina", paragraphs: ["La regla general exige que resten al menos cinco días para confeccionar la nómina a fin de que la comunicación pueda surtir efecto en ella."] },
        { title: "No hace falta repetirlo sin cambios", paragraphs: ["No es necesario presentar un nuevo Modelo 145 cada año si las circunstancias comunicadas no han cambiado, sin perjuicio de las comprobaciones internas del pagador."] },
      ],
      note: "La obligación de comunicar cambios y su fecha de efecto dependen del sentido de la variación. No retrases una comunicación que pueda incrementar la retención.",
    },
    {
      id: "model-145-form",
      title: "Qué datos organiza el formulario",
      cards: [
        { title: "Datos del perceptor", bullets: ["Identificación y situación familiar.", "Año de nacimiento y, cuando corresponda, grado de discapacidad.", "Movilidad geográfica u otras circunstancias previstas por el formulario vigente."] },
        { title: "Descendientes y ascendientes", paragraphs: ["Recoge la información necesaria para valorar las circunstancias familiares conforme a los requisitos del formulario y del reglamento."] },
        { title: "Pensiones y anualidades", paragraphs: ["Incluye espacios para pensiones compensatorias y anualidades por alimentos fijadas por resolución judicial cuando proceda."] },
        { title: "Vivienda habitual", paragraphs: ["Mantiene una comunicación específica para determinados supuestos transitorios de financiación de vivienda habitual. Deben comprobarse los requisitos vigentes antes de marcarla."] },
      ],
      note: "No facilites a Factu ninguno de estos datos. Descarga el PDF oficial y entrégalo directamente a tu pagador por un canal seguro.",
    },
    {
      id: "model-145-situations",
      title: "Situación familiar y cálculo de la retención",
      accordions: [
        { question: "¿Qué son las situaciones 1, 2 y 3?", paragraphs: ["Son categorías del formulario que ayudan al pagador a calcular el tipo. Debe elegirse la que corresponda a la situación real y leer las definiciones impresas en el documento oficial."] },
        { question: "¿El formulario decide la declaración de la Renta?", paragraphs: ["No. Sirve para calcular retenciones de nómina. No determina por sí mismo el derecho definitivo a mínimos, deducciones o el resultado de la declaración anual."] },
        { question: "¿Puedo marcar una situación para retener menos?", paragraphs: ["Solo deben comunicarse datos verdaderos y acreditables. Una comunicación incorrecta puede producir una retención insuficiente y responsabilidades para la persona perceptora."] },
      ],
    },
    {
      id: "model-145-higher-rate",
      title: "Solicitud de una retención superior",
      cards: [
        { title: "Solicitud escrita al pagador", paragraphs: ["La persona trabajadora puede solicitar en cualquier momento un tipo superior al calculado. La petición se dirige al pagador, no a la AEAT."] },
        { title: "Antelación", paragraphs: ["El pagador debe atender la solicitud formulada al menos cinco días antes de confeccionar la nómina."] },
        { title: "Duración", paragraphs: ["El tipo solicitado se mantiene como mínimo hasta final de año y continúa mientras no se renuncie por escrito o se solicite otro superior, salvo que una variación determine un tipo mayor."] },
      ],
      note: "No alteres la situación personal del Modelo 145 para conseguir una retención mayor: solicita expresamente el tipo superior.",
    },
    {
      id: "model-145-download",
      title: "Cómo descargar y cumplimentar el PDF",
      cards: [
        { title: "Guarda el archivo", paragraphs: ["La AEAT recomienda descargar el PDF en el equipo y abrirlo con un lector compatible, en lugar de cumplimentarlo dentro del navegador."] },
        { title: "Revisa los avisos del navegador", paragraphs: ["La página oficial explica limitaciones de algunos navegadores y del botón de generación del código. Sigue las instrucciones de la AEAT para evitar un documento incompleto."] },
        { title: "Firma y entrega", paragraphs: ["Comprueba los datos, firma la comunicación y entrégala al pagador. Descargar o rellenar el archivo no equivale a haberlo comunicado."] },
      ],
    },
    {
      id: "model-145-security",
      title: "Conservación y privacidad",
      cards: [
        { title: "Obligación del pagador", paragraphs: ["El Reglamento obliga al pagador a conservar la comunicación debidamente firmada."] },
        { title: "Canal seguro", paragraphs: ["Por contener información personal y familiar, utiliza el canal seguro indicado por la empresa y evita enviarlo a destinatarios equivocados."] },
        { title: "Factu no actúa como archivo", paragraphs: ["Esta página solo explica el modelo y enlaza la documentación oficial. No sube, analiza ni guarda el PDF ni sus datos."] },
      ],
    },
    {
      id: "model-145-payroll",
      title: "Relación con las nóminas, el 111 y el 190",
      cards: [
        { title: "Cálculo de nómina", paragraphs: ["El pagador utiliza la información comunicada junto con las retribuciones y las reglas vigentes. Recibir el 145 no garantiza por sí solo que el porcentaje calculado sea correcto."] },
        { title: "Modelo 111", paragraphs: ["El pagador ingresa periódicamente las retenciones practicadas en nómina mediante el 111."], links: [{ label: "Ver Modelo 111", href: "/consultor-fiscal/modelos/111" }] },
        { title: "Modelo 190", paragraphs: ["Al finalizar el año, el pagador informa del detalle anual de las retenciones del trabajo mediante el 190."], links: [{ label: "Ver Modelo 190", href: "/consultor-fiscal/modelos/190" }] },
      ],
    },
  ],
  fillingTitle: "Cómo gestionar el Modelo 145",
  fillingSteps: [
    { title: "1. Descarga el PDF oficial", paragraphs: ["Guárdalo en tu equipo y ábrelo con un lector compatible siguiendo la ayuda de la AEAT."] },
    { title: "2. Lee las definiciones", paragraphs: ["Comprueba cada situación y campo; no marques opciones solo para modificar el resultado de la nómina."] },
    { title: "3. Cumplimenta solo lo aplicable", paragraphs: ["Incluye datos ciertos y la documentación que corresponda, sin enviarlos a Factu."] },
    { title: "4. Firma y entrega al pagador", paragraphs: ["Utiliza el canal seguro establecido por la empresa. No lo presentes en la sede de la AEAT."] },
    { title: "5. Comunica cambios", paragraphs: ["Informa las variaciones relevantes dentro de sus plazos y conserva prueba de la entrega."] },
  ],
  afterTitle: "Qué ocurre después",
  afterSteps: [
    { title: "Conservación", description: "El pagador archiva la comunicación firmada conforme a sus obligaciones." },
    { title: "Cálculo", description: "El pagador calcula o regulariza el tipo de la nómina con las reglas vigentes." },
    { title: "Cambios", description: "La persona trabajadora comunica las variaciones que puedan afectar a la retención." },
  ],
  comparison: {
    title: "Modelo 145, Modelo 111 y Modelo 190",
    current: { title: "Modelo 145", description: "Comunicación del trabajador al pagador; no es una autoliquidación y no se presenta a la AEAT." },
    related: { title: "Modelo 111", description: "El pagador ingresa periódicamente las retenciones de las nóminas.", href: "/consultor-fiscal/modelos/111", label: "Ver Modelo 111" },
    additional: [{ title: "Modelo 190", description: "El pagador informa anualmente de las retenciones del trabajo por perceptor.", href: "/consultor-fiscal/modelos/190", label: "Ver Modelo 190" }],
    conclusion: "El 145 aporta datos para calcular la nómina; el 111 ingresa las retenciones y el 190 las resume anualmente.",
  },
  pdfNotice: [
    "El formulario oficial enlazado es un PDF interactivo. Descárgalo y ábrelo con un lector compatible siguiendo las instrucciones de la AEAT.",
    "El documento contiene datos personales y familiares: entrégalo solo al pagador por un canal seguro. Factu no recibe ni almacena el archivo.",
  ],
  documents: [{ label: "Descargar formulario oficial del Modelo 145", sourceId: "aeat.model-145.form-pdf.captured-2026-07-13" }],
  officialLinks: [
    { label: "Página oficial del Modelo 145", sourceId: "aeat.model-145.procedure-home.2022-05-30" },
    { label: "Ficha administrativa del procedimiento", sourceId: "aeat.model-145.procedure-record.2026-06-09" },
    { label: "Instrucciones oficiales de descarga", sourceId: "aeat.model-145.download.2026-06-09" },
  ],
  legalLinks: [
    { label: "Resolución de aprobación del Modelo 145", sourceId: "boe.model-145.resolution-2011" },
    { label: "Reglamento del IRPF · artículo 88", href: "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a88" },
  ],
  faq: [
    { question: "¿Qué es el Modelo 145?", answer: "La comunicación con la que una persona trabajadora informa a su pagador de circunstancias que influyen en la retención de su nómina." },
    { question: "¿Quién lo rellena?", answer: "La persona que recibe los rendimientos del trabajo." },
    { question: "¿A quién se entrega?", answer: "A la empresa, empleador u otro pagador de las retribuciones." },
    { question: "¿Se presenta a la AEAT?", answer: "No. La AEAT indica que se tramita entre la persona interesada y el pagador." },
    { question: "¿Debe entregarse cada año?", answer: "No necesariamente. Se renueva cuando cambian circunstancias relevantes o el pagador necesita una comunicación actualizada." },
    { question: "¿Cuándo comunico un cambio que aumenta la retención?", answer: "En el plazo de diez días desde que se produce, según el artículo 88 del Reglamento del IRPF." },
    { question: "¿Cuándo afecta a la nómina?", answer: "Con carácter general, cuando resten al menos cinco días antes de confeccionarla." },
    { question: "¿Puedo pedir que me retengan más?", answer: "Sí, mediante solicitud escrita al pagador formulada al menos cinco días antes de la nómina." },
    { question: "¿El Modelo 145 calcula el porcentaje?", answer: "No. Comunica datos; el pagador calcula el tipo con las retribuciones y las reglas vigentes." },
    { question: "¿Determina mi declaración de la Renta?", answer: "No. La retención es un pago a cuenta y el 145 no decide el resultado anual ni los derechos definitivos." },
    { question: "¿Qué hace el autónomo que recibe uno?", answer: "Lo conserva de forma segura y utiliza la información para calcular o regularizar la nómina conforme a la normativa." },
    { question: "¿Sustituye al Modelo 111?", answer: "No. El pagador ingresa las retenciones de nómina mediante el Modelo 111." },
    { question: "¿Sustituye al Modelo 190?", answer: "No. El pagador informa del detalle anual mediante el Modelo 190." },
    { question: "¿Factu guarda mis datos familiares?", answer: "No. Esta ficha no recibe, analiza ni almacena el Modelo 145 ni sus datos." },
    { question: "¿Cómo abro el PDF oficial?", answer: "Descárgalo al equipo y ábrelo con un lector compatible, siguiendo las instrucciones de la página de descarga de la AEAT." },
  ],
  sourceIds: [
    "aeat.model-145.procedure-home.2022-05-30",
    "aeat.model-145.procedure-record.2026-06-09",
    "aeat.model-145.download.2026-06-09",
    "aeat.model-145.form-pdf.captured-2026-07-13",
    "boe.model-145.resolution-2011",
  ],
} as const satisfies FiscalModelPracticalGuideV1;
