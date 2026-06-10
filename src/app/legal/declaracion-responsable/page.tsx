import Link from "next/link";
import { buildDeclarationOfConformity } from "@/lib/verifactu/declaration";

const MANDATORY_LABELS: Array<{
  key: keyof ReturnType<typeof buildDeclarationOfConformity>["mandatory"];
  label: string;
}> = [
  { key: "systemName", label: "a) Nombre del sistema informático" },
  { key: "systemId", label: "b) Código identificador" },
  { key: "systemVersion", label: "c) Versión" },
  { key: "componentsDescription", label: "d) Componentes y funcionalidades" },
  { key: "exclusiveVerifactu", label: "e) Solo VERI*FACTU exclusivo" },
  { key: "multiTaxpayerSupport", label: "f) Varios obligados tributarios" },
  { key: "signatureTypes", label: "g) Tipos de firma" },
  { key: "producerName", label: "h) Productor" },
  { key: "producerNif", label: "i) NIF productor" },
  { key: "producerPostalAddress", label: "j) Dirección postal" },
  { key: "complianceStatement", label: "k) Declaración de cumplimiento" },
  { key: "signedAt", label: "l) Fecha" },
  { key: "signedPlace", label: "l) Lugar" },
];

export default function DeclaracionResponsablePage() {
  const declaration = buildDeclarationOfConformity();
  const { mandatory, annex } = declaration;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/configuracion" className="text-sm font-medium text-blue-600">
        ← Volver a configuración
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Declaración responsable del SIF
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Certificación del productor según el artículo 15 de la Orden HAC/1177/2024
        y el RD 1007/2023. Modalidad <strong>{declaration.modality}</strong>.
      </p>

      <div className="mt-6 space-y-4">
        {MANDATORY_LABELS.map(({ key, label }) => {
          const raw = mandatory[key];
          const display =
            key === "exclusiveVerifactu"
              ? raw
                ? "Sí"
                : "No"
              : key === "multiTaxpayerSupport"
                ? raw
                  ? "Sí, mediante cuentas independientes; cada cuenta gestiona un único obligado tributario."
                  : "No"
                : String(raw);

          return (
            <div
              key={key}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-800">
                {display}
              </dd>
            </div>
          );
        })}
      </div>

      {(annex.contactEmail || annex.websiteUrl || annex.complianceNotes) && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">
            Anexo (información recomendada)
          </h2>
          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            {annex.contactEmail && <p>Contacto: {annex.contactEmail}</p>}
            {annex.websiteUrl && <p>Sitio web: {annex.websiteUrl}</p>}
            <p>
              <span className="font-medium">Cumplimiento técnico:</span>{" "}
              {annex.complianceNotes}
            </p>
          </div>
        </section>
      )}

      <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Ver texto completo para impresión o archivo
        </summary>
        <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {declaration.statementEs}
        </pre>
      </details>

      <p className="mt-6 text-xs text-slate-500">
        Configura los datos del productor con las variables{" "}
        <code className="rounded bg-slate-100 px-1">
          NEXT_PUBLIC_VERIFACTU_DEVELOPER_*
        </code>{" "}
        antes de comercializar. Guía completa:{" "}
        <code className="rounded bg-slate-100 px-1">docs/PRODUCTOR_SIF.md</code>
      </p>
    </div>
  );
}
