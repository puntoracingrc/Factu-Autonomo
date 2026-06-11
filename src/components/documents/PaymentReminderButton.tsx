"use client";

import { useMemo, useState } from "react";
import { Bell, Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconActionButton } from "@/components/ui/IconAction";
import { Field, Textarea } from "@/components/ui/Field";
import { showFactuToast } from "@/lib/factu/occasional";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";
import {
  canSendPaymentReminder,
  canShowPaymentReminder,
  sendPaymentReminderByEmail,
  sendPaymentReminderByWhatsApp,
  type PaymentReminderChannel,
} from "@/lib/payment-reminder-client";
import { buildDefaultPaymentReminderMessage } from "@/lib/payment-reminder";
import { hasClientEmail, hasClientPhone } from "@/lib/share";
import type { BusinessProfile, Document } from "@/lib/types";

interface PaymentReminderButtonProps {
  doc: Document;
  profile: BusinessProfile;
  variant?: "icon" | "button";
}

export function PaymentReminderButton({
  doc,
  profile,
  variant = "icon",
}: PaymentReminderButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<PaymentReminderChannel | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultMessage = useMemo(
    () => buildDefaultPaymentReminderMessage(doc, profile),
    [doc, profile],
  );
  const [message, setMessage] = useState(defaultMessage);

  if (!canShowPaymentReminder(doc)) {
    return null;
  }

  const canEmail = canSendPaymentReminder(doc, "email");
  const canWhatsApp = canSendPaymentReminder(doc, "whatsapp");

  function handleOpen() {
    setMessage(defaultMessage);
    setError(null);
    setOpen(true);
  }

  function handleClose() {
    if (busy) return;
    setOpen(false);
    setError(null);
  }

  async function handleSend(channel: PaymentReminderChannel) {
    setBusy(channel);
    setError(null);

    const input = { doc, profile, message };
    const result =
      channel === "email"
        ? await sendPaymentReminderByEmail(input)
        : await sendPaymentReminderByWhatsApp(input);

    setBusy(null);

    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar el recordatorio.");
      return;
    }

    markFactuFeatureUsed("payment_reminder");

    if (channel === "email" && result.via === "api") {
      showFactuToast(`Recordatorio enviado a ${doc.client.email}`, 4500);
      setOpen(false);
      return;
    }

    if (channel === "whatsapp" && result.via === "native") {
      showFactuToast("Recordatorio compartido por WhatsApp", 4500);
      setOpen(false);
      return;
    }

    if (channel === "email" && result.via === "native") {
      showFactuToast("Recordatorio compartido por email", 4500);
      setOpen(false);
    }
  }

  const trigger =
    variant === "button" ? (
      <Button variant="secondary" onClick={handleOpen}>
        <Bell className="h-4 w-4" />
        Recordar pago
      </Button>
    ) : (
      <IconActionButton
        label="Recordar"
        tooltip="Recordar pago al cliente"
        onClick={handleOpen}
        className="bg-amber-50 text-amber-800 hover:bg-amber-100"
      >
        <Bell className="h-5 w-5" />
      </IconActionButton>
    );

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-labelledby="payment-reminder-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2
                  id="payment-reminder-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Recordar pago
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {doc.number} · {doc.client.name}
                </p>
                {hasClientEmail(doc) && (
                  <p className="text-sm text-slate-500">{doc.client.email}</p>
                )}
                {hasClientPhone(doc) && (
                  <p className="text-sm text-slate-500">{doc.client.phone}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <Field
                label="Mensaje para el cliente"
                hint="Puedes suavizar el tono o añadir un detalle personal antes de enviar."
              >
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                  className="min-h-[220px] resize-y"
                />
              </Field>
              <button
                type="button"
                onClick={() => setMessage(defaultMessage)}
                className="mt-2 text-sm font-semibold text-blue-600 underline"
              >
                Restaurar texto sugerido
              </button>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={handleClose} disabled={busy !== null}>
                  Cancelar
                </Button>
                {canEmail && (
                  <Button
                    variant="secondary"
                    onClick={() => void handleSend("email")}
                    disabled={busy !== null}
                    className="bg-violet-50 text-violet-800 hover:bg-violet-100"
                  >
                    <Mail className="h-4 w-4" />
                    {busy === "email" ? "Enviando…" : "Enviar por email"}
                  </Button>
                )}
                {canWhatsApp && (
                  <Button
                    onClick={() => void handleSend("whatsapp")}
                    disabled={busy !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {busy === "whatsapp" ? "Abriendo…" : "Enviar por WhatsApp"}
                  </Button>
                )}
              </div>
              {!canEmail && (
                <p className="text-xs text-slate-500">
                  Añade el email del cliente para enviar por correo.
                </p>
              )}
              {!canWhatsApp && (
                <p className="text-xs text-slate-500">
                  Añade el teléfono del cliente para enviar por WhatsApp.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
