"use client";

import { useMemo, useState } from "react";
import { Mail, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  DOCUMENT_EMAIL_METHOD_OPTIONS,
  DOCUMENT_WHATSAPP_METHOD_OPTIONS,
  normalizeAppPreferences,
} from "@/lib/app-preferences";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
import { shareDocumentWithIntegrity } from "@/lib/document-integrity/share-flow";
import { showFactuToast } from "@/lib/factu/occasional";
import { downloadDocumentPdf } from "@/lib/pdf";
import {
  hasClientEmail,
  hasClientPhone,
  openDocumentEmailMessage,
  openWhatsAppDocumentMessage,
  reserveExternalShareWindow,
  shareDocumentByEmail,
  shareDocumentByWhatsApp,
} from "@/lib/share";
import type { DocumentPdfOptions } from "@/lib/pdf";
import type {
  BusinessProfile,
  Document,
  DocumentEmailSendPreference,
  DocumentWhatsAppSendPreference,
} from "@/lib/types";

type ShareChannel = "email" | "whatsapp";
type ConcreteEmailMethod = Exclude<DocumentEmailSendPreference, "ask">;
type ConcreteWhatsAppMethod = Exclude<DocumentWhatsAppSendPreference, "ask">;

const emailMethodChoices = DOCUMENT_EMAIL_METHOD_OPTIONS.filter(
  (option): option is (typeof DOCUMENT_EMAIL_METHOD_OPTIONS)[number] & {
    value: ConcreteEmailMethod;
  } => option.value !== "ask",
);

const whatsAppMethodChoices = DOCUMENT_WHATSAPP_METHOD_OPTIONS.filter(
  (option): option is (typeof DOCUMENT_WHATSAPP_METHOD_OPTIONS)[number] & {
    value: ConcreteWhatsAppMethod;
  } => option.value !== "ask",
);

interface DocumentShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
  pdfOptions?: DocumentPdfOptions;
}

function methodLabel(
  channel: ShareChannel,
  method: DocumentEmailSendPreference | DocumentWhatsAppSendPreference,
): string {
  const options =
    channel === "email"
      ? DOCUMENT_EMAIL_METHOD_OPTIONS
      : DOCUMENT_WHATSAPP_METHOD_OPTIONS;
  return (
    options.find((option) => option.value === method)?.label ?? "Preguntar"
  );
}

