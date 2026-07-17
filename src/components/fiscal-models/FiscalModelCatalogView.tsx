import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  History,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  FiscalModelCatalogBrowser,
  FiscalModelManualSelectionAction,
} from "./FiscalModelCatalogBrowser";
import {
  createPublicAeatModelSearchEntryWithTermsV2,
  type PublicAeatModelReviewSearchResultV2,
} from "@/lib/fiscal-models/model-pages/public-review-search.v2";
import type {
  PublicAeatModelCalendarDetailContextResultV1,
  PublicAeatModelReviewPageV1,
} from "@/lib/fiscal-models/model-pages/public-review-catalog.v1";
import type { PublicAeatOfficialModelContentV1 } from "@/lib/fiscal-models/model-pages/official-content";
import { FiscalModelOfficialVisual } from "./FiscalModelOfficialVisual";
import { getFiscalModelDocumentTitle } from "./fiscal-model-document-title";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

const practicalCatalogLabels: Readonly<
  Partial<Record<string, readonly string[]>>
> = {
  "035": [
    "Comercio electrónico",
    "OSS e IOSS",
    "Registro censal",
    "Operaciones B2C",
  ],
  "038": [
    "Registros públicos",
    "Mensual",
    "Declaración informativa",
    "No la presenta la entidad inscrita",
  ],
  "039": ["Grupo de IVA", "Comunicación censal", "Relacionado con 322 y 353"],
  "043": ["Juego", "Bingo", "Competencia territorial", "Sectorial"],
  "044": ["Juego", "Casinos", "Competencia territorial", "Sectorial"],
  "045": [
    "Juego",
    "Máquinas recreativas",
    "Competencia territorial",
    "Sectorial",
  ],
  "040": [
    "Obligaciones informativas sectoriales",
    "Operadores de plataformas",
    "Registro censal",
    "DAC7",
  ],
  "100": [
    "Esencial para autónomos",
    "Anual",
    "IRPF",
    "Obligatoria para altas en RETA",
  ],
  "102": ["Renta", "Segundo plazo", "40 %", "Documento de ingreso"],
  "111": ["Frecuente si pagas retenciones", "Trimestral o mensual", "IRPF"],
  "113": [
    "Impuesto de salida",
    "Cambio de residencia",
    "UE y EEE",
    "Participaciones",
  ],
  "115": ["Si alquilas un local", "Trimestral o mensual", "Retenciones"],
  "121": [
    "Deducciones familiares",
    "Cesión del derecho",
    "Solo no declarantes",
    "Caso excepcional",
  ],
  "122": [
    "Deducciones familiares",
    "Regularización",
    "Solo no declarantes",
    "Resultado a ingresar",
  ],
  "123": [
    "Dividendos e intereses",
    "Trimestral o mensual",
    "Retenciones",
    "Frecuente en sociedades",
  ],
  "130": [
    "Frecuente para autónomos",
    "IRPF",
    "Trimestral",
    "Estimación directa",
  ],
  "131": ["Solo módulos", "IRPF", "Trimestral", "Revisión anual"],
  "136": ["Premios", "20 %", "Autoliquidación", "Relacionado con 230 y 270"],
  "140": [
    "Deducción por maternidad",
    "Abono anticipado",
    "IRPF",
    "Hijos menores de 3 años",
  ],
  "143": [
    "Deducciones familiares",
    "Abono anticipado",
    "IRPF",
    "Familia y discapacidad",
  ],
  "145": [
    "Si tienes empleados",
    "Nóminas",
    "No se presenta a la AEAT",
    "Datos del trabajador",
  ],
  "146": ["Pensionistas", "Varios pagadores", "Retenciones", "Solicitud"],
  "147": [
    "Trabajador desplazado",
    "Retenciones",
    "183 días",
    "No es Ley Beckham",
  ],
  "149": [
    "Movilidad internacional y no residentes",
    "Régimen de desplazados",
    "Opción y comunicaciones",
    "IRPF",
  ],
  "150": [
    "Histórico",
    "Régimen anterior a 2015",
    "No para nuevas opciones",
    "Relacionado con 149 y 151",
  ],
  "151": [
    "Movilidad internacional y no residentes",
    "Régimen de desplazados",
    "Declaración anual",
    "IRPF",
  ],
  "156": [
    "Cotizaciones",
    "Deducción por maternidad",
    "Anual",
    "No lo presenta el afiliado",
  ],
  "159": [
    "Energía eléctrica",
    "Consumo",
    "Anual",
    "No lo presenta el consumidor",
  ],
  "165": ["Empresas nuevas", "Inversores", "Certificados", "Anual"],
  "170": [
    "Mensual desde 2026",
    "Tarjetas y pagos móviles",
    "Entidades de pago",
    "No lo presenta el comercio",
  ],
  "171": [
    "Efectivo",
    "Operaciones financieras",
    "Anual",
    "No equivale a infracción",
  ],
  "174": [
    "Primera presentación en 2027",
    "Tarjetas",
    "Anual",
    "Entidades financieras",
  ],
  "172": [
    "Obligaciones informativas sectoriales",
    "Criptomonedas",
    "Saldos",
    "Custodios",
  ],
  "173": [
    "Obligaciones informativas sectoriales",
    "Criptomonedas",
    "Operaciones",
    "Servicio web XML",
  ],
  "179": [
    "Obligaciones informativas sectoriales",
    "Histórico",
    "No vigente desde 2024",
    "Relacionado con 238",
  ],
  "180": ["Anual", "Relacionado con 115", "Declaración informativa"],
  "181": ["Préstamos", "Hipotecas", "Inmuebles", "Anual"],
  "182": ["Donativos", "Entidades beneficiarias", "Certificados", "Anual"],
  "184": [
    "Comunidades de bienes",
    "Declaración informativa",
    "Anual",
    "Relacionado con Renta",
  ],
  "185": [
    "Mensual desde 2026",
    "Seguridad Social",
    "Mutualidades",
    "No lo presenta el afiliado",
  ],
  "186": ["Registro Civil", "Nacimientos", "Defunciones", "Mensual"],
  "189": ["Valores", "Seguros", "31 de diciembre", "Anual"],
  "190": ["Anual", "Relacionado con 111", "Declaración informativa"],
  "192": ["Letras del Tesoro", "Operaciones", "Anual", "Intermediarios"],
  "195": [
    "Cuentas sin NIF",
    "Entidades de crédito",
    "Trimestral",
    "Identificación",
  ],
  "198": ["Activos financieros", "Valores", "Operaciones", "Anual"],
  "199": ["Cheques", "Entidades de crédito", "Identificación", "Anual"],
  "193": [
    "Anual",
    "Declaración informativa",
    "Relacionado con 123",
    "Rentas del capital",
  ],
  "200": [
    "Autónomo societario y empresas",
    "Anual",
    "Impuesto sobre Sociedades",
  ],
  "202": [
    "Autónomo societario y empresas",
    "Abril, octubre y diciembre",
    "Pago a cuenta",
  ],
  "206": [
    "Auxiliar del Modelo 200",
    "IRNR",
    "Establecimiento permanente",
    "No se presenta solo",
  ],
  "210": [
    "Movilidad internacional y no residentes",
    "IRNR",
    "Sin establecimiento permanente",
    "Inmuebles y otras rentas",
  ],
  "211": [
    "Movilidad internacional y no residentes",
    "IRNR",
    "Venta de inmuebles",
    "Retención del 3 %",
  ],
  "213": ["IRNR", "Inmuebles", "Jurisdicción no cooperativa", "3 %"],
  "216": [
    "Pagos a no residentes",
    "IRNR",
    "Trimestral o mensual",
    "Solo si existe obligación de retener",
  ],
  "217": ["SOCIMI", "Dividendos", "19 %", "Dos meses desde el acuerdo"],
  "220": [
    "Grupos fiscales",
    "Sociedades",
    "Anual",
    "Relacionado con 200 y 222",
  ],
  "221": [
    "Muy especializado",
    "Sociedades",
    "Activos fiscales diferidos",
    "1,5 %",
  ],
  "222": [
    "Grupos fiscales",
    "Pago a cuenta",
    "Abril, octubre y diciembre",
    "Relacionado con 220",
  ],
  "226": ["No residentes", "UE y EEE", "Solicitud", "No confiere residencia"],
  "228": ["No residentes", "Vivienda habitual", "Reinversión", "Tres meses"],
  "230": ["Loterías", "Mensual", "20 %", "Lo presenta el pagador"],
  "231": ["CBC/DAC4", "Grandes grupos", "> 750 millones", "Doce meses"],
  "234": ["DAC6", "Comunicación inicial", "30 días", "Transfronterizo"],
  "235": ["DAC6", "Comercializable", "Trimestral", "Actualización"],
  "236": ["DAC6", "Utilización", "Anual", "Octubre a diciembre"],
  "237": ["SOCIMI", "15 %", "Beneficios no distribuidos", "Dos meses"],
  "239": ["Pendiente de activación", "CRS", "AMAC", "Sin presentación"],
  "240": [
    "Impuesto Complementario",
    "Grandes grupos",
    "Comunicación",
    "Primera campaña",
  ],
  "241": [
    "Impuesto Complementario",
    "GIR/DAC9",
    "Grandes grupos",
    "Servicio web",
  ],
  "242": [
    "Impuesto Complementario",
    "Autoliquidación",
    "Grandes grupos",
    "Por lotes",
  ],
  "247": [
    "Trabajador por cuenta ajena",
    "Salida al extranjero",
    "Retenciones",
    "No es 147",
  ],
  "270": ["Loterías", "Anual", "Fichero", "Relacionado con 230"],
  "280": [
    "Ahorro a largo plazo",
    "SIALP y CIALP",
    "Durante febrero",
    "No lo presenta el ahorrador",
  ],
  "281": ["ZEC", "Trimestral", "Sin tránsito por Canarias", "Territorial"],
  "282": [
    "REF Canarias",
    "Ayudas de Estado",
    "Renta o Sociedades",
    "Territorial",
  ],
  "283": [
    "Illes Balears",
    "Ayudas fiscales",
    "Renta o Sociedades",
    "Territorial",
  ],
  "289": [
    "CRS",
    "Cuentas financieras",
    "Servicio web",
    "Instituciones financieras",
  ],
  "290": [
    "FATCA",
    "Estados Unidos",
    "Servicio web",
    "Instituciones financieras",
  ],
  "291": [
    "Transición 2026",
    "Histórico reciente",
    "Relacionado con 196",
    "No lo presenta el titular",
  ],
  "294": [
    "IIC españolas",
    "Operaciones",
    "Clientes extranjeros",
    "Hasta 31 de marzo",
  ],
  "295": [
    "IIC españolas",
    "Posiciones",
    "31 de diciembre",
    "Hasta 31 de marzo",
  ],
  "318": [
    "IVA especializado",
    "Estado y forales",
    "Regularización",
    "Territorial",
  ],
  "319": ["Nuevo en 2026", "Hidrocarburos", "Antes de la extracción", "110 %"],
  "322": [
    "Grupo de IVA",
    "Mensual",
    "Modelo individual",
    "Relacionado con 353",
  ],
  "345": [
    "Previsión social",
    "Anual",
    "Entidades obligadas",
    "No lo presenta el partícipe",
  ],
  "346": [
    "Ayudas agrarias",
    "Entidad pagadora",
    "Plazo a verificar",
    "Informativa",
  ],
  "353": ["Grupo de IVA", "Mensual", "Modelo agregado", "Relacionado con 322"],
  "364": [
    "IVA institucional",
    "OTAN",
    "Reembolso",
    "No lo presenta el proveedor",
  ],
  "365": ["IVA institucional", "OTAN", "Exención previa", "Solicitud"],
  "368": ["Histórico", "MOSS", "Sustituido por 035 y 369", "No vigente"],
  "379": [
    "CESOP",
    "Pagos transfronterizos",
    "Trimestral",
    "Proveedores de pago",
  ],
  "380": ["IVA", "Operación asimilada", "Regímenes suspensivos", "Sectorial"],
  "381": ["IVA institucional", "Fuerzas armadas UE", "Reembolso", "Defensa"],
  "410": [
    "Entidades de crédito",
    "Pago a cuenta",
    "Depósitos",
    "Relacionado con 411",
  ],
  "411": [
    "Entidades de crédito",
    "Autoliquidación anual",
    "Depósitos",
    "Relacionado con 410",
  ],
  "430": ["Aseguradoras", "Mensual", "Primas de seguros", "Autoliquidación"],
  "480": ["Aseguradoras", "Anual", "Primas de seguros", "Resumen"],
  "490": ["Grandes empresas", "Servicios digitales", "Trimestral", "3 %"],
  "504": [
    "Impuestos Especiales",
    "Movimientos UE",
    "Solicitud",
    "Relacionado con 505",
  ],
  "505": [
    "Impuestos Especiales",
    "Autorización administrativa",
    "No se presenta sola",
    "Relacionado con 504",
  ],
  "506": [
    "Impuestos Especiales",
    "Devolución",
    "Depósito fiscal",
    "Trimestral",
  ],
  "507": [
    "Impuestos Especiales",
    "Envíos garantizados",
    "EMCS",
    "Vigente desde 2023",
  ],
  "508": [
    "Impuestos Especiales",
    "Ventas a distancia",
    "Devolución",
    "Trimestral",
  ],
  "510": [
    "Impuestos Especiales",
    "Recepciones UE",
    "Declaración de operaciones",
    "EMCS",
  ],
  "512": ["Hidrocarburos", "Tarifa segunda", "50.000 litros", "Anual"],
  "515": [
    "Marcas fiscales",
    "Tabaco",
    "Solicitud electrónica",
    "Operadores autorizados",
  ],
  "517": [
    "Marcas fiscales",
    "Bebidas derivadas",
    "Precintas",
    "Operadores autorizados",
  ],
  "518": [
    "Alcohol",
    "Declaración previa",
    "Un día hábil",
    "Relacionado con 519 y 520",
  ],
  "519": [
    "Alcohol",
    "Incidencia inmediata",
    "Comunicación",
    "Relacionado con 518",
  ],
  "520": [
    "Alcohol",
    "Resultado final",
    "Día de finalización",
    "Relacionado con 518",
  ],
  "521": ["Alcohol vínico", "Materias primas", "Trimestral", "Artículo 89"],
  "522": [
    "Biocarburantes",
    "Vigencia conflictiva",
    "Artículo derogado",
    "Consulta obligatoria",
  ],
  "523": [
    "Alcohol",
    "Beneficio de devolución",
    "Reconocimiento previo",
    "Relacionado con 524",
  ],
  "524": ["Alcohol", "Devolución", "Trimestral", "Relacionado con 523"],
  "544": ["Gasóleo bonificado", "Pagos", "Trimestral", "Hasta el día 20"],
  "545": [
    "Relaciones internacionales",
    "Carburantes",
    "Trimestral",
    "Hasta el día 20",
  ],
  "546": [
    "Gasóleo bonificado",
    "Entidades emisoras",
    "Trimestral",
    "Hasta el día 20",
  ],
  "547": [
    "Gasóleo bonificado",
    "Abonos a detallistas",
    "Trimestral",
    "Hasta el día 20",
  ],
  "548": [
    "Impuestos Especiales",
    "Depositarios autorizados",
    "Mensual",
    "Operaciones por cuenta ajena",
  ],
  "553": [
    "Vino y bebidas fermentadas",
    "SILICIE",
    "Trimestral",
    "Formulario 2025+",
  ],
  "559": [
    "Alcohol",
    "Destilación artesanal",
    "Tarifa 1 y 2",
    "Plazos especiales",
  ],
  "560": ["Electricidad", "Autoliquidación", "CIE", "Tipo revisable"],
  "561": ["Cerveza", "Impuestos Especiales", "Autoliquidación", "Grado Plato"],
  "562": [
    "Productos intermedios",
    "Tranquilos y espumosos",
    "Autoliquidación",
    "Impuestos Especiales",
  ],
  "563": [
    "Alcohol y bebidas derivadas",
    "Autoliquidación",
    "Litros de alcohol puro",
    "Impuestos Especiales",
  ],
  "566": [
    "Tabaco",
    "Autoliquidación",
    "Labores y epígrafes",
    "Impuestos Especiales",
  ],
  "568": [
    "Medios de transporte",
    "Reventa profesional",
    "Envío fuera del territorio",
    "Antes de cuatro años",
  ],
  "571": [
    "Hidrocarburos",
    "Reconocimiento previo",
    "Devolución",
    "No es el 572",
  ],
  "572": [
    "Hidrocarburos",
    "Solicitud de devolución",
    "Trimestral",
    "Relacionado con 571",
  ],
  "573": [
    "Cigarrillos electrónicos",
    "Mensual",
    "Vigente desde abril de 2025",
    "Impuesto especial",
  ],
  "576": ["Carburantes", "Devolución", "Uso profesional", "Transporte"],
  "581": ["Hidrocarburos", "Autoliquidación", "Por establecimiento", "Vigente"],
  "582": [
    "Histórico",
    "Hidrocarburos",
    "Periodos anteriores a 2019",
    "No vigente en 2026",
  ],
  "583": [
    "Producción eléctrica",
    "Pagos fraccionados",
    "Autoliquidación anual",
    "Noviembre",
  ],
  "584": [
    "Energía nuclear",
    "Producción",
    "Combustible gastado",
    "Residuos radiactivos",
  ],
  "585": [
    "Energía nuclear",
    "Almacenamiento centralizado",
    "Combustible gastado",
    "Residuos radiactivos",
  ],
  "586": [
    "Histórico",
    "Gases fluorados",
    "Hasta agosto de 2022",
    "No vigente en 2026",
  ],
  "587": [
    "Gases fluorados",
    "Trimestral",
    "Rectificativa desde julio de 2026",
    "Autoliquidación",
  ],
  "588": [
    "Producción eléctrica",
    "Cese anticipado",
    "Noviembre",
    "Relacionado con 583",
  ],
  "589": ["Extracción", "Gas y petróleo", "Pago en octubre", "Anual en abril"],
  "590": ["Hidrocarburos", "Exportación", "Devolución", "Aduanas"],
  "591": [
    "Producción eléctrica",
    "Pagadores",
    "Informativa anual",
    "Diciembre",
  ],
  "592": [
    "Plástico no reciclado",
    "Vigente desde 2023",
    "Autoliquidación",
    "Envases",
  ],
  "593": [
    "Residuos",
    "Vigente desde 2023",
    "Gestión territorial",
    "Vertedero e incineración",
  ],
  "595": [
    "Carbón",
    "Relación de suministros",
    "Declaración informativa",
    "Operadores",
  ],
  "596": [
    "Carbón",
    "Autoliquidación",
    "Impuestos Especiales",
    "Suministro o autoconsumo",
  ],
  "600": ["ITP y AJD", "Competencia territorial", "30 días hábiles"],
  "602": ["Juego", "Tasa administrativa", "No periódica"],
  "604": ["Transacciones financieras", "Mensual", "0,2 %", "Anexo previo"],
  "610": ["Documentos mercantiles", "Entidades colaboradoras", "AJD"],
  "611": ["Informativa anual", "No genera pago", "Relacionado con 610"],
  "615": ["Documentos mercantiles", "Función de giro", "AJD"],
  "616": ["Informativa anual", "No genera pago", "Relacionado con 615"],
  "620": ["Vehículos usados", "Comprador", "Competencia territorial"],
  "630": ["Letras de cambio", "AJD", "Competencia territorial"],
  "650": ["Herencias", "Seis meses", "Competencia territorial"],
  "651": ["Donaciones", "Donatario", "30 días hábiles"],
  "655": ["Usufructo", "Nuda propiedad", "Competencia territorial"],
  "681": ["Sector eléctrico", "Residuos radiactivos", "Mensual"],
  "682": ["Centrales nucleares", "Residuos radiactivos", "Mensual"],
  "683": ["Combustible nuclear", "Anual", "Muy especializado"],
  "684": ["Residuos radiactivos", "ENRESA", "60 días"],
  "685": ["Apuestas", "Promociones", "Periodo 0A", "30 días"],
  "695": ["Tasa judicial", "Devolución parcial", "60 % o 20 %"],
  "696": ["Tasa judicial", "Personas jurídicas", "Revisar exenciones"],
  "763": ["Operadores de juego", "Trimestral", "Sectorial"],
  "770": ["Alta complejidad", "Intereses y recargos", "Artículo 252 LGT"],
  "771": ["Alta complejidad", "Cuota principal", "Solo sin modelo ordinario"],
  "780": ["Entidades financieras", "Impuesto vigente", "Septiembre"],
  "781": ["Entidades financieras", "Pago fraccionado", "40 %", "Febrero"],
  "791": ["Empleo público", "Oposiciones AEAT", "No tributario"],
  "792": ["Servicios audiovisuales", "Anual", "Febrero"],
  "793": [
    "Servicios audiovisuales",
    "Pagos a cuenta",
    "Abril, julio y octubre",
  ],
  "795": ["Histórico", "Energía", "2023 y 2024"],
  "796": ["Histórico", "Pago anticipado", "2023 y 2024"],
  "797": ["Histórico", "Entidades financieras", "Relacionado con 780 y 781"],
  "798": ["Histórico", "Pago anticipado", "Solo 2023 y 2024"],
  "848": ["IAE", "Cifra de negocios", "Del 1 de enero al 14 de febrero"],
  "901": [
    "Administraciones públicas",
    "Eficiencia energética",
    "Institucional",
  ],
  "933": ["Administraciones públicas", "Centros autorizados", "Institucional"],
  "952": [
    "IVA",
    "Créditos incobrables",
    "Un mes desde la factura rectificativa",
  ],
  "980": ["Administraciones públicas", "Intereses de demora", "Institucional"],
  "981": ["Histórico", "Único ejercicio 2019", "Prestaciones 2014 a 2017"],
  "990": [
    "Administraciones públicas",
    "Información mensual",
    "Datos sensibles",
  ],
  "991": ["Administraciones públicas", "Fianzas de alquiler", "Institucional"],
  "992": ["Administraciones públicas", "Juegos", "Institucional"],
  "993": [
    "Administraciones públicas",
    "Deducciones familiares",
    "Institucional",
  ],
  "995": ["Entidades locales", "Información urbanística", "Institucional"],
  "996": ["Recaudación", "Embargo de devoluciones AEAT", "Institucional"],
  "997": ["Recaudación", "Pagos presupuestarios", "Institucional"],
  A22: ["Plástico", "Solicitud de devolución", "Trimestral"],
  A23: ["Gases fluorados", "Solicitud de devolución", "Trimestral"],
  A24: ["Vapeo y nicotina", "Solicitud de devolución", "Mensual"],
  "232": [
    "Autónomo societario y empresas",
    "Operaciones vinculadas",
    "Informativa",
    "Anual",
  ],
  "233": [
    "Obligaciones informativas sectoriales",
    "Guarderías y centros infantiles",
    "Anual",
    "No la presentan los padres",
  ],
  "238": [
    "Obligaciones informativas sectoriales",
    "Operadores de plataformas",
    "DAC7",
    "Anual",
  ],
  "296": ["Anual", "No residentes", "Informativa", "Relacionado con 216"],
  "303": ["Frecuente para autónomos", "IVA", "Trimestral o mensual"],
  "308": [
    "IVA sectorial",
    "Caso especial de IVA",
    "Comercio y transporte",
    "Solicitud de devolución",
    "No periódico",
  ],
  "309": [
    "Caso especial de IVA",
    "No periódico",
    "Operaciones intracomunitarias",
    "Solo si se produce el supuesto",
  ],
  "341": [
    "IVA sectorial",
    "Agricultura, ganadería y pesca",
    "REAGP",
    "Solicitud de reintegro",
    "Trimestral",
  ],
  "347": [
    "Anual",
    "Declaración informativa",
    "Clientes y proveedores",
    "Solo si superas el límite",
  ],
  "349": [
    "Unión Europea",
    "Mensual o trimestral",
    "Declaración informativa",
    "Sin importe mínimo",
  ],
  "360": [
    "IVA extranjero",
    "Unión Europea",
    "Devolución",
    "Fecha límite anual",
  ],
  "361": ["Internacional", "No establecido", "IVA español", "Avanzado"],
  "369": [
    "Comercio electrónico",
    "IVA europeo",
    "Trimestral o mensual",
    "OSS e IOSS",
  ],
  "390": ["Anual", "IVA", "Puede estar exonerado"],
  "714": [
    "Patrimonio y activos internacionales",
    "Patrimonio personal",
    "Anual",
    "Reglas autonómicas",
    "Solo si existe obligación",
  ],
  "718": [
    "Patrimonio y activos internacionales",
    "Grandes fortunas",
    "Patrimonio personal",
    "Julio",
    "Avanzado",
  ],
  "720": [
    "Patrimonio y activos internacionales",
    "Bienes en el extranjero",
    "Declaración informativa",
    "Enero a marzo",
    "Solo si se superan límites",
  ],
  "721": [
    "Patrimonio y activos internacionales",
    "Criptomonedas",
    "Custodia extranjera",
    "Declaración informativa",
    "Enero a marzo",
  ],
  "840": [
    "Normalmente no para autónomos",
    "IAE",
    "Empresas no exentas",
    "Cifra de negocios ≥ 1 millón",
  ],
};

