"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Plus, RotateCcw, Search, Send, Trash2, X } from "lucide-react";
import { CustomerListSearch } from "@/components/clients/CustomerListSearch";
import { ReminderRealtimeVoiceInput } from "@/components/reminders/ReminderRealtimeVoiceInput";
import { UserReminderRow } from "@/components/reminders/UserReminderRow";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  completedUserReminders,
  pendingUserReminders,
  resolveReminderHref,
} from "@/lib/user-reminders";
import { consumeFiscalCalendarReminderDraft } from "@/lib/fiscal-calendar/reminder-draft";
import { formatShortDate } from "@/lib/calculations";
import { filterDocumentsByQuery, sortDocumentsByNewest } from "@/lib/documents";
import {
  OFFICE_REMINDER_TEMPLATES,
  guessReminderOrigin,
} from "@/lib/reminder-team";
import {
  interpretReminderVoiceIntent,
  type ReminderVoiceIntent,
} from "@/lib/reminder-voice-intent";
import { appendVoiceTranscript } from "@/lib/reminder-voice";
import { getCustomerDisplayName } from "@/lib/customers";
import {
  getComboboxOptionId,
  resolveComboboxKeyboardAction,
} from "@/lib/combobox-navigation";
import type {
  Document,
  DocumentType,
  UserReminderLink,
  UserReminderLinkKind,
} from "@/lib/types";

type ReminderLinkMode = "none" | "generate" | "rectify";
type GenerateReminderDocumentType = Extract<
  DocumentType,
  "factura" | "presupuesto" | "recibo"
>;
type RectifyReminderDocumentType = Extract<
  DocumentType,
  "factura" | "presupuesto"
>;
type GenerateCustomerMode = "none" | "customer";

