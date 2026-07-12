import type { ConditionalQuestion } from "./types";

export const MEAL_PURPOSE_QUESTION: ConditionalQuestion = {
  id: "meal.purpose",
  prompt: "¿Cuál fue la finalidad principal del gasto?",
  type: "SINGLE_CHOICE",
  required: true,
  options: [
    { value: "SELF_MAINTENANCE", label: "Manutención del propio autónomo" },
    { value: "CLIENT_OR_SUPPLIER", label: "Atención a cliente o proveedor" },
    { value: "EMPLOYEE_TRAVEL", label: "Viaje o desplazamiento de empleado" },
    { value: "INTERNAL_EVENT", label: "Evento interno de empresa" },
    { value: "PERSONAL", label: "Gasto personal" },
    { value: "OTHER_UNSURE", label: "Otro o no estoy seguro" },
  ],
};

export const SELF_MAINTENANCE_QUESTIONS: readonly ConditionalQuestion[] = [
  {
    id: "meal.businessRelated",
    prompt: "¿El gasto se produjo directamente durante el desarrollo de la actividad?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "meal.hospitalityEstablishment",
    prompt: "¿Se realizó en un establecimiento de hostelería o restauración?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "meal.electronicPayment",
    prompt: "¿Se pagó mediante un medio electrónico?",
    type: "BOOLEAN",
    required: true,
    helpText: "Solo se pregunta cuando el medio indicado no permite determinarlo.",
  },
  {
    id: "meal.location",
    prompt: "¿Se produjo en España o en el extranjero?",
    type: "SINGLE_CHOICE",
    required: true,
    options: [
      { value: "SPAIN", label: "España" },
      { value: "FOREIGN", label: "Extranjero" },
    ],
  },
  {
    id: "meal.overnightDifferentMunicipality",
    prompt:
      "¿Existió pernoctación en un municipio distinto tanto de tu residencia como de tu lugar habitual de trabajo?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "meal.sameDayAlreadyDeductedCents",
    prompt: "¿Cuánto se ha deducido ya ese mismo día por manutención?",
    type: "MONEY_CENTS",
    required: true,
    helpText: "El límite es diario y conjunto, no por ticket. Indica 0 si no hay otros gastos del día.",
  },
  {
    id: "meal.activityEvidence",
    prompt: "¿Qué pruebas permiten relacionarlo con la actividad?",
    type: "TEXT",
    required: true,
    helpText: "Por ejemplo: proyecto, agenda, correo, hoja de ruta o parte de trabajo. Un día laborable por sí solo no basta.",
  },
];

export const CLIENT_ATTENTION_QUESTIONS: readonly ConditionalQuestion[] = [
  {
    id: "client.identified",
    prompt: "¿Puede identificarse al cliente o proveedor?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "client.commercialRelationship",
    prompt: "¿Existe una relación comercial real y documentable?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "client.relationshipEvidence",
    prompt: "¿Qué correo, agenda, contrato, presupuesto o proyecto acredita la relación?",
    type: "TEXT",
    required: true,
  },
  {
    id: "client.netTurnoverCents",
    prompt: "¿Cuál es el importe neto de la cifra de negocios del ejercicio?",
    type: "MONEY_CENTS",
    required: true,
    helpText: "Sin IVA y para el conjunto de actividades del contribuyente.",
  },
  {
    id: "client.alreadyDeductedCents",
    prompt: "¿Cuánto se ha deducido ya este ejercicio por atenciones a clientes y proveedores?",
    type: "MONEY_CENTS",
    required: true,
  },
];

export const DOCUMENT_TYPE_QUESTION: ConditionalQuestion = {
  id: "document.invoiceType",
  prompt: "¿Qué tipo de justificante se conserva?",
  type: "SINGLE_CHOICE",
  required: true,
  options: [
    { value: "FULL_INVOICE", label: "Factura completa" },
    { value: "SIMPLIFIED_INVOICE", label: "Factura simplificada" },
    { value: "RECEIPT", label: "Recibo o ticket sin datos fiscales completos" },
    { value: "NO_DOCUMENT", label: "Ningún documento" },
  ],
};

export const SIMPLIFIED_INVOICE_QUESTION: ConditionalQuestion = {
  id: "document.simplifiedInvoiceQualified",
  prompt:
    "¿La factura simplificada incluye tu NIF y domicilio y muestra la cuota de IVA por separado?",
  type: "BOOLEAN",
  required: true,
};

export const VEHICLE_QUESTIONS: readonly ConditionalQuestion[] = [
  {
    id: "vehicle.identifier",
    prompt: "¿Qué matrícula o identificador estable tiene el vehículo?",
    type: "TEXT",
    required: true,
    helpText:
      "Permite vincular esta factura al mismo vehículo; no se incluye en la traza ni en logs.",
  },
  {
    id: "vehicle.type",
    prompt: "¿Qué tipo de vehículo es?",
    type: "SINGLE_CHOICE",
    required: true,
    options: [
      { value: "ORDINARY_PASSENGER", label: "Turismo ordinario" },
      { value: "MIXED_GOODS", label: "Vehículo mixto para transportar mercancías" },
      { value: "PAID_PASSENGER_TRANSPORT", label: "Transporte remunerado de viajeros" },
      { value: "DRIVING_SCHOOL", label: "Vehículo de autoescuela" },
      { value: "SALES_REP", label: "Vehículo de representante o agente comercial" },
      { value: "SURVEILLANCE", label: "Vehículo de vigilancia" },
      { value: "OTHER", label: "Otro" },
    ],
  },
  {
    id: "vehicle.usedInBusiness",
    prompt: "¿El vehículo se utiliza realmente en la actividad?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.professionalUseProven",
    prompt: "¿Existe prueba del uso profesional?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.evidenceDescription",
    prompt: "¿Qué pruebas concretas acreditan el uso profesional?",
    type: "TEXT",
    required: true,
  },
  {
    id: "vehicle.privateUse",
    prompt: "¿Se utiliza también para fines privados?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.privateUseAccessory",
    prompt:
      "En la categoría especial indicada, ¿el uso privado es accesorio y notoriamente irrelevante?",
    type: "BOOLEAN",
    required: true,
    helpText:
      "Solo se pregunta para categorías con excepción específica en IRPF cuando existe algún uso privado.",
  },
  {
    id: "vehicle.exclusiveProfessionalUse",
    prompt: "¿El uso profesional es exclusivo?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.expenseLinked",
    prompt: "¿El gasto está vinculado al vehículo identificado?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.higherVatUseProven",
    prompt: "¿Se puede probar un porcentaje de utilización profesional distinto de la presunción?",
    type: "BOOLEAN",
    required: true,
  },
  {
    id: "vehicle.provenVatPercentage",
    prompt: "¿Qué porcentaje de utilización profesional para IVA se acredita?",
    type: "PERCENTAGE",
    required: true,
  },
  {
    id: "vehicle.marked",
    prompt: "¿El vehículo está rotulado?",
    type: "BOOLEAN",
    required: true,
    helpText: "La rotulación es solo una prueba complementaria y nunca activa por sí sola el 100 %.",
  },
];
