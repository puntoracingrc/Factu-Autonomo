#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SUITE_ROOT = path.join(
  REPO_ROOT,
  "test/fixtures/invoices/synthetic/adversarial",
);
const PDF_DIR = path.join(SUITE_ROOT, "pdf");
const GROUND_TRUTH_DIR = path.join(SUITE_ROOT, "ground_truth");
const BASE_FIXTURE_COUNT = 150;

const suppliers = [
  ["Talleres Norte Demo SL", "B10000001"],
  ["Persianas Sinteticas Levante SL", "B10000002"],
  ["Materiales Ficticios Centro CB", "E10000003"],
  ["Servicios Demo Sur SL", "B10000004"],
  ["Cristales de Prueba SA", "A10000005"],
];

const customers = [
  ["Autonomo Demo Uno", "12345678Z"],
  ["Cliente Ficticio Dos SL", "B20000002"],
  ["Prueba Instalaciones CB", "E20000003"],
  ["Consumidor Demo", "87654321X"],
];

const layouts = [
  {
    id: "adv_stil_columns",
    columns: ["Articulo", "Descripcion", "Cant.", "Ancho", "Alto", "M2/ML/UN", "Precio", "Dto. %", "Precio Neto", "IVA", "Importe"],
    showHead: "everyPage",
  },
  {
    id: "adv_quantity_first",
    columns: ["Ctdad.", "Codigo", "Descripcion", "M2/ML/UN", "Ud", "P. Unit", "Dto", "Neto", "IVA %", "Total"],
    showHead: "everyPage",
  },
  {
    id: "adv_net_before_price",
    columns: ["Ref.", "Detalle", "M2/ML/UN", "Precio Neto", "Precio", "Descuento", "IVA", "Importe linea"],
    showHead: "firstPage",
  },
  {
    id: "adv_ml_explicit",
    columns: ["SKU", "Producto", "Qty", "Largo", "M2/ML/UN", "Tarifa", "Dto. %", "Neto", "IVA", "Subtotal"],
    showHead: "everyPage",
  },
  {
    id: "adv_base_per_line",
    columns: ["Codigo", "Concepto", "Cant.", "Unid.", "Cantidad cobro", "Precio", "Dto. %", "Precio Neto", "Base", "Tipo IVA"],
    showHead: "everyPage",
  },
  {
    id: "adv_amount_before_discount",
    columns: ["Codigo", "Descripcion", "Uds.", "M2/ML/UN", "Importe", "Dto. %", "Precio", "IVA"],
    showHead: "everyPage",
  },
];

const productFamilies = [
  {
    title: "Persiana demo",
    main: "MAIN-PER",
    mainDescription: "Producto principal persiana autoblocante",
    components: [
      ["COMP-GUIA", "Guia lateral aluminio"],
      ["COMP-CAPS", "Capsula regulable"],
      ["COMP-SOP", "Soporte con rodamiento"],
      ["COMP-EJE", "Eje metalico octogonal"],
    ],
  },
  {
    title: "Ventana demo",
    main: "MAIN-VEN",
    mainDescription: "Producto principal ventana practicable",
    components: [
      ["COMP-MARCO", "Marco perimetral aluminio"],
      ["COMP-CRISTAL", "Cristal camara bajo emisivo"],
      ["COMP-HERR", "Herraje oscilobatiente"],
      ["SERV-INST", "Instalacion y sellado"],
    ],
  },
  {
    title: "Puerta demo",
    main: "MAIN-PUE",
    mainDescription: "Producto principal puerta corredera",
    components: [
      ["COMP-HOJA", "Hoja aluminio reforzada"],
      ["COMP-GUIA", "Guia superior e inferior"],
      ["COMP-MOTOR", "Motor tubular con mando"],
      ["SERV-INST", "Mano de obra instalacion"],
    ],
  },
  {
    title: "Toldo demo",
    main: "MAIN-TOL",
    mainDescription: "Producto principal toldo cofre",
    components: [
      ["COMP-LONA", "Lona acrilica color demo"],
      ["COMP-BRAZO", "Brazos extensibles"],
      ["COMP-MOTOR", "Motor y automatismo"],
      ["COMP-SOP", "Soportes pared"],
    ],
  },
];