export function UserRemindersPanel() {
  const {
    data,
    addUserReminder,
    completeUserReminder,
    reopenUserReminder,
    deleteUserReminder,
  } = useAppStore();
  const { user, syncNow } = useCloudSync();

  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [linkMode, setLinkMode] = useState<ReminderLinkMode>("none");
  const [generateType, setGenerateType] =
    useState<GenerateReminderDocumentType>("factura");
  const [generateCustomerMode, setGenerateCustomerMode] =
    useState<GenerateCustomerMode>("none");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [rectifyType, setRectifyType] =
    useState<RectifyReminderDocumentType>("factura");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [target, setTarget] = useState<"self" | "office">("self");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sentToOffice, setSentToOffice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [calendarDraftNotice, setCalendarDraftNotice] = useState<
    string | null
  >(null);
  const initialRouteHandled = useRef(false);

  const pending = useMemo(
    () => pendingUserReminders(data.userReminders),
    [data.userReminders],
  );
  const completed = useMemo(
    () => completedUserReminders(data.userReminders),
    [data.userReminders],
  );

  const rectifiableDocuments = useMemo(
    () =>
      data.documents.filter((doc) =>
        rectifyType === "factura"
          ? doc.type === "factura"
          : doc.type === "presupuesto",
      ),
    [data.documents, rectifyType],
  );

  useEffect(() => {
    if (initialRouteHandled.current) return;
    initialRouteHandled.current = true;
    if (window.location.hash !== "#nuevo-recordatorio") return;
    setShowForm(true);
    const originValues = new URLSearchParams(window.location.search).getAll(
      "origen",
    );
    const fromFiscalCalendar =
      originValues.length === 1 && originValues[0] === "calendario";
    if (fromFiscalCalendar) {
      setTarget("self");
      setLinkMode("none");
      setGenerateCustomerMode("none");
      setSelectedCustomerId(null);
      setSelectedDocumentId("");
      setSentToOffice(false);
      setVoiceHint(null);
      try {
        const result = consumeFiscalCalendarReminderDraft(
          window.sessionStorage,
        );
        if (result.ok) {
          setText(result.draft.text);
          setFormError(null);
          setCalendarDraftNotice(
            "Borrador preparado desde el calendario fiscal. Revísalo antes de guardarlo.",
          );
        } else {
          setText("");
          setCalendarDraftNotice(null);
          setFormError(
            "No hemos podido recuperar el borrador del calendario. Vuelve al calendario e inténtalo de nuevo.",
          );
        }
      } catch {
        setText("");
        setCalendarDraftNotice(null);
        setFormError(
          "No hemos podido recuperar el borrador del calendario. Vuelve al calendario e inténtalo de nuevo.",
        );
      }
    }
    window.requestAnimationFrame(() => {
      document
        .getElementById("nuevo-recordatorio")
        ?.scrollIntoView({ block: "start" });
    });
  }, []);

  function resetForm() {
    setText("");
    setLinkMode("none");
    setGenerateType("factura");
    setGenerateCustomerMode("none");
    setSelectedCustomerId(null);
    setRectifyType("factura");
    setSelectedDocumentId("");
    setTarget("self");
    setFormError(null);
    setVoiceHint(null);
    setCalendarDraftNotice(null);
  }

  function openForm(nextTarget: "self" | "office") {
    setShowForm(true);
    setTarget(nextTarget);
    setSentToOffice(false);
    setFormError(null);
    setVoiceHint(null);
    setCalendarDraftNotice(null);
    window.requestAnimationFrame(() => {
      document
        .getElementById("nuevo-recordatorio")
        ?.scrollIntoView({ block: "start" });
    });
  }

  function applyOfficeTemplate(kind: UserReminderLinkKind, presetText: string) {
    setTarget("office");
    applyLinkKindToForm(kind);
    setText(presetText);
    setSelectedCustomerId(null);
    setSelectedDocumentId("");
    setFormError(null);
    setVoiceHint(null);
    setCalendarDraftNotice(null);
    setSentToOffice(false);
  }

  function applyLinkKindToForm(kind: UserReminderLinkKind) {
    if (kind === "new_invoice" || kind === "customer") {
      setLinkMode("generate");
      setGenerateType("factura");
      setGenerateCustomerMode(kind === "customer" ? "customer" : "none");
    } else if (kind === "new_quote") {
      setLinkMode("generate");
      setGenerateType("presupuesto");
      setGenerateCustomerMode("none");
    } else if (kind === "new_receipt") {
      setLinkMode("generate");
      setGenerateType("recibo");
      setGenerateCustomerMode("none");
    } else if (kind === "rectify") {
      setLinkMode("rectify");
      setRectifyType("factura");
    } else {
      setLinkMode("none");
    }
  }

  function clearVoiceDraft() {
    setText("");
    setLinkMode("none");
    setGenerateType("factura");
    setGenerateCustomerMode("none");
    setSelectedCustomerId(null);
    setRectifyType("factura");
    setSelectedDocumentId("");
    setSentToOffice(false);
    setFormError(null);
    setVoiceHint("He limpiado el recordatorio. Puedes empezar de nuevo.");
    setCalendarDraftNotice(null);
  }

  function applyVoiceIntent(intent: ReminderVoiceIntent) {
    if (intent.linkMode === "reset") {
      clearVoiceDraft();
      return;
    }

    if (intent.linkMode === "none") {
      setVoiceHint(null);
      return;
    }

    if (intent.linkMode === "generate" && intent.generateType) {
      setLinkMode("generate");
      setGenerateType(intent.generateType);
      setSelectedDocumentId("");
      if (intent.customerMatch) {
        setGenerateCustomerMode("customer");
        setSelectedCustomerId(intent.customerMatch.customer.id);
        setVoiceHint(
          `Preparado: ${intent.generateType} para ${getCustomerDisplayName(
            intent.customerMatch.customer,
          )}.`,
        );
      } else {
        setGenerateCustomerMode("none");
        setSelectedCustomerId(null);
        setVoiceHint(`Preparado: ${intent.generateType}.`);
      }
      return;
    }

    if (intent.linkMode === "rectify" && intent.rectifyType) {
      setLinkMode("rectify");
      setRectifyType(intent.rectifyType);
      setGenerateCustomerMode("none");
      setSelectedCustomerId(null);
      if (intent.documentMatch) {
        setSelectedDocumentId(intent.documentMatch.document.id);
        setVoiceHint(`Preparado: rectificar ${intent.rectifyType}.`);
      } else {
        setSelectedDocumentId("");
        setVoiceHint(`Preparado: rectificar ${intent.rectifyType}.`);
      }
    }
  }

  function handleVoiceTranscript(transcript: string) {
    const intent = interpretReminderVoiceIntent({
      transcript,
      customers: data.customers,
      documents: data.documents,
    });

    if (intent.linkMode === "reset") {
      applyVoiceIntent(intent);
      return;
    }

    const nextText = appendVoiceTranscript(text, transcript);
    setText(nextText);
    setSentToOffice(false);
    setFormError(null);

    applyVoiceIntent(intent);
  }

  function buildReminderLink(): UserReminderLink | null {
    if (linkMode === "none") {
      return { kind: "none" };
    }

    if (linkMode === "generate") {
      if (generateCustomerMode === "customer" && !selectedCustomerId) {
        setFormError("Elige un cliente o cambia a Sin cliente.");
        return null;
      }
      const entityId =
        generateCustomerMode === "customer" && selectedCustomerId
          ? selectedCustomerId
          : undefined;
      if (generateType === "factura") {
        return { kind: "new_invoice", entityId };
      }
      if (generateType === "presupuesto") {
        return { kind: "new_quote", entityId };
      }
      return { kind: "new_receipt", entityId };
    }

    if (!selectedDocumentId) {
      setFormError("Elige el documento que quieres rectificar.");
      return null;
    }
    return { kind: "rectify", entityId: selectedDocumentId };
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setFormError(null);
    const link = buildReminderLink();
    if (!link) return;

    addUserReminder({
      text: trimmed,
      target,
      origin: guessReminderOrigin(),
      link,
    });

    if (target === "office" && user) {
      void syncNow();
    }

    if (target === "office") {
      setSentToOffice(true);
    }

    resetForm();
    setShowForm(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          type="button"
          id="nuevo-recordatorio"
          onClick={() => {
            if (showForm && target === "self") {
              setShowForm(false);
              setCalendarDraftNotice(null);
              return;
            }
            openForm("self");
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo recordatorio
        </Button>
      </div>

      {sentToOffice ? (
        <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Enviado a oficina. Si hay nube activa, se sincronizará con el otro
          dispositivo.
        </p>
      ) : null}

      {calendarDraftNotice ? (
        <p
          className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
          role="status"
        >
          {calendarDraftNotice}
        </p>
      ) : null}

      {showForm ? (
        <Card className="mb-6 border-violet-200 bg-violet-50/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-lg font-bold text-slate-900">
                {target === "office"
                  ? "Enviar a oficina"
                  : "Nuevo recordatorio"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {target === "office"
                  ? "Deja una tarea para el equipo usando la misma cuenta."
                  : "Apunta una tarea personal para tenerla visible en Panel."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="reminder-text"
                className="text-sm font-semibold text-slate-700"
              >
                Qué quieres recordar
              </label>
              <Textarea
                id="reminder-text"
                value={text}
                onChange={(event) => {
                  setText(event.target.value);
                  setSentToOffice(false);
                }}
                placeholder="Ej.: Esta tarde hacer la factura a María"
                required
              />
              <ReminderRealtimeVoiceInput
                value={text}
                onChange={(nextText) => {
                  setText(nextText);
                  setSentToOffice(false);
                }}
                onTranscript={handleVoiceTranscript}
                onActivity={() => {
                  setFormError(null);
                  setVoiceHint(null);
                }}
              />
              <span className="text-xs text-slate-400">
                Escribe la tarea con tus palabras
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Destino">
                <Select
                  value={target}
                  onChange={(event) => {
                    setTarget(event.target.value as "self" | "office");
                    setSentToOffice(false);
                  }}
                >
                  <option value="self">Para mí</option>
                  <option value="office">Para oficina / equipo</option>
                </Select>
              </Field>

              <Field label="Enlace rápido (opcional)">
                <Select
                  value={linkMode}
                  onChange={(event) => {
                    setLinkMode(event.target.value as ReminderLinkMode);
                    setSelectedCustomerId(null);
                    setSelectedDocumentId("");
                    setFormError(null);
                  }}
                >
                  <option value="none">Sin enlace</option>
                  <option value="generate">Generar</option>
                  <option value="rectify">Rectificar</option>
                </Select>
              </Field>
            </div>

            {target === "office" ? (
              <div className="rounded-2xl border border-sky-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-800">
                  Plantillas rápidas
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {OFFICE_REMINDER_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        applyOfficeTemplate(template.linkKind, template.text)
                      }
                      className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
                {!user ? (
                  <p className="mt-3 text-xs font-medium text-amber-800">
                    Para verlo en otro dispositivo necesitas la cuenta en la
                    nube.
                  </p>
                ) : null}
              </div>
            ) : null}

            {linkMode === "generate" ? (
              <div className="grid gap-4 rounded-2xl border border-blue-100 bg-white/80 p-4 sm:grid-cols-2">
                <Field label="Qué generar">
                  <Select
                    value={generateType}
                    onChange={(event) => {
                      setGenerateType(
                        event.target.value as GenerateReminderDocumentType,
                      );
                      setFormError(null);
                    }}
                  >
                    <option value="presupuesto">Presupuesto</option>
                    <option value="factura">Factura</option>
                    <option value="recibo">Recibo</option>
                  </Select>
                </Field>

                <Field label="Cliente">
                  <Select
                    value={generateCustomerMode}
                    onChange={(event) => {
                      const value = event.target.value as GenerateCustomerMode;
                      setGenerateCustomerMode(value);
                      if (value === "none") setSelectedCustomerId(null);
                      setFormError(null);
                    }}
                  >
                    <option value="none">Sin cliente</option>
                    <option value="customer">Cliente</option>
                  </Select>
                </Field>
                {generateCustomerMode === "customer" ? (
                  <div className="sm:col-span-2">
                    <CustomerListSearch
                      customers={data.customers}
                      selectedCustomerId={selectedCustomerId}
                      onSelectCustomer={(customer) => {
                        setSelectedCustomerId(customer?.id ?? null);
                        setFormError(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {linkMode === "rectify" ? (
              <div className="grid gap-4 rounded-2xl border border-orange-100 bg-white/80 p-4">
                <Field label="Documento a rectificar">
                  <Select
                    value={rectifyType}
                    onChange={(event) => {
                      setRectifyType(
                        event.target.value as RectifyReminderDocumentType,
                      );
                      setSelectedDocumentId("");
                      setFormError(null);
                    }}
                  >
                    <option value="presupuesto">Presupuesto</option>
                    <option value="factura">Factura</option>
                  </Select>
                </Field>
                <DocumentPickerSearch
                  documents={rectifiableDocuments}
                  selectedDocumentId={selectedDocumentId}
                  onSelectDocument={(doc) => {
                    setSelectedDocumentId(doc?.id ?? "");
                    setFormError(null);
                  }}
                />
              </div>
            ) : null}

            {formError ? (
              <p
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
            {voiceHint ? (
              <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900">
                {voiceHint}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit">
                {target === "office" ? (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar a oficina
                  </>
                ) : (
                  "Guardar recordatorio"
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {pending.length === 0 ? (
        <Card className="mb-4 border-slate-200 bg-slate-50 text-center">
          <p className="font-semibold text-slate-800">Sin tareas pendientes</p>
          <p className="mt-1 text-sm text-slate-600">
            Crea recordatorios para facturas, rectificaciones o cualquier
            gestión que solo tú conoces.
          </p>
        </Card>
      ) : (
        <ul className="mb-6 space-y-3">
          {pending.map((item) => (
            <li key={item.id}>
              <UserReminderRow
                reminder={item}
                href={resolveReminderHref(data, item.link)}
                onComplete={() => completeUserReminder(item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {completed.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted((open) => !open)}
            className="mb-3 text-sm font-semibold text-slate-600 underline"
          >
            {showCompleted ? "Ocultar" : "Ver"} completados ({completed.length})
          </button>

          {showCompleted ? (
            <ul className="space-y-3">
              {completed.slice(0, 30).map((item) => (
                <Card
                  key={item.id}
                  className="border-slate-200 bg-slate-50 p-4 opacity-80"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-700 line-through">
                        {item.text}
                      </p>
                      {item.completedAt ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Hecho el{" "}
                          {new Date(item.completedAt).toLocaleDateString(
                            "es-ES",
                          )}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => reopenUserReminder(item.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white"
                        title="Marcar como pendiente"
                        aria-label="Marcar recordatorio como pendiente"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUserReminder(item.id)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-red-500 hover:bg-white"
                        title="Eliminar"
                        aria-label="Eliminar recordatorio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function DocumentPickerSearch({
  documents,
  selectedDocumentId,
  onSelectDocument,
}: {
  documents: Document[];
  selectedDocumentId: string;
  onSelectDocument: (document: Document | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxId = useId();
  const listboxId = `document-picker-listbox-${comboboxId}`;

  const selectedDocument = useMemo(
    () =>
      selectedDocumentId
        ? (documents.find((document) => document.id === selectedDocumentId) ??
          null)
        : null,
    [documents, selectedDocumentId],
  );

  const results = useMemo(() => {
    const sorted = sortDocumentsByNewest(documents);
    if (!search.trim()) return sorted.slice(0, 15);
    return filterDocumentsByQuery(sorted, search).slice(0, 20);
  }, [documents, search]);

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  useEffect(() => {
    if (selectedDocument) {
      setSearch(documentPickerLabel(selectedDocument));
    }
  }, [selectedDocument]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyDocument(document: Document) {
    onSelectDocument(document);
    setSearch(documentPickerLabel(document));
    setOpen(false);
  }

  function clearSelection() {
    onSelectDocument(null);
    setSearch("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const popupVisible = open && !selectedDocumentId;
    const action = resolveComboboxKeyboardAction({
      key: event.key,
      itemCount: selectedDocumentId ? 0 : results.length,
      highlightedIndex: highlight,
      open: popupVisible,
    });
    if (action.type === "none") return;

    event.preventDefault();
    if (action.type === "close") {
      setOpen(false);
    } else if (action.type === "highlight") {
      setOpen(true);
      setHighlight(action.index);
    } else {
      const document = results[action.index];
      if (document) applyDocument(document);
    }
  }

  const popupOpen = open && !selectedDocumentId;
  const activeIndex =
    results.length > 0 ? Math.min(highlight, results.length - 1) : -1;

  useEffect(() => {
    if (!popupOpen || activeIndex < 0) return;
    document
      .getElementById(getComboboxOptionId(listboxId, results[activeIndex].id))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, popupOpen, results]);

  return (
    <div className="relative" ref={containerRef}>
      <Field
        label="Buscar documento"
        hint="Escribe número, cliente, NIF, dirección o importe"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={popupOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              popupOpen && activeIndex >= 0
                ? getComboboxOptionId(listboxId, results[activeIndex].id)
                : undefined
            }
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
              if (selectedDocumentId) onSelectDocument(null);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ej.: cliente, número o importe..."
            className="pl-10"
          />
          {selectedDocumentId && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Quitar documento"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Field>

      {popupOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Documentos encontrados"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <li
              role="status"
              className="px-4 py-3 text-sm text-slate-500"
            >
              No hay documentos que coincidan
            </li>
          ) : (
            results.map((document, index) => (
              <li key={document.id} role="presentation">
                <button
                  id={getComboboxOptionId(listboxId, document.id)}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => applyDocument(document)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    index === activeIndex
                      ? "bg-blue-50 text-blue-900"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">
                    {documentPickerLabel(document)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {document.client.name} · {formatShortDate(document.date)}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function documentPickerLabel(document: Document): string {
  return `${document.number} · ${document.client.name}`;
}
