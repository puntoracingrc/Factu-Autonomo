"use client";

import { useMemo, useState } from "react";
import { Bell, Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { Field, Textarea } from "@/components/ui/Field";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
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
import { PAYMENT_REMINDER_COPY } from "@/lib/invoice-status-actions";
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
  const { data } = useAppStore();
  const { billingEnabled, isPro } = useBilling();
  const demoMode = useDemoWorkspaceMode();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<PaymentReminderChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contactDoc = useMemo(
    () => documentWithCurrentCustomerContact(doc, data.customers),
    [data.customers, doc],
  );

  const defaultMessage = useMemo(
    () => buildDefaultPaymentReminderMessage(contactDoc, profile),
    [contactDoc, profile],
  );
  const [message, setMessage] = useState(defaultMessage);

  if (!canShowPaymentReminder(contactDoc)) {
    return null;
  }

  const canEmail = canSendPaymentReminder(contactDoc, "email");
  const canWhatsApp = canSendPaymentReminder(contactDoc, "whatsapp");
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };

  function handleOpen() {
    if (demoMode) {
      showFactuToast(
        "En modo demo no se envían recordatorios a clientes.",
        5000,
      );
      return;
    }
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

    const input = { doc: contactDoc, profile, message, pdfOptions };
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
      showFactuToast(
        `Recordatorio enviado por email a ${contactDoc.client.email}`,
        4500,
      );
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
        {PAYMENT_REMINDER_COPY.buttonLabel}
      </Button>
    ) : (
      <IconActionButton
        label={PAYMENT_REMINDER_COPY.triggerLabel}
        tooltip={PAYMENT_REMINDER_COPY.triggerTooltip}
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
                  {PAYMENT_REMINDER_COPY.dialogTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {contactDoc.number} · {contactDoc.client.name}
                </p>
                {hasClientEmail(contactDoc) && (
                  <p className="text-sm text-slate-500">
                    {contactDoc.client.email}
                  </p>
                )}
                {hasClientPhone(contactDoc) && (
                  <p className="text-sm text-slate-500">
                    {contactDoc.client.phone}
                  </p>
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
                hint={PAYMENT_REMINDER_COPY.fieldHint}
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
                    {busy === "email"
                      ? PAYMENT_REMINDER_COPY.emailBusyLabel
                      : PAYMENT_REMINDER_COPY.emailLabel}
                  </Button>
                )}
                {canWhatsApp && (
                  <Button
                    onClick={() => void handleSend("whatsapp")}
                    disabled={busy !== null}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {busy === "whatsapp"
                      ? PAYMENT_REMINDER_COPY.whatsappBusyLabel
                      : PAYMENT_REMINDER_COPY.whatsappLabel}
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