const practicalCatalogSummaries: Readonly<Partial<Record<string, string>>> = {
  "038":
    "Información mensual de inscripciones comunicada por titulares de Registros públicos. No la presenta la entidad inscrita.",
  "039":
    "Comunicación de opciones, composición y cambios del régimen especial del grupo de entidades de IVA.",
  "043":
    "Tasa sobre el bingo cuando la gestión corresponde a la Administración tributaria estatal.",
  "044":
    "Tasa fiscal sobre casinos cuando la gestión corresponde a la Administración estatal.",
  "045":
    "Tasa sobre máquinas recreativas o de azar en los supuestos de gestión estatal.",
  "102":
    "Documento para ingresar el segundo 40 % de la Renta cuando no quedó domiciliado.",
  "113":
    "Comunicación especial de determinadas participaciones al trasladar la residencia a la UE o al EEE.",
  "136":
    "Autoliquidación de determinados premios cuando no se practicó la retención correspondiente.",
  "146":
    "Solicitud para coordinar la retención de pensionistas con dos o más pagadores.",
  "147":
    "Comunicación de un trabajador desplazado para anticipar el cambio de residencia en sus retenciones.",
  "150":
    "Modelo histórico del régimen de desplazados anterior a 2015. Las situaciones actuales utilizan 149 y 151.",
  "156":
    "Resumen anual de cotizaciones comunicado por organismos y mutualidades para contrastar la deducción por maternidad.",
  "159":
    "Información anual de contratos, puntos de suministro y consumos comunicada por entidades eléctricas.",
  "165":
    "Información anual de certificados emitidos a inversores de determinadas empresas nuevas o recientes.",
  "170":
    "Información mensual desde 2026 sobre cobros con tarjeta y móvil gestionados para empresarios y profesionales.",
  "171":
    "Información anual de determinadas imposiciones, retiradas y cobros de documentos comunicada por entidades financieras.",
  "174":
    "Nueva declaración anual de tarjetas cuya primera información de 2026 se presenta en enero de 2027.",
  "181":
    "Información anual de préstamos, créditos y financiación inmobiliaria comunicada por entidades obligadas.",
  "182":
    "Declaración anual de donativos y aportaciones presentada por las entidades beneficiarias.",
  "185":
    "Información mensual desde 2026 de cotizaciones suministrada electrónicamente por Seguridad Social y mutualidades.",
  "186":
    "Información mensual de nacimientos y defunciones suministrada por los órganos del Registro Civil.",
  "189":
    "Información anual sobre valores, seguros y rentas comunicada por entidades financieras y aseguradoras.",
  "192":
    "Información anual de operaciones con Letras del Tesoro comunicada por intermediarios obligados.",
  "195":
    "Información trimestral sobre cuentas cuyos titulares no facilitaron el NIF en plazo.",
  "198":
    "Información anual de operaciones con activos financieros y valores comunicada por entidades e intermediarios.",
  "199":
    "Información anual de determinadas operaciones con cheques comunicada por entidades de crédito.",
  "206":
    "Documento auxiliar de ingreso o devolución generado junto al Modelo 200 para determinados contribuyentes del IRNR.",
  "213":
    "Gravamen anual del 3 % para determinadas entidades de jurisdicciones no cooperativas con inmuebles en España.",
  "217":
    "Autoliquidación del 19 % sobre determinados dividendos distribuidos por SOCIMI, dentro de los dos meses del acuerdo.",
  "220":
    "Declaración anual de Sociedades para grupos acogidos al régimen de consolidación fiscal.",
  "221":
    "Prestación anual aplicable a determinados activos fiscales diferidos convertibles en crédito frente a Hacienda.",
  "222":
    "Pago fraccionado de Sociedades presentado por la entidad representante de un grupo fiscal.",
  "226":
    "Solicitud de determinados residentes UE/EEE para comparar su tributación como no residentes con el IRPF.",
  "228":
    "Devolución para determinados no residentes que reinvierten la venta de su vivienda habitual española.",
  "230":
    "Retenciones mensuales practicadas por los pagadores de determinados premios de loterías.",
  "231": "Información país por país de grandes grupos multinacionales.",
  "234":
    "Comunicación inicial de determinados mecanismos transfronterizos DAC6.",
  "235":
    "Actualización trimestral de mecanismos transfronterizos comercializables.",
  "236": "Información anual sobre la utilización en España de mecanismos DAC6.",
  "237":
    "Gravamen del 15 % sobre determinados beneficios no distribuidos por SOCIMI.",
  "239":
    "Modelo internacional para mecanismos de elusión CRS, pendiente de activación.",
  "240":
    "Comunicación de la entidad designada para presentar la información del Impuesto Complementario.",
  "241": "Declaración informativa GIR/DAC9 del Impuesto Complementario.",
  "242": "Autoliquidación del Impuesto Complementario de grandes grupos.",
  "247":
    "Comunicación de un trabajador por cuenta ajena que se desplaza al extranjero.",
  "270":
    "Resumen anual de premios, perceptores y retenciones declarados mediante el Modelo 230.",
  "280":
    "Información anual de Planes de Ahorro a Largo Plazo presentada por entidades financieras.",
  "281":
    "Operaciones trimestrales de comercio de bienes de entidades ZEC sin tránsito por Canarias.",
  "282": "Ayudas fiscales del REF de Canarias y otras ayudas de Estado.",
  "283": "Ayudas fiscales del Régimen Fiscal Especial de las Illes Balears.",
  "289": "Información CRS de cuentas financieras reportables.",
  "290":
    "Información FATCA de cuentas de determinadas personas estadounidenses.",
  "291":
    "Información anual histórica reciente de cuentas de no residentes, en transición al Modelo 196.",
  "294":
    "Distribuciones y reembolsos de clientes extranjeros en IIC españolas.",
  "295":
    "Posiciones a 31 de diciembre de clientes extranjeros en IIC españolas.",
  "318":
    "Regularización territorial del IVA entre la Administración estatal y las Haciendas forales.",
  "319":
    "Pago anticipado de IVA para determinadas extracciones de carburantes de depósitos fiscales.",
  "322":
    "Autoliquidación mensual individual de entidades incluidas en un grupo de IVA.",
  "345":
    "Información anual de aportaciones y partícipes de sistemas de previsión social.",
  "346":
    "Información anual de ayudas agrarias comunicada por las entidades pagadoras.",
  "353": "Autoliquidación mensual agregada del IVA de un grupo de entidades.",
  "364":
    "Solicitud institucional de reembolso de IVA para OTAN, cuarteles generales y Estados parte.",
  "365": "Reconocimiento previo de exenciones de IVA en el ámbito OTAN.",
  "368":
    "Modelo histórico MOSS, sustituido desde julio de 2021 por el Formulario 035 y el Modelo 369.",
  "379":
    "Información trimestral CESOP comunicada por proveedores de servicios de pago.",
  "380":
    "IVA de determinadas operaciones asimiladas a importaciones y salidas de regímenes suspensivos.",
  "381":
    "Reembolso institucional de IVA a fuerzas armadas de otro Estado miembro en actividades de defensa de la UE.",
  "410":
    "Pago a cuenta del impuesto sobre depósitos presentado por entidades de crédito.",
  "411":
    "Autoliquidación anual del impuesto sobre depósitos de las entidades de crédito.",
  "430": "Autoliquidación mensual del Impuesto sobre las Primas de Seguros.",
  "480":
    "Resumen anual de bases y cuotas del Impuesto sobre las Primas de Seguros.",
  "490":
    "Autoliquidación trimestral del impuesto del 3 % sobre determinados servicios digitales.",
  "504":
    "Solicitud vigente para determinados movimientos UE de productos sujetos a Impuestos Especiales.",
  "505":
    "Autorización administrativa emitida tras una solicitud 504; no tiene presentación independiente.",
  "506":
    "Solicitud trimestral de devolución por introducción de productos en depósito fiscal.",
  "507":
    "Solicitud vigente de devolución en envíos garantizados, regulada por la Orden HFP/626/2023.",
  "508":
    "Solicitud trimestral de devolución en ventas a distancia de productos sujetos a Impuestos Especiales.",
  "510":
    "Declaración de determinadas recepciones UE de productos sujetos a Impuestos Especiales.",
  "512":
    "Relación anual de destinatarios que alcanzan 50.000 litros de productos de tarifa segunda.",
  "515":
    "Solicitud electrónica de marcas fiscales para todas las labores del tabaco comprendidas.",
  "517": "Solicitud de marcas fiscales para alcohol y bebidas derivadas.",
  "518":
    "Declaración de trabajo presentada al menos un día hábil antes de comenzar.",
  "519":
    "Comunicación inmediata de incidencias durante una operación de trabajo.",
  "520":
    "Resultado final presentado el día en que termina el periodo de actividad.",
  "521":
    "Relación trimestral de materias primas para alcohol vínico, azúcares, isoglucosa y melazas.",
  "522":
    "Parte histórico de determinados biocarburantes con una contradicción oficial de vigencia pendiente de aclarar.",
  "523":
    "Reconocimiento previo de determinados beneficios de devolución sobre alcohol y bebidas alcohólicas.",
  "524":
    "Solicitud trimestral de devolución por determinados usos de alcohol y bebidas alcohólicas.",
  "544":
    "Información trimestral de pagos mediante cheques y tarjetas de gasóleo bonificado.",
  "545":
    "Información trimestral de carburantes suministrados bajo beneficios de relaciones internacionales.",
  "546":
    "Información trimestral de cheques-tarjeta de gasóleo bonificado emitidos o gestionados por entidades autorizadas.",
  "547":
    "Información trimestral de abonos realizados a detallistas de gasóleo bonificado por entidades emisoras de medios de pago.",
  "548":
    "Declaración mensual de cuotas repercutidas por depositarios autorizados en operaciones por cuenta ajena, sin incluir electricidad.",
  "553":
    "Operaciones y existencias de determinados establecimientos de vino y bebidas fermentadas, coordinadas con SILICIE y con flujo separado desde 2025.",
  "559":
    "Autoliquidación especial de destilación artesanal y régimen de cosechero, con reglas distintas para Tarifa 1 y Tarifa 2.",
  "560":
    "Autoliquidación del Impuesto Especial sobre la Electricidad por contribuyentes inscritos, no por consumidores ordinarios.",
  "561":
    "Autoliquidación del Impuesto sobre la Cerveza por operadores autorizados.",
  "562":
    "Autoliquidación del Impuesto sobre Productos Intermedios tranquilos y espumosos.",
  "563": "Autoliquidación del Impuesto sobre el Alcohol y Bebidas Derivadas.",
  "566": "Autoliquidación de los Impuestos sobre las Labores del Tabaco.",
  "568":
    "Solicitud de devolución para revendedores profesionales que envían definitivamente un medio de transporte fuera del territorio antes de cuatro años.",
  "571":
    "Reconocimiento previo del derecho a determinadas devoluciones del Impuesto sobre Hidrocarburos.",
  "572":
    "Solicitud trimestral de devolución de determinadas cuotas del Impuesto sobre Hidrocarburos.",
  "573":
    "Autoliquidación mensual del impuesto sobre líquidos para cigarrillos electrónicos y otros productos del tabaco, exigible desde abril de 2025.",
  "576":
    "Solicitud de devolución por determinados usos profesionales de gasóleo.",
  "581":
    "Autoliquidación vigente del Impuesto sobre Hidrocarburos por establecimiento.",
  "582":
    "Modelo histórico trimestral por establecimiento, limitado a periodos anteriores a 2019.",
  "583":
    "Pagos fraccionados y autoliquidación anual del impuesto sobre el valor de la producción eléctrica.",
  "584":
    "Autoliquidación por producción de combustible nuclear gastado y residuos radiactivos.",
  "585":
    "Autoliquidación por almacenamiento centralizado de combustible nuclear gastado y residuos radiactivos.",
  "586":
    "Declaración histórica de gases fluorados, limitada a operaciones realizadas hasta el 31 de agosto de 2022.",
  "587":
    "Autoliquidación vigente de gases fluorados, con rectificativa para periodos iniciados desde julio de 2026.",
  "588":
    "Autoliquidación especial de producción eléctrica por determinados ceses anticipados.",
  "589":
    "Pago fraccionado y autoliquidación anual de la extracción de gas, petróleo y condensados.",
  "590":
    "Solicitud de devolución de hidrocarburos en determinados envíos y exportaciones acreditados.",
  "591":
    "Información anual de pagos realizados a contribuyentes del impuesto sobre la producción eléctrica.",
  "592":
    "Autoliquidación vigente desde 2023 sobre envases de plástico no reutilizables.",
  "593":
    "Autoliquidación vigente desde 2023 sobre depósito, incineración y coincineración de residuos, con gestión territorial.",
  "595":
    "Relación informativa de suministros de carbón realizada por operadores obligados.",
  "596":
    "Autoliquidación del Impuesto Especial sobre el Carbón por operaciones sujetas y autoconsumos.",
  "600":
    "Autoliquidación general de ITP y AJD en los supuestos de competencia estatal.",
  "602":
    "Tasa asociada a determinados trámites administrativos estatales en materia de juego.",
  "604":
    "Autoliquidación mensual del impuesto sobre determinadas adquisiciones de acciones españolas.",
  "610":
    "Ingreso del AJD sobre determinados documentos negociados por entidades colaboradoras.",
  "611":
    "Resumen anual de los documentos y cuotas declarados mediante el Modelo 610.",
  "615":
    "Ingreso del AJD sobre determinados documentos con función de giro o endosables a la orden.",
  "616":
    "Resumen anual de los documentos y cuotas declarados mediante el Modelo 615.",
  "620":
    "Autoliquidación de ITP por determinados medios de transporte usados adquiridos entre particulares.",
  "630":
    "Pago en metálico del AJD correspondiente a determinadas letras y documentos mercantiles.",
  "650":
    "Autoliquidación del impuesto correspondiente a herencias, legados y seguros por fallecimiento.",
  "651":
    "Autoliquidación del impuesto correspondiente a donaciones y otras adquisiciones gratuitas inter vivos.",
  "655":
    "Autoliquidación por consolidación de la plena propiedad al extinguirse un usufructo.",
  "681":
    "Tasa sectorial vinculada a la financiación de determinados servicios de gestión de residuos radiactivos.",
  "682":
    "Tasa por la gestión de combustible nuclear gastado y residuos generados en centrales nucleares.",
  "683":
    "Tasa anual por residuos derivados de la fabricación de elementos combustibles nucleares.",
  "684":
    "Tasa por la gestión de residuos radiactivos generados en otras instalaciones.",
  "685":
    "Autoliquidación estatal de determinadas apuestas y combinaciones aleatorias promocionales.",
  "695":
    "Solicitud de devolución parcial de una tasa judicial por terminación del litigio o acumulación.",
  "696":
    "Autoliquidación de la tasa judicial de determinadas personas jurídicas y actuaciones procesales.",
  "763":
    "Autoliquidación trimestral del impuesto sobre actividades de juego de operadores estatales.",
  "770":
    "Intereses y recargos de una regularización voluntaria especial del artículo 252 LGT.",
  "771":
    "Cuota principal de una regularización especial cuando no existe modelo electrónico ordinario.",
  "780":
    "Autoliquidación anual del impuesto vigente sobre el margen de intereses y comisiones.",
  "781":
    "Pago fraccionado del impuesto sobre el margen de intereses y comisiones.",
  "791":
    "Solicitud electrónica de admisión a procesos selectivos de la AEAT y tasa de examen.",
  "792":
    "Autoliquidación anual de la aportación a RTVE de determinados prestadores audiovisuales.",
  "793":
    "Pagos de abril, julio y octubre a cuenta de la aportación audiovisual a RTVE.",
  "795": "Modelo histórico del gravamen temporal energético de 2023 y 2024.",
  "796": "Pago anticipado histórico del gravamen energético de 2023 y 2024.",
  "797":
    "Modelo histórico del antiguo gravamen bancario, relacionado con los actuales 780 y 781.",
  "798":
    "Pago anticipado histórico del antiguo gravamen bancario, limitado a 2023 y 2024.",
  "848":
    "Comunicación excepcional de la cifra de negocios para el IAE cuando la AEAT no dispone ya del dato.",
  "901":
    "Suministro institucional de certificados de eficiencia energética por las Administraciones competentes.",
  "933":
    "Información institucional de centros autorizados y datos de atención a menores, distinta del Modelo 233.",
  "952":
    "Comunicación electrónica de la modificación de la base imponible del IVA por créditos incobrables.",
  "980":
    "Información institucional de los intereses de demora pagados por las comunidades autónomas.",
  "981":
    "Declaración histórica presentada solo en 2019 para determinadas prestaciones devengadas entre 2014 y 2017.",
  "990":
    "Suministro mensual y restringido de información por Administraciones públicas autorizadas.",
  "991":
    "Información institucional sobre fianzas derivadas del arrendamiento de inmuebles.",
  "992":
    "Información institucional sobre registros y autorizaciones relacionados con juegos.",
  "993":
    "Información institucional utilizada en determinadas deducciones familiares del IRPF.",
  "995":
    "Información anual de entidades locales sobre hechos urbanísticos con relevancia catastral o tributaria.",
  "996":
    "Canal institucional para embargos sobre devoluciones gestionadas por la AEAT.",
  "997":
    "Canal institucional para embargos de pagos presupuestarios de otras Administraciones públicas.",
  A22: "Solicitud trimestral de devolución del impuesto sobre envases de plástico para determinados importadores y compradores posteriores.",
  A23: "Solicitud trimestral de devolución del impuesto sobre gases fluorados para determinados importadores y compradores posteriores.",
  A24: "Solicitud mensual de devolución por envíos a otros Estados miembros de productos de vapeo y nicotina.",
  "040":
    "Alta, modificación y baja de operadores de plataformas en sus dos registros específicos. No es el Modelo 04 y no lo presenta el vendedor.",
  "172":
    "Declaración anual de custodios sujetos en España sobre saldos en monedas virtuales y determinados saldos fiduciarios de terceros.",
  "173":
    "Declaración anual de proveedores sobre adquisiciones, ventas, permutas, transferencias y otras operaciones con monedas virtuales.",
  "179":
    "Ficha histórica de la declaración sobre cesiones de viviendas turísticas, no vigente desde el ejercicio 2024 y relacionada con el Modelo 238.",
  "308":
    "Solicitud especial de devolución de IVA para determinados comercios en recargo de equivalencia, transportistas en régimen simplificado y ventas ocasionales de medios de transporte nuevos.",
  "341":
    "Solicitud trimestral del reintegro de compensaciones del régimen especial agrario en determinadas operaciones exteriores.",
  "121":
    "Comunicación excepcional de la cesión de determinadas deducciones familiares por una persona no obligada a presentar Renta.",
  "122":
    "Regularización de abonos anticipados familiares cobrados en exceso por una persona no obligada a presentar Renta.",
  "123":
    "Ingreso periódico de determinadas retenciones sobre dividendos, intereses y otras rentas del capital.",
  "145":
    "Datos personales y familiares del trabajador para calcular la retención de su nómina. Se entrega al pagador.",
  "149":
    "Comunicación de la opción, renuncia, exclusión o fin del régimen especial para personas desplazadas a España.",
  "151":
    "Declaración anual de quienes tributan por el régimen especial de personas desplazadas a territorio español.",
  "140":
    "Solicitud del abono anticipado de la deducción por maternidad y comunicación de variaciones.",
  "143":
    "Solicitud del abono anticipado de deducciones por familia numerosa y determinadas circunstancias familiares o de discapacidad.",
  "193":
    "Resumen anual de determinadas rentas y retenciones declaradas mediante el Modelo 123.",
  "210":
    "Declaración del IRNR para rentas obtenidas en España por no residentes sin establecimiento permanente.",
  "211":
    "Retención del 3 % que practica quien compra un inmueble a una persona no residente sin establecimiento permanente.",
  "233":
    "Declaración anual de guarderías y centros infantiles autorizados sobre menores y gastos de custodia. No la presentan los progenitores.",
  "238":
    "Información anual que comunican determinados operadores de plataformas sobre vendedores y actividades pertinentes en el marco DAC7.",
  "714":
    "Declaración del Impuesto sobre el Patrimonio cuando existe cuota o se supera el límite bruto establecido.",
  "718":
    "Impuesto estatal complementario del Patrimonio para determinados patrimonios netos elevados.",
  "720":
    "Declaración informativa sobre determinadas cuentas, inversiones, seguros e inmuebles situados en el extranjero.",
  "721":
    "Declaración informativa sobre criptomonedas custodiadas por determinados proveedores situados en el extranjero.",
};

