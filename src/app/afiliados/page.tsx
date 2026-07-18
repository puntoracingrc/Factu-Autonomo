"use client";

import { Suspense, useState } from "react";
import { ArrowRight, BadgeCheck, Gift, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { ReferralCard } from "@/components/referrals/ReferralCard";
import { PageHeader } from "@/components/ui/Card";
import { REFERRAL_BONUS_SCANS } from "@/lib/billing/referral-codes";

type AffiliateTab = "panel" | "informacion";

export default function AffiliatesPage() {
  const [tab, setTab] = useState<AffiliateTab>("panel");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Afiliados"
        subtitle="Invita a otros autónomos y consigue créditos IA cuando activen y mantengan un plan de pago."
      />

      <section className="mb-6 border-y border-slate-200 py-6" aria-labelledby="affiliate-intro-title">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <BadgeCheck className="h-4 w-4" />
            Recompensa para los dos
          </div>
          <h2 id="affiliate-intro-title" className="mt-2 text-2xl font-bold text-slate-950">
            Comparte Factu con otros autónomos
          </h2>
          <p className="mt-2 leading-7 text-slate-600">
            La persona invitada y tú recibís {REFERRAL_BONUS_SCANS} créditos IA después de su primer pago válido. La recompensa se repite con cada renovación pagada y verificada.
          </p>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            { step: "1", title: "Comparte", text: "Envía tu enlace o tu código personal.", Icon: Users },
            { step: "2", title: "Se suscribe", text: "La persona invitada activa un plan de pago.", Icon: ArrowRight },
            { step: "3", title: "Ganáis créditos", text: "Stripe confirma el pago y se abonan los créditos a ambos.", Icon: Gift },
          ].map(({ step, title, text, Icon }) => (
            <div key={step} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">{step}</span>
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-blue-700" />
                  <h3 className="font-bold text-slate-950">{title}</h3>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Contenido de Afiliados">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "panel"}
          onClick={() => setTab("panel")}
          className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${tab === "panel" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
        >
          Mi panel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "informacion"}
          onClick={() => setTab("informacion")}
          className={`min-h-10 rounded-md px-4 text-sm font-bold transition-colors ${tab === "informacion" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
        >
          Cómo funciona
        </button>
      </div>

      {tab === "panel" ? (
        <Suspense fallback={<p className="py-8 text-sm text-slate-500">Cargando Afiliados...</p>}>
          <ReferralCard />
        </Suspense>
      ) : (
        <section className="space-y-6" aria-label="Condiciones del programa de Afiliados">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border-t-4 border-emerald-500 pt-4">
              <Gift className="h-5 w-5 text-emerald-700" />
              <h2 className="mt-3 text-lg font-bold text-slate-950">Cuándo recibís créditos</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Con el primer pago confirmado y con cada renovación realmente cobrada. Un plan mensual puede premiar cada mes; un plan anual, cuando se confirma su pago anual.
              </p>
            </div>
            <div className="border-t-4 border-blue-500 pt-4">
              <RefreshCw className="h-5 w-5 text-blue-700" />
              <h2 className="mt-3 text-lg font-bold text-slate-950">Mientras siga pagando</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Si la suscripción deja de estar activa o el pago falla, no se generan nuevos créditos. Volverán a activarse cuando exista otro pago válido.
              </p>
            </div>
          </div>
          <div className="border-y border-slate-200 py-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
              <div>
                <h2 className="font-bold text-slate-950">Validación automática y segura</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Registrarse o introducir un código no concede premios. El sistema exige una cuenta distinta, una suscripción activa y un pago confirmado por Stripe; un mismo pago no puede premiarse dos veces.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
