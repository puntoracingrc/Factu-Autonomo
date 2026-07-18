import type { ManualSection } from "../types";

export const primerosPasosSection: ManualSection = {
  slug: "primeros-pasos",
  title: "Primeros pasos",
  summary: "Configura tu negocio, entiende la navegación y prepara tus copias.",
  order: 1,
  intro: [
    "Facturación Autónomos está pensada para usarse desde el móvil o el ordenador sin complicaciones. Desde Inicio puedes mirar una demo ficticia, trabajar solo en este navegador o crear una cuenta gratis para empezar con tus datos.",
  ],
  steps: [
    {
      title: "1. Elige cómo quieres empezar",
      paragraphs: [
        "Desde **Inicio**, pulsa **Empezar gratis** si quieres crear una cuenta real sin tarjeta, o **Demo sin registro** si solo quieres curiosear.",
        "En **Demo sin registro** verás una empresa ficticia y podrás tocar facturas, gastos e impuestos sin afectar a tus datos.",
        "Si entras en la app sin cuenta, puedes crear datos en este navegador. Verás un aviso de **Estás probando sin cuenta** o **Tienes datos guardados solo en este navegador**.",
        "Para trabajar ya con tus datos, ve a **Cuenta** y pulsa **Crear cuenta**. El plan Gratis es una cuenta real sin tarjeta, con límites de uso y email verificado.",
      ],
      tip: "Cuando creas una cuenta con email, primero recibirás el correo de Supabase que activa el acceso. Tras confirmarlo e iniciar sesión, Factu enviará la bienvenida.",
    },
    {
      title: "2. Abre Ajustes y rellena tus datos",
      paragraphs: [
        "En móvil, pulsa **Más → Ajustes**; en ordenador, abre **Ajustes** en el menú lateral. Completa al menos tu **nombre** y **NIF/CIF**. Esos datos salen en el PDF de tus facturas.",
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
        "En móvil, desplaza la barra inferior hacia los lados para acceder a todas las secciones. La opción actual aparece resaltada y la barra la acerca automáticamente al centro.",
        "El orden es el mismo que en ordenador: **Proveedores** aparece entre **Gastos** y **Productos**.",
        "La cabecera se adapta al tamaño de pantalla: en móvil muestra menos texto para dejar espacio a las acciones importantes, y en ordenador enseña más contexto.",
        "Arriba verás el icono de ayuda **?**. Abre la sección del manual correspondiente a la pantalla en la que estés.",
      ],
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
        "En **Cuenta** tienes bloques separados para **Acceso**, **Plan**, **Sincronización**, **Copias**, **Importación** y **Legal**. Así no tienes que buscar las copias o los documentos legales dentro de Ajustes.",
        "Hasta confirmar el email, la app puede dejarte seguir trabajando en este navegador, pero bloquea nube, Drive, envíos reales y acciones de cuenta.",
        "Si ya habías creado datos sin cuenta, al entrar te preguntará si quieres **Guardar estos datos en mi cuenta**, descargar una copia o **Seguir solo en este navegador**.",
        "En **Legal** encontrarás términos, privacidad, cookies, encargo de tratamiento y nota VeriFactu.",
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