const declarandoInspiredVariants = [
  ["modelo_factura", ["modelo factura", "IVA 21"], ["estructura básica"]],
  ["con_iva", ["factura con IVA", "IVA 21"], ["desglose IVA"]],
  ["exenta_iva", ["factura exenta de IVA", "exenta"], ["nota exencion IVA"]],
  ["con_irpf", ["factura con IRPF", "IRPF"], ["retencion IRPF"]],
  ["iva_irpf", ["factura con IVA e IRPF", "IVA 21", "IRPF"], ["iva mas retencion"]],
  ["recargo_equivalencia", ["factura con recargo de equivalencia", "IVA 21", "recargo"], ["recargo equivalencia"]],
  ["autonomo_empresa", ["factura de autonomo a empresa", "IVA 21", "IRPF"], ["cliente empresa"]],
  ["particular", ["factura a particular", "IVA 21"], ["cliente particular"]],
  ["simplificada", ["factura simplificada", "IVA 21"], ["ticket simplificado"]],
  ["inversion_sujeto_pasivo", ["factura con inversion del sujeto pasivo", "exenta"], ["inversion sujeto pasivo"]],
  ["proforma", ["factura proforma", "IVA 21"], ["proforma no fiscal"]],
  ["anticipo", ["factura de anticipo", "IVA 21", "anticipos"], ["anticipo pagado"]],
  ["recapitulativa", ["factura recapitulativa", "IVA 21", "IVA 10"], ["varias operaciones"]],
  ["abono", ["factura de abono", "rectificativa"], ["importe negativo"]],
  ["rectificativa", ["factura rectificativa", "rectificativa"], ["rectifica factura previa"]],
  ["descuento_pronto_pago", ["factura con descuento", "IVA 21", "descuento global"], ["descuento pronto pago"]],
  ["rappel_descuento", ["factura con rappel", "IVA 21", "descuento global"], ["rappel comercial"]],
  ["suplidos", ["factura con suplidos", "IVA 21", "suplidos"], ["suplido no sujeto"]],
  ["intracomunitaria", ["factura intracomunitaria", "exenta", "intracomunitaria"], ["NIF IVA UE"]],
  ["internacional", ["factura internacional", "exenta", "exportacion"], ["cliente fuera UE"]],
  ["ingles", ["factura en ingles", "IVA 21"], ["labels ingleses"]],
  ["emitida_destinatario", ["factura emitida por destinatario", "IVA 21"], ["self billing"]],
  ["electronica", ["factura electronica", "IVA 21", "Facturae"], ["firma electronica"]],
];

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(Number(value) * factor) / factor;
}

