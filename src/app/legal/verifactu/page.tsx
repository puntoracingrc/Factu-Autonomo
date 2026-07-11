import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/Card";
import { APP_BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Información VeriFactu",
  description:
    "Qué incluye la app sobre VeriFactu/SIF, qué necesita configuración real y qué debe revisar cada autónomo con fuentes oficiales.",
  alternates: {
    canonical: "/legal/verifactu",
  },
};

const officialSources = [
  {
    label: "AEAT: Sistemas Informáticos de Facturación y VERI*FACTU",
    href: "https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html",
  },
  {
    label: "AEAT: modalidades VERI*FACTU y no VERI*FACTU",
    href: "https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu/cuestiones-generales/modalidades-cumplimiento-obligaciones.html",
  },
  {
    label: "BOE: Real Decreto 1007/2023",
    href: "https://www.boe.es/buscar/doc.php?id=BOE-A-2023-24840",
  },
  {
    label: "BOE: Orden HAC/1177/2024",
    href: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-22138",
  },
];

export default function LegalVerifactuPage() {
  return (
    <div>
      <PageHeader
        title="Información VeriFactu"
        subtitle="Qué incluye la app y qué debe revisarse con fuentes oficiales"
      />
      <Card className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-700">
        <div className="not-prose rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
          <p className="font-bold">
            Estado actual: preparación VeriFactu/SIF en modo simulado.
          </p>
          <p className="mt-2">
            No afirmamos que la AEAT haya homologado, validado o revisado
            comercialmente la app. La declaración responsable permanece como
            borrador técnico y no constituye una declaración válida.
          </p>
          <Link
            href="/legal/declaracion-responsable"
            className="mt-3 inline-flex font-bold underline underline-offset-2"
          >
            Consultar estado de la declaración
          </Link>
        </div>
        <p>
          Esta página resume cómo se plantea el cumplimiento VeriFactu/SIF en
          {APP_BRAND_NAME}. No sustituye asesoramiento fiscal ni la normativa
          oficial publicada por la Agencia Tributaria y el BOE.
        </p>
        <h2>Resumen claro</h2>
        <ul>
          <li>
            El plan Gratis incluye el acceso básico a las funciones
            VeriFactu/SIF con cuenta verificada.
          </li>
          <li>
            El uso real depende de tener bien configurados los datos fiscales,
            la modalidad y, cuando corresponda, la conexión con AEAT.
          </li>
          <li>
            No afirmamos que la AEAT haya homologado, validado o revisado
            comercialmente la app.
          </li>
        </ul>
        <h2>Qué hace la app</h2>
        <ul>
          <li>Genera documentos de facturación con numeración y datos fiscales.</li>
          <li>
            Prepara huella, encadenamiento, registros técnicos y material
            VeriFactu cuando el módulo está activado y configurado.
          </li>
          <li>
            Reserva el QR tributario en el PDF cuando procede según la
            configuración de emisión.
          </li>
          <li>
            Mantiene funciones de rectificación para no alterar facturas emitidas.
          </li>
        </ul>
        <h2>Qué no promete la app</h2>
        <ul>
          <li>
            No sustituye a un gestor, asesor fiscal ni revisión profesional de
            tu caso.
          </li>
          <li>
            No envía registros reales a AEAT si faltan certificado, variables de
            servidor, entorno o activación de envío real.
          </li>
          <li>
            No convierte presupuestos, gastos o recibos en obligaciones SIF:
            la normativa se centra en sistemas usados para expedir facturas.
          </li>
          <li>
            No debe usarse una frase de factura verificable si no está activa la
            modalidad de remisión que corresponda.
          </li>
        </ul>
        <h2>Responsabilidad del usuario</h2>
        <p>
          El usuario debe revisar los datos de cada factura antes de emitirla,
          comprobar si está obligado a VeriFactu/SIF, elegir la modalidad que le
          corresponda y conservar la documentación necesaria para su actividad.
        </p>
        <h2>Modalidad y configuración</h2>
        <p>
          La app se orienta a trabajar con funciones VeriFactu/SIF. La modalidad
          VERI*FACTU exige remisión de registros a la Sede electrónica de la
          Agencia Tributaria después de su producción. Algunas funciones pueden
          depender de certificado, variables de entorno, proveedor de
          alojamiento, estado de producción y configuración de cada cuenta.
        </p>
        <h2>Plan gratis</h2>
        <p>
          Las funciones básicas de emisión y preparación VeriFactu/SIF se
          contemplan como parte del uso gratuito con cuenta verificada. Las
          funciones Pro pueden afectar a nube, importación, IA o
          personalización, no al derecho a emitir documentos básicos.
        </p>
        <h2>Fuentes oficiales</h2>
        <ul>
          {officialSources.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noreferrer">
                {source.label}
              </a>
            </li>
          ))}
        </ul>
        <h2>Última actualización</h2>
        <p>11 de julio de 2026.</p>
      </Card>
    </div>
  );
}
