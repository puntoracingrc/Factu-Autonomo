"use client";

import Image from "next/image";
import { CheckCircle2, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SignupSuccessPanelProps {
  email: string;
  needsEmailConfirmation: boolean;
  onContinueToSignIn: () => void;
}

export function SignupSuccessPanel({
  email,
  needsEmailConfirmation,
  onContinueToSignIn,
}: SignupSuccessPanelProps) {
  return (
    <div
      className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0">
          <Image
            src="/brand/robot-avatar.png"
            alt="Factu"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-emerald-900">
            ¡Paso 1 completado! Cuenta creada
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            Hemos registrado <strong>{email}</strong>. Factu ya está en marcha.
          </p>
        </div>
        <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
      </div>

      <ol className="space-y-2 text-sm text-emerald-900">
        <li className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            <strong>Paso 1 — Cuenta creada</strong>
            <br />
            <span className="text-emerald-800">Datos guardados en la nube.</span>
          </span>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2">
          {needsEmailConfirmation ? (
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span>
            <strong>
              Paso 2 —{" "}
              {needsEmailConfirmation
                ? "Confirma tu email"
                : "Email listo"}
            </strong>
            <br />
            <span className="text-emerald-800">
              {needsEmailConfirmation
                ? "Revisa tu bandeja (y spam) y pulsa el enlace de confirmación."
                : "No hace falta confirmar el email en este servidor."}
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2">
          <LogIn className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span>
            <strong>Paso 3 — Inicia sesión</strong>
            <br />
            <span className="text-emerald-800">
              Vuelve aquí con la misma contraseña para sincronizar móvil y PC.
            </span>
          </span>
        </li>
      </ol>

      <p className="text-xs text-emerald-700">
        Si todo va bien, Factu te envía un email de bienvenida a {email}.
      </p>

      <Button fullWidth onClick={onContinueToSignIn}>
        Entendido — ir a iniciar sesión
      </Button>
    </div>
  );
}
