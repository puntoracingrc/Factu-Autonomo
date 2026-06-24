import { Card, PageHeader } from "@/components/ui/Card";

export default function CookiesPage() {
  return (
    <div>
      <PageHeader
        title="Política de cookies y almacenamiento"
        subtitle="Borrador operativo — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Factura Autónomo usa almacenamiento local y tecnologías similares para
          que la app funcione correctamente.
        </p>
        <h2>Uso técnico necesario</h2>
        <p>
          La app puede guardar datos en el navegador para conservar facturas,
          gastos, configuración, sesión, preferencias de interfaz y
          sincronización pendiente. Este almacenamiento es necesario para usar
          la app, especialmente en modo local sin cuenta.
        </p>
        <h2>Pagos y cuenta</h2>
        <p>
          Supabase y Stripe pueden usar cookies o tecnologías equivalentes para
          autenticación, seguridad, prevención de fraude y gestión de pagos.
        </p>
        <h2>Analítica y publicidad</h2>
        <p>
          En este borrador no se declara analítica publicitaria ni seguimiento
          comercial de terceros. Si en producción se añade analítica no técnica,
          deberá mostrarse un panel de consentimiento antes de activarla.
        </p>
        <h2>Cómo borrar datos locales</h2>
        <p>
          Puedes exportar una copia desde Cuenta o Configuración. Si borras los
          datos del sitio desde el navegador, puedes perder el histórico local si
          no estaba sincronizado o exportado.
        </p>
        <h2>Última actualización</h2>
        <p>24 de junio de 2026.</p>
      </Card>
    </div>
  );
}
