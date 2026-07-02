import { Card, PageHeader } from "@/components/ui/Card";

export default function AvisoLegalPage() {
  return (
    <div>
      <PageHeader
        title="Aviso legal"
        subtitle="Información legal del titular de Factura Autónomo"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <p>
          Este aviso legal regula la información básica del titular de Factura
          Autónomo y del sitio web o aplicación desde la que se presta el
          servicio.
        </p>
        <h2>Titular</h2>
        <p>
          <strong>Nombre o razón social:</strong> Alberto Ibáñez de Opacua Muñoz
          <br />
          <strong>NIF/CIF:</strong> 46402457A
          <br />
          <strong>Domicilio:</strong> C/ Valencia 542, Barcelona
          <br />
          <strong>Email de contacto:</strong>{" "}
          <a href="mailto:puntoracingrc@gmail.com">
            puntoracingrc@gmail.com
          </a>
          <br />
          <strong>Dominio:</strong> facturacion-autonomos.app
        </p>
        <h2>Objeto</h2>
        <p>
          Factura Autónomo es una aplicación de facturación para autónomos y
          pequeños negocios, con funciones de emisión de documentos, gestión de
          gastos, sincronización opcional, importación e IA según el plan
          contratado.
        </p>
        <h2>Propiedad intelectual</h2>
        <p>
          El diseño, código, textos, marcas y elementos propios de la aplicación
          pertenecen a su titular o se usan con licencia. El usuario conserva la
          titularidad de sus datos y documentos.
        </p>
        <h2>Responsabilidad</h2>
        <p>
          La app ayuda a gestionar información de facturación, pero el usuario
          debe revisar los documentos emitidos y cumplir sus obligaciones
          fiscales, contables y mercantiles.
        </p>
        <h2>Última actualización</h2>
        <p>2 de julio de 2026.</p>
      </Card>
    </div>
  );
}
