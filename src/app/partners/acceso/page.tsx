"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Handshake } from "lucide-react";
import { CloudAccountCard } from "@/components/cloud/CloudAccountCard";
import { ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";

export default function PartnerAccessPage() {
  const { user, authReady } = useCloudSync();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
      <Link
        href="/inicio"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-bold text-blue-700 hover:text-blue-900"
      >
        <Handshake className="h-5 w-5" /> Facturación Autónomos · Partners
      </Link>
      <PageHeader
        title="Acceso Partners"
        subtitle="Registro e inicio de sesión independiente para gestorías y colaboradores profesionales."
      />

      {authReady && user ? (
        <Card className="space-y-4 border-blue-200 bg-blue-50/60">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Handshake className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Acceso preparado</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Entra con el mismo email que haya autorizado el administrador. No necesitas utilizar el resto del programa.
              </p>
            </div>
          </div>
          <ButtonLink href="/partners">Abrir panel Partner</ButtonLink>
        </Card>
      ) : (
        <Suspense fallback={<Card>Cargando acceso...</Card>}>
          <CloudAccountCard surface="partner" />
        </Suspense>
      )}
      </div>
    </main>
  );
}
