import type {
  AeatOfficialIndexRowV1,
  AeatOfficialIndexSourceV1,
  AeatOfficialModelInventoryRecordV1,
} from "./contracts.v1";
import { AEAT_MODEL_INVENTORY_SCHEMA_VERSION_V1 } from "./contracts.v1";

const RAW_AEAT_OFFICIAL_INDEX_ROWS_V1 = [
  {
    sourceRowLabel: "Modelo 01",
    codes: ["01"],
    officialName:
      "Certificados tributarios. Expedición de certificados tributarios. Estar al corriente de obligaciones tributarias.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G304.shtml",
  },
  {
    sourceRowLabel: "Modelo 01C",
    codes: ["01C"],
    officialName: "Solicitud de Certificado de Contratistas y Subcontratistas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G303.shtml",
  },
  {
    sourceRowLabel: "Modelo 04",
    codes: ["04"],
    officialName:
      "Solicitud de aplicación del tipo del 4% a vehículos destinados a transportar habitualmente a personas con discapacidad en silla de ruedas o con movilidad reducida",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ13.shtml",
  },
  {
    sourceRowLabel: "Modelo 05",
    codes: ["05"],
    officialName:
      "Reconocimiento previo de determinados supuestos de no sujeción, exención o reducción en el Impuesto de Matriculación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ17.shtml",
  },
  {
    sourceRowLabel: "Modelo 06",
    codes: ["06"],
    officialName:
      "Impuesto Especial sobre determinados medios de transporte. Exenciones y no sujeción sin reconocimiento previo.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G503.shtml",
  },
  {
    sourceRowLabel: "Modelo 030",
    codes: ["030"],
    officialName:
      "Censo de obligados tributarios-Declaración censal de alta, cambio de domicilio y/o de variación de datos personales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G321.shtml",
  },
  {
    sourceRowLabel: "Modelo 035",
    codes: ["035"],
    officialName:
      "Registro Censal de los regímenes especiales aplicables a las prestaciones de servicios, ventas a distancia de bienes y determinadas entregas interiores.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G333.shtml",
  },
  {
    sourceRowLabel: "Modelo 036",
    codes: ["036"],
    officialName:
      "Censo de empresarios, profesionales y retenedores - Declaración censal de alta, modificación y baja.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G322.shtml",
  },
  {
    sourceRowLabel: "Modelo 038",
    codes: ["038"],
    officialName:
      "Declaración informativa en euros. Relación de operaciones realizadas por entidades inscritas en Registros públicos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI29.shtml",
  },
  {
    sourceRowLabel: "Modelo 039",
    codes: ["039"],
    officialName:
      "Comprobación censal del régimen especial del grupo de entidades en el IVA.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ33.shtml",
  },
  {
    sourceRowLabel: "Modelo 040",
    codes: ["040"],
    officialName: "Registro de Operadores de Plataforma.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G335.shtml",
  },
  {
    sourceRowLabel: "Modelo 043",
    codes: ["043"],
    officialName:
      "Tasa fiscal sobre el juego. Salas de bingo. Solicitud liquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC09.shtml",
  },
  {
    sourceRowLabel: "Modelo 044",
    codes: ["044"],
    officialName: "Tasa fiscal sobre el juego. Casas de juego.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC10.shtml",
  },
  {
    sourceRowLabel: "Modelo 045",
    codes: ["045"],
    officialName:
      "Tasa fiscal sobre el juego. Máquinas o aparatos automáticos. Declaración-liquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC11.shtml",
  },
  {
    sourceRowLabel: "Modelo 100",
    codes: ["100"],
    officialName:
      "Impuesto sobre la Renta de las Personas Físicas. Declaración y documentos de ingreso o devolución.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml",
  },
  {
    sourceRowLabel: "Modelo 102",
    codes: ["102"],
    officialName:
      "Documento de ingreso o devolución de la declaración del Impuesto sobre la Renta de las Personas Físicas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G229.shtml",
  },
  {
    sourceRowLabel: "Modelo 111",
    codes: ["111"],
    officialName:
      "Retenciones e ingresos a cuenta. Rendimientos del trabajo, de actividades profesionales, de actividades agrícolas y ganaderas y premios. Empresas. Documento de ingreso.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH01.shtml",
  },
  {
    sourceRowLabel: "Modelo 113",
    codes: ["113"],
    officialName:
      "Comunicación de datos relativos a las ganancias patrimoniales por cambio de residencia cuando se produzca a otro Estado Miembro de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G614.shtml",
  },
  {
    sourceRowLabel: "Modelo 115",
    codes: ["115"],
    officialName:
      "Retenciones e ingresos a cuenta. Rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH02.shtml",
  },
  {
    sourceRowLabel: "Modelo 117",
    codes: ["117"],
    officialName:
      "Retenciones e ingresos a cuenta en Impuesto sobre la renta de las personas físicas, Impuesto sobre Sociedades e Impuesto sobre la renta de no residentes. Rentas procedentes de transmisión o reembolso de acciones o participaciones en Instituciones de Inversión Colectiva.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH03.shtml",
  },
  {
    sourceRowLabel: "Modelo 121",
    codes: ["121"],
    officialName:
      "Impuesto sobre la Renta de las Personas Físicas. Deducciones por familia numerosa o por personas con discapacidad a cargo. Comunicación de la cesión del derecho a la deducción por contribuyentes no obligados a presentar declaración",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G616.shtml",
  },
  {
    sourceRowLabel: "Modelo 122",
    codes: ["122"],
    officialName:
      "Impuesto sobre la Renta de las Personas Físicas. Deducciones por familia numerosa, por personas con discapacidad a cargo o por ascendiente con dos hijos separado legalmente o sin vínculo matrimonial. Regularización del derecho a la deducción por contribuyentes no obligados a presentar declaración",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G617.shtml",
  },
  {
    sourceRowLabel: "Modelo 123",
    codes: ["123"],
    officialName:
      "Retenciones e ingresos a cuenta del Impuesto sobre la Renta de las Personas Físicas, Impuesto sobre Sociedades y del Impuesto sobre la Renta de no Residentes (establecimientos permanentes). Determinados rendimientos del capital mobiliario o determinadas rentas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH04.shtml",
  },
  {
    sourceRowLabel: "Modelo 124",
    codes: ["124"],
    officialName:
      "Retenciones e ingresos a cuenta. Rentas y rendimientos del capital mobiliario derivadas de la transmisión, amortización, reembolso, canje o conversión de cualquier tipo de activo representativos de la captación y utilización de capitales ajenos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH05.shtml",
  },
  {
    sourceRowLabel: "Modelo 126",
    codes: ["126"],
    officialName:
      "Retenciones e ingresos a cuenta. Rendimientos del capital mobiliario obtenidos por la contraprestación derivada de cuentas en toda clase de instituciones financieras.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH06.shtml",
  },
  {
    sourceRowLabel: "Modelo 128",
    codes: ["128"],
    officialName:
      "Retenciones e ingresos a cuenta. Rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida e invalidez.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH07.shtml",
  },
  {
    sourceRowLabel: "Modelo 130",
    codes: ["130"],
    officialName:
      "IRPF. Empresarios y profesionales en Estimación Directa. Pago fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G601.shtml",
  },
  {
    sourceRowLabel: "Modelo 131",
    codes: ["131"],
    officialName:
      "IRPF. Empresarios y profesionales en Estimación Objetiva. Pago fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G602.shtml",
  },
  {
    sourceRowLabel: "Modelo 136",
    codes: ["136"],
    officialName:
      "Impuesto sobre la Renta de las Personas Físicas e Impuesto sobre la Renta de no Residentes. Gravamen Especial sobre los Premios de determinadas Loterías y Apuestas. Autoliquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH09.shtml",
  },
  {
    sourceRowLabel: "Modelo 140",
    codes: ["140"],
    officialName:
      "IRPF. Deducción por maternidad. Solicitud de abono anticipado de la deducción.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ25.shtml",
  },
  {
    sourceRowLabel: "Modelo 143",
    codes: ["143"],
    officialName:
      "IRPF. Abono anticipado deducción de familia numerosa, por ascendiente con dos hijos o por personas con discapacidad a cargo.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G613.shtml",
  },
  {
    sourceRowLabel: "Modelo 145",
    codes: ["145"],
    officialName:
      "Retenciones sobre rendimientos del trabajo. Comunicación de datos al pagador.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G603.shtml",
  },
  {
    sourceRowLabel: "Modelo 146",
    codes: ["146"],
    officialName:
      "IRPF. Pensionistas con dos o más pagadores. Solicitud de determinación del importe de las retenciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G604.shtml",
  },
  {
    sourceRowLabel: "Modelo 147",
    codes: ["147"],
    officialName:
      "IRPF. Comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G605.shtml",
  },
  {
    sourceRowLabel: "Modelo 149",
    codes: ["149"],
    officialName:
      "IRPF. Régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores desplazados a territorio español. Comunicación de la opción, renuncia, exclusión y fin del desplazamiento",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G606.shtml",
  },
  {
    sourceRowLabel: "Modelo 150",
    codes: ["150"],
    officialName:
      "IRPF. Régimen especial aplicable a los trabajadores desplazados a territorio español (para contribuyentes que hayan optado por este régimen con anterioridad a 1 de enero de 2015)",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G607.shtml",
  },
  {
    sourceRowLabel: "Modelo 151",
    codes: ["151"],
    officialName:
      "Declaración del Impuesto sobre la Renta de las Personas Físicas del régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores, desplazados a territorio español.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G615.shtml",
  },
  {
    sourceRowLabel: "Modelo 156",
    codes: ["156"],
    officialName:
      "Declaración Informativa. Cotizaciones de afiliados y mutualidades a efectos de la deducción por maternidad. Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G608.shtml",
  },
  {
    sourceRowLabel: "Modelo 159",
    codes: ["159"],
    officialName:
      "Declaración Informativa. Declaración anual de consumo de energía eléctrica.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI31.shtml",
  },
  {
    sourceRowLabel: "Modelo 165",
    codes: ["165"],
    officialName:
      "Declaración informativa de certificaciones individuales emitidas a los socios o partícipes de entidades de nueva o reciente creación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI35.shtml",
  },
  {
    sourceRowLabel: "Modelo 170",
    codes: ["170"],
    officialName:
      "Declaración anual de las operaciones realizadas por los empresarios o profesionales adheridos al sistema de gestión de cobros a través de tarjetas de crédito o de débito.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI32.shtml",
  },
  {
    sourceRowLabel: "Modelo 171",
    codes: ["171"],
    officialName:
      "Declaración anual de imposiciones, disposiciones de fondos y de los cobros de cualquier documento.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI33.shtml",
  },
  {
    sourceRowLabel: "Modelo 172",
    codes: ["172"],
    officialName: "Declaración informativa sobre saldos en monedas virtuales",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI53.shtml",
  },
  {
    sourceRowLabel: "Modelo 173",
    codes: ["173"],
    officialName:
      "Declaración informativa sobre operaciones con monedas virtuales",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI54.shtml",
  },
  {
    sourceRowLabel: "Modelo 174",
    codes: ["174"],
    officialName: "Declaración informativa sobre todo tipo de tarjetas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI62.shtml",
  },
  {
    sourceRowLabel: "Modelo 179",
    codes: ["179"],
    officialName:
      "Declaración informativa anual de la cesión de uso de viviendas con fines turísticos",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI44.shtml",
  },
  {
    sourceRowLabel: "Modelo 180",
    codes: ["180"],
    officialName:
      "Declaración informativa. Retenciones e ingresos a cuenta sobre determinadas rentas o rendimientos procedentes del arrendamiento o subarrendamiento de inmuebles urbanos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI00.shtml",
  },
  {
    sourceRowLabel: "Modelo 181",
    codes: ["181"],
    officialName:
      "Declaración informativa de préstamos y créditos, y operaciones financieras relacionadas con bienes inmuebles.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI01.shtml",
  },
  {
    sourceRowLabel: "Modelo 182",
    codes: ["182"],
    officialName:
      "Declaración informativa de donativos, donaciones y aportaciones recibidas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI02.shtml",
  },
  {
    sourceRowLabel: "Modelo 184",
    codes: ["184"],
    officialName:
      "Declaración informativa. Entidades en régimen de atribución de rentas. Declaración anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI04.shtml",
  },
  {
    sourceRowLabel: "Modelo 185",
    codes: ["185"],
    officialName:
      "Declaración Informativa. Declaración informativa mensual de los órganos y entidades gestores de la Seguridad Social y Mutualidades.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI05.shtml",
  },
  {
    sourceRowLabel: "Modelo 186",
    codes: ["186"],
    officialName:
      "Declaración Informativa. Suministro de información relativa a nacimientos y defunciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI06.shtml",
  },
  {
    sourceRowLabel: "Modelo 187",
    codes: ["187"],
    officialName:
      "Declaración informativa de acciones y participaciones representativas del capital o del patrimonio de las instituciones de inversión colectiva y resumen anual de retenciones e ingresos a cuenta del Impuesto sobre la Renta de las Personas Físicas, Impuesto sobre Sociedades e Impuesto sobre la Renta de no Residentes en relación con las rentas o ganancias patrimoniales obtenidas como consecuencia de las transmisiones o reembolsos de esas acciones y participaciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI07.shtml",
  },
  {
    sourceRowLabel: "Modelo 188",
    codes: ["188"],
    officialName:
      "Declaración Informativa de retenciones e ingresos a cuenta . Rentas o rendimientos del capital mobiliario procedentes de operaciones de capitalización y de contratos de seguro de vida o invalidez. Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI08.shtml",
  },
  {
    sourceRowLabel: "Modelo 189",
    codes: ["189"],
    officialName: "Declaración informativa anual de valores, seguros y rentas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI09.shtml",
  },
  {
    sourceRowLabel: "Modelo 190",
    codes: ["190"],
    officialName:
      "Declaración Informativa. Retenciones e ingresos a cuenta. Rendimientos del trabajo y de actividades económicas, premios y determinadas ganancias patrimoniales e imputaciones de rentas. Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI10.shtml",
  },
  {
    sourceRowLabel: "Modelo 192",
    codes: ["192"],
    officialName:
      "Declaración informativa anual de operaciones con Letras del Tesoro.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI11.shtml",
  },
  {
    sourceRowLabel: "Modelo 193",
    codes: ["193"],
    officialName:
      "Declaración Informativa. Retenciones e ingresos a cuenta del Impuesto sobre la Renta de las Personas Físicas sobre determinados rendimientos del capital mobiliario. Retenciones e ingresos a cuenta del Impuesto sobre Sociedades e Impuesto sobre la Renta de no residentes (establecimientos permanentes) sobre determinadas rentas. Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI12.shtml",
  },
  {
    sourceRowLabel: "Modelo 194",
    codes: ["194"],
    officialName:
      "Declaración Informativa. Retenciones e ingresos a cuenta del Impuesto sobre la Renta de las Personas Físicas, Impuesto sobre Sociedades e Impuesto sobre la Renta de no residentes (establecimientos permanentes) sobre rendimientos del capital mobiliario y rentas derivadas de la transmisión, amortización, reembolso, canje o conversión de cualquier clase de activos representativos de la captación y utilización de capitales ajenos. Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI13.shtml",
  },
  {
    sourceRowLabel: "Modelo 195",
    codes: ["195"],
    officialName:
      "Declaración informativa. Declaración trimestral de cuentas u operaciones cuyos titulares no han facilitado el NIF a las Entidades de Crédito en el plazo establecido.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml",
  },
  {
    sourceRowLabel: "Modelo 196",
    codes: ["196"],
    officialName:
      "Declaración informativa. Resumen anual de retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario y rentas obtenidas por la contraprestación derivada de cuentas en toda clase de instituciones financieras, incluyendo las basadas en operaciones sobre activos financieros, y declaración informativa anual de personas autorizadas y de saldos en cuentas de toda clase de instituciones financieras.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI15.shtml",
  },
  {
    sourceRowLabel: "Modelo 198",
    codes: ["198"],
    officialName:
      "Declaración informativa. Declaración anual de operaciones con activos financieros y otros valores mobiliarios.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI17.shtml",
  },
  {
    sourceRowLabel: "Modelo 199",
    codes: ["199"],
    officialName:
      "Declaración Informativa anual de identificación de las operaciones con cheques de las Entidades de Crédito.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI18.shtml",
  },
  {
    sourceRowLabel: "Modelo 200",
    codes: ["200"],
    officialName:
      "IS. Impuesto sobre Sociedades e Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español). Declaración (Mod. 200). Documentos de ingreso o devolución: Impuesto sobre Sociedades (Mod. 200); Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español) (Mod.206).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml",
  },
  {
    sourceRowLabel: "Modelo 202",
    codes: ["202"],
    officialName:
      "IS. Impuesto sobre Sociedades e Impuesto sobre la Renta de no residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español). Pago Fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE00.shtml",
  },
  {
    sourceRowLabel: "Modelo 206",
    codes: ["206"],
    officialName:
      "Documento de ingreso o devolución del Impuesto sobre la Renta de no Residentes (establecimientos permanentes y entidades en régimen de atribución de rentas constituidas en el extranjero con presencia en territorio español).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE04.shtml",
  },
  {
    sourceRowLabel: "Modelo 210",
    codes: ["210"],
    officialName:
      "IRNR- Impuesto sobre la Renta de no residentes sin establecimiento permanente. Declaración ordinaria.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF00.shtml",
  },
  {
    sourceRowLabel: "Modelo 211",
    codes: ["211"],
    officialName:
      "IRNR- Impuesto sobre la Renta de no Residentes. Retención en la adquisición de bienes inmuebles a no residentes sin establecimiento permanente.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF01.shtml",
  },
  {
    sourceRowLabel: "Modelo 213",
    codes: ["213"],
    officialName:
      "IRNR. Gravamen especial sobre bienes inmuebles de entidades no residentes.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF03.shtml",
  },
  {
    sourceRowLabel: "Modelo 216",
    codes: ["216"],
    officialName:
      "IRNR. Impuesto sobre la Renta de no Residentes. Rentas obtenidas sin mediación de establecimiento permanente. Retenciones e ingresos a cuenta (declaración - documento de ingreso).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF05.shtml",
  },
  {
    sourceRowLabel: "Modelo 217",
    codes: ["217"],
    officialName: "Gravamen especial SOCIMI",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE06.shtml",
  },
  {
    sourceRowLabel: "Modelo 220",
    codes: ["220"],
    officialName:
      "Impuesto sobre Sociedades. Régimen de consolidación fiscal correspondiente a los grupos fiscales. Declaración. (Mod. 220). Documento de ingreso o devolución",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE02.shtml",
  },
  {
    sourceRowLabel: "Modelo 221",
    codes: ["221"],
    officialName:
      "Prestación patrimonial por conversión de activos por impuesto diferido en crédito exigible frente a la Administración tributaria.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE07.shtml",
  },
  {
    sourceRowLabel: "Modelo 222",
    codes: ["222"],
    officialName:
      "IS. Régimen de Tributación de los Grupos de Sociedades. Pago fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE03.shtml",
  },
  {
    sourceRowLabel: "Modelo 226",
    codes: ["226"],
    officialName:
      "Solicitud de aplicación del régimen opcional para contribuyentes personas físicas residentes en otros Estados miembros de la Unión Europea o del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF08.shtml",
  },
  {
    sourceRowLabel: "Modelo 228",
    codes: ["228"],
    officialName:
      "Solicitud de devolución por exención por reinversión en vivienda habitual para contribuyentes de la Unión Europea y del Espacio Económico Europeo con efectivo intercambio de información tributaria.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF07.shtml",
  },
  {
    sourceRowLabel: "Modelo 230",
    codes: ["230"],
    officialName:
      "Impuesto sobre la Renta de las Personas Físicas e Impuesto sobre la Renta de No Residentes: Retenciones e ingresos a cuenta del gravamen especial sobre los premios de determinadas loterías y apuestas; Impuesto sobre Sociedades: Retenciones e ingresos a cuenta sobre los premios de determinadas loterías y apuestas. Autoliquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G235.shtml",
  },
  {
    sourceRowLabel: "Modelo 231",
    codes: ["231"],
    officialName:
      "Declaración Informativa. Declaración de información país por país (CBC/DAC4).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI41.shtml",
  },
  {
    sourceRowLabel: "Modelo 232",
    codes: ["232"],
    officialName:
      "Declaración informativa de operaciones vinculadas y de operaciones y situaciones relacionadas con países o territorios calificados como paraísos fiscales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI43.shtml",
  },
  {
    sourceRowLabel: "Modelo 233",
    codes: ["233"],
    officialName:
      "Declaración informativa por gastos en guarderías o centros de educación infantil autorizados",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI45.shtml",
  },
  {
    sourceRowLabel: "Modelo 234",
    codes: ["234"],
    officialName: "Declaración informativa de mecanismos transfronterizos",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI46.shtml",
  },
  {
    sourceRowLabel: "Modelo 235",
    codes: ["235"],
    officialName:
      "Declaración de información de actualización de mecanismos transfronterizos comercializables",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI47.shtml",
  },
  {
    sourceRowLabel: "Modelo 236",
    codes: ["236"],
    officialName:
      "Declaración de información de la utilización de determinados mecanismos transfronterizos",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI48.shtml",
  },
  {
    sourceRowLabel: "Modelo 237",
    codes: ["237"],
    officialName:
      "Gravamen especial sobre beneficios no distribuidos por SOCIMI.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE08.shtml",
  },
  {
    sourceRowLabel: "Modelo 238",
    codes: ["238"],
    officialName:
      "Declaración informativa para la comunicación de información por parte de operadores de plataformas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI52.shtml",
  },
  {
    sourceRowLabel: "Modelo 239",
    codes: ["239"],
    officialName:
      "Declaración informativa de mecanismos de planificación fiscal en el ámbito del AMAC sobre intercambio automático relativo a los mecanismos de elusión del estándar común de comunicación de información y las estructuras extraterritoriales opacas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI57.shtml",
  },
  {
    sourceRowLabel: "Modelo 240",
    codes: ["240"],
    officialName:
      "Comunicación de la entidad constitutiva declarante de la declaración informativa del Impuesto Complementario.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI60.shtml",
  },
  {
    sourceRowLabel: "Modelo 241",
    codes: ["241"],
    officialName:
      "Declaración informativa del Impuesto Complementario por parte de grupos multinacionales o grupos nacionales de gran magnitud",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI59.shtml",
  },
  {
    sourceRowLabel: "Modelo 242",
    codes: ["242"],
    officialName: "Autoliquidación del Impuesto Complementario",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GE09.shtml",
  },
  {
    sourceRowLabel: "Modelo 247",
    codes: ["247"],
    officialName:
      "IRNR. Impuesto sobre la Renta de no Residentes. Comunicación del desplazamiento al extranjero efectuada por trabajadores por cuenta ajena",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GF06.shtml",
  },
  {
    sourceRowLabel: "Modelo 270",
    codes: ["270"],
    officialName:
      "Resumen anual de retenciones e ingresos a cuenta del gravamen especial sobre los premios de determinadas loterías y apuestas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI36.shtml",
  },
  {
    sourceRowLabel: "Modelo 280",
    codes: ["280"],
    officialName:
      "Declaración informativa anual de Planes de Ahorro a Largo Plazo",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI39.shtml",
  },
  {
    sourceRowLabel: "Modelo 281",
    codes: ["281"],
    officialName:
      "Declaración informativa trimestral de operaciones de comercio de bienes corporales realizadas en la Zona Especial Canaria sin que las mercancías transiten por territorio canario.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI56.shtml",
  },
  {
    sourceRowLabel: "Modelo 282",
    codes: ["282"],
    officialName:
      "Declaración informativa anual de ayudas recibidas en el marco del Régimen Económico y Fiscal de Canarias y otras ayudas de estado, derivadas de la aplicación del Derecho de la Unión Europea.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI40.shtml",
  },
  {
    sourceRowLabel: "Modelo 283",
    codes: ["283"],
    officialName:
      "Declaración informativa anual de ayudas recibidas en el marco del Régimen Fiscal Especial de las Illes Balears",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI58.shtml",
  },
  {
    sourceRowLabel: "Modelo 289",
    codes: ["289"],
    officialName:
      "Declaración informativa anual de cuentas financieras en el ámbito de la asistencia mutua.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI42.shtml",
  },
  {
    sourceRowLabel: "Modelo 290",
    codes: ["290"],
    officialName:
      "Declaración informativa anual de cuentas financieras de determinadas personas estadounidenses (FATCA)",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI38.shtml",
  },
  {
    sourceRowLabel: "Modelo 291",
    codes: ["291"],
    officialName:
      "Declaración Informativa. Impuesto sobre la Renta de no Residentes. Cuentas de no residentes sin establecimiento permanente.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI19.shtml",
  },
  {
    sourceRowLabel: "Modelo 294",
    codes: ["294"],
    officialName:
      "Declaración informativa. Relación individualizada de los clientes perceptores de beneficios distribuidos por Instituciones de Inversión Colectiva españolas, así como de aquellos por cuenta de los cuales la entidad comercializadora haya efectuado reembolsos o transmisiones de acciones o participaciones, en los supuestos de comercializacion transfronteriza de acciones o participaciones de instituciones de inversión colectiva españolas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI20.shtml",
  },
  {
    sourceRowLabel: "Modelo 295",
    codes: ["295"],
    officialName:
      "Declaración informativa. Relación anual individualizada de los clientes con la posición inversora en las Instituciones de Inversión Colectiva españolas, referida a fecha 31 de diciembre del ejercicio, en los supuestos de comercialización transfronteriza de acciones o participaciones en Instituciones de Inversión Colectiva españolas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI21.shtml",
  },
  {
    sourceRowLabel: "Modelo 296",
    codes: ["296"],
    officialName:
      "Declaración informativa. Retenciones e ingresos a cuenta del Impuesto sobre la Renta de no Residentes (sin establecimiento permanente). Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI22.shtml",
  },
  {
    sourceRowLabel: "Modelo 303",
    codes: ["303"],
    officialName: "IVA. Autoliquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G414.shtml",
  },
  {
    sourceRowLabel: "Modelo 308",
    codes: ["308"],
    officialName:
      "IVA. Régimen Especial del Recargo Equivalencia, artículo 30 bis del Reglamento del IVA y sujetos pasivos ocasionales. Solicitud de devolución.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G403.shtml",
  },
  {
    sourceRowLabel: "Modelo 309",
    codes: ["309"],
    officialName: "IVA. Declaración - Liquidación no periódica.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G404.shtml",
  },
  {
    sourceRowLabel: "Modelo 318",
    codes: ["318"],
    officialName:
      "IVA. Regularización de las proporciones de tributación de los períodos de liquidación anteriores al inicio de la realización habitual de entregas de bienes o prestaciones de servicios.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G419.shtml",
  },
  {
    sourceRowLabel: "Modelo 319",
    codes: ["319"],
    officialName:
      "Pago a cuenta del IVA correspondiente a las entregas de gasolinas, gasóleos y biocarburantes posteriores a la ultimación del régimen de depósito distinto del aduanero",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC68.shtml",
  },
  {
    sourceRowLabel: "Modelo 322",
    codes: ["322"],
    officialName:
      "IVA. Grupos de entidades. Modelo individual. Autoliquidación mensual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G407.shtml",
  },
  {
    sourceRowLabel: "Modelo 341",
    codes: ["341"],
    officialName:
      "Solicitud de reintegro compensaciones en el Régimen especial de agricultura, ganadería y pesca.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ10.shtml",
  },
  {
    sourceRowLabel: "Modelo 345",
    codes: ["345"],
    officialName:
      "Declaración Informativa. Planes, fondos de pensiones y sistemas alternativos. Mutualidades de Previsión Social, Planes de Previsión Asegurados, Planes individuales de Ahorro Sistemático, Planes de Previsión Social Empresarial y Seguros de Dependencia. Declaración anual partícipes y aportaciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI25.shtml",
  },
  {
    sourceRowLabel: "Modelo 346",
    codes: ["346"],
    officialName:
      "IRPF. Declaración Informativa de Subvenciones e indemnizaciones satisfechas por Entidades Públicas/privadas a agricultores o ganaderos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI26.shtml",
  },
  {
    sourceRowLabel: "Modelo 347",
    codes: ["347"],
    officialName:
      "Declaración Informativa anual de operaciones con terceras personas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI27.shtml",
  },
  {
    sourceRowLabel: "Modelo 349",
    codes: ["349"],
    officialName:
      "IVA. Declaración recapitulativa de operaciones intracomunitarias.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI28.shtml",
  },
  {
    sourceRowLabel: "Modelo 353",
    codes: ["353"],
    officialName:
      "IVA. Grupo de entidades. Modelo agregado. Autoliquidación mensual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G408.shtml",
  },
  {
    sourceRowLabel: "Modelo 360 - 361",
    codes: ["360", "361"],
    officialName:
      "IVA. Gestión de devoluciones de IVA a empresarios o profesionales no establecidos en el territorio de aplicación del impuesto.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ09.shtml",
  },
  {
    sourceRowLabel: "Modelo 364",
    codes: ["364"],
    officialName:
      "Impuesto sobre el Valor Añadido. Solicitud de reembolso de las cuotas tributarias soportadas relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ86.shtml",
  },
  {
    sourceRowLabel: "Modelo 365",
    codes: ["365"],
    officialName:
      "Impuesto sobre el Valor Añadido. Solicitud de reconocimiento previo de las exenciones relativas a la Organización del Tratado del Atlántico Norte, a los Cuarteles Generales Internacionales de dicha Organización y a los Estados parte en dicho Tratado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ87.shtml",
  },
  {
    sourceRowLabel: "Modelo 368",
    codes: ["368"],
    officialName:
      "Declaración de IVA de los regímenes especiales de servicios de telecomunicaciones, de radiodifusión o de televisión o electrónicos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G330.shtml",
  },
  {
    sourceRowLabel: "Modelo 369",
    codes: ["369"],
    officialName: "Declaraciones de IVA del régimen One Stop Shop (OSS)",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G420.shtml",
  },
  {
    sourceRowLabel: "Modelo 379",
    codes: ["379"],
    officialName: "Declaración informativa pagos operaciones transfronterizas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI51.shtml",
  },
  {
    sourceRowLabel: "Modelo 380",
    codes: ["380"],
    officialName:
      "Declaración-liquidación en operaciones asimiliadas a las importaciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DB06.shtml",
  },
  {
    sourceRowLabel: "Modelo 381",
    codes: ["381"],
    officialName:
      "Solicitud de reembolso de las cuotas tributarias relativas a las Fuerzas Armadas de cualquier Estado miembro distinto de España.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GZ92.shtml",
  },
  {
    sourceRowLabel: "Modelo 390",
    codes: ["390"],
    officialName: "IVA. Declaración Resumen Anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G412.shtml",
  },
  {
    sourceRowLabel: "Modelo 410",
    codes: ["410"],
    officialName:
      "Pago a cuenta del Impuesto sobre los Depósitos de las Entidades de Crédito.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GH10.shtml",
  },
  {
    sourceRowLabel: "Modelo 411",
    codes: ["411"],
    officialName: "Impuesto sobre los Depósitos en las Entidades de Crédito",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC38.shtml",
  },
  {
    sourceRowLabel: "Modelo 430",
    codes: ["430"],
    officialName: "Primas de seguros. Declaración-liquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC03.shtml",
  },
  {
    sourceRowLabel: "Modelo 480",
    codes: ["480"],
    officialName: "Primas de seguros. Declaración Resumen anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC04.shtml",
  },
  {
    sourceRowLabel: "Modelo 490",
    codes: ["490"],
    officialName:
      "Impuesto sobre Determinados Servicios Digitales. Autoliquidación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC45.shtml",
  },
  {
    sourceRowLabel: "Modelo 504/505",
    codes: ["504", "505"],
    officialName:
      "II. EE. Modelo 504/505. Recepción de productos sujetos a Impuestos Especiales procedentes de la U.E.para Operadores no Registrados, receptores en el sistema de envíos garantizados y representantes fiscales en el sistema de ventas a distancia",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN05.shtml",
  },
  {
    sourceRowLabel: "Modelo 506",
    codes: ["506"],
    officialName:
      "II. EE. Solicitud de devolución por introducción en depósito fiscal.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ01.shtml",
  },
  {
    sourceRowLabel: "Modelo 507",
    codes: ["507"],
    officialName:
      "II. EE. Solicitud de devolución en el sistema de envíos garantizados.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ02.shtml",
  },
  {
    sourceRowLabel: "Modelo 508",
    codes: ["508"],
    officialName:
      "II. EE. Solicitud de devolución por el sistema de ventas a distancia.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ03.shtml",
  },
  {
    sourceRowLabel: "Modelo 510",
    codes: ["510"],
    officialName:
      "II. EE. Declaración de operaciones de recepción del resto de la UE.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF01.shtml",
  },
  {
    sourceRowLabel: "Modelo 512",
    codes: ["512"],
    officialName: "II. EE. Destinatarios de productos de tarifa segunda.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DE03.shtml",
  },
  {
    sourceRowLabel: "Modelo 515 y 517",
    codes: ["515", "517"],
    officialName:
      "II. EE. Petición de marcas fiscales a la Oficina Gestora de Impuestos Especiales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DE04.shtml",
  },
  {
    sourceRowLabel: "Modelo 518/519/520",
    codes: ["518", "519", "520"],
    officialName: "II. EE. Declaraciones de trabajo.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DG01.shtml",
  },
  {
    sourceRowLabel: "Modelo 521",
    codes: ["521"],
    officialName:
      "II. EE. Relación trimestral de primeras materias entregadas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF13.shtml",
  },
  {
    sourceRowLabel: "Modelo 522",
    codes: ["522"],
    officialName:
      "II. EE. Parte trimestral de productos a que se refiere el artículo 108 ter del Reglamento de los Impuestos Especiales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF12.shtml",
  },
  {
    sourceRowLabel: "Modelo 523",
    codes: ["523"],
    officialName:
      "Aplicación del beneficio de devolución de los IIEE sobre el alcohol y bebidas alcohólicas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN01.shtml",
  },
  {
    sourceRowLabel: "Modelo 524",
    codes: ["524"],
    officialName:
      "II. EE. Solicitud de devolución sobre el alcohol y las bebidas alcohólicas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ04.shtml",
  },
  {
    sourceRowLabel: "Modelo 544",
    codes: ["544"],
    officialName:
      "II. EE. Pagos efectuados mediante cheque o tarjetas de gasóleo bonificado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DH01.shtml",
  },
  {
    sourceRowLabel: "Modelo 545",
    codes: ["545"],
    officialName:
      "II. EE. Suministros de carburantes para relaciones internacionales con devolución del impuesto sobre hidrocarburos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ05.shtml",
  },
  {
    sourceRowLabel: "Modelo 546",
    codes: ["546"],
    officialName:
      "II. EE. Avituallamiento de gasóleo a embarcaciones con derecho a la devolución del impuesto sobre hidrocarburos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ06.shtml",
  },
  {
    sourceRowLabel: "Modelo 547",
    codes: ["547"],
    officialName:
      "II. EE. Relación de abonos realizados a detallistas de gasóleo bonificado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DH02.shtml",
  },
  {
    sourceRowLabel: "Modelo 548",
    codes: ["548"],
    officialName: "Declaración informativa de cuotas repercutidas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF15.shtml",
  },
  {
    sourceRowLabel: "Modelo 553",
    codes: ["553"],
    officialName:
      "II. EE. Declaración de operaciones en fábricas y depósitos de vino y bebidas fermentadas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF02.shtml",
  },
  {
    sourceRowLabel: "Modelo 559",
    codes: ["559"],
    officialName:
      "II. EE. Impuesto sobre el alcohol y bebidas derivadas. Regímenes de destilación artesanal y de cosechero.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI01.shtml",
  },
  {
    sourceRowLabel: "Modelo 560",
    codes: ["560"],
    officialName: "Impuestos sobre la electricidad.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI02.shtml",
  },
  {
    sourceRowLabel: "Modelo 561",
    codes: ["561"],
    officialName: "Impuestos sobre la cerveza.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI03.shtml",
  },
  {
    sourceRowLabel: "Modelo 562",
    codes: ["562"],
    officialName: "Impuestos sobre productos intermedios.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI04.shtml",
  },
  {
    sourceRowLabel: "Modelo 563",
    codes: ["563"],
    officialName: "Impuestos sobre alcohol y bebidas derivadas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI05.shtml",
  },
  {
    sourceRowLabel: "Modelo 566",
    codes: ["566"],
    officialName: "Impuestos sobre labores del tabaco.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI07.shtml",
  },
  {
    sourceRowLabel: "Modelo 568",
    codes: ["568"],
    officialName:
      "Impuesto sobre Determinados Medios de Transporte. Solicitud de devolución por reventa y envío de medios de transporte fuera del territorio.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G501.shtml",
  },
  {
    sourceRowLabel: "Modelo 571",
    codes: ["571"],
    officialName:
      "Aplicación del beneficio devolución de los impuestos especiales hidrocarburos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DN02.shtml",
  },
  {
    sourceRowLabel: "Modelo 572",
    codes: ["572"],
    officialName:
      "II. EE. Solicitud de devolución del Impuesto sobre Hidrocarburos.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ07.shtml",
  },
  {
    sourceRowLabel: "Modelo 573",
    codes: ["573"],
    officialName:
      "II. EE. Impuesto sobre los líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI10.shtml",
  },
  {
    sourceRowLabel: "Modelo 576",
    codes: ["576"],
    officialName:
      "Impuesto Especial sobre Determinados Medios de Transporte. Autoliquidación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G502.shtml",
  },
  {
    sourceRowLabel: "Modelo 581",
    codes: ["581"],
    officialName: "Impuesto sobre Hidrocarburos. Declaración-liquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI06.shtml",
  },
  {
    sourceRowLabel: "Modelo 582",
    codes: ["582"],
    officialName:
      "Impuesto sobre Hidrocarburos. Regularización por reexpedición de productos a otra Comunidad Autónoma.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI06.shtml",
  },
  {
    sourceRowLabel: "Modelo 583",
    codes: ["583"],
    officialName:
      "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación y Pagos Fraccionados.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR01.shtml",
  },
  {
    sourceRowLabel: "Modelo 584",
    codes: ["584"],
    officialName:
      "Impuesto sobre la producción de combustible nuclear gastado y residuos radioactivos resultantes de la generación de energía nucleoeléctrica. Autoliquidación y pagos fraccionados.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR02.shtml",
  },
  {
    sourceRowLabel: "Modelo 585",
    codes: ["585"],
    officialName:
      "Impuesto sobre el almacenamiento de combustible nuclear gastado y residuos radioactivos en instalaciones centralizadas. Autoliquidación y pagos fraccionados.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR03.shtml",
  },
  {
    sourceRowLabel: "Modelo 586",
    codes: ["586"],
    officialName: "Declaración Informativa. Gases Fluorados",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR08.shtml",
  },
  {
    sourceRowLabel: "Modelo 587",
    codes: ["587"],
    officialName: "Declaración-Liquidación Gases Fluorados Efecto Invernadero.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR10.shtml",
  },
  {
    sourceRowLabel: "Modelo 588",
    codes: ["588"],
    officialName:
      "Impuesto sobre el valor de la producción de la energía eléctrica. Autoliquidación por cese de actividad de enero a octubre",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR01.shtml",
  },
  {
    sourceRowLabel: "Modelo 589",
    codes: ["589"],
    officialName:
      "Impuesto sobre el valor de la extracción de gas, petróleo y condensación. Autoliquidación y pago fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR13.shtml",
  },
  {
    sourceRowLabel: "Modelo 590",
    codes: ["590"],
    officialName: "IIEE. Solicitud de devolución por exportación o expedición.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ08.shtml",
  },
  {
    sourceRowLabel: "Modelo 591",
    codes: ["591"],
    officialName:
      "Impuesto sobre el valor de la producción de la energía eléctrica. Declaración anual de operaciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR12.shtml",
  },
  {
    sourceRowLabel: "Modelo 592",
    codes: ["592"],
    officialName:
      "Declaración-Liquidación Impuesto especial sobre los envases de plástico no reutilizables. Autoliquidación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR14.shtml",
  },
  {
    sourceRowLabel: "Modelo 593",
    codes: ["593"],
    officialName:
      "Impuesto sobre el depósito de residuos en vertederos, la incineración y la coincineración de residuos. Autoliquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR15.shtml",
  },
  {
    sourceRowLabel: "Modelo 595",
    codes: ["595"],
    officialName: "II. EE. Impuesto sobre el carbón.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DI09.shtml",
  },
  {
    sourceRowLabel: "Modelo 596",
    codes: ["596"],
    officialName:
      "II. EE. Declaración anual de operaciones realizadas. Impuesto sobre el carbón.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DF10.shtml",
  },
  {
    sourceRowLabel: "Modelo 600-610-615-620-630",
    codes: ["600", "610", "615", "620", "630"],
    officialName:
      "Transmisiones Patrimoniales y Actos Jurídicos Documentados - Autoliquidación del Impuesto (tramitación ante la Agencia Estatal de Administración Tributaria: Ceuta y Melilla y otros supuestos).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC12.shtml",
  },
  {
    sourceRowLabel: "Modelo 602",
    codes: ["602"],
    officialName: "Tasa por la gestión administrativa del juego.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC43.shtml",
  },
  {
    sourceRowLabel: "Modelo 604",
    codes: ["604"],
    officialName:
      "Impuesto sobre las Transacciones Financieras. Autoliquidación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC44.shtml",
  },
  {
    sourceRowLabel: "Modelo 611",
    codes: ["611"],
    officialName:
      "Declaración Informativa. Pagos en metálico del impuesto que grava los documentos negociados por Entidades Colaboradoras. Declaración Resumen Anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC05.shtml",
  },
  {
    sourceRowLabel: "Modelo 616",
    codes: ["616"],
    officialName:
      "Declaración Informativa. Pagos en metálico del impuesto que grava la emisión de documentos que lleven aparejada acción cambiaria o sean endosables a la orden. Declaración Resumen Anual.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC06.shtml",
  },
  {
    sourceRowLabel: "Modelo 650",
    codes: ["650"],
    officialName:
      "Impuesto sobre Sucesiones y Donaciones. Autoliquidación adquisición “mortis causa”.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G702.shtml",
  },
  {
    sourceRowLabel: "Modelo 651",
    codes: ["651"],
    officialName:
      "Impuesto sobre Sucesiones y Donaciones. Autoliquidación adquisición “inter vivos”.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G703.shtml",
  },
  {
    sourceRowLabel: "Modelo 655",
    codes: ["655"],
    officialName:
      "Impuesto sobre Sucesiones y Donaciones. Consolidación de dominio por extinción de usufructo.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G704.shtml",
  },
  {
    sourceRowLabel: "Modelo 681",
    codes: ["681"],
    officialName:
      "Tasa por la prestación de servicios de gestión de residuos radiactivos a que se refiere el apartado 3 de la disposición adicional sexta de la Ley 54/1997.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC13.shtml",
  },
  {
    sourceRowLabel: "Modelo 682",
    codes: ["682"],
    officialName:
      "Tasa por la prestación de servicios de gestión de residuos radiactivos a que se refiere el apartado 3 de la disposición adicional sexta de la Ley 54/1997.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC14.shtml",
  },
  {
    sourceRowLabel: "Modelo 683",
    codes: ["683"],
    officialName:
      "Tasa por la prestación de servicios de gestión de residuos radiactivos derivados de la fabricación de elementos combustibles, incluido desmantelamiento de instalaciones de fabricación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC15.shtml",
  },
  {
    sourceRowLabel: "Modelo 684",
    codes: ["684"],
    officialName:
      "Tasa por la prestación de servicios de gestión de residuos radiactivos generados en otras instalaciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC16.shtml",
  },
  {
    sourceRowLabel: "Modelo 685",
    codes: ["685"],
    officialName:
      "Tasa sobre apuestas y combinaciones aleatorias, autoliquidación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC17.shtml",
  },
  {
    sourceRowLabel: "Modelo 695",
    codes: ["695"],
    officialName: "Solicitud de devolución tasa judicial.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC26.shtml",
  },
  {
    sourceRowLabel: "Modelo 696",
    codes: ["696"],
    officialName:
      "Tasa por el Ejercicio de la Potestad Jurisdiccional en los Órdenes Civil y Contencioso-Administrativo.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC07.shtml",
  },
  {
    sourceRowLabel: "Modelo 714",
    codes: ["714"],
    officialName: "Impuesto sobre el Patrimonio",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G611.shtml",
  },
  {
    sourceRowLabel: "Modelo 718",
    codes: ["718"],
    officialName: "Impuesto temporal de Solidaridad de las Grandes Fortunas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC62.shtml",
  },
  {
    sourceRowLabel: "Modelo 720",
    codes: ["720"],
    officialName:
      "Declaración informativa sobre bienes y derechos situados en el extranjero.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI34.shtml",
  },
  {
    sourceRowLabel: "Modelo 721",
    codes: ["721"],
    officialName:
      "Declaración informativa sobre monedas virtuales situadas en el extranjero",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI55.shtml",
  },
  {
    sourceRowLabel: "Modelo 763",
    codes: ["763"],
    officialName:
      "Autoliquidación del Impuesto sobre actividades de juego en los supuestos de actividades anuales o plurianuales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC18.shtml",
  },
  {
    sourceRowLabel: "Modelo 770",
    codes: ["770"],
    officialName:
      "Autoliquidación de intereses de demora y recargos para la regularización voluntaria prevista en el artículo 252 de la Ley General Tributaria",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC41.shtml",
  },
  {
    sourceRowLabel: "Modelo 771",
    codes: ["771"],
    officialName:
      "Autoliquidación de cuotas de conceptos y ejercicios sin modelo disponible en la Sede electrónica de la AEAT para la regularización voluntaria prevista en el artículo 252 de la Ley General Tributaria",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC42.shtml",
  },
  {
    sourceRowLabel: "Modelo 780",
    codes: ["780"],
    officialName:
      "Impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras. Autoliquidación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC66.shtml",
  },
  {
    sourceRowLabel: "Modelo 781",
    codes: ["781"],
    officialName:
      "Impuesto sobre el margen de intereses y comisiones de determinadas entidades financieras. Pago fraccionado.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC67.shtml",
  },
  {
    sourceRowLabel: "Modelo 791",
    codes: ["791"],
    officialName: "Empleo Público. Presentación instancias oposiciones.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/B201.shtml",
  },
  {
    sourceRowLabel: "Modelo 792",
    codes: ["792"],
    officialName:
      "Autoliquidación de la aportación a realizar por los prestadores del servicio de comunicación audiovisual televisivo y por los prestadores del servicio de intercambio de vídeos a través de plataforma de ámbito geográfico estatal o superior al de una Comunidad Autónoma.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC59.shtml",
  },
  {
    sourceRowLabel: "Modelo 793",
    codes: ["793"],
    officialName:
      "Pagos a cuenta de la aportación a realizar por los prestadores del servicio de comunicación audiovisual televisivo y por los prestadores del servicio de intercambio de vídeos a través de plataforma de ámbito geográfico estatal o superior al de una Comunidad Autónoma.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC60.shtml",
  },
  {
    sourceRowLabel: "Modelo 795",
    codes: ["795"],
    officialName:
      "Gravamen temporal energético. Declaración del ingreso de la prestación",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC55.shtml",
  },
  {
    sourceRowLabel: "Modelo 796",
    codes: ["796"],
    officialName: "Gravamen temporal energético. Pago anticipado",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC56.shtml",
  },
  {
    sourceRowLabel: "Modelo 797",
    codes: ["797"],
    officialName:
      "Gravamen temporal de entidades de crédito y establecimientos financieros de crédito. Declaración del ingreso de la prestación.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC57.shtml",
  },
  {
    sourceRowLabel: "Modelo 798",
    codes: ["798"],
    officialName:
      "Gravamen temporal de entidades de crédito y establecimientos financieros de crédito. Pago anticipado",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC58.shtml",
  },
  {
    sourceRowLabel: "Modelo 840 - 848",
    codes: ["840", "848"],
    officialName:
      "IAE. Declaración de alta, variación o baja en el Impuesto sobre Actividades Económicas (IAE) y comunicación del importe neto de la cifra de negocios a efectos de IAE (tramitación ante la Agencia Estatal de Administración Tributaria). Cuando la gestión censal está delegada (en Ayuntamientos, Diputaciones, Comunidades Autónomas, ...) las declaraciones se presentan en la entidad que tiene delegada la gestión censal y con sus propios modelos (esto sólo afecta a las cuotas municipales).",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G323.shtml",
  },
  {
    sourceRowLabel: "Modelo 901",
    codes: ["901"],
    officialName:
      "Información de las CC.AA. sobre datos consignados en el certificado de eficiencia energética",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC46.shtml",
  },
  {
    sourceRowLabel: "Modelo 933",
    codes: ["933"],
    officialName:
      "Información de las CC. AA. sobre guarderías y centros de educación infantil autorizados",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC40.shtml",
  },
  {
    sourceRowLabel: "Modelo 952",
    codes: ["952"],
    officialName:
      "IVA. Comunicación de la modificación de la base imponible en supuestos de concurso y por crédito incobrable.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G416.shtml",
  },
  {
    sourceRowLabel: "Modelo 980",
    codes: ["980"],
    officialName:
      "Información de los intereses de demora pagados a los contribuyentes por las CC. AA.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/ZA23.shtml",
  },
  {
    sourceRowLabel: "Modelo 981",
    codes: ["981"],
    officialName:
      "Suministro de información sobre la prestación por maternidad/paternidad",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC39.shtml",
  },
  {
    sourceRowLabel: "Modelo 990",
    codes: ["990"],
    officialName:
      "Información mensual por parte de las CC. AA. sobre familias numerosas o con personas con discapacidad a cargo",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC32.shtml",
  },
  {
    sourceRowLabel: "Modelo 991",
    codes: ["991"],
    officialName:
      "Declaración informativa de fianzas derivadas del arrendamiento de inmuebles",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI49.shtml",
  },
  {
    sourceRowLabel: "Modelo 992",
    codes: ["992"],
    officialName: "Tributos cedidos sobre el Juego de Comunidades Autónomas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC30.shtml",
  },
  {
    sourceRowLabel: "Modelo 993",
    codes: ["993"],
    officialName: "Control de deducciones autonómicas",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GC22.shtml",
  },
  {
    sourceRowLabel: "Modelo 995",
    codes: ["995"],
    officialName: "Cesión de Información Urbanística por Entidades Locales.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/ZA06.shtml",
  },
  {
    sourceRowLabel: "Modelo 996",
    codes: ["996"],
    officialName: "Embargo de devoluciones gestionadas por la AEAT.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/ZA07.shtml",
  },
  {
    sourceRowLabel: "Modelo 997",
    codes: ["997"],
    officialName:
      "Embargo de pagos presupuestarios de otras Administraciones Públicas.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/ZA09.shtml",
  },
  {
    sourceRowLabel: "Modelo A22",
    codes: ["A22"],
    officialName:
      "Impuesto especial sobre los envases de plástico no reutilizables. Solicitud de devolución.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR20.shtml",
  },
  {
    sourceRowLabel: "Modelo A23",
    codes: ["A23"],
    officialName:
      "Impuesto sobre los Gases Fluorados de Efecto Invernadero. Solicitud de devolución",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DR19.shtml",
  },
  {
    sourceRowLabel: "Modelo A24",
    codes: ["A24"],
    officialName:
      "II. EE. Solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
    officialProcedureHref:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/DJ28.shtml",
  },
] as const satisfies readonly AeatOfficialIndexRowV1[];

