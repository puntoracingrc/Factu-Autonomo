import { Card, PageHeader } from "@/components/ui/Card";
import { APP_BRAND_NAME } from "@/lib/brand";

export default function CookiesPage() {
  return (
    <div>
      <PageHeader
        title="Política de cookies y almacenamiento"
        subtitle="Uso técnico del navegador para que la app funcione"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          {APP_BRAND_NAME} usa almacenamiento local y tecnologías similares para
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
          No usamos cookies publicitarias ni seguimiento comercial de terceros.
          Si en el futuro se añade analítica no técnica, se mostrará un panel de
          consentimiento antes de activarla.
        </p>
        <h2>Cómo borrar datos locales</h2>
        <p>
          Puedes exportar una copia desde Cuenta. En el plan Gratis, si borras
          los datos del sitio desde el navegador sin una copia manual o en
          Drive, puedes perder el histórico porque no se guarda en la nube de
          Factu.
        </p>
        <h2>Última actualización</h2>
        <p>21 de julio de 2026.</p>
      </Card>
    </div>
  );
}