function money(value, variant = 0) {
  const numeric = round(value);
  const abs = Math.abs(numeric);
  const fixed = abs.toFixed(2);
  if (numeric < 0 && variant % 5 === 0) {
    return `(${fixed.replace(".", ",")})`;
  }
  const sign = numeric < 0 ? "-" : "";
  if (variant % 7 === 0) return `${sign}${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
  if (variant % 11 === 0) return `${sign}${fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  const [euros, cents] = fixed.split(".");
  const grouped = euros.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${grouped},${cents}`;
}

function quantity(value, variant = 0) {
  const decimals = Math.abs(value % 1) > 0 ? 2 : 0;
  const fixed = round(value, decimals).toFixed(decimals);
  return variant % 2 === 0 ? fixed.replace(".", ",") : fixed;
}

function netPrice(unitPrice, discountPct) {
  return round(unitPrice * (1 - discountPct / 100));
}

function formulaForBasis(basis) {
  if (basis === "m2") return "m2 * netPrice";
  if (basis === "ml") return "ml * netPrice";
  if (basis === "kg") return "kg * netPrice";
  if (basis === "hour") return "hours * netPrice";
  if (basis === "fixed") return "fixed";
  if (basis === "mixed") return "mixed rule";
  return "units * netPrice";
}

function makeLine(input) {
  const discountPct = input.discountPct ?? 0;
  const netUnitPrice =
    input.netUnitPrice ?? (input.unitPrice !== undefined ? netPrice(input.unitPrice, discountPct) : undefined);
  const amount =
    input.amount ??
    (input.calculationBasis === "fixed"
      ? input.fixedAmount
      : round((input.chargeQuantity ?? input.quantity ?? 1) * (netUnitPrice ?? 0)));
  return {
    id: input.id,
    articleCode: input.articleCode,
    description: input.description,
    lineType: input.lineType,
    roleInGroup: input.roleInGroup,
    productGroupId: input.productGroupId,
    quantity: input.quantity,
    sourceQuantity: input.quantity,
    chargeQuantity: input.chargeQuantity ?? input.quantity ?? 1,
    calculationBasis: input.calculationBasis ?? "unit",
    width: input.width,
    height: input.height,
    length: input.length,
    unit: input.unit,
    unitPrice: input.unitPrice,
    discountPct,
    netUnitPrice,
    amount: round(amount),
    vatRate: input.vatRate ?? 21,
    expectedFormula: input.expectedFormula ?? formulaForBasis(input.calculationBasis ?? "unit"),
    calculationDifference: 0,
    tolerance: 0.01,
    reason: input.reason ?? "Deterministic fixture.",
    confidence: 0.94,
    warnings: input.warnings ?? [],
  };
}

function buildLines(index) {
  const family = productFamilies[index % productFamilies.length];
  const groupCount = (index + 1) % 5 === 0 ? 16 : 1;
  const lines = [];
  const groups = [];
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const groupId = `G${groupIndex + 1}`;
    const width = index % 3 === 0 ? 230.2 + groupIndex * 12 : 2350 + groupIndex * 80;
    const height = index % 3 === 0 ? 256.0 + groupIndex * 8 : 2510 + groupIndex * 60;
    const basisM2 = round((width / (index % 3 === 0 ? 100 : 1000)) * (height / (index % 3 === 0 ? 100 : 1000)) + (index % 4) * 0.03);
    const chargeM2 = index % 10 === 0 ? Math.max(1.5, basisM2) : index % 6 === 0 ? Math.max(1, basisM2) : basisM2;
    const mainId = `L${lines.length + 1}`;
    const main = makeLine({
      id: mainId,
      articleCode: `${family.main}-${index + 1}-${groupIndex + 1}`,
      description: `${family.mainDescription} medida especial con texto largo de prueba`,
      lineType: "producto principal",
      roleInGroup: "main_product",
      productGroupId: groupId,
      quantity: 1,
      chargeQuantity: chargeM2,
      calculationBasis: "m2",
      width,
      height,
      unit: "m2",
      unitPrice: 120 + (index % 9) * 7,
      discountPct: index % 4 === 0 ? 25 : 0,
      vatRate: [21, 10, 4][index % 3],
      reason: "La columna M2 explicita manda sobre ancho*alto.",
    });
    lines.push(main);

    const guideLength = round((height / (index % 3 === 0 ? 100 : 1000)) * 2 + 0.08);
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `${family.components[0][0]}-${index + 1}-${groupIndex + 1}`,
        description: family.components[0][1],
        lineType: "componente",
        roleInGroup: "component",
        productGroupId: groupId,
        quantity: 2,
        chargeQuantity: guideLength,
        calculationBasis: "ml",
        height,
        unit: "ML",
        unitPrice: 4.2 + (index % 5) * 0.4,
        discountPct: index % 3 === 0 ? 25 : 0,
        vatRate: main.vatRate,
        reason: "Cantidad fisica distinta de metros cobrados.",
      }),
    );
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `${family.components[1][0]}-${index + 1}-${groupIndex + 1}`,
        description: family.components[1][1],
        lineType: "componente",
        roleInGroup: "component",
        productGroupId: groupId,
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "unit",
        unit: "Ud",
        unitPrice: 8 + (index % 6),
        discountPct: 0,
        vatRate: main.vatRate,
      }),
    );
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `${family.components[2][0]}-${index + 1}-${groupIndex + 1}`,
        description: family.components[2][1],
        lineType: family.components[2][0].startsWith("SERV") ? "servicio" : "componente",
        roleInGroup: family.components[2][0].startsWith("SERV") ? "service" : "component",
        productGroupId: groupId,
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "unit",
        unit: "UN",
        unitPrice: 14 + (index % 4) * 3,
        discountPct: index % 7 === 0 ? 0.25 : 0,
        vatRate: main.vatRate,
      }),
    );
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `${family.components[3][0]}-${index + 1}-${groupIndex + 1}`,
        description: family.components[3][1],
        lineType: family.components[3][0].startsWith("SERV") ? "servicio" : "componente",
        roleInGroup: family.components[3][0].startsWith("SERV") ? "service" : "component",
        productGroupId: groupId,
        quantity: family.components[3][0].startsWith("SERV") ? 2.5 : 1,
        chargeQuantity: family.components[3][0].startsWith("SERV") ? 2.5 : round(height / (index % 3 === 0 ? 100 : 1000), 2),
        calculationBasis: family.components[3][0].startsWith("SERV") ? "hour" : "ml",
        length: height,
        unit: family.components[3][0].startsWith("SERV") ? "horas" : "ML",
        unitPrice: family.components[3][0].startsWith("SERV") ? 32 : 7.5,
        discountPct: 0,
        vatRate: main.vatRate,
      }),
    );
    const groupLines = lines.filter((line) => line.productGroupId === groupId);
    groups.push({
      id: groupId,
      title: `${family.title} ${groupIndex + 1}`,
      mainLineId: mainId,
      componentLineIds: groupLines.filter((line) => line.id !== mainId && line.roleInGroup !== "comment").map((line) => line.id),
      totalAmount: round(groupLines.reduce((sum, line) => sum + line.amount, 0)),
      calculationSummary: "principal + componentes",
      confidence: 0.92,
    });
  }

  if (index % 4 === 0) {
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `SHIP-${index + 1}`,
        description: "Portes y desplazamiento",
        lineType: "transporte",
        roleInGroup: "transport",
        productGroupId: groups.at(-1)?.id,
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "fixed",
        unit: "fijo",
        amount: 18 + (index % 5) * 3,
        vatRate: 21,
      }),
    );
    groups.at(-1).componentLineIds.push(lines.at(-1).id);
    groups.at(-1).totalAmount = round(groups.at(-1).totalAmount + lines.at(-1).amount);
  }
  if (index % 6 === 0) {
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `DISC-${index + 1}`,
        description: "Descuento comercial aplicado",
        lineType: "descuento",
        roleInGroup: "discount",
        productGroupId: groups.at(-1)?.id,
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "fixed",
        unit: "fijo",
        amount: -12.5,
        vatRate: 21,
      }),
    );
    groups.at(-1).componentLineIds.push(lines.at(-1).id);
    groups.at(-1).totalAmount = round(groups.at(-1).totalAmount + lines.at(-1).amount);
  }
  if (index % 9 === 0) {
    lines.push(
      makeLine({
        id: `L${lines.length + 1}`,
        articleCode: `INFO-${index + 1}`,
        description: "Linea informativa sin cargo",
        lineType: "comentario/no facturable",
        roleInGroup: "comment",
        quantity: 0,
        chargeQuantity: 0,
        calculationBasis: "unit",
        unit: "Ud",
        unitPrice: 0,
        amount: 0,
        vatRate: 0,
      }),
    );
  }
  return { lines, groups };
}

function fiscalFor(index, lines) {
  const taxBase = round(lines.reduce((sum, line) => sum + line.amount, 0));
  const vatTotal = round(lines.reduce((sum, line) => sum + (line.amount * (line.vatRate ?? 0)) / 100, 0));
  const irpfAmount = index % 13 === 0 ? round(taxBase * 0.15) : index % 17 === 0 ? round(taxBase * 0.07) : 0;
  const recargoAmount = index % 11 === 0 ? round(taxBase * 0.052) : 0;
  const paidAmount = index % 8 === 0 ? round(taxBase + vatTotal + recargoAmount - irpfAmount) : 0;
  const total = round(taxBase + vatTotal + recargoAmount - irpfAmount);
  const dueAmount = round(total - paidAmount);
  return {
    taxable_base: taxBase,
    vat_total: vatTotal,
    irpf_amount: irpfAmount,
    recargo_amount: recargoAmount,
    global_discount_amount: lines.some((line) => line.roleInGroup === "discount") ? 12.5 : 0,
    total,
    paid_amount: paidAmount,
    advance_paid: paidAmount,
    due_amount: dueAmount,
    gross_amount: round(lines.reduce((sum, line) => sum + Math.max(0, line.amount), 0)),
  };
}

function fiscalCases(index, totals, lines) {
  const cases = new Set();
  for (const line of lines) {
    if (line.vatRate === 21) cases.add("IVA 21");
    if (line.vatRate === 10) cases.add("IVA 10");
    if (line.vatRate === 4) cases.add("IVA 4");
    if (line.vatRate === 0) cases.add("exenta");
  }
  if (totals.irpf_amount > 0) cases.add("IRPF");
  if (totals.recargo_amount > 0) cases.add("recargo");
  if (totals.global_discount_amount > 0) cases.add("descuento global");
  if (totals.paid_amount > 0) cases.add("anticipos");
  if (index % 19 === 0) cases.add("intracomunitaria");
  if (index % 23 === 0) cases.add("rectificativa");
  if (index % 7 === 0) cases.add("suplidos");
  return [...cases];
}

function adversarialCases(index, layout) {
  const cases = new Set([
    "columnas_cambiadas",
    "calculo_m2_ml_unidad",
    "formatos_numericos",
    "producto_con_componentes",
  ]);
  if (index % 5 === 0) cases.add("multipage_table");
  if (layout.showHead === "firstPage") cases.add("cabecera_no_repetida");
  if (layout.showHead === "everyPage") cases.add("cabecera_repetida");
  if (index % 2 === 0) cases.add("descripcion_larga");
  if (index % 3 === 0) cases.add("ancho_alto_cm");
  if (index % 4 === 0) cases.add("totales_enganosos");
  if (index % 6 === 0) cases.add("linea_negativa");
  if (index % 9 === 0) cases.add("linea_importe_cero");
  return [...cases];
}

function lineToRow(line, columns, variant) {
  const values = {
    articulo: line.articleCode,
    codigo: line.articleCode,
    "ref.": line.articleCode,
    sku: line.articleCode,
    descripcion: line.description,
    detalle: line.description,
    producto: line.description,
    concepto: line.description,
    "cant.": quantity(line.quantity, variant),
    ctdad: quantity(line.quantity, variant),
    "ctdad.": quantity(line.quantity, variant),
    qty: quantity(line.quantity, variant),
    cantidad: quantity(line.quantity, variant),
    uds: quantity(line.quantity, variant),
    "uds.": quantity(line.quantity, variant),
    ud: line.unit,
    unid: line.unit,
    "unid.": line.unit,
    "m2/ml/un": `${quantity(line.chargeQuantity, variant)} ${line.calculationBasis.toUpperCase()}`,
    m2: line.calculationBasis === "m2" ? quantity(line.chargeQuantity, variant) : "",
    ml: line.calculationBasis === "ml" ? quantity(line.chargeQuantity, variant) : "",
    "cantidad cobro": `${quantity(line.chargeQuantity, variant)} ${line.calculationBasis.toUpperCase()}`,
    ancho: line.width === undefined ? "" : quantity(line.width, variant),
    alto: line.height === undefined ? "" : quantity(line.height, variant),
    largo: line.length === undefined ? "" : quantity(line.length, variant),
    precio: line.unitPrice === undefined ? "" : money(line.unitPrice, variant),
    "p. unit": line.unitPrice === undefined ? "" : money(line.unitPrice, variant),
    tarifa: line.unitPrice === undefined ? "" : money(line.unitPrice, variant),
    "dto. %": line.discountPct ? `${quantity(line.discountPct, variant)}%` : "",
    dto: line.discountPct ? quantity(line.discountPct, variant) : "",
    descuento: line.discountPct ? quantity(line.discountPct, variant) : "",
    "precio neto": line.netUnitPrice === undefined ? "" : money(line.netUnitPrice, variant),
    neto: line.netUnitPrice === undefined ? "" : money(line.netUnitPrice, variant),
    iva: `${quantity(line.vatRate, variant)}%`,
    "iva %": `${quantity(line.vatRate, variant)}%`,
    "tipo iva": `${quantity(line.vatRate, variant)}%`,
    importe: money(line.amount, variant),
    total: money(line.amount, variant),
    subtotal: money(line.amount, variant),
    "importe linea": money(line.amount, variant),
    base: money(line.amount, variant),
  };
  return columns.map((column) => {
    const value = values[column.toLowerCase()] ?? values[column.toLowerCase().replace(/\.$/, "")];
    return value === undefined || value === "" ? "-" : value;
  });
}

function writePdf(fixture, layout, rows) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const supplier = fixture.supplier;
  const customer = fixture.customer;
  doc.setFontSize(10);
  doc.text("SINTETICA - SIN VALIDEZ FISCAL - DATOS FICTICIOS", 40, 34);
  doc.text(`${supplier.name}`, 40, 52);
  doc.text(`NIF/CIF: ${supplier.tax_id} | FACTURA`, 40, 68);
  doc.text(`Factura: | ${fixture.invoice_number}`, 40, 84);
  doc.text(`Fecha: ${fixture.date}`, 40, 100);
  doc.text(`Cliente / | ${customer.name} | NIF/CIF: ${customer.tax_id} | Calle Demo 12`, 40, 116);
  doc.text(`Layout | ${layout.id}`, 40, 132);
  doc.setFontSize(7);
  let y = 152;
  const header = layout.columns.join(" | ");
  doc.text(header, 40, y);
  y += 12;
  for (const row of rows) {
    if (y > 520) {
      doc.setFontSize(8);
      doc.text("Suma y sigue - no es total factura", 40, 560);
      doc.addPage();
      doc.setFontSize(7);
      y = 42;
      if (layout.showHead === "everyPage") {
        doc.text(header, 40, y);
        y += 12;
      }
    }
    doc.text(row.join(" | "), 40, y);
    y += 12;
  }
  y += 16;
  if (y > 500) {
    doc.addPage();
    y = 50;
  }
  const totals = fixture.totals;
  const totalRows = [
    ["Base imponible", totals.taxable_base],
    ["IVA", totals.vat_total],
    ["Recargo", totals.recargo_amount],
    ["IRPF", totals.irpf_amount ? -totals.irpf_amount : 0],
    ["Descuento global", totals.global_discount_amount],
    ["Anticipo pagado", totals.paid_amount],
    ["Total pendiente", totals.due_amount],
    ["TOTAL FACTURA", totals.total],
  ];
  for (const [label, value] of totalRows) {
    doc.text(`${label} | ${money(value, fixture.index)}`, 360, y);
    y += 14;
  }
  doc.save(path.join(PDF_DIR, fixture.pdfName));
}

function buildFixture(index) {
  const layout = layouts[index % layouts.length];
  const supplier = suppliers[index % suppliers.length];
  const customer = customers[index % customers.length];
  const { lines, groups } = buildLines(index);
  if ((index + 1) % 23 === 0) {
    for (const line of lines) {
      line.amount = round(-Math.abs(line.amount));
    }
    for (const group of groups) {
      group.totalAmount = round(
        lines
          .filter((line) => line.productGroupId === group.id && line.roleInGroup !== "comment")
          .reduce((sum, line) => sum + line.amount, 0),
      );
    }
  }
  const totals = fiscalFor(index, lines);
  const invoiceId = `synthetic_adv_${String(index + 1).padStart(4, "0")}`;
  const rows = lines.map((line) => lineToRow(line, layout.columns, index));
  if (index % 2 === 0) {
    rows.splice(1, 0, ["Observacion: texto comercial dentro de tabla, no facturable"]);
  }
  const pdfName = `${invoiceId}_${layout.id}.pdf`;
  const jsonName = `${invoiceId}_${layout.id}.json`;
  const fixture = {
    engine_contract_version: 1,
    invoice_id: invoiceId,
    document_title: "FACTURA",
    layout_id: layout.id,
    invoice_number: `ADV-${String(2026)}-${String(index + 1).padStart(4, "0")}`,
    date: `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 27) + 1).padStart(2, "0")}`,
    privacy: "Datos 100% ficticios. No contiene PDFs reales ni datos reales.",
    synthetic_notice: "SINTETICA - SIN VALIDEZ FISCAL - DATOS FICTICIOS",
    supplier: { name: supplier[0], tax_id: supplier[1] },
    customer: { name: customer[0], tax_id: customer[1] },
    table_columns: layout.columns,
    totals,
    lines,
    informational_lines: index % 2 === 0 ? [{ text: "Observacion: texto comercial dentro de tabla, no facturable", reason: "No es linea facturable." }] : [],
    product_groups: groups,
    coverage: {
      adversarialCases: adversarialCases(index, layout),
      fiscalCases: fiscalCases(index, totals, lines),
      productGrouping: groups.some((group) => group.componentLineIds.length) ? "grupos con componentes" : "grupos simples",
    },
  };
  writePdf({ ...fixture, index, pdfName }, layout, rows);
  fs.writeFileSync(path.join(GROUND_TRUTH_DIR, jsonName), `${JSON.stringify(fixture, null, 2)}\n`);
  return {
    invoice_id: invoiceId,
    pdf: `pdf/${pdfName}`,
    ground_truth: `ground_truth/${jsonName}`,
    layout_id: layout.id,
    adversarial_cases: fixture.coverage.adversarialCases,
    fiscal_cases: fixture.coverage.fiscalCases,
    total: totals.total,
  };
}

function buildDeclarandoInspiredFixture(variant, offset) {
  const [slug, fiscalCaseLabels, layoutCaseLabels] = variant;
  const index = BASE_FIXTURE_COUNT + offset;
  const layout = layouts[(offset + 4) % layouts.length];
  const supplier = suppliers[offset % suppliers.length];
  const customer = customers[(offset + 1) % customers.length];
  const baseVatRate =
    fiscalCaseLabels.includes("exenta") || fiscalCaseLabels.includes("rectificativa")
      ? 0
      : fiscalCaseLabels.includes("IVA 10")
        ? 10
        : 21;
  const negative = ["abono", "rectificativa"].includes(slug);
  const discount = ["descuento_pronto_pago", "rappel_descuento"].includes(slug) ? 10 : 0;
  const lines = [
    makeLine({
      id: "L1",
      articleCode: `DECL-${String(offset + 1).padStart(2, "0")}-SERV`,
      description: `Servicio ficticio ${slug.replace(/_/g, " ")}`,
      lineType: "servicio",
      roleInGroup: "service",
      quantity: 2,
      chargeQuantity: 2,
      calculationBasis: "hour",
      unit: "horas",
      unitPrice: 125 + offset * 3,
      discountPct: discount,
      vatRate: baseVatRate,
      reason: "Caso sintético español inspirado en variantes públicas, sin copiar datos reales.",
    }),
    makeLine({
      id: "L2",
      articleCode: `DECL-${String(offset + 1).padStart(2, "0")}-MAT`,
      description: `Material ficticio ${slug.replace(/_/g, " ")}`,
      lineType: "material",
      roleInGroup: "material",
      quantity: slug === "simplificada" ? 1 : 3,
      chargeQuantity: slug === "simplificada" ? 1 : 3,
      calculationBasis: "unit",
      unit: "Ud",
      unitPrice: 48 + offset,
      discountPct: 0,
      vatRate: baseVatRate,
    }),
  ];

  if (slug === "recapitulativa") {
    lines.push(
      makeLine({
        id: "L3",
        articleCode: "DECL-RECAP-10",
        description: "Operacion ficticia con IVA reducido",
        lineType: "material",
        roleInGroup: "material",
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "unit",
        unit: "Ud",
        unitPrice: 80,
        vatRate: 10,
      }),
    );
  }

  if (slug === "suplidos") {
    lines.push(
      makeLine({
        id: "L3",
        articleCode: "DECL-SUPLIDO",
        description: "Suplido ficticio no sujeto a IVA",
        lineType: "suplido",
        roleInGroup: "material",
        quantity: 1,
        chargeQuantity: 1,
        calculationBasis: "fixed",
        unit: "fijo",
        amount: 35,
        vatRate: 0,
        reason: "Suplido separado para no confundirlo con base de IVA.",
      }),
    );
  }

  if (negative) {
    for (const line of lines) {
      line.amount = round(-Math.abs(line.amount));
    }
  }

  const taxBase = round(lines.reduce((sum, line) => sum + line.amount, 0));
  const vatTotal = round(lines.reduce((sum, line) => sum + (line.amount * (line.vatRate ?? 0)) / 100, 0));
  const irpfAmount = fiscalCaseLabels.includes("IRPF") ? round(taxBase * 0.15) : 0;
  const recargoAmount = fiscalCaseLabels.includes("recargo") ? round(taxBase * 0.052) : 0;
  const paidAmount = fiscalCaseLabels.includes("anticipos")
    ? round(taxBase + vatTotal + recargoAmount - irpfAmount)
    : 0;
  const total = round(taxBase + vatTotal + recargoAmount - irpfAmount);
  const totals = {
    taxable_base: taxBase,
    vat_total: vatTotal,
    irpf_amount: irpfAmount,
    recargo_amount: recargoAmount,
    global_discount_amount: discount ? round(lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * (line.quantity ?? 1) * discount / 100, 0)) : 0,
    total,
    paid_amount: paidAmount,
    advance_paid: paidAmount,
    due_amount: round(total - paidAmount),
    gross_amount: round(lines.reduce((sum, line) => sum + Math.max(0, line.amount), 0)),
  };
  const invoiceId = `synthetic_adv_decl_${String(offset + 1).padStart(2, "0")}_${slug}`;
  const rows = lines.map((line) => lineToRow(line, layout.columns, index));
  rows.unshift([`Nota: variante española sintética ${slug.replace(/_/g, " ")}, sin datos reales`]);
  const pdfName = `${invoiceId}_${layout.id}.pdf`;
  const jsonName = `${invoiceId}_${layout.id}.json`;
  const fixture = {
    engine_contract_version: 1,
    invoice_id: invoiceId,
    document_title: slug === "proforma" ? "FACTURA PROFORMA" : negative ? "FACTURA RECTIFICATIVA" : "FACTURA",
    layout_id: layout.id,
    invoice_number: `DECL-SYN-${String(offset + 1).padStart(3, "0")}`,
    date: `2026-${String((offset % 12) + 1).padStart(2, "0")}-${String((offset % 24) + 1).padStart(2, "0")}`,
    privacy: "Datos 100% ficticios. Inspirado en variantes fiscales españolas públicas sin copiar facturas reales.",
    synthetic_notice: "SINTETICA - SIN VALIDEZ FISCAL - DATOS FICTICIOS",
    inspiration: {
      source: "Declarando ejemplos de facturas",
      copiedRealData: false,
      derivedPatternOnly: true,
      variant: slug,
    },
    supplier: { name: supplier[0], tax_id: supplier[1] },
    customer: { name: customer[0], tax_id: customer[1] },
    table_columns: layout.columns,
    totals,
    lines,
    informational_lines: [
      {
        text: `Variante sintética ${slug.replace(/_/g, " ")}`,
        reason: "Etiqueta de cobertura, no linea facturable.",
      },
    ],
    product_groups: [],
    coverage: {
      adversarialCases: [
        "declarando_spanish_variant",
        "variantes_fiscales_espanolas",
        ...layoutCaseLabels,
      ],
      fiscalCases: fiscalCaseLabels,
      productGrouping: "sin grupos",
    },
  };
  writePdf({ ...fixture, index, pdfName }, layout, rows);
  fs.writeFileSync(path.join(GROUND_TRUTH_DIR, jsonName), `${JSON.stringify(fixture, null, 2)}\n`);
  return {
    invoice_id: invoiceId,
    pdf: `pdf/${pdfName}`,
    ground_truth: `ground_truth/${jsonName}`,
    layout_id: layout.id,
    adversarial_cases: fixture.coverage.adversarialCases,
    fiscal_cases: fixture.coverage.fiscalCases,
    total: totals.total,
  };
}

function writeReadme() {
  fs.writeFileSync(
    path.join(SUITE_ROOT, "README.md"),
    `# Synthetic Adversarial Invoice Fixtures

