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
        "Si **Cuenta → Importación** detecta documentos de importadores históricos conocidos que quedaron bloqueados durante el despliegue de integridad, muestra una **vista previa** con su base, IVA, total y las carencias de datos antiguas. Algunos pueden conservar un paquete técnico completo —snapshot, plantilla PDF y sello interno— que el rollout antiguo creó al importar: Factu solo lo propone si todas sus huellas verifican y no existe evidencia Veri*Factu real ni una acción posterior; ese paquete no demuestra que Factu emitiera el documento ni que se enviara a la AEAT. Descarga desde la propia tarjeta una **copia JSON completa** —si cambia cualquier dato del workspace tendrás que descargar otra— y usa la **confirmación explícita** solo si las cifras coinciden con los documentos que declaraste. La copia cubre el alcance exportable indicado en pantalla; la restauración durable guarda primero, registra los cambios pendientes para la nube y solo después publica memoria. El estado **Histórico importado · aceptado por ti** los congela y permite usarlos en **impuestos y rentabilidad** —incluida Rentabilidad Real—, además de Panel, facturación, cobros, ingresos, beneficio e informes, aunque falten NIF, dirección u otros campos que Factu exige hoy. Las parejas históricas factura–rectificativa y factura–recibo solo aparecen cuando ambos extremos se enlazan de forma inequívoca y recíproca; se revisan y aceptan juntos. No rellena huecos, no inventa vínculos, no crea un sello moderno ni un registro Veri*Factu. **Conserva el archivo original**: duplicados, relaciones huérfanas o ambiguas, una huella incoherente y evidencia moderna real o corrupta quedan fuera y no se cambian automáticamente. Si necesitas deshacer la reparación, restaura la copia JSON previa: se recuperan de forma durable los datos de negocio incluidos en ese archivo.",
        "Si **Cuenta → Copias** detecta una factura–rectificativa emitida por Factu antes del sellado canónico, un recibo antiguo cuyo snapshot todavía no congelaba la factura de origen, una pareja factura–recibo anterior a los marcadores de cobro actuales o una factura pre-sello con una simulación local de Veri*Factu, muestra una reparación distinta. En la pareja antigua solo se acepta que falten `paymentStatus` y `paidAt` en ambos documentos mientras ambos conservan estado pagado; un caso híbrido queda fuera y Factu no rellena esos campos. La simulación solo es admisible cuando consta exactamente como `test_registered`, entorno `test` y `legacy_unverified`: no fue un envío a AEAT, se conserva sin cambios como rastro de desarrollo y nunca se presenta como registro fiscal. Cualquier registro confirmado por servidor o de producción queda fuera. Debes elegir un único grupo, descargar desde la propia tarjeta una copia JSON ligada a esa vista, revisar todos sus documentos y, cuando lo pida, seleccionar el **PDF original**. La vista previa muestra emisor, cliente, líneas, notas, relación, base, IVA y total para que los contrastes manualmente. Factu guarda solo la huella SHA-256 del PDF, su tamaño, el resumen confirmado y la huella del contenido revisado; no guarda el nombre, texto ni bytes del PDF ni afirma haberlo leído. El estado **Documento de Factu · recuperado y revisado** permite usar de nuevo base, IVA y total en cuentas generales, ingresos y rentabilidad; impuestos y exportaciones siguen aplicando sus validaciones fiscales habituales. La recuperación no vuelve válida una combinación de tipo y signo que esas reglas ya rechazaban, no fabrica el sello de emisión perdido ni crea un registro Veri*Factu. Un hash o sello presente que no verifique sigue bloqueado. La aplicación y el rollback son atómicos; cualquier cambio del workspace invalida la copia, la confirmación y la precondición antes de mutar.",
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
