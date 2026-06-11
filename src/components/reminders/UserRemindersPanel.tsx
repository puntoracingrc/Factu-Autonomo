"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  completedUserReminders,
  isReminderOverdue,
  linkKindLabel,
  pendingUserReminders,
  reminderDueLabel,
  resolveReminderHref,
} from "@/lib/user-reminders";
import type { UserReminder, UserReminderLinkKind } from "@/lib/types";

const LINK_KINDS: UserReminderLinkKind[] = [
  "none",
  "new_invoice",
  "new_expense",
  "customer",
  "document",
  "rectify",
];

export function UserRemindersPanel() {
  const {
    data,
    addUserReminder,
    completeUserReminder,
    reopenUserReminder,
    deleteUserReminder,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [linkKind, setLinkKind] = useState<UserReminderLinkKind>("none");
  const [entityId, setEntityId] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  const pending = useMemo(
    () => pendingUserReminders(data.userReminders),
    [data.userReminders],
  );
  const completed = useMemo(
    () => completedUserReminders(data.userReminders),
    [data.userReminders],
  );

  const invoiceDocuments = data.documents.filter((doc) => doc.type === "factura");
  const needsEntity =
    linkKind === "customer" ||
    linkKind === "document" ||
    linkKind === "rectify";

  function resetForm() {
    setText("");
    setDueDate("");
    setDueTime("");
    setLinkKind("none");
    setEntityId("");
  }

  function openTemplate(kind: UserReminderLinkKind, presetText: string) {
    setShowForm(true);
    setLinkKind(kind);
    setText(presetText);
    setEntityId("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    addUserReminder({
      text: trimmed,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      link: {
        kind: linkKind,
        entityId: needsEntity && entityId ? entityId : undefined,
      },
    });

    resetForm();
    setShowForm(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => setShowForm((open) => !open)}>
          <Plus className="h-4 w-4" />
          Nuevo recordatorio
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => openTemplate("customer", "Hacer factura a ")}
        >
          Facturar a…
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => openTemplate("rectify", "Rectificar factura de ")}
        >
          Rectificar…
        </Button>
      </div>

      {showForm ? (
        <Card className="mb-6 border-violet-200 bg-violet-50/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Qué quieres recordar" hint="Escribe la tarea con tus palabras">
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ej.: Esta tarde hacer la factura a María"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha (opcional)">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </Field>
              <Field label="Hora (opcional)">
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(event) => setDueTime(event.target.value)}
                />
              </Field>
            </div>

            <Field label="Enlace rápido (opcional)">
              <Select
                value={linkKind}
                onChange={(event) => {
                  setLinkKind(event.target.value as UserReminderLinkKind);
                  setEntityId("");
                }}
              >
                {LINK_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {linkKindLabel(kind)}
                  </option>
                ))}
              </Select>
            </Field>

            {linkKind === "customer" ? (
              <Field label="Cliente">
                <Select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  required
                >
                  <option value="">Elige un cliente</option>
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {linkKind === "document" ? (
              <Field label="Documento">
                <Select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  required
                >
                  <option value="">Elige un documento</option>
                  {data.documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.number} · {doc.client.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {linkKind === "rectify" ? (
              <Field label="Factura a rectificar">
                <Select
                  value={entityId}
                  onChange={(event) => setEntityId(event.target.value)}
                  required
                >
                  <option value="">Elige una factura</option>
                  {invoiceDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.number} · {doc.client.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Guardar recordatorio</Button>
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
            Crea recordatorios para facturas, rectificaciones o cualquier gestión
            que solo tú conoces.
          </p>
        </Card>
      ) : (
        <ul className="mb-6 space-y-3">
          {pending.map((item) => (
            <ReminderRow
              key={item.id}
              reminder={item}
              href={resolveReminderHref(data, item.link)}
              onComplete={() => completeUserReminder(item.id)}
            />
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
                <Card key={item.id} className="border-slate-200 bg-slate-50 p-4 opacity-80">
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
                          {new Date(item.completedAt).toLocaleDateString("es-ES")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => reopenUserReminder(item.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white"
                        title="Marcar como pendiente"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUserReminder(item.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-white"
                        title="Eliminar"
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

function ReminderRow({
  reminder,
  href,
  onComplete,
}: {
  reminder: UserReminder;
  href?: string;
  onComplete: () => void;
}) {
  const overdue = isReminderOverdue(reminder);
  const dueLabel = reminderDueLabel(reminder);

  return (
    <li>
      <Card
        className={`p-4 ${
          overdue ? "border-amber-300 bg-amber-50" : "border-violet-200 bg-violet-50/50"
        }`}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onComplete}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-violet-400 bg-white text-violet-700 transition hover:bg-violet-100"
            title="Marcar como hecho"
            aria-label="Marcar recordatorio como hecho"
          >
            <Check className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{reminder.text}</p>
            {dueLabel ? (
              <p
                className={`mt-1 text-sm ${overdue ? "font-medium text-amber-800" : "text-slate-600"}`}
              >
                {overdue ? "Vencido · " : "Para · "}
                {dueLabel}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-violet-700">Tarea tuya · requiere check</p>
          </div>
          {href ? (
            <Link
              href={href}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200"
            >
              Ir
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </Card>
    </li>
  );
}