function postShareHint(channel: ShareChannel, method: string): string | null {
  if (channel === "email" && method === "gmail") {
    return "Gmail abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  if (channel === "email" && method === "mailto") {
    return "Correo abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  if (channel === "whatsapp" && method === "direct") {
    return "WhatsApp abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  return null;
}

function externalOpenError(channel: ShareChannel): string {
  return channel === "email"
    ? "No se pudo abrir el correo. Revisa si el navegador ha bloqueado la ventana emergente."
    : "No se pudo abrir WhatsApp. Revisa si el navegador ha bloqueado la ventana emergente.";
}

export function DocumentShareActions({
  doc,
  profile,
  markSentOnShare = true,
  pdfOptions,
}: DocumentShareActionsProps) {
  const { data, issueDocument, markDocumentSent, updateProfile } =
    useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [busy, setBusy] = useState<ShareChannel | null>(null);
  const [chooser, setChooser] = useState<ShareChannel | null>(null);
  const [rememberMethod, setRememberMethod] = useState(true);
  const appPreferences = normalizeAppPreferences(data.profile.appPreferences);
  const contactDoc = useMemo(
    () => documentWithCurrentCustomerContact(doc, data.customers),
    [data.customers, doc],
  );

  const canEmail = hasClientEmail(contactDoc);
  const canWhatsApp = hasClientPhone(contactDoc);
  const accountCanShare = Boolean(user && emailConfirmed);

  function showBlockedMessage(channel: ShareChannel): boolean {
    if (!user) {
      showFactuToast(
        channel === "email"
          ? "Inicia sesión para enviar documentos reales a clientes."
          : "Inicia sesión para compartir documentos reales con clientes.",
        5000,
      );
      return true;
    }
    if (!emailConfirmed) {
      showFactuToast(
        channel === "email"
          ? "Confirma tu email para enviar documentos reales a clientes."
          : "Confirma tu email para compartir documentos reales con clientes.",
        5000,
      );
      return true;
    }
    if (demoMode) {
      showFactuToast(
        channel === "email"
          ? "En modo demo no se envían documentos. Crea una cuenta real para enviar facturas."
          : "En modo demo no se comparten documentos por WhatsApp.",
        5000,
      );
      return true;
    }
    return false;
  }

  function saveEmailMethod(method: ConcreteEmailMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentEmailMethod: method,
      }),
    });
  }

  function saveWhatsAppMethod(method: ConcreteWhatsAppMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentWhatsAppMethod: method,
      }),
    });
  }

  async function runEmail(method: ConcreteEmailMethod) {
    if (!canEmail || busy) return;
    const useExternalClient = method === "gmail" || method === "mailto";
    const externalWindow = useExternalClient
      ? reserveExternalShareWindow()
      : null;
    if (useExternalClient && !externalWindow) {
      showFactuToast(externalOpenError("email"), 5000);
      return;
    }
    setBusy("email");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: async (current) => {
          const currentDoc = documentWithCurrentCustomerContact(
            current,
            data.customers,
          );
          if (useExternalClient) {
            const opened = openDocumentEmailMessage(
              currentDoc,
              profile,
              method,
              externalWindow,
            );
            if (!opened) throw new Error("email_open_failed");
            await downloadDocumentPdf(current, profile, pdfOptions);
            return;
          }
          await shareDocumentByEmail(currentDoc, profile, pdfOptions, method);
        },
      });
      const hint = postShareHint("email", method);
      if (hint) showFactuToast(hint, 5000);
    } catch {
      externalWindow?.close();
      showFactuToast(externalOpenError("email"), 5000);
    } finally {
      setBusy(null);
    }
  }

  async function runWhatsApp(method: ConcreteWhatsAppMethod) {
    if (!canWhatsApp || busy) return;
    const useDirect = method === "direct";
    const externalWindow = useDirect ? reserveExternalShareWindow() : null;
    if (useDirect && !externalWindow) {
      showFactuToast(externalOpenError("whatsapp"), 5000);
      return;
    }
    setBusy("whatsapp");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: async (current) => {
          const currentDoc = documentWithCurrentCustomerContact(
            current,
            data.customers,
          );
          if (useDirect) {
            const opened = openWhatsAppDocumentMessage(
              currentDoc,
              profile,
              externalWindow,
            );
            if (!opened) throw new Error("whatsapp_open_failed");
            await downloadDocumentPdf(current, profile, pdfOptions);
            return;
          }
          await shareDocumentByWhatsApp(
            currentDoc,
            profile,
            pdfOptions,
            method,
          );
        },
      });
      const hint = postShareHint("whatsapp", method);
      if (hint) showFactuToast(hint, 5000);
    } catch {
      externalWindow?.close();
      showFactuToast(externalOpenError("whatsapp"), 5000);
    } finally {
      setBusy(null);
    }
  }

  function handleEmail() {
    if (!canEmail || busy || showBlockedMessage("email")) return;
    if (appPreferences.documentEmailMethod === "ask") {
      setRememberMethod(true);
      setChooser("email");
      return;
    }
    void runEmail(appPreferences.documentEmailMethod);
  }

  function handleWhatsApp() {
    if (!canWhatsApp || busy || showBlockedMessage("whatsapp")) return;
    if (appPreferences.documentWhatsAppMethod === "ask") {
      setRememberMethod(true);
      setChooser("whatsapp");
      return;
    }
    void runWhatsApp(appPreferences.documentWhatsAppMethod);
  }

  function closeChooser() {
    if (busy) return;
    setChooser(null);
  }

  async function chooseEmailMethod(method: ConcreteEmailMethod) {
    if (rememberMethod) saveEmailMethod(method);
    setChooser(null);
    await runEmail(method);
  }

  async function chooseWhatsAppMethod(method: ConcreteWhatsAppMethod) {
    if (rememberMethod) saveWhatsAppMethod(method);
    setChooser(null);
    await runWhatsApp(method);
  }

  const emailTooltip = demoMode
    ? "En demo no se envían documentos"
    : !user
      ? "Inicia sesión para enviar documentos"
      : !emailConfirmed
        ? "Confirma tu email para enviar documentos"
        : canEmail
          ? `Enviar por ${methodLabel("email", appPreferences.documentEmailMethod)} a ${contactDoc.client.email}`
          : "Añade el email del cliente para enviar";
  const whatsappTooltip = demoMode
    ? "En demo no se comparten documentos"
    : !user
      ? "Inicia sesión para compartir documentos"
      : !emailConfirmed
        ? "Confirma tu email para compartir documentos"
        : canWhatsApp
          ? `Enviar por ${methodLabel("whatsapp", appPreferences.documentWhatsAppMethod)} a ${contactDoc.client.phone}`
          : "Añade el teléfono del cliente para enviar";

  return (
    <>
      <IconActionButton
        label="Email"
        tooltip={emailTooltip}
        onClick={handleEmail}
        disabled={!canEmail || busy !== null || demoMode || !accountCanShare}
        className={
          canEmail && !demoMode && accountCanShare
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }
      >
        <Mail
          className={`h-5 w-5 ${busy === "email" ? "animate-pulse" : ""}`}
        />
      </IconActionButton>
      <IconActionButton
        label="WhatsApp"
        tooltip={whatsappTooltip}
        onClick={handleWhatsApp}
        disabled={!canWhatsApp || busy !== null || demoMode || !accountCanShare}
        className={
          canWhatsApp && !demoMode && accountCanShare
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }
      >
        <MessageCircle
          className={`h-5 w-5 ${busy === "whatsapp" ? "animate-pulse" : ""}`}
        />
      </IconActionButton>
      {chooser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-send-method-title"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h2
                  id="document-send-method-title"
                  className="text-lg font-bold text-slate-900"
                >
                  {chooser === "email"
                    ? "Enviar por email"
                    : "Enviar por WhatsApp"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {contactDoc.number} · {contactDoc.client.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeChooser}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto p-5">
              {(chooser === "email"
                ? emailMethodChoices
                : whatsAppMethodChoices
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    chooser === "email"
                      ? void chooseEmailMethod(option.value as ConcreteEmailMethod)
                      : void chooseWhatsAppMethod(
                          option.value as ConcreteWhatsAppMethod,
                        )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <span className="block font-bold text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    {option.description}
                  </span>
                </button>
              ))}

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <input
                  type="checkbox"
                  checked={rememberMethod}
                  onChange={(event) => setRememberMethod(event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  <span className="font-semibold text-slate-900">
                    Usar siempre este método
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Podrás cambiarlo en Ajustes, Preferencias.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end border-t border-slate-100 p-5">
              <Button variant="secondary" onClick={closeChooser}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
