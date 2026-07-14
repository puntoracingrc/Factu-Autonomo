import { Card, PageHeader } from "@/components/ui/Card";
import { APP_BRAND_NAME } from "@/lib/brand";
import { privacyPageMetadata } from "@/lib/legal-metadata";

export const metadata = privacyPageMetadata;

export default function PrivacidadPage() {
  return (
    <div>
      <PageHeader
        title="Política de privacidad"
        subtitle={`Cómo tratamos tus datos al usar ${APP_BRAND_NAME}`}
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Esta política explica cómo se tratan los datos personales al usar
          {APP_BRAND_NAME}, tanto en modo local como con cuenta en la nube.
        </p>
        <p>
          <strong>Responsable del servicio:</strong> Alberto Ibáñez de Opacua
          Muñoz, NIF 46402457A, C/ Valencia 542, Barcelona. Para consultas
          sobre privacidad puedes escribir a{" "}
          <a href="mailto:puntoracingrc@gmail.com">
            puntoracingrc@gmail.com
          </a>
          .
        </p>
        <h2>Datos que tratamos</h2>
        <ul>
          <li>Datos de cuenta: email, identificador de usuario y acceso.</li>
          <li>
            Datos de facturación introducidos por el usuario: clientes,
            proveedores, facturas, presupuestos, recibos, gastos, impuestos y
            configuración de empresa.
          </li>
          <li>
            Datos de pago gestionados por Stripe: estado de suscripción,
            identificador de cliente y datos fiscales de facturación. No
            almacenamos tarjetas.
          </li>
          <li>
            Datos enviados voluntariamente a funciones IA: imágenes, PDF o
            textos necesarios para escanear gastos, rellenar fichas o solicitar
            una clasificación fiscal auxiliar cuando el motor local no encuentra
            una regla.
          </li>
        </ul>
        <h2>Finalidades y bases legales</h2>
        <ul>
          <li>
            Prestar la app de facturación: ejecución del servicio solicitado.
          </li>
          <li>
            Sincronizar datos entre dispositivos cuando activas cuenta nube:
            ejecución del servicio.
          </li>
          <li>
            Gestionar pagos, facturas de suscripción y créditos IA: ejecución
            contractual y obligaciones legales.
          </li>
          <li>
            Procesar documentos o textos con IA cuando lo solicitas:
            consentimiento/solicitud expresa de uso de esa función.
          </li>
          <li>
            Enviar comunicaciones comerciales: solo con consentimiento o base
            legal aplicable.
          </li>
        </ul>
        <h2>Modo local y modo nube</h2>
        <p>
          {APP_BRAND_NAME} guarda tus datos de facturación en el dispositivo
          cuando trabajas sin cuenta. Si activas cuenta y sincronización, los
          datos se guardan también en la nube para poder usarlos desde móvil y
          ordenador.
        </p>
        <h2>Proveedores</h2>
        <ul>
          <li>Supabase: autenticación, base de datos y sincronización.</li>
          <li>Stripe: pagos, suscripciones y portal de facturación.</li>
          <li>
            Google Drive: copia extra opcional cuando el usuario la activa. La
            app solicita el permiso limitado{" "}
            <code>https://www.googleapis.com/auth/drive.file</code> para crear
            y actualizar únicamente archivos de Drive usados con Factura
            Autónomo.
          </li>
          <li>
            Proveedor de IA: análisis de imágenes, PDF o textos que el usuario
            envía voluntariamente desde funciones IA.
          </li>
          <li>Vercel u otro proveedor de alojamiento: publicación de la app.</li>
        </ul>
        <h2>IA y documentos</h2>
        <p>
          Las funciones IA no se ejecutan solas: el usuario decide cuándo enviar
          un documento o texto. Antes del primer uso se muestra un aviso y queda
          guardada la aceptación en este dispositivo. No subas información que
          no sea necesaria para la tarea.
        </p>
        <p>
          En el Consultor fiscal se ejecuta siempre primero el motor local. El
          fallback externo solo recibe vocabulario genérico extraído del concepto,
          medio de pago, tipo de justificante y contexto fiscal estructurado
          imprescindible; no recibe fechas, importes, nombre del proveedor, OCR
          completo, identificadores de cuenta ni el documento.
          Se eliminan los términos fuera de una lista fiscal segura, además de
          NIF, IBAN, correos, teléfonos, direcciones, URL y secretos detectables.
          La propuesta queda pendiente de revisión y
          nunca crea ni confirma un asiento contable.
        </p>
        <p>
          Si añades PDF o capturas al Consultor fiscal, se leen localmente en tu
          navegador. Los PDF escaneados compatibles usan OCR local; sus
          archivos, imágenes, texto completo y Código Seguro de Verificación no
          se guardan ni se envían al proveedor de IA. Solo se conserva el perfil
          fiscal estructurado que confirmas y metadatos mínimos sobre su
          procedencia. Si una lectura no es suficientemente clara, el sistema
          pide revisión o deja la pregunta sin responder.
        </p>
        <h2>Aprendizaje de lecturas IA</h2>
        <p>
          Algunas cuentas autorizadas pueden corregir lecturas para mejorar el
          sistema. En ese caso se guardan únicamente patrones estructurales:
          campos presentes, tipos de cambio, unidades, número aproximado de
          líneas, IVA y señales de calidad. No se guardan el PDF o imagen
          original, nombres de clientes o proveedores, NIF, direcciones, números
          de factura ni importes exactos como datos de aprendizaje.
        </p>
        <p>
          Puedes solicitar que se deje de usar una cuenta para aprendizaje o que
          se eliminen los eventos asociados escribiendo al email de contacto.
        </p>
        <h2>Google Drive</h2>
        <p>
          La copia extra en Google Drive es opcional y se activa desde Cuenta.
          Si la conectas, {APP_BRAND_NAME} guarda un archivo de copia de
          seguridad en tu Drive. No solicitamos acceso completo a tu unidad ni a
          archivos ajenos a los usados con esta app.
        </p>
        <h2>Conservación</h2>
        <p>
          Los datos se conservan mientras mantengas la cuenta o los datos en el
          dispositivo. Puedes exportar una copia desde Cuenta. Al borrar
          la cuenta se eliminarán los datos asociados en la nube, sin perjuicio
          de obligaciones legales de conservación cuando resulten aplicables.
        </p>
        <h2>Derechos</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición,
          limitación y portabilidad escribiendo a{" "}
          <a href="mailto:puntoracingrc@gmail.com">
            puntoracingrc@gmail.com
          </a>
          . También puedes reclamar ante la Agencia Española de Protección de
          Datos.
        </p>
        <h2>Transferencias internacionales</h2>
        <p>
          Algunos proveedores tecnológicos pueden operar fuera del Espacio
          Económico Europeo. Cuando sea necesario, se aplican las garantías
          previstas por la normativa de protección de datos.
        </p>
        <h2>Última actualización</h2>
        <p>14 de julio de 2026.</p>
      </Card>
    </div>
  );
}