This suite contains generated, fully fictitious Spanish invoice PDFs and JSON ground truth files for hardening the deterministic invoice engine.

- No real invoices or real customer data are stored here.
- Regenerate with \`npm run fixtures:invoices:generate-adversarial\`.
- Validate structure with \`npm run fixtures:invoices:validate\`.
- Run the full benchmark with \`npm run benchmark:invoices\`.

The fixtures exercise multipage tables, repeated and missing headers, wrapped descriptions, changed columns, explicit M2/ML/UN charge quantities, line discounts, Spanish tax cases, misleading totals, and product groups with components.

The latest generator also includes synthetic Spanish fiscal variants inspired by public example categories, without copying source invoices or real data.

The expected JSON is generated from the fixture source of truth before the PDF is rendered. Do not edit ground truth to hide parser failures.
`,
  );
}

fs.rmSync(SUITE_ROOT, { recursive: true, force: true });
fs.mkdirSync(PDF_DIR, { recursive: true });
fs.mkdirSync(GROUND_TRUTH_DIR, { recursive: true });
writeReadme();

const files = [];
for (let index = 0; index < BASE_FIXTURE_COUNT; index += 1) {
  files.push(buildFixture(index));
}
for (const [offset, variant] of declarandoInspiredVariants.entries()) {
  files.push(buildDeclarandoInspiredFixture(variant, offset));
}

const manifest = {
  created_at: "2026-07-07",
  generator_seed: 20260707,
  count: files.length,
  description: "Facturas sinteticas adversariales para romper el invoice engine determinista antes que clientes reales. Incluye variantes fiscales espanolas inspiradas en ejemplos publicos, sin copiar datos reales.",
  privacy: "No contiene facturas reales ni datos reales.",
  files,
};
fs.writeFileSync(path.join(SUITE_ROOT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${files.length} adversarial invoice fixtures in ${SUITE_ROOT}`);
