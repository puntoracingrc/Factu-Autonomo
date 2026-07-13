import type { ManualSection } from "../types";

export const cuentaSection: ManualSection = {
  slug: "cuenta",
  title: "Cuenta, sincronización y copias",
  summary:
    "Alta gratis, email confirmado, plan, sincronización, copias JSON, Drive, importación y legal.",
  order: 12,
  intro: [
    "La app puede funcionar solo en este dispositivo, pero la cuenta permite pasar de prueba local a trabajo real. La copia manual JSON y la copia extra en Google Drive son una red de seguridad adicional.",
  ],
  steps: [
    {
      title: "1. Crear cuenta o iniciar sesión",
      paragraphs: [
        "En **Cuenta**, el bloque **Acceso** reúne la creación de cuenta, el inicio de sesión, la confirmación de email y la decisión sobre datos locales.",
        "Usa **Crear cuenta** si es la primera vez; usa **Iniciar sesión** si ya tienes usuario.",
        "Puedes entrar con email y contraseña o con Google. Si eliges Google con el mismo email con el que ya usabas la app, seguirás entrando en la misma cuenta. Google solo se usa para identificarte; Drive se conecta aparte.",
        "La casilla de términos, privacidad y el **Código de invitación** solo aparecen al elegir **Crear cuenta**, no al iniciar sesión.",
        "Crear cuenta no exige tarjeta. El plan Gratis tiene límites de uso, pero sirve para empezar de verdad con cuenta verificada.",
      ],
      screenshot: {
        src: "/ayuda/capturas/cuenta-nube.png",
        alt: "Acceso a tu cuenta",
      },
    },
    {
      title: "2. Confirmar el email",
      paragraphs: [
        "Después de crear una cuenta con email, la app muestra **¡Paso 1 completado! Cuenta creada** y te avisa de que la activación llega en otro correo de Supabase.",
        "Busca el correo de Supabase con asunto tipo **Confirm your signup** y pulsa **Confirmar cuenta**. El email de Factu es bienvenida; el de Supabase es el que valida la cuenta.",
        "Mientras el email esté pendiente verás **Email pendiente de confirmar**. Puedes seguir trabajando en ese navegador, pero la nube, Drive, envíos reales y acciones de cuenta quedan bloqueadas hasta confirmar.",
        "Si no llega, usa **Reenviar email de confirmación** y revisa spam, promociones o correo no deseado.",
      ],
    },
    {
      title: "3. Decidir qué hacer con datos locales",
      paragraphs: [
        "Si ya habías creado clientes, facturas, productos o gastos sin cuenta, al entrar la app muestra **Datos locales encontrados**.",
        "Elige **Guardar estos datos en mi cuenta** si quieres subirlos y sincronizarlos. Antes puedes usar **Descargar copia antes de continuar** para quedarte un JSON de seguridad.",
        "Si no quieres subirlos, pulsa **Seguir solo en este navegador**. Podrás guardarlos en la cuenta más adelante desde la misma tarjeta.",
        "La app no borra tus datos locales por iniciar sesión: siempre te pregunta antes de subirlos.",
      ],
    },
    {
      title: "4. Sincronizar móvil y ordenador",
      paragraphs: [
        "Con sesión iniciada, **Acceso** muestra tu email, el estado del email, los datos locales pendientes y los controles principales de nube.",
        "La sección **Sincronización** explica cómo funciona la nube de Factu y te lleva de vuelta a **Acceso** para evitar duplicar botones.",
        "Si ya decidiste guardar los datos en tu cuenta y hay cambios pendientes, la app muestra cuántos quedan por subir. Normalmente se suben solos en unos segundos si la pestaña está abierta y tienes conexión.",
        "Si otro dispositivo tiene la copia buena y este no la refleja, abre **Problemas de sincronización** y usa **Reparar con la copia de la nube**.",
        "La sincronización automática en la nube es función Pro. En Gratis puedes crear cuenta y exportar copias manuales.",
      ],
    },
    {
      title: "5. Exportar o importar una copia JSON",
      paragraphs: [
        "**Exportar copia** descarga un archivo JSON con tus datos para guardarlo donde quieras.",
        "**Importar copia** sirve para recuperar una copia JSON de Facturación Autónomos. Revísalo con calma: una copia sustituye los datos locales del navegador donde la importas.",
        "Aunque uses la nube, conviene exportar una copia manual de vez en cuando.",
        "Si **Cuenta → Copias** detecta repartos antiguos afectados por un cambio de coste, muestra primero cuántos gastos son seguros y sus importes antes/después. Nada se corrige al cargar: revisa la vista previa, descarga una copia si quieres una seguridad adicional y confirma expresamente. Los casos parciales o ambiguos quedan fuera; una reparación aplicada puede deshacerse mientras no edites después esos repartos.",
        "Si **Cuenta → Importación** detecta documentos de importadores históricos conocidos que quedaron bloqueados durante el despliegue de integridad, muestra una **vista previa** con su base, IVA, total y las carencias de datos antiguas. Descarga antes una **copia JSON** y usa la **confirmación explícita** solo si esas cifras coinciden con los documentos que declaraste. El estado **Histórico importado · aceptado por ti** los congela y permite usarlos en **impuestos y rentabilidad** —incluida Rentabilidad Real—, además de Panel, facturación, cobros, ingresos, beneficio e informes, aunque falten NIF, dirección u otros campos que Factu exige hoy. No rellena esos huecos, no crea un sello moderno ni un registro Veri*Factu. **Conserva el archivo original**: los duplicados ambiguos, rectificativas, recibos o evidencia moderna corrupta quedan fuera y no se cambian automáticamente. Si necesitas deshacer la reparación, restaura la copia JSON previa: la restauración sustituye el workspace completo por ese estado anterior.",
      ],
    },
    {
      title: "6. Guardar una copia extra en Google Drive",
      paragraphs: [
        "En **Copia extra en Google Drive** puedes conectar Drive y guardar un JSON adicional en tu cuenta de Google.",
        "Drive no se usa para iniciar sesión: se conecta aparte, solo desde esta tarjeta, y con permiso limitado a los archivos creados o usados por la app.",
        "La frecuencia se elige en la propia tarjeta: manual, diaria o automática según los cambios importantes. Los automatismos solo funcionan mientras la app está abierta y Google mantiene el permiso activo.",
        "Tras guardar una copia, **Abrir carpeta de copias en Drive** te lleva a la carpeta donde quedan los JSON, para que no tengas que abrir el archivo técnico directamente.",
        "Para no llenar Drive, Factu conserva las 10 copias más recientes y retira las anteriores de la carpeta de copias.",
        "Si ves **Drive necesita reconectar**, pulsa **Reconectar Drive** para renovar el permiso de Google. **Desconectar Drive** deja de guardar copias desde ese navegador, pero no borra lo que ya tengas guardado en Google Drive.",
      ],
    },
    {
      title: "7. Accesos rápidos de Cuenta",
      paragraphs: [
        "Arriba tienes pastillas para saltar a **Acceso**, **Plan**, **Sincronización**, **Copias**, **Importación** y **Legal**.",
        "**Acceso** reúne inicio de sesión, creación de cuenta, confirmación de email y decisión sobre datos locales. **Sincronización** te recuerda que los controles de nube están dentro de ese flujo para evitar duplicar acciones.",
        "**Copias** agrupa la copia manual, la restauración de JSON revisado y la copia extra en Google Drive. **Importación** queda aparte para traer datos desde otros programas.",
        "**Plan** agrupa límites, uso de IA, suscripción e invitaciones. **Legal** reúne condiciones, privacidad, cookies, encargo de tratamiento y notas sobre VeriFactu.",
        "El manual ya no aparece como tarjeta dentro de Cuenta: el icono **?** de la cabecera está disponible en toda la app.",
      ],
    },
  ],
};
