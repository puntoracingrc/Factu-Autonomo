export type RentabilidadRealQaScenarioStatus = "ok" | "pending" | "blocked";

export interface RentabilidadRealQaScenario {
  id: string;
  name: string;
  objective: string;
  keyRules: string[];
  expectedResult: string;
  status: RentabilidadRealQaScenarioStatus;
  notes: string;
}

export const RENTABILIDAD_REAL_V1_STABILITY_STATUS = {
  status: "stable_with_pending_access_qa",
  note:
    "Rentabilidad Real v1 validado para autonomos Pro+ niveles 1-4. Stock, S.L., modulos fiscales y empleados quedan como modulos futuros. Escenarios 11/12 siguen pendientes si no existe entorno QA seguro para Free/Pro no Pro+.",
} as const;

export const RENTABILIDAD_REAL_V1_QA_SCENARIOS: RentabilidadRealQaScenario[] = [
  {
    id: "scenario_01_simple_autonomo",
    name: "Autonomo simple",
    objective: "Validar uso basico de Rentabilidad Real con un documento simple.",
    keyRules: ["Sin duplicar documentos", "Sin tocar impuestos", "Sin snapshots"],
    expectedResult: "Calculadora e informes cargan con margen coherente.",
    status: "ok",
    notes: "Escenario 1 cerrado como OK.",
  },
  {
    id: "scenario_02_obra_oficio",
    name: "Obra/oficio",
    objective: "Validar trabajos cerrados con gastos enlazados.",
    keyRules: ["Gastos enlazados al trabajo", "Gastos fijos separados"],
    expectedResult: "Margen directo y caja prudente se calculan sin duplicados.",
    status: "ok",
    notes: "Escenario 2 cerrado como OK.",
  },
  {
    id: "scenario_03_horas_proyectos",
    name: "Horas/proyectos",
    objective: "Validar calculadora de horas y proyectos.",
    keyRules: ["Horas reales separadas de facturacion", "Ajustes internos no fiscales"],
    expectedResult: "Calculadora de horas funciona en modo estricto.",
    status: "ok",
    notes: "Escenario 3 cerrado como OK estricto.",
  },
  {
    id: "scenario_04_mixto",
    name: "Mixto obras + horas",
    objective: "Validar coexistencia de modulos de obra y horas.",
    keyRules: ["RR_TRADES_JOBS activo", "RR_HOURS_PROJECTS activo"],
    expectedResult: "Ambos modos coexisten sin pisarse.",
    status: "ok",
    notes: "Escenario 4 cerrado como OK.",
  },
  {
    id: "scenario_05_instalador_materiales_sin_stock",
    name: "Instalador con materiales sin stock",
    objective: "Validar que materiales de instalacion no activan stock.",
    keyRules: ["Productos como coste/venta", "Stock queda como modulo futuro"],
    expectedResult: "Materiales ayudan al margen sin crear flujo de inventario.",
    status: "ok",
    notes: "Escenario 5 cerrado como OK.",
  },
  {
    id: "scenario_06_stock_futuro",
    name: "Stock futuro",
    objective: "Validar que stock/tienda/e-commerce quedan fuera de v1.",
    keyRules: ["No implementar stock", "No mezclar tienda con RR v1"],
    expectedResult: "Stock aparece como futuro modulo aparte.",
    status: "ok",
    notes: "Escenario 6 cerrado como OK.",
  },
  {
    id: "scenario_07_vehiculo_estructura_ligera",
    name: "Vehiculo/estructura ligera",
    objective: "Validar gastos de estructura ligera sin fiscalidad avanzada.",
    keyRules: ["Coste interno separado", "Sin deducibilidad fiscal avanzada"],
    expectedResult: "Estructura ligera puede considerarse sin tocar impuestos.",
    status: "ok",
    notes: "Escenario 7 cerrado como OK.",
  },
  {
    id: "scenario_08_subcontrata_ayuda_empleados",
    name: "Subcontrata/ayuda/empleados",
    objective: "Validar ayudas y subcontratas sin modulo laboral.",
    keyRules: ["Sin nominas", "Sin empleados avanzados", "Coste directo si existe gasto"],
    expectedResult: "Subcontrata entra como gasto, empleados quedan futuro.",
    status: "ok",
    notes: "Escenario 8 cerrado como OK.",
  },
  {
    id: "scenario_09_informes_multi_documento",
    name: "Informes multi-cliente/documento",
    objective: "Validar informes por documento y cliente.",
    keyRules: ["No duplicar presupuesto/factura", "No mutar AppData"],
    expectedResult: "Informes cargan con unidades de analisis coherentes.",
    status: "ok",
    notes: "Escenario 9 cerrado como OK.",
  },
  {
    id: "scenario_10_cambio_modelo",
    name: "Cambio de modelo sin perdida de datos",
    objective: "Validar cambios de modo de trabajo sin perder datos existentes.",
    keyRules: ["Activaciones locales", "Sin borrar datos", "Sin duplicar registros"],
    expectedResult: "Cambiar configuracion no rompe documentos ni gastos.",
    status: "ok",
    notes: "Escenario 10 cerrado como OK.",
  },
  {
    id: "scenario_11_free_access",
    name: "Gratis sin Pro+",
    objective: "Validar bloqueo de modulos Pro+ en plan gratis.",
    keyRules: ["Usar solo RR_QA_", "No tocar cuenta real", "No imprimir credenciales"],
    expectedResult: "Usuario gratis ve mejora a Pro+ y no activa modulos Pro+.",
    status: "pending",
    notes: "Pendiente: falta .env.qa.local seguro con service role local no versionado.",
  },
  {
    id: "scenario_12_pro_access",
    name: "Pro sin Pro+",
    objective: "Validar bloqueo de modulos Pro+ en plan Pro no Pro+.",
    keyRules: ["Usar solo RR_QA_", "No tocar cuenta real", "No imprimir credenciales"],
    expectedResult: "Usuario Pro no Pro+ ve mejora a Pro+ y no activa modulos Pro+.",
    status: "pending",
    notes: "Pendiente: falta .env.qa.local seguro con service role local no versionado.",
  },
];
