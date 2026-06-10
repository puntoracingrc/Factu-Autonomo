import Link from "next/link";
import { buildDeclarationOfConformity } from "@/lib/verifactu/declaration";
import { VERIFACTU_SOFTWARE } from "@/lib/verifactu/constants";

export default function DeclaracionResponsablePage() {
  const declaration = buildDeclarationOfConformity();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/configuracion" className="text-sm font-medium text-blue-600">
        ← Volver a configuración
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Declaración responsable Veri*Factu
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Documento exigido por el RD 1007/2023 para sistemas informáticos de
        facturación en modalidad VERI*FACTU.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {declaration.statementEs}
        </pre>
      </div>

      <dl className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500">Software</dt>
          <dd className="text-slate-900">{VERIFACTU_SOFTWARE.softwareName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Versión</dt>
          <dd className="text-slate-900">{VERIFACTU_SOFTWARE.softwareVersion}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Productor</dt>
          <dd className="text-slate-900">{VERIFACTU_SOFTWARE.developerName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">NIF productor</dt>
          <dd className="text-slate-900">{VERIFACTU_SOFTWARE.developerNif}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Modalidad</dt>
          <dd className="text-slate-900">{declaration.modality}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Fecha</dt>
          <dd className="text-slate-900">{declaration.issuedAt}</dd>
        </div>
      </dl>

      <p className="mt-6 text-xs text-slate-500">
        En caso de inspección, la versión en español de esta declaración es la
        válida. Actualiza el NIF del productor con la variable de entorno{" "}
        <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_VERIFACTU_DEVELOPER_NIF</code>{" "}
        antes de ir a producción.
      </p>
    </div>
  );
}
