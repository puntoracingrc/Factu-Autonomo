import { Card, PageHeader } from "@/components/ui/Card";

export default function LegalVerifactuPage() {
  return (
    <div>
      <PageHeader
        title="Información VeriFactu"
        subtitle="Borrador operativo — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Esta página resume cómo se plantea el cumplimiento VeriFactu/SIF en
          Factura Autónomo. No sustituye asesoramiento fiscal ni la normativa
          oficial de la Agencia Tributaria.
        </p>
        <h2>Qué hace la app</h2>
        <ul>
          <li>Genera documentos de facturación con numeración y datos fiscales.</li>
          <li>
            Prepara bloques técnicos VeriFactu cuando la opción está activada y
            configurada.
          </li>
          <li>
            Reserva el QR tributario en el PDF conforme a las especificaciones
            técnicas usadas por la app.
          </li>
          <li>
            Mantiene funciones de rectificación para no alterar facturas emitidas.
          </li>
        </ul>
        <h2>Responsabilidad del usuario</h2>
        <p>
          El usuario debe revisar los datos de cada factura antes de emitirla,
          comprobar si está obligado a VeriFactu/SIF y conservar la documentación
          necesaria para su actividad.
        </p>
        <h2>Modalidad y configuración</h2>
        <p>
          La app se orienta a la modalidad VERI*FACTU cuando esté configurada
          para remitir registros a AEAT. Algunas funciones pueden depender de
          certificado, variables de entorno, proveedor de alojamiento y estado de
          producción.
        </p>
        <h2>Plan gratis</h2>
        <p>
          Las funciones básicas de emisión y el soporte visual del QR tributario
          se contemplan como parte del uso gratuito. Las funciones Pro pueden
          afectar a nube, importación, IA o personalización, no al derecho a
          emitir documentos básicos.
        </p>
        <h2>Última actualización</h2>
        <p>24 de junio de 2026.</p>
      </Card>
    </div>
  );
}
