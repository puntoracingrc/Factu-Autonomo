import type { ManualSection } from "../types";

export const proveedoresSection: ManualSection = {
  slug: "proveedores",
  title: "Proveedores",
  summary: "Centraliza a quienes les compras y evita duplicados.",
  order: 9,
  steps: [
    {
      title: "1. Dar de alta un proveedor",
      paragraphs: [
        "En **Proveedores** pulsa **Nuevo proveedor**. Se abrirá una pantalla propia para guardar nombre, NIF, teléfono, web y dirección; al guardar o cancelar volverás al listado.",
        "Para la dirección, elige el **tipo de vía** y escribe solo el **nombre de la calle y el número** — sin C/, Avda. ni similares.",
        "Usa el **buscador** para localizar un proveedor y el **ordenador** por nombre, volumen de compras o dirección.",
        "Al registrar o escanear un gasto, si aparece un proveedor nuevo la app puede añadirlo a Proveedores y usar su NIF en las exportaciones CSV.",
      ],
      screenshot: {
        src: "/ayuda/capturas/proveedores-nuevo.png",
        alt: "Alta de proveedor",
      },
    },
    {
      title: "2. Unificar duplicados",
      paragraphs: [
        "Si tienes el mismo proveedor repetido con nombres distintos, usa **Unificar manualmente**.",
        "Busca por nombre, NIF, teléfono o web, marca los proveedores repetidos y elige cuál conservar. Los gastos vinculados se moverán al proveedor conservado.",
      ],
      screenshot: {
        src: "/ayuda/capturas/proveedores-unificar.png",
        alt: "Unificación manual de proveedores",
      },
    },
  ],
};

export const configuracionSection: ManualSection = {
  slug: "configuracion",
  title: "Ajustes avanzados",
  summary: "Plantillas PDF, validez de presupuestos, numeración, Veri*Factu y cuenta.",
  order: 11,
  steps: [
    {
      title: "1. Moverse por Ajustes",
      paragraphs: [
        "La parte superior muestra accesos compactos a **Negocio**, **Documentos**, **Impuestos** y **Cuenta**.",
        "En **Cuenta** verás un bloque breve con **Abrir Cuenta**. La pantalla completa de cuenta, Drive e importación vive en **Cuenta**, no dentro de Ajustes.",
      ],
    },
    {
      title: "2. Frases, validez y formas de pago",
      paragraphs: [
        "En Ajustes puedes guardar **frases** y **formas de pago** que aparecerán como atajos al crear facturas, presupuestos y recibos.",
        "También puedes fijar los días de validez de tus presupuestos. La app usará ese valor automáticamente al crear uno nuevo.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-frases.png",
        alt: "Frases reutilizables en ajustes",
      },
    },
    {
      title: "3. Diseñador de plantillas PDF",
      paragraphs: [
        "Con plan **Pro** puedes abrir el **Diseñador de formularios** desde Ajustes para cambiar el estilo visual de facturas, presupuestos y recibos en una pantalla dedicada.",
        "Puedes elegir estilo, fuente profesional, tamaños de texto, color de marca, densidad de la tabla y algunos bloques visibles del PDF. Usa **Ver grande** para revisar una factura ficticia completa antes de guardar. La vista previa es orientativa: el PDF final conserva los datos fiscales, numeración, Veri*Factu, QR fiscal obligatorio y líneas reales.",
        "El QR tributario queda reservado al principio de la factura con el texto fiscal correspondiente; no se mueve como un elemento decorativo de la plantilla.",
        "El plan **Gratis** mantiene el diseño estándar y añade una firma discreta en gris al pie del PDF. En **Pro** esa firma no aparece en presupuestos, borradores y nuevos PDFs generados.",
      ],
    },
    {
      title: "4. Numeración de documentos",
      paragraphs: [
        "Revisa el formato de numeración (F-2026-0001, etc.) y el último número usado para evitar saltos o duplicados.",
        "Las facturas en borrador no consumen número definitivo. El número se fija al emitir.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-numeracion.png",
        alt: "Configuración de numeración",
      },
    },
    {
      title: "5. Veri*Factu",
      paragraphs: [
        "En **Impuestos** dentro de Ajustes está la tarjeta **Veri*Factu**.",
        "Puedes dejarlo desactivado hasta que corresponda. Si está apagado, no se registran facturas en Veri*Factu.",
        "La pantalla distingue entre **modo simulado**, preparación de envío a AEAT y falta de certificado. No guarda ni muestra claves privadas en esta tarjeta.",
        "El QR y la huella se aplican a facturas emitidas cuando la configuración lo permite; los borradores no se registran.",
      ],
    },
    {
      title: "6. Tus datos y copia de seguridad",
      paragraphs: [
        "La tarjeta **Tus datos** explica dónde viven tus facturas y gastos.",
        "Para exportar o importar copias JSON, entra en **Cuenta**. Si usas Drive, la copia extra también se configura allí.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-copia.png",
        alt: "Exportar copia de seguridad JSON",
      },
      tip: "Haz una exportación periódica aunque uses la nube: es tu red de seguridad.",
    },
  ],
};