const practicalCatalogTitles: Readonly<Partial<Record<string, string>>> = {
  "170":
    "Declaración mensual de operaciones gestionadas mediante tarjetas y pagos asociados a números de teléfono móvil",
  "185": "Declaración mensual de cotizaciones de afiliados y mutualistas",
  "206": "Documento de ingreso o devolución asociado al Modelo 200",
};

export function FiscalModelCatalogView({
  result,
  pages,
  calendarContext,
  officialContents,
}: {
  result: Extract<
    PublicAeatModelReviewSearchResultV2,
    { status: "REVIEW_ONLY" }
  >;
  pages: readonly PublicAeatModelReviewPageV1[];
  calendarContext: PublicAeatModelCalendarDetailContextResultV1;
  officialContents: readonly PublicAeatOfficialModelContentV1[];
}) {
  const initialVisibleIds = new Set(
    result.data.slice(0, 30).map((page) => page.catalogCardId),
  );
  const calendarNavigation =
    calendarContext.status === "FROM_CALENDAR" ? calendarContext.data : null;
  const focusedCardId = calendarNavigation?.catalogCardId ?? null;
  const officialContentByCode = new Map(
    officialContents.map((content) => [content.code, content] as const),
  );
  const searchEntries = pages.map((page) =>
    (() => {
      const content = officialContentByCode.get(page.code);
      return createPublicAeatModelSearchEntryWithTermsV2(
        page,
        content
          ? [
              ...content.searchTerms,
              ...(practicalCatalogLabels[page.code] ?? []),
              content.canonicalName,
              content.summary,
              practicalCatalogSummaries[page.code] ?? "",
              ...content.sections.flatMap((section) => [
                section.title,
                ...section.items.flatMap((item) => [item.heading, item.text]),
              ]),
              ...content.faq.flatMap((item) => [item.question, item.answer]),
            ]
          : [],
      );
    })(),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-slate-900 dark:text-slate-100">
      <header className="mb-6 min-w-0">
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl dark:text-slate-100">
          Modelos AEAT
        </h1>
        <p className="mt-1 break-words text-base text-slate-600 dark:text-slate-300">
          Consulta fichas informativas basadas en fuentes oficiales de la AEAT y
          el BOE.
        </p>
      </header>

      <FiscalModelCatalogBrowser
        entries={searchEntries}
        initialQuery={result.query ?? ""}
        focusedCardId={focusedCardId}
      >
        <section aria-labelledby="catalogo-modelos-title" className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpenCheck
              className="h-5 w-5 text-blue-700 dark:text-blue-300"
              aria-hidden="true"
            />
            <h2
              id="catalogo-modelos-title"
              className="text-xl font-bold text-slate-950 dark:text-slate-100"
            >
              Fichas registradas
            </h2>
          </div>

          <Card
            id="modelos-aeat-sin-resultados"
            className="dark:border-slate-700 dark:bg-slate-900"
            hidden={result.total !== 0}
          >
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              No encontramos fichas que coincidan con esta vista o búsqueda.
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {
                "Prueba con un código, un impuesto o una palabra del nombre oficial."
              }
            </p>
          </Card>

          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const fromCalendar = page.catalogCardId === focusedCardId;
              const detailHref = fromCalendar
                ? calendarNavigation!.detailHref
                : page.href;
              const officialContent =
                officialContentByCode.get(page.code) ?? null;
              const historical =
                page.lifecycleStatus === "HISTORICAL" ||
                officialContent?.lifecycleStatus === "HISTORICAL";
              const practicalLabels = practicalCatalogLabels[page.code] ?? [];
              return (
                <Card
                  key={page.code}
                  id={page.catalogCardId}
                  data-fiscal-model-card="true"
                  data-fiscal-model-code={page.code}
                  tabIndex={fromCalendar ? -1 : undefined}
                  hidden={!initialVisibleIds.has(page.catalogCardId)}
                  className={`flex min-w-0 scroll-mt-6 flex-col dark:border-slate-700 dark:bg-slate-900 ${
                    historical
                      ? "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FiscalModelManualSelectionAction modelCode={page.code} />
                      <span className="rounded-xl bg-blue-100 px-3 py-1.5 font-mono text-lg font-black text-blue-900 dark:bg-blue-950 dark:text-blue-100">
                        {page.code}
                      </span>
                    </div>
                    {(historical || !officialContent) && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          historical
                            ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                        }`}
                      >
                        {historical && (
                          <History className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        {historical
                          ? "Histórico · no vigente"
                          : "Revisión pendiente"}
                      </span>
                    )}
                  </div>
                  <div
                    className={`mt-4 min-w-0 ${officialContent ? "grid items-start grid-cols-[5.5rem_minmax(0,1fr)] gap-3" : ""}`}
                  >
                    {officialContent && (
                      <FiscalModelOfficialVisual
                        content={officialContent}
                        variant="catalog"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-slate-950 dark:text-slate-100">
                        {getFiscalModelDocumentTitle(page.code)}
                      </h3>
                      <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                        {practicalCatalogTitles[page.code] ??
                          officialContent?.canonicalName ??
                          page.canonicalName}
                      </p>
                      {officialContent && practicalLabels.length > 0 ? (
                        <>
                          <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {practicalCatalogSummaries[page.code] ??
                              officialContent.summary}
                          </p>
                          <ul
                            className="mt-3 flex flex-wrap gap-2"
                            aria-label={`Características de ${getFiscalModelDocumentTitle(page.code)}`}
                          >
                            {practicalLabels.map((label) => (
                              <li
                                key={label}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              >
                                {label}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-1" />
                  {fromCalendar && (
                    <Link
                      href={calendarNavigation!.returnHref}
                      className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 font-semibold text-blue-800 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Volver al Calendario
                    </Link>
                  )}
                  <Link
                    href={detailHref}
                    className={`mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 text-center font-semibold text-blue-800 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-blue-950 ${focusRing}`}
                  >
                    Ver ficha
                    <span className="sr-only">
                      {" "}
                      de {getFiscalModelDocumentTitle(page.code)}
                    </span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Card>
              );
            })}
          </div>
        </section>

      </FiscalModelCatalogBrowser>

      <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
        La cobertura se limita a las fichas que aparecen en este catálogo. La
        ausencia de un código no implica una conclusión sobre su existencia,
        vigencia o aplicación fiscal.
      </p>
    </div>
  );
}
