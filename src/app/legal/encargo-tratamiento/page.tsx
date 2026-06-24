import { Card, PageHeader } from "@/components/ui/Card";

export default function EncargoTratamientoPage() {
  return (
    <div>
      <PageHeader
        title="Encargo de tratamiento"
        subtitle="Borrador operativo — revisar antes de producción"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Este documento resume el marco de tratamiento de datos cuando el
          usuario usa Factura Autónomo para gestionar datos de sus clientes,
          proveedores y documentos en la nube.
        </p>
        <h2>Roles</h2>
        <p>
          El usuario profesional actúa como responsable del tratamiento de los
          datos que introduce en la app. Factura Autónomo actúa como encargado
          del tratamiento cuando almacena, sincroniza o procesa esos datos para
          prestar el servicio.
        </p>
        <h2>Objeto del encargo</h2>
        <p>
          Alojamiento, sincronización, copia, consulta, exportación,
          importación, generación de documentos, soporte técnico y funciones IA
          solicitadas por el usuario.
        </p>
        <h2>Datos tratados</h2>
        <ul>
          <li>Datos identificativos y de contacto de clientes y proveedores.</li>
          <li>Datos fiscales incluidos en facturas, presupuestos y recibos.</li>
          <li>Datos económicos de documentos y gastos.</li>
          <li>Archivos o textos enviados voluntariamente a funciones IA.</li>
        </ul>
        <h2>Obligaciones del encargado</h2>
        <ul>
          <li>Tratar los datos solo para prestar el servicio solicitado.</li>
          <li>Aplicar medidas razonables de seguridad y control de acceso.</li>
          <li>Permitir exportar datos y borrar la cuenta cuando proceda.</li>
          <li>No vender los datos del usuario ni usarlos para fines ajenos.</li>
          <li>Informar de subencargados relevantes antes de producción.</li>
        </ul>
        <h2>Subencargados previstos</h2>
        <p>
          Supabase, Stripe, proveedor de IA y proveedor de alojamiento. La lista
          final debe confirmarse antes de comercializar el servicio.
        </p>
        <h2>Fin del servicio</h2>
        <p>
          Tras la baja, los datos en nube se eliminarán o bloquearán conforme a
          los plazos y obligaciones legales aplicables. El usuario puede
          descargar una copia antes de cerrar su cuenta.
        </p>
        <h2>Última actualización</h2>
        <p>24 de junio de 2026.</p>
      </Card>
    </div>
  );
}
