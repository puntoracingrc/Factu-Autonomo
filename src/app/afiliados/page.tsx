"use client";

import { Suspense } from "react";
import { Gift, ShieldCheck } from "lucide-react";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { Card, PageHeader } from "@/components/ui/Card";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";

export default function AffiliatesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Afiliados"
        subtitle="Comparte tu enlace personal y consulta las ventajas que consigues con tus invitaciones."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-start gap-3 border-violet-200 bg-violet-50/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Ventaja actual</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Tú y la persona invitada recibís {REFERRAL_BONUS_SCANS} escaneos IA cuando completa el registro con tu código.
            </p>
          </div>
        </Card>
        <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50/60">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-slate-900">Atribución automática</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              El enlace guarda la invitación y la aplica al crear la cuenta. El código manual queda en el registro como alternativa.
            </p>
          </div>
        </Card>
      </div>

      <Suspense fallback={<Card>Cargando Afiliados...</Card>}>
        <ReferralCard />
      </Suspense>
    </div>
  );
}