export type AeatOfficialModelCodeV1 =
  (typeof RAW_AEAT_OFFICIAL_INDEX_ROWS_V1)[number]["codes"][number];

const SOURCE_V1: AeatOfficialIndexSourceV1 = Object.freeze({
  id: "aeat.declarations-by-model.2026-07-08",
  authority: "AEAT",
  title: "Presentar y consultar declaraciones por modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  sourceUpdatedOn: "2026-07-08",
  verifiedOn: "2026-07-12",
  sourceSha256:
    "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
  reviewStatus: "PENDING_REVIEW",
});

const rows = Object.freeze(
  RAW_AEAT_OFFICIAL_INDEX_ROWS_V1.map((row) =>
    Object.freeze({
      sourceRowLabel: row.sourceRowLabel,
      codes: Object.freeze([...row.codes]) as readonly [
        AeatOfficialModelCodeV1,
        ...AeatOfficialModelCodeV1[],
      ],
      officialName: row.officialName,
      officialProcedureHref: row.officialProcedureHref,
    }),
  ),
);

const records: readonly AeatOfficialModelInventoryRecordV1<AeatOfficialModelCodeV1>[] =
  Object.freeze(
    rows.flatMap((row) =>
      row.codes.map((code) =>
        Object.freeze({
          schemaVersion: AEAT_MODEL_INVENTORY_SCHEMA_VERSION_V1,
          releaseId: "aeat-declarations-by-model-2026-07-08.v1",
          code,
          sourceRowLabel: row.sourceRowLabel,
          sourceGroupCodes: row.codes,
          officialName: row.officialName,
          officialProcedureHref: row.officialProcedureHref,
          sourceId: SOURCE_V1.id,
          identityStatus: "SOURCE_CAPTURED",
          procedureHrefStatus: "SOURCE_CAPTURED",
          validityStatus: "SOURCE_PENDING",
          lifecycleStatus: "UNDETERMINED",
          reviewStatus: "PENDING_REVIEW",
          contentLevel: "STRUCTURAL_INDEX_ONLY",
        }),
      ),
    ),
  );

const codes = Object.freeze(records.map((record) => record.code));
if (
  rows.length !== 218 ||
  records.length !== 228 ||
  new Set(codes).size !== records.length
) {
  throw new Error("Inconsistent AEAT official model inventory release");
}

export const AEAT_OFFICIAL_MODEL_CODES_V1 =
  codes as readonly AeatOfficialModelCodeV1[];

export const AEAT_OFFICIAL_INDEX_RELEASE_V1 = Object.freeze({
  schemaVersion: AEAT_MODEL_INVENTORY_SCHEMA_VERSION_V1,
  releaseId: "aeat-declarations-by-model-2026-07-08.v1" as const,
  source: SOURCE_V1,
  rows,
  records,
});
