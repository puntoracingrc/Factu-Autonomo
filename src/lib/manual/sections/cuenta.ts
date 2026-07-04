import type { ManualSection } from "../types";

export const cuentaSection: ManualSection = {
  slug: "cuenta",
  title: "Cuenta, nube y copias",
  summary: "Inicio de sesión, sincronización, copias JSON y copia extra en Drive.",
  order: 10,
  intro: [
    "La app puede funcionar solo en este dispositivo, pero la cuenta permite sincronizar móvil y ordenador. La copia manual JSON y la copia extra en Google Drive son una red de seguridad adicional.",
  ],
  steps: [
    {
      title: "1. Entrar con email o con Google",
      paragraphs: [
        "En **Cuenta** puedes iniciar sesión con email y contraseña o pulsar **Continuar con Google**.",
        "Si eliges Google con el mismo email con el que ya usabas la app, seguirás entrando en la misma cuenta. Google solo se usa para identificarte; Drive se conecta aparte.",
        "Si ya habías creado datos sin cuenta en este navegador, al iniciar sesión Factu te preguntará si quieres guardarlos en tu cuenta, descargar una copia o seguir solo en local.",
        "La casilla de términos, privacidad y el **Código de invitación** solo aparecen al elegir **Crear cuenta**, no al iniciar sesión.",
      ],
      screenshot: {
        src: "/ayuda/capturas/cuenta-nube.png",
        alt: "Cuenta y copia de seguridad",
      },
    },
    {
      title: "2. Sincronizar móvil y ordenador",
      paragraphs: [
        "Con sesión iniciada, el bloque **Cuenta y copia de seguridad** muestra tu email, el estado de sincronización y el botón **Sincronizar ahora**.",
        "Si ya decidiste guardar los datos en tu cuenta y hay cambios pendientes, la app muestra cuántos quedan por subir. Normalmente se suben solos en unos segundos si la pestaña está abierta y tienes conexión.",
        "Si otro dispositivo tiene la copia buena y este no la refleja, abre **Problemas de sincronización** y usa **Reparar con la copia de la nube**.",
      ],
    },
    {
      title: "3. Exportar o importar una copia JSON",
      paragraphs: [
        "**Exportar copia** descarga un archivo JSON con tus datos para guardarlo donde quieras.",
        "**Importar copia** sirve para recuperar una copia JSON de Facturación Autónomos. Revísalo con calma: una copia sustituye los datos locales del navegador donde la importas.",
        "Aunque uses la nube, conviene exportar una copia manual de vez en cuando.",
      ],
    },
    {
      title: "4. Guardar una copia extra en Google Drive",
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
      title: "5. Accesos rápidos de Cuenta",
      paragraphs: [
        "Arriba tienes pastillas para saltar a **Cuenta y nube**, **Drive**, **Importar**, **Tus datos** y **Legal**.",
        "El manual ya no aparece como tarjeta dentro de Cuenta: el icono **?** de la cabecera está disponible en toda la app.",
      ],
    },
  ],
};
