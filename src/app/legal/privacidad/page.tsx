import { Card, PageHeader } from "@/components/ui/Card";

export default function PrivacidadPage() {
  return (
    <div>
      <PageHeader
        title="Política de privacidad"
        subtitle="Borrador operativo — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Esta política explica cómo se tratan los datos personales al usar
          Factura Autónomo. Debe revisarse por un profesional antes de
          comercializar el servicio.
        </p>
        <p>
          <strong>Responsable del servicio:</strong> [nombre o razón social
          pendiente] — [NIF/CIF pendiente] — [domicilio pendiente] — [email de
          contacto pendiente].
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
            textos necesarios para escanear gastos o rellenar fichas.
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
          Factura Autónomo guarda tus datos de facturación en el dispositivo
          cuando trabajas sin cuenta. Si activas cuenta y sincronización, los
          datos se guardan también en la nube para poder usarlos desde móvil y
          ordenador.
        </p>
        <h2>Proveedores</h2>
        <ul>
          <li>Supabase: autenticación, base de datos y sincronización.</li>
          <li>Stripe: pagos, suscripciones y portal de facturación.</li>
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
        <h2>Conservación</h2>
        <p>
          Los datos se conservan mientras mantengas la cuenta o los datos en el
          dispositivo. Puedes exportar una copia desde Configuración. Al borrar
          la cuenta se eliminarán los datos asociados en la nube, sin perjuicio
          de obligaciones legales de conservación cuando resulten aplicables.
        </p>
        <h2>Derechos</h2>
        <p>
          Puedes solicitar acceso, rectificación, supresión, oposición,
          limitación y portabilidad escribiendo a [email pendiente]. También
          puedes reclamar ante la Agencia Española de Protección de Datos.
        </p>
        <h2>Transferencias internacionales</h2>
        <p>
          Algunos proveedores tecnológicos pueden operar fuera del Espacio
          Económico Europeo. Antes de producción debe confirmarse la lista final
          de proveedores y las garantías aplicables.
        </p>
        <h2>Última actualización</h2>
        <p>24 de junio de 2026.</p>
      </Card>
    </div>
  );
}
