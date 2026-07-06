import type {
  RentabilidadRealAddonProductId,
  RentabilidadRealCalculationModeProductId,
  RentabilidadRealLevel,
  RentabilidadRealProduct,
  RentabilidadRealProductId,
} from "./types";

const CALCULATION_MODE_PRODUCT_IDS = [
  "RR_TRADES_JOBS",
  "RR_HOURS_PROJECTS",
] as const satisfies readonly RentabilidadRealCalculationModeProductId[];

const ADDON_PRODUCT_IDS = [
  "RR_FIXED_COSTS_PRO",
  "RR_ASSETS_LIGHT",
  "RR_PRICE_SIMULATOR",
  "RR_ADVISOR_REVIEW",
] as const satisfies readonly RentabilidadRealAddonProductId[];

const RENTABILIDAD_REAL_PRODUCTS = [
  {
    id: "RR_BASE",
    slug: "rentabilidad-real-base",
    name: "Rentabilidad Real Base",
    shortDescription:
      "Calcula cuánto queda de una factura o trabajo simple antes de complicar la herramienta.",
    longDescription:
      "Base para autónomos persona física que quieren ver ingresos sin IVA, costes básicos, margen y caja prudente por factura o trabajo sencillo.",
    status: "available",
    category: "base",
    levelMin: 1,
    levelMax: 1,
    targetUsers: [
      "Autónomos persona física sin empleados",
      "Profesionales con pocos gastos fijos",
      "Usuarios que quieren saber beneficio por factura o trabajo sencillo",
    ],
    useCases: [
      "Revisar si una factura deja beneficio real",
      "Separar IVA, IRPF orientativo y caja prudente",
      "Empezar sin configurar una calculadora grande",
    ],
    covers: [
      "Ingresos sin IVA",
      "Costes directos básicos",
      "Gastos fijos básicos",
      "Cuota de autónomo imputable",
      "Margen directo y beneficio operativo",
      "Reserva básica de IVA e IRPF",
      "Caja prudente",
    ],
    doesNotCover: [
      "Stock avanzado",
      "Empleados en nómina",
      "S.L. o sociedades",
      "Régimen de módulos",
    ],
    includedModules: [
      "income_without_vat",
      "basic_direct_costs",
      "basic_fixed_costs",
      "self_employed_fee_allocation",
      "direct_margin",
      "operating_profit",
      "basic_vat_reserve",
      "basic_irpf_reserve",
      "prudent_cash",
    ],
    productKind: "core",
    capabilities: ["basic_profitability"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para autónomos persona física de nivel 1.",
    recommendedAddons: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
  },
  {
    id: "RR_TRADES_JOBS",
    slug: "rentabilidad-obras-oficios",
    name: "Rentabilidad por Obras y Oficios",
    shortDescription:
      "Pensado para trabajos cerrados con materiales, desplazamientos o apoyos puntuales.",
    longDescription:
      "Módulo para pintores, electricistas, fontaneros, cerrajeros, instaladores, reparadores y autónomos que presupuestan por obra o servicio cerrado.",
    status: "available",
    category: "trades",
    levelMin: 2,
    levelMax: 2,
    targetUsers: [
      "Pintores",
      "Electricistas",
      "Fontaneros",
      "Cerrajeros",
      "Instaladores y técnicos de reparaciones",
    ],
    useCases: [
      "Saber si una obra deja margen",
      "Repartir gastos fijos entre trabajos",
      "Calcular un precio mínimo de obra",
    ],
    covers: [
      "Materiales",
      "Subcontratas puntuales",
      "Desplazamientos",
      "Reparto de gastos fijos por trabajos, facturación o manual",
      "Beneficio por obra",
      "Precio mínimo de obra",
    ],
    doesNotCover: [
      "Empleados en nómina",
      "Stock avanzado",
      "S.L.",
      "Régimen de módulos",
    ],
    includedModules: [
      "materials",
      "occasional_subcontracting",
      "travel_costs",
      "job_fixed_cost_distribution",
      "job_profit",
      "minimum_job_price",
    ],
    productKind: "calculation_mode",
    capabilities: ["jobs_profitability"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para autónomos persona física de nivel 2.",
    recommendedAddons: ["RR_FIXED_COSTS_PRO", "RR_PRICE_SIMULATOR"],
  },
  {
    id: "RR_HOURS_PROJECTS",
    slug: "rentabilidad-horas-proyectos",
    name: "Rentabilidad por Horas y Proyectos",
    shortDescription:
      "Para profesionales que venden tiempo, proyectos, clientes o igualas.",
    longDescription:
      "Módulo para diseñadores, consultores, programadores, abogados autónomos, arquitectos autónomos, marketing freelance y profesionales que necesitan entender coste hora y precio mínimo.",
    status: "available",
    category: "hours_projects",
    levelMin: 3,
    levelMax: 3,
    targetUsers: [
      "Diseñadores",
      "Programadores",
      "Consultores",
      "Abogados autónomos",
      "Arquitectos autónomos",
      "Marketing freelance y copywriters",
    ],
    useCases: [
      "Calcular coste hora real",
      "Medir beneficio por cliente",
      "Poner precio mínimo a proyectos cerrados o igualas",
    ],
    covers: [
      "Coste hora real",
      "Horas facturables y no facturables",
      "Retenciones profesionales simples",
      "Proyectos cerrados",
      "Igualas mensuales",
      "Rentabilidad por cliente",
      "Rentabilidad por hora",
      "Precio mínimo",
    ],
    doesNotCover: [
      "Nominas",
      "Sociedades",
      "Dividendos",
      "Operaciones internacionales avanzadas",
    ],
    includedModules: [
      "real_hourly_cost",
      "billable_hours",
      "non_billable_hours",
      "simple_professional_withholding",
      "closed_projects",
      "monthly_retainers",
      "customer_profitability",
      "hourly_profitability",
    ],
    productKind: "calculation_mode",
    capabilities: ["hours_projects_profitability"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para autónomos persona física de nivel 3.",
    recommendedAddons: ["RR_FIXED_COSTS_PRO", "RR_PRICE_SIMULATOR"],
  },
  {
    id: "RR_FIXED_COSTS_PRO",
    slug: "costes-fijos-pro",
    name: "Costes Fijos Pro",
    shortDescription:
      "Reparte tus gastos mensuales entre horas, trabajos, facturación o una fórmula mixta.",
    longDescription:
      "Módulo transversal para autónomos con varios gastos mensuales que necesitan imputarlos de forma sencilla antes de calcular margen.",
    status: "available",
    category: "fixed_costs",
    levelMin: 2,
    levelMax: 4,
    targetUsers: [
      "Autónomos con varios gastos mensuales",
      "Profesionales que necesitan repartir costes indirectos",
      "Negocios con cuotas, gestorías, software o alquiler básico",
    ],
    useCases: [
      "Repartir gastos fijos por horas",
      "Repartir gastos por trabajos o facturación",
      "Revisar coste mensual mínimo del negocio",
    ],
    covers: [
      "Cuota de autonomo",
      "Gestoria, software, internet y telefono",
      "Seguros, publicidad y costes bancarios",
      "Alquiler básico y suministros",
      "Reparto por horas, trabajos, facturación, manual o fórmula mixta básica",
    ],
    doesNotCover: [
      "Contabilidad completa",
      "Nominas",
      "Prorrata avanzada",
      "Analitica multiempresa",
    ],
    includedModules: [
      "monthly_fixed_costs",
      "self_employed_fee_allocation",
      "cost_distribution_methods",
      "mixed_distribution_formula",
    ],
    productKind: "addon",
    capabilities: ["fixed_costs_pro"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para autónomos persona física de niveles 2 a 4.",
    recommendedAddons: ["RR_PRICE_SIMULATOR", "RR_ADVISOR_REVIEW"],
  },
  {
    id: "RR_ASSETS_LIGHT",
    slug: "vehiculo-herramientas-local-equipos",
    name: "Vehículo, Herramientas, Local y Equipos",
    shortDescription:
      "Incluye estructura ligera: vehículo, herramientas caras, local, taller o equipos relevantes.",
    longDescription:
      "Módulo para autónomos que siguen siendo persona física, pero ya tienen estructura que cambia el coste real interno de cada trabajo.",
    status: "available",
    category: "assets",
    levelMin: 4,
    levelMax: 4,
    targetUsers: [
      "Autónomos con vehículo de trabajo",
      "Autónomos con local, oficina o taller",
      "Profesionales con herramientas, maquinaria ligera o equipos relevantes",
    ],
    useCases: [
      "Imputar coste de vehículo a trabajos",
      "Contar herramientas y equipos como coste real",
      "Separar estructura ligera de gastos simples",
    ],
    covers: [
      "Coste interno de vehículo, combustible, seguro y mantenimiento",
      "Herramientas y equipos",
      "Local, taller, oficina y suministros",
      "Amortizaciones simples",
      "Renting o leasing básico como coste",
    ],
    doesNotCover: [
      "Deducibilidad fiscal automática de coche particular o moto",
      "Flotas",
      "Maquinaria pesada",
      "Empleados",
      "Sociedades complejas",
    ],
    includedModules: [
      "vehicle_costs",
      "tool_costs",
      "workspace_costs",
      "simple_amortization",
      "renting_leasing_cost",
    ],
    productKind: "addon",
    capabilities: ["assets_light"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para rentabilidad interna de nivel 4; el tratamiento fiscal de coche particular o moto debe validarse si hay duda.",
    recommendedAddons: ["RR_FIXED_COSTS_PRO", "RR_PRICE_SIMULATOR"],
  },
  {
    id: "RR_PRICE_SIMULATOR",
    slug: "simulador-precio-minimo",
    name: "Simulador de Precio Mínimo",
    shortDescription:
      "Calcula precio mínimo por hora, obra o proyecto con margen y beneficio objetivo.",
    longDescription:
      "Extra para niveles 1 a 4 que ayuda a convertir costes y margen deseado en precio mínimo, facturación mensual objetivo y escenarios prudentes.",
    status: "available",
    category: "pricing",
    levelMin: 1,
    levelMax: 4,
    targetUsers: [
      "Autónomos que quieren revisar precios",
      "Profesionales que dudan entre precio por hora y proyecto",
      "Negocios que quieren una facturación mínima mensual",
    ],
    useCases: [
      "Probar precio mínimo por hora",
      "Simular precio mínimo de obra o proyecto",
      "Ajustar margen deseado y beneficio objetivo",
    ],
    covers: [
      "Precio mínimo por hora, obra o proyecto",
      "Facturacion minima mensual",
      "Margen deseado",
      "Beneficio objetivo",
    ],
    doesNotCover: [
      "Precios dinamicos por mercado",
      "Pagos reales",
      "Asesoramiento fiscal personalizado",
    ],
    includedModules: [
      "minimum_price_simulation",
      "monthly_revenue_target",
      "desired_margin",
    ],
    productKind: "addon",
    capabilities: ["price_simulator"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para simulaciones de precio mínimo en niveles 1 a 4.",
    recommendedAddons: ["RR_ADVISOR_REVIEW"],
  },
  {
    id: "RR_ADVISOR_REVIEW",
    slug: "validar-configuracion-gestor",
    name: "Validar configuración con mi gestor",
    shortDescription:
      "Prepara un resumen de tu configuración para revisarlo con tu gestor.",
    longDescription:
      "Addon transversal para compartir y revisar la configuración de Rentabilidad Real con el gestor del usuario, sin portal de gestoría ni gestión de varios clientes.",
    status: "available",
    category: "advisor",
    levelMin: 1,
    levelMax: 4,
    targetUsers: [
      "Autónomos que trabajan con gestor",
      "Gestorias que revisan perfiles de clientes",
      "Usuarios que quieren validar la configuracion antes de usarla",
    ],
    useCases: [
      "Copiar un resumen de configuración",
      "Marcar la configuración como pendiente de revisar",
      "Registrar validación o corrección básica",
    ],
    covers: [
      "Resumen de respuestas del test",
      "Revisión de configuración de los modos elegidos",
      "Estado pendiente, validado o corregido",
    ],
    doesNotCover: [
      "Portal de gestoría",
      "Gestión de varios clientes",
      "Presentación de impuestos",
      "Asesoramiento fiscal automático",
    ],
    includedModules: ["advisor_share", "advisor_validation_status"],
    productKind: "addon",
    capabilities: ["advisor_review"],
    includedInProPlus: true,
    commercialAccessNote:
      "Incluido en Pro+ IA para revisar la configuración con tu gestor; no es un portal de gestoría ni sustituye el asesoramiento profesional.",
    recommendedAddons: [],
  },
  {
    id: "RR_STOCK_COMMERCE",
    slug: "stock-comercio",
    name: "Stock y Comercio",
    shortDescription:
      "Producto futuro aparte para inventario, tienda, e-commerce y reventa.",
    longDescription:
      "Fase futura para autónomos y pequeños negocios con stock, comercio, rotación de productos o control avanzado de margen por artículo.",
    status: "coming_soon",
    category: "stock_commerce",
    levelMin: 5,
    levelMax: 5,
    targetUsers: ["Comercios", "Autónomos con stock", "Negocios de reventa"],
    useCases: [
      "Margen por producto",
      "Control de stock",
      "Coste de compras para reventa",
    ],
    covers: ["Stock", "Margen por producto", "Compras para reventa"],
    doesNotCover: [
      "Materiales comprados para un trabajo concreto",
      "Disponible en primera fase",
      "Inventario avanzado en tiempo real",
    ],
    includedModules: ["stock_margin"],
    productKind: "future",
    capabilities: ["stock_commerce"],
    includedInProPlus: false,
    commercialAccessNote:
      "Producto extra futuro. No está incluido todavía en Pro+ niveles 1 a 4 y no afecta a tus datos actuales.",
    recommendedAddons: [],
  },
  {
    id: "RR_MODULES_SPECIAL_REGIMES",
    slug: "modulos-regimenes-especiales",
    name: "Módulos y Regímenes Especiales",
    shortDescription:
      "Para autónomos en módulos u otros regímenes fiscales especiales.",
    longDescription:
      "Fase futura para perfiles que no encajan en estimacion directa simple y requieren reglas fiscales especificas.",
    status: "coming_soon",
    category: "tax_regimes",
    levelMin: 6,
    levelMax: 6,
    targetUsers: [
      "Autónomos en módulos",
      "Regímenes especiales",
      "Casos fiscales no simples",
    ],
    useCases: [
      "Separar régimen fiscal especial",
      "Evitar recomendaciones incorrectas",
    ],
    covers: ["Régimen de módulos", "Regímenes especiales"],
    doesNotCover: ["Disponible en primera fase", "Calculo fiscal definitivo"],
    includedModules: ["special_tax_regime"],
    productKind: "future",
    capabilities: ["modules_special_regimes"],
    includedInProPlus: false,
    commercialAccessNote:
      "Producto fiscal futuro. No está incluido todavía en Pro+ niveles 1 a 4 y no afecta a tus datos actuales.",
    recommendedAddons: [],
  },
  {
    id: "RR_SIMPLE_SL",
    slug: "sl-simple",
    name: "S.L. Simple",
    shortDescription:
      "Para sociedades limitadas sencillas sin estructura avanzada.",
    longDescription:
      "Fase futura para separar rentabilidad de persona fisica y sociedad, con costes y obligaciones propios de una S.L.",
    status: "coming_soon",
    category: "company",
    levelMin: 7,
    levelMax: 7,
    targetUsers: [
      "S.L. simples",
      "S.L.U.",
      "Autónomos que han pasado a sociedad",
    ],
    useCases: ["Distinguir beneficio societario", "Separar costes de sociedad"],
    covers: ["S.L. simple", "Beneficio de sociedad"],
    doesNotCover: [
      "Disponible en primera fase",
      "Socios, nóminas o dividendos",
    ],
    includedModules: ["company_profit"],
    productKind: "future",
    capabilities: ["simple_sl"],
    includedInProPlus: false,
    commercialAccessNote:
      "Producto futuro para sociedades. No está incluido todavía en Pro+ niveles 1 a 4 y no afecta a tus datos actuales.",
    recommendedAddons: [],
  },
  {
    id: "RR_SL_EMPLOYEES_PARTNERS",
    slug: "sl-empleados-socios",
    name: "S.L. con Empleados y Socios",
    shortDescription:
      "Producto futuro para nóminas, empleados, socios y estructura laboral.",
    longDescription:
      "Fase futura para empresas que necesitan incorporar empleados en nómina, socios, costes laborales y escenarios societarios más amplios.",
    status: "coming_soon",
    category: "company",
    levelMin: 8,
    levelMax: 8,
    targetUsers: [
      "S.L. con empleados",
      "Sociedades con socios",
      "Negocios con nóminas",
    ],
    useCases: [
      "Coste real de empleados",
      "Estructura por socios",
      "Rentabilidad con nóminas",
    ],
    covers: ["Nominas", "Socios", "Costes laborales"],
    doesNotCover: [
      "Autónomo externo con factura como coste directo",
      "Ayuda puntual no fiscal como ajuste interno",
      "Disponible en primera fase",
      "Empresa avanzada multiunidad",
    ],
    includedModules: ["payroll_costs", "company_profit"],
    productKind: "future",
    capabilities: ["sl_employees_partners"],
    includedInProPlus: false,
    commercialAccessNote:
      "Producto laboral/societario futuro. No está incluido todavía en Pro+ niveles 1 a 4 y no afecta a tus datos actuales.",
    recommendedAddons: [],
  },
  {
    id: "RR_ADVANCED_COMPANY",
    slug: "empresa-avanzada",
    name: "Empresa Avanzada",
    shortDescription:
      "Para empresas con operaciones, territorios o estructuras que superan la fase inicial.",
    longDescription:
      "Fase futura para empresas avanzadas, multiempresa, operaciones internacionales, cooperativas, sociedades laborales y casos de mayor complejidad.",
    status: "coming_soon",
    category: "company",
    levelMin: 9,
    levelMax: 10,
    targetUsers: [
      "Empresas avanzadas",
      "Multiempresa",
      "Operaciones internacionales",
      "Cooperativas y sociedades laborales",
    ],
    useCases: [
      "Clasificar casos fuera de primera fase",
      "Evitar activar módulos que no cubren la complejidad real",
    ],
    covers: ["Empresa avanzada", "Complejidad futura niveles 9 a 10"],
    doesNotCover: ["Disponible en primera fase", "Calculo fiscal o laboral real"],
    includedModules: ["advanced_company_controls"],
    productKind: "future",
    capabilities: ["advanced_company"],
    includedInProPlus: false,
    commercialAccessNote:
      "Producto avanzado futuro. No está incluido todavía en Pro+ niveles 1 a 4 y no afecta a tus datos actuales.",
    recommendedAddons: [],
  },
] as const satisfies readonly RentabilidadRealProduct[];

export function getRentabilidadRealProducts(): RentabilidadRealProduct[] {
  return [...RENTABILIDAD_REAL_PRODUCTS];
}

export function getAvailableRentabilidadRealProducts(): RentabilidadRealProduct[] {
  return RENTABILIDAD_REAL_PRODUCTS.filter(
    (product) => product.status === "available",
  );
}

export function getComingSoonRentabilidadRealProducts(): RentabilidadRealProduct[] {
  return RENTABILIDAD_REAL_PRODUCTS.filter(
    (product) => product.status === "coming_soon",
  );
}

export function getRentabilidadRealProductBySlug(
  slug: string,
): RentabilidadRealProduct | undefined {
  return RENTABILIDAD_REAL_PRODUCTS.find((product) => product.slug === slug);
}

export function getRentabilidadRealProductsByLevel(
  level: RentabilidadRealLevel,
): RentabilidadRealProduct[] {
  return RENTABILIDAD_REAL_PRODUCTS.filter(
    (product) => product.levelMin <= level && product.levelMax >= level,
  );
}

export function getRentabilidadRealProductById(
  id: RentabilidadRealProductId,
): RentabilidadRealProduct | undefined {
  return RENTABILIDAD_REAL_PRODUCTS.find((product) => product.id === id);
}

export function isRentabilidadRealCalculationModeProductId(
  productId: RentabilidadRealProductId,
): productId is RentabilidadRealCalculationModeProductId {
  return (
    CALCULATION_MODE_PRODUCT_IDS as readonly RentabilidadRealProductId[]
  ).includes(productId);
}

export function isRentabilidadRealAddonProductId(
  productId: RentabilidadRealProductId,
): productId is RentabilidadRealAddonProductId {
  return (ADDON_PRODUCT_IDS as readonly RentabilidadRealProductId[]).includes(
    productId,
  );
}

export function getRentabilidadRealCalculationModeProductIds(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealCalculationModeProductId[] {
  return productIds.filter(isRentabilidadRealCalculationModeProductId);
}

export function getRentabilidadRealAddonProductIds(
  productIds: readonly RentabilidadRealProductId[],
): RentabilidadRealAddonProductId[] {
  return productIds.filter(isRentabilidadRealAddonProductId);
}
