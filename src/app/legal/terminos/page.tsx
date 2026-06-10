import { Card, PageHeader } from "@/components/ui/Card";

export default function TerminosPage() {
  return (
    <div>
      <PageHeader
        title="Términos de uso"
        subtitle="Borrador — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Al usar Factura Autónomo aceptas estos términos. El servicio ofrece
          herramientas de facturación y estimaciones fiscales orientativas; no
          sustituye asesoramiento de gestoría o asesor fiscal.
        </p>
        <p>
          <strong>Planes:</strong> el plan Gratis tiene límites de uso. Pro se
          factura según precios publicados en /precios (+ IVA aplicable). Puedes
          cancelar desde el portal de Stripe.
        </p>
        <p>
          <strong>Prueba:</strong> 14 días de Pro al crear cuenta, salvo abuso o
          fraude.
        </p>
        <p>
          <strong>Reembolsos:</strong> solicitudes en los 14 días siguientes al
          primer cobro, salvo uso intensivo del periodo de prueba ya consumido.
        </p>
        <p>
          <strong>Limitación de responsabilidad:</strong> no nos hacemos
          responsables de sanciones tributarias por uso incorrecto de las
          estimaciones o por incumplimiento de normativa (Verifactu, etc.).
        </p>
      </Card>
    </div>
  );
}
