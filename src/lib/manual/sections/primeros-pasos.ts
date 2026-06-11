import type { ManualSection } from "../types";

export const primerosPasosSection: ManualSection = {
  slug: "primeros-pasos",
  title: "Primeros pasos",
  summary: "Configura tu negocio y entiende cómo moverte por la app.",
  order: 1,
  intro: [
    "Factura Autónomo está pensada para usarse desde el móvil o el ordenador sin complicaciones. En unos minutos puedes dejar lista la base para emitir facturas con tus datos.",
  ],
  steps: [
    {
      title: "1. Abre Ajustes y rellena tus datos",
      paragraphs: [
        "Ve a **Ajustes** (icono de engranaje en la barra inferior) y completa al menos tu **nombre** y **NIF/CIF**. Esos datos salen en el PDF de tus facturas.",
        "Si quieres, añade también dirección, teléfono, email e **IBAN**: el IBAN aparece en facturas pendientes de cobro y en los recordatorios de pago.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-datos-negocio.png",
        alt: "Formulario de datos del negocio en Ajustes",
        caption: "Tus datos de emisor en Ajustes.",
      },
      tip: "Hasta que no tengas nombre y NIF, en Inicio verás un aviso para ir a configuración.",
    },
    {
      title: "2. Revisa el IVA y el IRPF estimado",
      paragraphs: [
        "En Ajustes puedes indicar si estás **exento de repercutir IVA** y qué **tipos de IVA** usas habitualmente.",
        "El **% IRPF** es orientativo: sirve para calcular el resumen fiscal del trimestre, no sustituye el asesoramiento de tu gestor.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-iva-irpf.png",
        alt: "Opciones de IVA e IRPF en Ajustes",
      },
    },
    {
      title: "3. Aprende la barra de navegación",
      paragraphs: [
        "Abajo tienes acceso rápido a **Inicio**, **Clientes**, **Facturas**, **Presupuestos**, **Recibos**, **Gastos**, **Impuestos**, **Proveedores** y **Ajustes**.",
        "En móvil puedes deslizar la barra si no ves todos los iconos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/navegacion-inferior.png",
        alt: "Barra de navegación inferior de la aplicación",
        caption: "La barra inferior te lleva a cada sección principal.",
      },
    },
    {
      title: "4. (Opcional) Crea tu cuenta en la nube",
      paragraphs: [
        "Puedes usar la app solo en este dispositivo. Si creas **cuenta y nube**, tus datos se sincronizan entre móvil y PC.",
        "En Ajustes → **Cuenta y copia** puedes registrarte, exportar una copia de seguridad o importar datos.",
      ],
      screenshot: {
        src: "/ayuda/capturas/cuenta-nube.png",
        alt: "Tarjeta de cuenta y sincronización en la nube",
      },
    },
  ],
};
