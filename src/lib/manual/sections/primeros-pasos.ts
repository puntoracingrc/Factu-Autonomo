import type { ManualSection } from "../types";

export const primerosPasosSection: ManualSection = {
  slug: "primeros-pasos",
  title: "Primeros pasos",
  summary: "Configura tu negocio, entiende la navegación y prepara tus copias.",
  order: 1,
  intro: [
    "Facturación Autónomos está pensada para usarse desde el móvil o el ordenador sin complicaciones. Puedes mirar una demo ficticia, probar en local o crear una cuenta gratis para empezar con tus datos.",
  ],
  steps: [
    {
      title: "1. Elige cómo quieres empezar",
      paragraphs: [
        "Si solo quieres curiosear, entra en **Demo sin registro**: verás una empresa ficticia y podrás tocar facturas, gastos e impuestos sin afectar a tus datos.",
        "Si entras en la app sin cuenta, puedes crear datos en este navegador. Verás un aviso de **Estás probando sin cuenta** o **Tienes datos guardados solo en este navegador**.",
        "Para trabajar ya con tus datos, ve a **Cuenta** y pulsa **Crear cuenta**. El plan Gratis es una cuenta real sin tarjeta, con límites de uso y email verificado.",
      ],
      tip: "Cuando creas cuenta con email, recibirás un correo de bienvenida de Factu y otro de Supabase para confirmar la cuenta. El que activa el acceso es el de Supabase.",
    },
    {
      title: "2. Abre Ajustes y rellena tus datos",
      paragraphs: [
        "Ve a **Ajustes** (icono de engranaje en la barra inferior) y completa al menos tu **nombre** y **NIF/CIF**. Esos datos salen en el PDF de tus facturas.",
        "Si quieres, añade también dirección, teléfono, email e **IBAN**: el IBAN aparece en facturas pendientes de cobro y en los recordatorios de pago.",
        "Ajustes está organizado por bloques: **Negocio**, **Facturación**, **Fiscalidad** y **Preferencias**. Usa las pastillas superiores para saltar rápido a cada parte. En **Preferencias** puedes activar modo oscuro, vista compacta, pantalla inicial y reducir animaciones.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-datos-negocio.png",
        alt: "Formulario de datos del negocio en Ajustes",
        caption: "Tus datos de emisor en Ajustes.",
      },
      tip: "Hasta que no tengas nombre y NIF, verás un aviso en **Avisos** (el botón de Panel muestra el contador).",
    },
    {
      title: "3. Revisa el IVA y el IRPF estimado",
      paragraphs: [
        "En **Fiscalidad** dentro de Ajustes puedes indicar si estás **exento de repercutir IVA** y qué **tipos de IVA** usas habitualmente.",
        "El **% IRPF** es orientativo: sirve para calcular el resumen fiscal del trimestre, no sustituye el asesoramiento de tu gestor.",
      ],
      screenshot: {
        src: "/ayuda/capturas/ajustes-iva-irpf.png",
        alt: "Opciones de IVA e IRPF en Ajustes",
      },
    },
    {
      title: "4. Aprende la barra de navegación",
      paragraphs: [
        "Abajo tienes acceso rápido a **Panel**, **Clientes**, **Facturas**, **Presupuestos**, **Recibos**, **Gastos**, **Productos**, **Proveedores**, **Impuestos** y **Ajustes**.",
        "En móvil puedes deslizar la barra si no ves todos los iconos. Las flechas laterales aparecen solo cuando queda contenido por mover.",
        "Arriba verás el icono de ayuda **?**. Abre la sección del manual correspondiente a la pantalla en la que estés.",
      ],
      screenshot: {
        src: "/ayuda/capturas/navegacion-inferior.png",
        alt: "Barra de navegación inferior de la aplicación",
        caption: "La barra inferior te lleva a cada sección principal.",
      },
    },
    {
      title: "5. Instala la app si quieres usarla como acceso directo",
      paragraphs: [
        "Al final de **Panel** aparece el bloque **Instalar app**. Si tu navegador lo permite, podrás añadir Facturación Autónomos al móvil, Windows o Mac con su icono propio.",
      ],
    },
    {
      title: "6. Crea tu cuenta y confirma el email",
      paragraphs: [
        "Puedes usar la app solo en este dispositivo. Si creas **cuenta y nube**, tus datos pueden sincronizarse entre móvil y PC cuando eliges guardarlos en tu cuenta.",
        "En **Cuenta** puedes registrarte con email o continuar con Google, cerrar sesión, sincronizar ahora, exportar una copia de seguridad o importar una copia JSON.",
        "Hasta confirmar el email, la app puede dejarte seguir trabajando en este navegador, pero bloquea nube, Drive, envíos reales y acciones de cuenta.",
        "Si ya habías creado datos sin cuenta, al entrar te preguntará si quieres **Guardar estos datos en mi cuenta**, descargar una copia o **Seguir solo en este navegador**.",
        "También encontrarás el bloque **Legal y privacidad** con términos, privacidad, cookies, encargo de tratamiento y nota VeriFactu.",
        "Si un móvil u ordenador no refleja lo que ya está bien en otro dispositivo, abre **Problemas de sincronización** en Cuenta y usa la reparación con la copia de la nube.",
        "Para migrar datos desde programas antiguos, usa **Cuenta → Importar datos** o entra en **Importar datos** desde el menú. La importación de bases de datos externas requiere Pro.",
      ],
      screenshot: {
        src: "/ayuda/capturas/cuenta-nube.png",
        alt: "Tarjeta de cuenta y sincronización en la nube",
      },
    },
  ],
};
