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
            Estado actual: registro VeriFactu, envío a AEAT y QR tributario
            desactivados.
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
            La app ofrece información sobre VeriFactu/SIF, pero actualmente no
            registra ni remite facturas a la AEAT.
          </li>
          <li>
            Ningún dato local, estado <code>server_confirmed</code> o huella
            calculada por el cliente acredita una aceptación de la AEAT.
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
            Mantiene controles internos de integridad documental sin
            presentarlos como registro fiscal ni confirmación externa.
          </li>
          <li>
            No genera ni muestra QR tributario o distintivo VeriFactu mientras
            no exista una atestación autenticada del servidor.
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
            La ruta de registro está desactivada y responde como servicio no
            disponible; no se envían registros reales a AEAT.
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
          La modalidad VERI*FACTU exige remisión de registros a la Sede
          electrónica de la Agencia Tributaria después de su producción. Esta
          app no ofrece actualmente esa operación. Su futura activación requiere
          controles fiscales, identidad del emisor, persistencia atómica y
          atestación autenticada que hoy no están disponibles.
        </p>
        <h2>Plan gratis</h2>
        <p>
          La emisión de documentos básicos y la información sobre VeriFactu/SIF
          forman parte del uso gratuito. Esto no incluye registro, remisión a
          AEAT, QR tributario ni acreditación de aceptación.
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
