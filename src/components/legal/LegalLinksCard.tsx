import Link from "next/link";
import { Scale } from "lucide-react";
import { Card } from "@/components/ui/Card";

const LEGAL_LINKS = [
  { href: "/legal/aviso-legal", label: "Aviso legal" },
  { href: "/legal/terminos", label: "Términos de uso" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/cookies", label: "Cookies" },
  { href: "/legal/encargo-tratamiento", label: "Encargo de tratamiento" },
  { href: "/legal/verifactu", label: "VeriFactu" },
];

export function LegalLinksCard() {
  return (
    <Card className="mb-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Legal y privacidad
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Condiciones, privacidad, cookies, tratamiento de datos y notas sobre
            VeriFactu.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Borradores pendientes de revisión profesional antes de comercializar la
        app.
      </p>
    </Card>
  );
}
