import { Card, PageHeader } from "@/components/ui/Card";

export default function PrivacidadPage() {
  return (
    <div>
      <PageHeader
        title="Política de privacidad"
        subtitle="Borrador — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          <strong>Responsable:</strong> [Tu nombre o razón social] — [email de
          contacto].
        </p>
        <p>
          Factura Autónomo guarda tus datos de facturación en el dispositivo
          (localStorage). Si activas cuenta y nube, los datos se sincronizan en
          Supabase (UE). Los pagos se procesan con Stripe; no almacenamos datos
          de tarjeta.
        </p>
        <p>
          <strong>Finalidad:</strong> prestación del servicio de facturación,
          sincronización opcional y gestión de suscripciones.
        </p>
        <p>
          <strong>Derechos RGPD:</strong> acceso, rectificación, supresión y
          portabilidad escribiendo a [email]. Puedes exportar tus datos desde
          Configuración → Exportar copia.
        </p>
        <p>
          <strong>Conservación:</strong> mientras mantengas la cuenta o datos
          locales. Al borrar la cuenta en Supabase se eliminan los datos en
          nube asociados.
        </p>
      </Card>
    </div>
  );
}
