import { Card, PageHeader } from "@/components/ui/Card";
import { APP_BRAND_NAME } from "@/lib/brand";
import { termsPageMetadata } from "@/lib/legal-metadata";

export const metadata = termsPageMetadata;

export default function TerminosPage() {
  return (
    <div>
      <PageHeader
        title="Términos de uso"
        subtitle={`Condiciones básicas de uso de ${APP_BRAND_NAME}`}
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Al usar {APP_BRAND_NAME} aceptas estos términos. El servicio ofrece
          herramientas de facturación y estimaciones fiscales orientativas; no
          sustituye asesoramiento de gestoría o asesor fiscal.
        </p>
        <h2>Titular del servicio</h2>
        <p>
          Alberto Ibáñez de Opacua Muñoz — NIF 46402457A — C/ Valencia 542,
          Barcelona —{" "}
          <a href="mailto:puntoracingrc@gmail.com">
            puntoracingrc@gmail.com
          </a>
          .
        </p>
        <h2>Uso de la app</h2>
        <p>
          El usuario debe introducir datos veraces, revisar los documentos antes
          de emitirlos y conservar las copias que exija su actividad. La app
          ayuda a generar facturas, presupuestos, recibos, gastos e informes,
          pero el usuario sigue siendo responsable de sus obligaciones fiscales
          y contables.
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
          <strong>Créditos IA:</strong> las funciones de escaneo y autorrelleno
          consumen créditos o unidades IA según se indique en pantalla. El
          resultado debe revisarse antes de guardar. En cuentas autorizadas, las
          correcciones de lecturas IA pueden usarse para mejorar el sistema con
          patrones estructurales limpios, sin conservar documentos originales ni
          datos identificativos como aprendizaje.
        </p>
        <p>
          <strong>Reembolsos:</strong> solicitudes en los 14 días siguientes al
          primer cobro, salvo uso intensivo del periodo de prueba, créditos IA
          ya consumidos o supuestos excluidos por la normativa aplicable.
        </p>
        <h2>Cuenta, nube y datos</h2>
        <p>
          La app puede usarse sin cuenta en modo local. Las funciones de nube,
          sincronización, suscripción, importación avanzada e IA pueden requerir
          cuenta e inicio de sesión.
        </p>
        <h2>VeriFactu y normativa</h2>
        <p>
          La app incorpora herramientas orientadas al cumplimiento VeriFactu/SIF
          cuando estén activadas y configuradas. No afirmamos homologación ni
          validación comercial por parte de AEAT. Aun así, el usuario debe
          comprobar que su uso concreto se ajusta a su actividad, plazos y
          obligaciones.
        </p>
        <h2>Disponibilidad</h2>
        <p>
          Trabajaremos para mantener el servicio disponible, pero puede haber
          interrupciones por mantenimiento, proveedores externos, cambios
          normativos o causas técnicas.
        </p>
        <p>
          <strong>Limitación de responsabilidad:</strong> no nos hacemos
          responsables de sanciones tributarias por uso incorrecto de las
          estimaciones o por incumplimiento de normativa (VeriFactu, etc.).
        </p>
        <h2>Última actualización</h2>
        <p>4 de julio de 2026.</p>
      </Card>
    </div>
  );
}
